import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { userStore } from "@/lib/user-store";
import type { Permission } from "@/lib/auth-types";

export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = userStore.getAll().map(({ password: _p, ...u }) => u);
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    name?: string;
    email?: string;
    password?: string;
    permissions?: Permission[];
  };

  if (!body.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
    return NextResponse.json({ error: "Nama, email, dan password wajib diisi." }, { status: 400 });
  }

  const id = `emp-${Date.now()}`;
  const result = userStore.create({
    id,
    name: body.name.trim(),
    email: body.email.trim(),
    password: body.password,
    role: "employee",
    permissions: body.permissions ?? ["transaksi"],
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, id });
}
