import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { fetchCOABank } from "@/lib/accurate-api";
import { accurateMasterDataStore } from "@/lib/accurate-master-data-store";
import { resolveAccurateDbId } from "@/lib/db-alias";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const dbId = resolveAccurateDbId(req.nextUrl.searchParams.get("dbId") ?? "db-retail");
  try {
    const cached = await accurateMasterDataStore.listGlAccounts(dbId);
    // Data live sudah difilter CASH_BANK server-side; cache belum (nyimpen
    // semua tipe akun sekaligus), jadi filter accountType di sini kalau
    // sumbernya dari cache.
    const data = cached.length > 0 ? cached.filter((c) => c.accountType === "CASH_BANK") : await fetchCOABank(session.id, dbId);
    // Exclude parent/group accounts (ending in -00)
    const filtered = data.filter((c) => !c.no.endsWith("-00"));
    return NextResponse.json(filtered);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
