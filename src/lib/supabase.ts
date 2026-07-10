// Server-only — never import in client components.
// Central Supabase client + a single flag every store checks to decide
// whether to talk to Postgres or fall back to the local fs.*.json store
// (fs stores don't survive on Vercel's read-only filesystem — see
// docs/PRD.md and AGENTS.md history — Supabase is the real fix).
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Service-role key — full read/write, bypasses RLS. Only ever used from
// server code (API routes, route handlers), never sent to the browser.
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase belum dikonfigurasi — set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local (lihat supabase/README.md)."
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
