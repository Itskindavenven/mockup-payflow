import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { fetchCOA, AccurateCOA } from "@/lib/accurate-api";
import { accurateMasterDataStore } from "@/lib/accurate-master-data-store";
import { resolveAccurateDbId } from "@/lib/db-alias";

const EXPENSE_ACCOUNT_TYPES = new Set(["EXPENSE", "OTHER_EXPENSE"]);

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const dbId = resolveAccurateDbId(req.nextUrl.searchParams.get("dbId") ?? "db-retail");
  try {
    const cached = await accurateMasterDataStore.listGlAccounts(dbId);
    if (cached.length > 0) {
      const filtered = cached.filter((c: AccurateCOA) => EXPENSE_ACCOUNT_TYPES.has(c.accountType));
      return NextResponse.json(filtered);
    }
    const data = await fetchCOA(session.id, dbId);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
