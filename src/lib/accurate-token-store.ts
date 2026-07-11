// Server-only — persists live Accurate OAuth tokens/sessions so they
// survive across serverless invocations (env vars are baked at deploy time
// and can't be updated at runtime, so a plain env-var-only setup goes stale
// the moment Accurate rotates the token).
//
// Model: MULTI-TENANT — every app user (see src/lib/user-store.ts) has
// their OWN Accurate OAuth access/refresh token pair and their own set of
// per-database sessions, keyed by app userId. Before this, the token was
// a single account-level value shared by every app user, which meant any
// employee logged into the app could act as whichever Accurate business
// someone else had last connected — not an acceptable security model once
// there's more than one person using the app. Everything below is keyed
// by `userId` (the app session's `SessionUser.id`, see src/lib/session.ts)
// so one user's Accurate connection is invisible to and unaffected by
// another's.
//
// Storage: Upstash Redis (via Vercel's Redis marketplace integration,
// which injects KV_REST_API_URL / KV_REST_API_TOKEN, or plain
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). If neither is
// configured (e.g. local dev), falls back to in-memory — refresh still
// works within a single process, it just won't persist across restarts.

import { Redis } from "@upstash/redis";

export interface AccountToken {
  accessToken: string;
  refreshToken: string;
}

export interface DbSession {
  session: string;
  host: string;
}

const accountKey = (userId: string) => `accurate:account:${userId}`;
const dbKey = (userId: string, dbId: string) => `accurate:db:${userId}:${dbId}`;
// Redis SET tracking every dbId a user has minted a session for — the only
// way clearAccountToken() can find and delete ALL of a user's per-database
// session keys later (there's no KEYS-scan on Upstash's REST client, and
// nothing else records which databases a given user has touched).
const dbIndexKey = (userId: string) => `accurate:db-index:${userId}`;

function makeRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = makeRedis();

// Boolean-only diagnostic (never expose the URL/token themselves) — lets
// us tell "Redis isn't configured in this environment, so per-instance
// memory is the only store and will drift across Vercel instances" apart
// from "Redis is configured but something else is wrong".
export function isRedisConfigured(): boolean {
  return redis !== null;
}

// In-memory fallback so refreshes within the same warm process are still
// picked up even without Redis configured (e.g. local `next dev`).
const memoryAccounts = new Map<string, AccountToken>();
const memoryDbSessions = new Map<string, DbSession>();

// IMPORTANT: once Redis is configured it is the single source of truth —
// do NOT fall back to the in-memory map when Redis says "nothing here".
// This function used to fall through to `memoryAccounts` whenever Redis
// returned null, which meant a warm Vercel instance that had cached an
// old token in its own process memory kept serving it even after that
// token was deleted from Redis by a real logout/disconnect on a
// *different* instance — so "logout" appeared to do nothing. The memory
// map only exists as a fallback for when Redis isn't configured at all
// (e.g. local dev without Upstash set up).
export async function loadAccountToken(userId: string): Promise<AccountToken | null> {
  if (redis) return (await redis.get<AccountToken>(accountKey(userId))) ?? null;
  return memoryAccounts.get(userId) ?? null;
}

async function saveAccountToken(userId: string, token: AccountToken): Promise<void> {
  memoryAccounts.set(userId, token);
  if (redis) await redis.set(accountKey(userId), token);
}

// Used by the initial OAuth callback (authorization_code exchange), as
// opposed to doRefreshAccountToken (refresh_token exchange). Cached
// per-database sessions minted under the old access_token don't need to
// be proactively cleared here — accurateFetch already re-mints a session
// reactively the moment Accurate reports it invalid (looksLikeInvalidSession).
export async function setAccountToken(userId: string, token: AccountToken): Promise<void> {
  await saveAccountToken(userId, token);
}

// "Putuskan Koneksi" (Settings page) + app logout — wipes this user's
// stored token/sessions, forcing a fresh OAuth login before any Accurate
// call works again for them. Scoped to `userId` only. Uses `dbIndexKey`
// (see above) to find every per-database session key that needs
// deleting, since there's no other registry of which databases this user
// has minted sessions for.
export async function clearAccountToken(userId: string): Promise<void> {
  memoryAccounts.delete(userId);
  for (const k of Array.from(memoryDbSessions.keys())) {
    if (k.startsWith(`${userId} `)) memoryDbSessions.delete(k);
  }
  if (redis) {
    const dbIds = await redis.smembers(dbIndexKey(userId));
    const keys = [accountKey(userId), dbIndexKey(userId), ...dbIds.map((dbId) => dbKey(userId, dbId))];
    await redis.del(...keys);
  }
}

function memDbKey(userId: string, dbId: string): string {
  return `${userId} ${dbId}`;
}

// Same "Redis is the sole source of truth once configured" rule as
// loadAccountToken above.
async function loadDbSession(userId: string, dbId: string): Promise<DbSession | null> {
  if (redis) return (await redis.get<DbSession>(dbKey(userId, dbId))) ?? null;
  return memoryDbSessions.get(memDbKey(userId, dbId)) ?? null;
}

