import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { paymentBatchStore, PaymentBatchRecord } from "@/lib/payment-batch-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const record = await paymentBatchStore.get(id);
  if (!record) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  return NextResponse.json(record);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Partial<Omit<PaymentBatchRecord, "id" | "createdAt" | "createdBy">>;

  const ok = await paymentBatchStore.update(id, body);
  if (!ok) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
