import { NextRequest, NextResponse } from "next/server";
import { fetchVendors } from "@/lib/accurate-api";
import { resolveAccurateDbId } from "@/lib/db-alias";

export async function GET(req: NextRequest) {
  const dbId = resolveAccurateDbId(req.nextUrl.searchParams.get("dbId") ?? "db-retail");
  try {
    const data = await fetchVendors(dbId);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
