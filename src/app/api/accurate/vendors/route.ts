import { NextResponse } from "next/server";
import { fetchVendors } from "@/lib/accurate-api";

export async function GET() {
  try {
    const data = await fetchVendors();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
