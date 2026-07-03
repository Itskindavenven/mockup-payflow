import { NextResponse } from "next/server";
import { fetchAccurateDatabases } from "@/lib/accurate-api";
import { appIdForAccurateDb } from "@/lib/db-alias";

export async function GET() {
  try {
    const data = await fetchAccurateDatabases();
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
