import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { clearAccountToken } from "@/lib/accurate-token-store";

// "Putuskan Koneksi" di Settings — sebelumnya tombol ini cuma toast
// simulasi, nggak beneran hapus apa-apa. Account-level (dibagi semua
// user/database), jadi admin-only.
export async function POST() {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await clearAccountToken();
  return NextResponse.json({ ok: true });
}