async function saveDbSession(userId: string, dbId: string, session: DbSession): Promise<void> {
  memoryDbSessions.set(memDbKey(userId, dbId), session);
  if (redis) {
    await redis.set(dbKey(userId, dbId), session);
    await redis.sadd(dbIndexKey(userId), dbId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Distributed mutex on top of Redis SET NX — the in-process in-flight
// promise caches below only dedupe concurrent calls *within one process*,
// which is all `next dev` ever is, but on Vercel each concurrent request
// can land on a completely separate serverless instance with its own
// memory. Several parallel page requests for the same user (e.g. Settings
// loading COA/vendor/kas-bank at once) can each spin up their own
// instance, all miss the cached session/token, and all hit Accurate at
// once — since refresh_token is single-use, only the first succeeds and
// the rest die with `invalid_grant`, and open-db.do sometimes rejects
// concurrent opens for the same account with "Data Usaha tidak tepat".
// Losing this race in prod (confirmed via parallel curl requests against
// Vercel) is what the in-memory-only guard could never catch locally.
async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  if (!redis) return true; // no cross-instance concern without Redis — in-memory guard is enough
  const result = await redis.set(key, "1", { nx: true, ex: ttlSeconds });
  return result === "OK";
}

async function releaseLock(key: string): Promise<void> {
  if (redis) await redis.del(key);
}

// Single-flighted in-process, and lock-guarded cross-process (see above).
// Keyed per userId since each user's refresh is fully independent.
const inFlightAccountRefresh = new Map<string, Promise<AccountToken>>();

export function refreshAccountToken(userId: string): Promise<AccountToken> {
  const existing = inFlightAccountRefresh.get(userId);
  if (existing) return existing;
  const promise = refreshAccountTokenLocked(userId).finally(() => {
    inFlightAccountRefresh.delete(userId);
  });
  inFlightAccountRefresh.set(userId, promise);
  return promise;
}

const accountRefreshLockKey = (userId: string) => `accurate:account:${userId}:refresh-lock`;

async function refreshAccountTokenLocked(userId: string): Promise<AccountToken> {
  const lockKey = accountRefreshLockKey(userId);
  if (await acquireLock(lockKey, 15)) {
    try {
      return await doRefreshAccountToken(userId);
    } finally {
      await releaseLock(lockKey);
    }
  }
  // Another instance is refreshing this user's token right now — poll for
  // what it saves instead of racing it with our own (single-use) refresh_token.
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    if (redis) {
      const stored = await redis.get<AccountToken>(accountKey(userId));
      if (stored) return stored;
    }
  }
  // Gave up waiting (~6s) — try ourselves rather than hang forever.
  return doRefreshAccountToken(userId);
}

async function doRefreshAccountToken(userId: string): Promise<AccountToken> {
  const current = await loadAccountToken(userId);
  if (!current) {
    throw new Error("Belum ada koneksi Accurate untuk user ini — silakan hubungkan akun Accurate dulu.");
  }
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
  await saveAccountToken(userId, account);
  return account;
}

// Mints (or re-mints) a session for a specific database, for a specific
// user. Single-flighted per (userId, dbId) in-process, and lock-guarded
// cross-process (see the comment above acquireLock) — same open-db.do
// concurrency problem as the account refresh.
const inFlightDbSession = new Map<string, Promise<DbSession>>();

export function mintDbSession(userId: string, dbId: string, accessToken: string): Promise<DbSession> {
  const flightKey = memDbKey(userId, dbId);
  const existing = inFlightDbSession.get(flightKey);
  if (existing) return existing;
  const promise = mintDbSessionLocked(userId, dbId, accessToken).finally(() => {
    inFlightDbSession.delete(flightKey);
  });
  inFlightDbSession.set(flightKey, promise);
  return promise;
}

async function mintDbSessionLocked(userId: string, dbId: string, accessToken: string): Promise<DbSession> {
  const lockKey = `accurate:db:${userId}:${dbId}:mint-lock`;
  if (await acquireLock(lockKey, 15)) {
    try {
      return await doMintDbSession(userId, dbId, accessToken);
    } finally {
      await releaseLock(lockKey);
    }
  }
  // Another instance is minting this database's session right now — poll
  // for it instead of also calling open-db.do concurrently.
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    const stored = await loadDbSession(userId, dbId);
    if (stored) return stored;
  }
  return doMintDbSession(userId, dbId, accessToken);
}

async function doMintDbSession(userId: string, dbId: string, accessToken: string): Promise<DbSession> {
  const res = await fetch(`https://account.accurate.id/api/open-db.do?id=${dbId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const db = await res.json() as { s: boolean; session?: string; host?: string; d?: unknown };
  if (!db.s || !db.session || !db.host) {
    throw new Error(`Gagal membuka sesi database Accurate (id=${dbId}): ${JSON.stringify(db)}`);
  }
  const session: DbSession = { session: db.session, host: db.host };
  await saveDbSession(userId, dbId, session);
  return session;
}

// Returns the current session for a user+database, minting one via
// open-db.do if it isn't cached yet. Throws if this user has never
// connected an Accurate account.
export async function getDbSession(userId: string, dbId: string): Promise<{ account: AccountToken; db: DbSession }> {
  const account = await loadAccountToken(userId);
  if (!account) {
    throw new Error("Akun Accurate belum terhubung untuk user ini — silakan connect di halaman Settings.");
  }
  let db = await loadDbSession(userId, dbId);
  if (!db) db = await mintDbSession(userId, dbId, account.accessToken);
  return { account, db };
}

// Forces a fresh database session using the current (possibly just
// refreshed) account access token.
export async function refreshDbSession(userId: string, dbId: string, accessToken: string): Promise<DbSession> {
  return mintDbSession(userId, dbId, accessToken);
}
