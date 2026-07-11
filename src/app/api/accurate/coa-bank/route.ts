import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { fetchCOABank } from "@/lib/accurate-api";
import { resolveAccurateDbId } from "@/lib/db-alias";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const dbId = resolveAccurateDbId(req.nextUrl.searchParams.get("dbId") ?? "db-retail");
  try {
    const data = await fetchCOABank(session.id, dbId);
    // Exclude parent/group accounts (ending in -00)
    const filtered = data.filter((c) => !c.no.endsWith("-00"));
    return NextResponse.json(filtered);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
