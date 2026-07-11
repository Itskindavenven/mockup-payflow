import { NextResponse } from "next/server";
import { getServerSession, SESSION_COOKIE } from "@/lib/session";
import { clearAccountToken } from "@/lib/accurate-token-store";

// Logout dari app harus benar-benar memutus koneksi Accurate user itu juga
// (bukan cuma hapus cookie session app) — kalau nggak, token Accurate-nya
// tetap hidup di store per-user (lihat accurate-token-store.ts), jadi pas
// login lagi fetchAccurateDatabases() di /api/app-auth/login masih sukses
// dan user nggak pernah diarahkan ulang ke /api/auth/login walau mereka
// "logout" secara eksplisit.
export async function POST() {
  const session = await getServerSession();
  if (session) await clearAccountToken(session.id);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
