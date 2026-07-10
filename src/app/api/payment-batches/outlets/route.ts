import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { outstandingInvoiceStore } from "@/lib/outstanding-invoice-store";
import { findOutlet } from "@/lib/bni-outlets";

// Outlet mana saja yang punya outstanding hutang untuk dikurasi, dipakai
// buat step pertama bikin batch pembayaran (pilih outlet -> pilih Rek. Debet
// -> baru kurasi invoice-nya, karena satu batch = satu outlet).
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoices = await outstandingInvoiceStore.list();
  const counts = new Map<string, { count: number; total: number }>();
  for (const inv of invoices) {
    const c = counts.get(inv.sourceOutletCode) ?? { count: 0, total: 0 };
    c.count += 1;
    c.total += inv.amount;
    counts.set(inv.sourceOutletCode, c);
  }

  const result = Array.from(counts.entries())
    .map(([code, c]) => {
      const outlet = findOutlet(code);
      return outlet ? { code, name: outlet.name, invoiceCount: c.count, totalAmount: c.total } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json(result);
}
