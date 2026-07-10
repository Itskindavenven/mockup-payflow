import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/user-store";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import type { SessionUser } from "@/lib/auth-types";
import { fetchAccurateDatabases } from "@/lib/accurate-api";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email?.trim() || !body.password?.trim()) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }

  const user = await userStore.findByEmail(body.email);
  if (!user || !(await userStore.verifyPassword(user, body.password))) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  const sessionUser: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  };

  const token = await createSessionToken(sessionUser);

  // Proaktif cek/refresh token OAuth Accurate saat login, bukan nunggu user
  // buka halaman yang butuh Accurate (sebelumnya token cuma di-refresh reaktif
  // saat sebuah API call gagal). fetchAccurateDatabases() sendiri sudah retry
  // sekali via refreshAccountToken() kalau access_token basi — jadi login ini
  // otomatis "menghidupkan" token yang basi selama refresh_token masih valid.
  // Kalau gagal (refresh_token juga sudah invalid / Accurate down), jangan
  // gagalkan login — user tetap harus bisa masuk ke app, cuma dikasih tahu.
  let accurateStatus: "ok" | "error" = "ok";
  let accurateError: string | undefined;
  try {
    await fetchAccurateDatabases();
  } catch (e) {
    accurateStatus = "error";
    accurateError = e instanceof Error ? e.message : String(e);
  }

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, role: user.role },
    accurateStatus,
    accurateError,
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
