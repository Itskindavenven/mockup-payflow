import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { userStore } from "@/lib/user-store";
import type { Permission } from "@/lib/auth-types";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = userStore.findById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "admin") {
    return NextResponse.json({ error: "Cannot modify admin permissions" }, { status: 400 });
  }

  const body = await req.json() as { permissions?: Permission[] };
  if (!Array.isArray(body.permissions)) {
    return NextResponse.json({ error: "permissions must be an array" }, { status: 400 });
  }

  userStore.update(id, { permissions: body.permissions });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = userStore.findById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role === "admin") {
    return NextResponse.json({ error: "Cannot delete admin" }, { status: 400 });
  }

  userStore.delete(id);
  return NextResponse.json({ ok: true });
}
