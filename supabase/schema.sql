-- BNI PayFlow / AP Validation — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
--
-- Design note: this mirrors the existing fs.writeFileSync JSON stores
-- (src/data/*.json) as closely as possible so the migration is a straight
-- swap, not a redesign. Nested structures (journal groups, batch items,
-- permissions) are kept as JSONB rather than normalized into more tables —
-- revisit if/when those need to be queried/filtered server-side at scale.
--
-- All access goes through the server (Next.js API routes) using the
-- service_role key, never the browser directly — so RLS is left disabled.
-- If you ever call Supabase from the client with the anon key, enable RLS
-- and add policies before doing so.

create extension if not exists "pgcrypto";

-- ── Users (auth) ────────────────────────────────────────────────────────
create table if not exists app_users (
  id            text primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null check (role in ('admin', 'employee')),
  permissions   jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists app_users_email_idx on app_users (lower(email));

-- ── AP sessions (Transaksi AP: e-statement -> Accurate) ────────────────
create table if not exists ap_sessions (
  id                    text primary key,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            jsonb not null,        -- { id, name }
  created_by_email      text,
  created_by_ip         text,
  database              jsonb not null,        -- { id, name, dbCode }
  kas_bank              jsonb not null,        -- { code, name }
  branch_name           text,
  selected_vendor_codes jsonb not null default '[]'::jsonb,
  file_name             text not null,
  groups                jsonb not null default '[]'::jsonb,  -- JournalGroup[]
  pushed_ids            jsonb not null default '[]'::jsonb,
  resolved_ids          jsonb not null default '[]'::jsonb,
  accurate_journal_nos  jsonb not null default '{}'::jsonb,
  manual_overrides      jsonb not null default '{}'::jsonb,
  status                text not null default 'draft' check (status in ('draft', 'selesai'))
);

-- ── Payment batches (Pembayaran Vendor: outstanding hutang -> file BNI) ─
-- One batch = one outlet + one of its Rek. Debet (cash/cashless/tabungan),
-- since a real BNI Direct upload file is always scoped to a single debit
-- account (see docs/references/0. MASTER CMS - INHOUSE.xls / KLIRING.xls
-- in the root repo — one P-row per file). No separate "menunggu_rilis"
-- status: once exported, the file is upload-ready, so "file_exported" goes
-- straight to "rilis_selesai" once the user confirms it's been released.
create table if not exists payment_batches (
  id                     text primary key,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             jsonb not null,        -- { id, name }
  status                 text not null default 'draft'
                         check (status in ('draft','dikurasi','file_exported','rilis_selesai')),
  outlet_code            text not null,          -- lihat src/lib/data/bni-outlets.json
  debet_account_type     text not null check (debet_account_type in ('cash','cashless','tabungan')),
  items                  jsonb not null default '[]'::jsonb,  -- PaymentBatchItem[]
  exported_file_name     text,
  exported_file_content  text,                    -- base64 .xlsx
  exported_at            timestamptz,
  released_at            timestamptz,
  ap_session_id          text references ap_sessions (id) on delete set null
);

-- ── Outstanding hutang vendor (tahap 1-2: import file -> pool hutang) ──
-- Replace-all on every upload (see outstanding-invoice-store.ts) — each
-- import is treated as a fresh full snapshot, not an incremental add.
create table if not exists outstanding_invoices (
  id                  text primary key,
  source_outlet_code  text not null,   -- lihat src/lib/data/bni-outlets.json
  vendor_code         text not null,
  vendor_name         text not null,
  invoice_no          text not null,
  invoice_date        date not null,
  due_date            date not null,
  amount              numeric not null,
  bank_name           text not null,
  bank_account_no     text not null,
  bank_account_name   text not null,
  description         text default ''
);

create table if not exists outstanding_invoice_imports (
  id           bigint generated always as identity primary key,
  imported_at  timestamptz not null default now(),
  imported_by  jsonb not null,   -- { id, name }
  file_name    text not null,
  row_count    integer not null
);

-- ── Wizard config (per-database default kas/bank + active vendors) ─────
create table if not exists wizard_configs (
  db_id            text primary key,
  bank_account_no  text,
  vendor_nos       jsonb not null default '[]'::jsonb
);

-- ── Master data cache (vendor & COA dari Accurate) ──────────────────────
-- Bukan sumber kebenaran — cuma cache biar load master data nggak nunggu
-- Accurate live tiap kali (fetchVendors() khususnya lambat, N+1 detail
-- call per vendor). Di-replace penuh (bukan upsert incremental) tiap kali
-- tombol "Sync" di /settings/database/[id] dipencet — lihat
-- accurate-master-data-store.ts. Kalau cache kosong (belum pernah sync),
-- API route fallback ke live fetch tanpa nyatet itu sebagai sync resmi.
create table if not exists accurate_vendors_cache (
  db_id               text not null,
  accurate_id         bigint not null,
  vendor_no           text not null,
  name                text not null,
  vendor_branch_name  text,
  bank_name           text,
  account_no          text,
  primary key (db_id, accurate_id)
);

create table if not exists accurate_gl_accounts_cache (
  db_id         text not null,
  no            text not null,
  name          text not null,
  account_type  text not null,
  primary key (db_id, no)
);

create table if not exists accurate_master_sync_log (
  id          bigint generated always as identity primary key,
  db_id       text not null,
  entity      text not null check (entity in ('vendors', 'gl_accounts')),
  synced_at   timestamptz not null default now(),
  synced_by   jsonb not null,   -- { id, name }
  row_count   integer not null
);

create index if not exists accurate_master_sync_log_lookup_idx
  on accurate_master_sync_log (db_id, entity, synced_at desc);

-- updated_at auto-touch trigger, reused across tables
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_users_touch on app_users;
create trigger app_users_touch before update on app_users
  for each row execute function set_updated_at();

drop trigger if exists ap_sessions_touch on ap_sessions;
create trigger ap_sessions_touch before update on ap_sessions
  for each row execute function set_updated_at();

drop trigger if exists payment_batches_touch on payment_batches;
create trigger payment_batches_touch before update on payment_batches
  for each row execute function set_updated_at();
