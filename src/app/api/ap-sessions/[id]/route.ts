import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { apSessionStore, ApSessionRecord } from "@/lib/ap-session-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const record = apSessionStore.get(id);
  if (!record) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json(record);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Partial<Omit<ApSessionRecord, "id" | "createdAt" | "createdBy">>;

  const ok = apSessionStore.update(id, body);
  if (!ok) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
