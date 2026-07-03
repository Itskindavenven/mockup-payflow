import { NextRequest, NextResponse } from "next/server";
import { fetchCOA } from "@/lib/accurate-api";
import { resolveAccurateDbId } from "@/lib/db-alias";

export async function GET(req: NextRequest) {
  const dbId = resolveAccurateDbId(req.nextUrl.searchParams.get("dbId") ?? "db-retail");
  try {
    const data = await fetchCOA(dbId);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
