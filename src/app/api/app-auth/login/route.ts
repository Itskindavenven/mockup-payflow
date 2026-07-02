import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/user-store";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import type { SessionUser } from "@/lib/auth-types";

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

  const user = userStore.findByEmail(body.email);
  if (!user || user.password !== body.password) {
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

  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
