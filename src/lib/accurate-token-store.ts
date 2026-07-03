// Server-only — persists the live Accurate OAuth token/session so it
// survives across serverless invocations (env vars are baked at deploy
// time and can't be updated at runtime, so a plain env-var-only setup
// goes stale the moment Accurate rotates the access/refresh token pair).
//
// Storage: Upstash Redis (via Vercel's Redis marketplace integration,
// which injects KV_REST_API_URL / KV_REST_API_TOKEN, or plain
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). If neither is
// configured (e.g. local dev), falls back to the static env vars —
// refresh still works within a single process, it just won't persist
// across restarts.

import { Redis } from "@upstash/redis";

export interface AccurateCreds {
  accessToken: string;
  refreshToken: string;
  session: string;
  host: string;
}

const REDIS_KEY = "accurate:creds";

function makeRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = makeRedis();

function credsFromEnv(): AccurateCreds {
  return {
    accessToken: process.env.ACCURATE_ACCESS_TOKEN!,
    refreshToken: process.env.ACCURATE_REFRESH_TOKEN!,
    session: process.env.ACCURATE_SESSION!,
    host: process.env.ACCURATE_DB_HOST!,
  };
}

// In-memory fallback so refreshes within the same warm process are still
// picked up even without Redis configured (e.g. local `next dev`).
let memoryCreds: AccurateCreds | null = null;

export async function loadCreds(): Promise<AccurateCreds> {
  if (redis) {
    const stored = await redis.get<AccurateCreds>(REDIS_KEY);
    if (stored) return stored;
  }
  return memoryCreds ?? credsFromEnv();
}

async function saveCreds(creds: AccurateCreds): Promise<void> {
  memoryCreds = creds;
  if (redis) {
    await redis.set(REDIS_KEY, creds);
  }
}

// Exchanges the current refresh_token for a new access_token, then mints
// a fresh database session via open-db.do. Accurate rotates the
// refresh_token on every use, so the new pair is persisted immediately —
// skipping this would strand the app with a refresh_token that only
// works once.
//
// Single-flighted: the wizard fires several Accurate API calls in
// parallel (Promise.all), so if the token is stale, multiple callers can
// hit `refreshCreds()` at nearly the same instant. Without this, each
// would race to spend the *same* refresh_token — Accurate only honors
// the first, and every other concurrent call dies with `invalid_grant`
// even though the refresh itself succeeded moments earlier.
let inFlightRefresh: Promise<AccurateCreds> | null = null;

export function refreshCreds(): Promise<AccurateCreds> {
  if (!inFlightRefresh) {
    inFlightRefresh = doRefresh().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

async function doRefresh(): Promise<AccurateCreds> {
  const current = await loadCreds();

  const basicAuth = Buffer.from(
    `${process.env.ACCURATE_CLIENT_ID}:${process.env.ACCURATE_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://account.accurate.id/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: current.refreshToken,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Gagal refresh token Accurate: ${await tokenRes.text()}`);
  }
  const token = await tokenRes.json() as { access_token: string; refresh_token: string };

  const dbRes = await fetch(`https://account.accurate.id/api/open-db.do?id=${process.env.ACCURATE_DB_ID}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const db = await dbRes.json() as { s: boolean; session?: string; host?: string; d?: unknown };
  if (!db.s || !db.session || !db.host) {
    throw new Error(`Gagal membuka sesi database Accurate: ${JSON.stringify(db)}`);
  }

  const creds: AccurateCreds = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    session: db.session,
    host: db.host,
  };
  await saveCreds(creds);
  return creds;
}
