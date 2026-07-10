# Supabase setup

Migrates auth (`users`) and the previously fs-based data stores
(`ap_sessions`, `payment_batches`, `wizard_configs`) off `fs.writeFileSync`
onto Postgres. This was a known gap: Vercel's serverless functions have a
read-only filesystem (except `/tmp`, which doesn't persist across
invocations), so every `src/data/*.json` write was silently lost in
production. Locally, nothing changes until you set the env vars below —
every store falls back to the original fs-based JSON files when Supabase
isn't configured (see `isSupabaseConfigured()` in `src/lib/supabase.ts`).

## 1. Create a project

1. Go to [supabase.com](https://supabase.com) → sign in → **New project**.
2. Pick an org, name it (e.g. `ega-accurate-payflow`), set a database
   password (save it somewhere — you won't need it for the app itself,
   only if you ever connect via raw Postgres), pick a region close to
   your users (e.g. Singapore).
3. Wait ~2 min for provisioning.

## 2. Run the schema

1. In the project dashboard: **SQL Editor** → **New query**.
2. Paste the contents of [`schema.sql`](./schema.sql), run it.
3. Optionally paste [`seed.sql`](./seed.sql) and run it — seeds the same
   3 dev users that are in `src/data/users.json` today (admin / budi /
   sari), same passwords, now bcrypt-hashed.

## 3. Get your keys

**Project Settings → API**:
- `Project URL` → `SUPABASE_URL`
- `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ The service-role key bypasses Row Level Security and has full
read/write access. It must **only** ever be used server-side (which is
how `src/lib/supabase.ts` uses it — never import it in a client
component). Never expose it with a `NEXT_PUBLIC_` prefix.

## 4. Set env vars

Add to `.env.local` (local dev) and to Vercel → Project Settings →
Environment Variables (production/preview):

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

That's it — every store (`user-store.ts`, `ap-session-store.ts`,
`payment-batch-store.ts`, `wizard-config-store.ts`) checks these two vars
at call time and switches to Supabase automatically. No code changes,
no feature flag.

## Migrations

`migrations/0001_payment_batch_outlet.sql` — run this if you already ran
`schema.sql` **before** the outlet-scoped payment batch redesign (adds
`outlet_code`/`debet_account_type`, drops the old `menunggu_rilis` status).

`migrations/0002_outstanding_invoices.sql` — run this if you already ran
`schema.sql` before the outstanding-hutang-vendor upload feature was added
(adds `outstanding_invoices` + `outstanding_invoice_imports` tables).

Fresh installs don't need either — both are already in `schema.sql`.

## 5. Migrate existing local data (optional)

If you have real sessions/batches in `src/data/*.json` you want to keep,
insert them manually via the SQL editor or Supabase's Table Editor UI —
the JSON shape maps directly to the JSONB columns (see the
`recordToRow`/`rowToRecord` mapping functions in each `*-store.ts` file
for the exact camelCase ↔ snake_case field mapping). There's no
automated migration script since this only matters if you have
meaningful non-test data sitting in the JSON files right now.

## What changed in the app

- **Passwords are now bcrypt-hashed**, in both Supabase and the fs
  fallback (`src/data/users.json` was previously plaintext — that was a
  real problem, fixed as part of this migration regardless of whether
  Supabase is configured).
- All store methods are now `async` (they always were I/O, just
  synchronous fs I/O before) — every caller was updated to `await` them.
- `StoredUser.password` was renamed to `StoredUser.passwordHash` to make
  clear it's never a raw password past the API boundary.

## Not done yet

- Real Supabase Auth (magic links, OAuth, etc.) — this migration only
  moves the *storage* of the existing custom email+password + JWT-cookie
  auth to Postgres. Swapping to `supabase.auth.*` would be a separate,
  bigger change (drops the custom JWT/session cookie code in
  `src/lib/session.ts` entirely) — worth doing if this goes to real
  production, but out of scope here.
- Row Level Security is intentionally left off — all access is
  server-side via the service-role key. If any Supabase call is ever
  made from client code (browser) instead, RLS policies must be added
  first.
