import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { outstandingInvoiceStore } from "@/lib/outstanding-invoice-store";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [invoices, lastImport] = await Promise.all([
    outstandingInvoiceStore.list(),
    outstandingInvoiceStore.lastImport(),
  ]);
  return NextResponse.json({ invoices, lastImport });
}
