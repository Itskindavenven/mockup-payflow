-- Run this in the SQL Editor if your Supabase project already had
-- schema.sql applied before the outlet-scoped payment batch redesign
-- (adds outlet_code / debet_account_type, drops the old
-- 'menunggu_rilis' status). Safe to run even if payment_batches has no
-- rows yet (which is the expected state — this feature had no real data).

alter table payment_batches
  add column if not exists outlet_code text,
  add column if not exists debet_account_type text;

-- Existing rows (if any) predate outlet scoping and can't be backfilled
-- meaningfully — remove them rather than leaving nulls that violate the
-- new not-null constraint below.
delete from payment_batches where outlet_code is null;

alter table payment_batches
  alter column outlet_code set not null,
  alter column debet_account_type set not null;

alter table payment_batches
  add constraint payment_batches_debet_account_type_check
    check (debet_account_type in ('cash','cashless','tabungan'));

alter table payment_batches drop constraint if exists payment_batches_status_check;
alter table payment_batches
  add constraint payment_batches_status_check
    check (status in ('draft','dikurasi','file_exported','rilis_selesai'));

update payment_batches set status = 'file_exported' where status = 'menunggu_rilis';
