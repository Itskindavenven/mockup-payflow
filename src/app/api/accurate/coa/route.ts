import { NextResponse } from "next/server";
import { fetchCOA } from "@/lib/accurate-api";

export async function GET() {
  try {
    const data = await fetchCOA();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
