-- Run this in the SQL Editor if your Supabase project already had
-- schema.sql applied before the outstanding-hutang-vendor upload feature
-- was added. Fresh installs don't need it — it's already in schema.sql.

create table if not exists outstanding_invoices (
  id                  text primary key,
  source_outlet_code  text not null,
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
  imported_by  jsonb not null,
  file_name    text not null,
  row_count    integer not null
);
