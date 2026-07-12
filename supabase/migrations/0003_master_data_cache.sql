-- Run this in the SQL Editor if your Supabase project already had
-- schema.sql applied before the master-data-cache (manual sync) feature
-- was added. Fresh installs don't need it — it's already in schema.sql.

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
  synced_by   jsonb not null,
  row_count   integer not null
);

create index if not exists accurate_master_sync_log_lookup_idx
  on accurate_master_sync_log (db_id, entity, synced_at desc);
