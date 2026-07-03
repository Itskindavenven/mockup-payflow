// Server-only. Existing stored data (ap-sessions.json, wizard-config.json)
// references the original database as the stable id "db-retail", from
// back when only one database was wired up. Newly-discovered databases
// (from fetchAccurateDatabases) use their real Accurate numeric id
// directly as the app-level id. This resolves either shape to the real
// Accurate database id needed for open-db.do.
const LEGACY_ALIASES: Record<string, string> = {
  "db-retail": process.env.ACCURATE_DB_ID!,
};

export function resolveAccurateDbId(appId: string): string {
  return LEGACY_ALIASES[appId] ?? appId;
}

export function appIdForAccurateDb(accurateDbId: string): string {
  return accurateDbId === process.env.ACCURATE_DB_ID ? "db-retail" : accurateDbId;
}
