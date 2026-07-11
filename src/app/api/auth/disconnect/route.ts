import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { clearAccountToken } from "@/lib/accurate-token-store";

// "Putuskan Koneksi" di Settings — sebelumnya tombol ini cuma toast
// simulasi, nggak beneran hapus apa-apa. Sekarang per-user (setiap app
// user punya koneksi Accurate sendiri, lihat accurate-token-store.ts) —
// jadi cukup login, tidak perlu admin, karena cuma bisa memutus koneksi
// milik diri sendiri.
export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await clearAccountToken(session.id);
  return NextResponse.json({ ok: true });
}
