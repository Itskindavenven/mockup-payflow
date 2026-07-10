// Server-only — persists the live Accurate OAuth token and per-database
// sessions so they survive across serverless invocations (env vars are
// baked at deploy time and can't be updated at runtime, so a plain
// env-var-only setup goes stale the moment Accurate rotates the token).
//
// Model: one OAuth access/refresh token pair per Accurate *account*
// (shared across every database that account can see), and a separate
// session key per *database* (minted via open-db.do?id=<dbId>, since
// each database needs its own session).
//
// Storage: Upstash Redis (via Vercel's Redis marketplace integration,
// which injects KV_REST_API_URL / KV_REST_API_TOKEN, or plain
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). If neither is
// configured (e.g. local dev), falls back to env vars / in-memory —
// refresh still works within a single process, it just won't persist
// across restarts.

import { Redis } from "@upstash/redis";

export interface AccountToken {
  accessToken: string;
  refreshToken: string;
}

export interface DbSession {
  session: string;
  host: string;
}

const ACCOUNT_KEY = "accurate:account";
const dbKey = (dbId: string) => `accurate:db:${dbId}`;

function makeRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = makeRedis();

function accountFromEnv(): AccountToken {
  return {
    accessToken: process.env.ACCURATE_ACCESS_TOKEN!,
    refreshToken: process.env.ACCURATE_REFRESH_TOKEN!,
  };
}

function defaultDbSessionFromEnv(dbId: string): DbSession | null {
  // Only the originally-configured database has an env-var fallback —
  // any other database always goes through open-db.do.
  if (dbId !== process.env.ACCURATE_DB_ID) return null;
  return {
    session: process.env.ACCURATE_SESSION!,
    host: process.env.ACCURATE_DB_HOST!,
  };
}

// In-memory fallback so refreshes within the same warm process are still
// picked up even without Redis configured (e.g. local `next dev`).
let memoryAccount: AccountToken | null = null;
const memoryDbSessions = new Map<string, DbSession>();

export async function loadAccountToken(): Promise<AccountToken> {
  if (redis) {
    const stored = await redis.get<AccountToken>(ACCOUNT_KEY);
    if (stored) return stored;
  }
  return memoryAccount ?? accountFromEnv();
}

async function saveAccountToken(token: AccountToken): Promise<void> {
  memoryAccount = token;
  if (redis) await redis.set(ACCOUNT_KEY, token);
}

// Used by the initial OAuth callback (authorization_code exchange), as
// opposed to doRefreshAccountToken (refresh_token exchange). Cached
// per-database sessions minted under the old access_token don't need to
// be proactively cleared here — accurateFetch already re-mints a session
// reactively the moment Accurate reports it invalid (looksLikeInvalidSession).
export async function setAccountToken(token: AccountToken): Promise<void> {
  await saveAccountToken(token);
}

async function loadDbSession(dbId: string): Promise<DbSession | null> {
  if (redis) {
    const stored = await redis.get<DbSession>(dbKey(dbId));
    if (stored) return stored;
  }
  return memoryDbSessions.get(dbId) ?? defaultDbSessionFromEnv(dbId);
}

async function saveDbSession(dbId: string, session: DbSession): Promise<void> {
  memoryDbSessions.set(dbId, session);
  if (redis) await redis.set(dbKey(dbId), session);
}

// Single-flighted: several Accurate API calls can fire in parallel
// (e.g. the wizard's Promise.all), so if the token is stale, multiple
// callers can hit refresh at nearly the same instant. Without this,
// each would race to spend the *same* refresh_token — Accurate only
// honors the first, and every other concurrent call dies with
// `invalid_grant` even though the refresh itself had just succeeded.
let inFlightAccountRefresh: Promise<AccountToken> | null = null;

export function refreshAccountToken(): Promise<AccountToken> {
  if (!inFlightAccountRefresh) {
    inFlightAccountRefresh = doRefreshAccountToken().finally(() => {
      inFlightAccountRefresh = null;
    });
  }
  return inFlightAccountRefresh;
}

async function doRefreshAccountToken(): Promise<AccountToken> {
  const current = await loadAccountToken();
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
  const account: AccountToken = { accessToken: token.access_token, refreshToken: token.refresh_token };
  await saveAccountToken(account);
  return account;
}

// Mints (or re-mints) a session for a specific database. Single-flighted
// per dbId for the same reason as the account refresh above.
const inFlightDbSession = new Map<string, Promise<DbSession>>();

export function mintDbSession(dbId: string, accessToken: string): Promise<DbSession> {
  const existing = inFlightDbSession.get(dbId);
  if (existing) return existing;
  const promise = doMintDbSession(dbId, accessToken).finally(() => {
    inFlightDbSession.delete(dbId);
  });
  inFlightDbSession.set(dbId, promise);
  return promise;
}

async function doMintDbSession(dbId: string, accessToken: string): Promise<DbSession> {
  const res = await fetch(`https://account.accurate.id/api/open-db.do?id=${dbId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const db = await res.json() as { s: boolean; session?: string; host?: string; d?: unknown };
  if (!db.s || !db.session || !db.host) {
    throw new Error(`Gagal membuka sesi database Accurate (id=${dbId}): ${JSON.stringify(db)}`);
  }
  const session: DbSession = { session: db.session, host: db.host };
  await saveDbSession(dbId, session);
  return session;
}

// Returns the current session for a database, minting one via
// open-db.do if it isn't cached yet.
export async function getDbSession(dbId: string): Promise<{ account: AccountToken; db: DbSession }> {
  const account = await loadAccountToken();
  let db = await loadDbSession(dbId);
  if (!db) db = await mintDbSession(dbId, account.accessToken);
  return { account, db };
}

// Forces a fresh database session using the current (possibly just
// refreshed) account access token.
export async function refreshDbSession(dbId: string, accessToken: string): Promise<DbSession> {
  return mintDbSession(dbId, accessToken);
}
