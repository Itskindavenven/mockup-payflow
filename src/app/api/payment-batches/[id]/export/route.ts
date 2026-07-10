import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { paymentBatchStore } from "@/lib/payment-batch-store";
import { findOutlet } from "@/lib/bni-outlets";
import { buildBniExportWorkbook } from "@/lib/bni-export";

// Generate file siap-import Internet Banking BNI (tahap 4 flow) — real
// P-row/T-row .xlsx per rail, matching docs/references/0. MASTER CMS -
// INHOUSE.xls / KLIRING.xls (root repo). See bni-export.ts for the layout.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const batch = await paymentBatchStore.get(id);
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const outlet = findOutlet(batch.outletCode);
  if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan" }, { status: 400 });

  const selected = batch.items.filter((i) => i.selected);
  if (selected.length === 0) {
    return NextResponse.json({ error: "Tidak ada invoice yang dipilih untuk di-export" }, { status: 400 });
  }

  const result = buildBniExportWorkbook(id, outlet, batch.debetAccountType, selected);
  const now = new Date().toISOString();

  await paymentBatchStore.update(id, {
    status: "file_exported",
    exportedFileName: result.fileName,
    exportedFileContent: result.base64,
    exportedAt: now,
  });

  return NextResponse.json({
    fileName: result.fileName,
    base64: result.base64,
    railsUsed: result.railsUsed,
    unmatchedBankItems: result.unmatchedBankItems.map((i) => ({ id: i.id, vendorName: i.vendorName, bankName: i.bankName })),
  });
}
