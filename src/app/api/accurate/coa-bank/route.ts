import { NextResponse } from "next/server";
import { fetchCOABank } from "@/lib/accurate-api";

export async function GET() {
  try {
    const data = await fetchCOABank();
    // Exclude parent/group accounts (ending in -00)
    const filtered = data.filter((c) => !c.no.endsWith("-00"));
    return NextResponse.json(filtered);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
