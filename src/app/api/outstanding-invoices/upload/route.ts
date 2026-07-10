import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { parseUploadedWorkbook } from "@/lib/outstanding-invoice-import";
import { outstandingInvoiceStore } from "@/lib/outstanding-invoice-store";

// Import outstanding hutang vendor (tahap 2 flow) — replace-all: setiap
// upload dianggap snapshot baru, bukan tambahan ke data lama (lihat
// outstanding-invoice-store.ts).
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan di request." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { invoices, errors } = parseUploadedWorkbook(buffer);

  if (errors.length > 0) {
    return NextResponse.json({ error: "File tidak valid.", details: errors }, { status: 400 });
  }
  if (invoices.length === 0) {
    return NextResponse.json({ error: "Tidak ada baris valid di file." }, { status: 400 });
  }

  try {
    await outstandingInvoiceStore.replaceAll(invoices, {
      importedBy: { id: session.id, name: session.name },
      fileName: file.name,
      rowCount: invoices.length,
    });
  } catch (e) {
    return NextResponse.json({ error: "Gagal menyimpan data ke database: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rowCount: invoices.length });
}
