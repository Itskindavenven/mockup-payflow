import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { paymentBatchStore, PaymentBatchRecord } from "@/lib/payment-batch-store";
import { outstandingInvoiceStore } from "@/lib/outstanding-invoice-store";
import { findOutlet } from "@/lib/bni-outlets";
import type { BniAccountType } from "@/lib/bni-outlets";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await paymentBatchStore.list());
}

// Membuat batch baru — scoped ke satu outlet + satu Rek. Debet-nya (satu
// file BNI Direct = satu P-row = satu rekening sumber, lihat bni-outlets.ts
// / bni-export.ts). Invoice-nya ditarik dari pool outstanding hutang yang
// terakhir di-upload lewat /api/outstanding-invoices/upload.
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { outletCode?: string; debetAccountType?: BniAccountType };
  if (!body.outletCode || !body.debetAccountType) {
    return NextResponse.json({ error: "outletCode dan debetAccountType wajib diisi" }, { status: 400 });
  }
  const outlet = findOutlet(body.outletCode);
  if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan" }, { status: 400 });

  const allInvoices = await outstandingInvoiceStore.list();
  const items = allInvoices.filter((inv) => inv.sourceOutletCode === body.outletCode);

  const now = new Date().toISOString();
  const record: PaymentBatchRecord = {
    id: `pb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    createdBy: { id: session.id, name: session.name },
    status: "draft",
    outletCode: outlet.code,
    debetAccountType: body.debetAccountType,
    items: items.map((inv) => ({ ...inv, selected: false })),
    exportedFileName: null,
    exportedFileContent: null,
    exportedAt: null,
    releasedAt: null,
    apSessionId: null,
  };

  await paymentBatchStore.create(record);
  return NextResponse.json(record);
}
