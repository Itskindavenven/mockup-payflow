import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { fetchAccurateDatabases } from "@/lib/accurate-api";
import { appIdForAccurateDb } from "@/lib/db-alias";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const data = await fetchAccurateDatabases(session.id);
    return NextResponse.json(
      data.map((d) => ({
        id: appIdForAccurateDb(String(d.id)),
        name: d.alias,
        dbCode: `RSP-${d.id}`,
        expired: d.expired,
      }))
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
