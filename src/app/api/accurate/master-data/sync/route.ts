import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { fetchVendors, fetchAllGlAccounts } from "@/lib/accurate-api";
import { accurateMasterDataStore } from "@/lib/accurate-master-data-store";
import { resolveAccurateDbId } from "@/lib/db-alias";

// Sync manual (tombol "Sync" di /settings/database/[id]) — tarik vendor +
// gl-account terbaru dari Accurate pakai token user yang lagi login, lalu
// replace-all cache lokal. Dipanggil user yang login, bukan cron — jadi
// token yang dipakai selalu token session ini sendiri, nggak butuh konsep
// "service account" terpisah untuk MVP ini.
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const dbId = resolveAccurateDbId(req.nextUrl.searchParams.get("dbId") ?? "db-retail");
  const syncedBy = { id: session.id, name: session.name };

  try {
    const [vendors, glAccounts] = await Promise.all([
      fetchVendors(session.id, dbId),
      fetchAllGlAccounts(session.id, dbId),
    ]);
    const [vendorMeta, glAccountMeta] = await Promise.all([
      accurateMasterDataStore.replaceVendors(dbId, vendors, syncedBy),
      accurateMasterDataStore.replaceGlAccounts(dbId, glAccounts, syncedBy),
    ]);
    return NextResponse.json({ vendors: vendorMeta, glAccounts: glAccountMeta });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const dbId = resolveAccurateDbId(req.nextUrl.searchParams.get("dbId") ?? "db-retail");

  const [vendors, glAccounts] = await Promise.all([
    accurateMasterDataStore.getLastSync(dbId, "vendors"),
    accurateMasterDataStore.getLastSync(dbId, "gl_accounts"),
  ]);
  return NextResponse.json({ vendors, glAccounts });
}
