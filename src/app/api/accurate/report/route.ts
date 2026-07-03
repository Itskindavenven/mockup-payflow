import { NextRequest, NextResponse } from "next/server";
import { fetchOtherPaymentAdminFees, fetchPurchasePaymentsByVendor } from "@/lib/accurate-api";
import { resolveAccurateDbId } from "@/lib/db-alias";

function toAccurateDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const dbId = resolveAccurateDbId(searchParams.get("dbId") ?? "db-retail");
  if (!from || !to) {
    return NextResponse.json({ error: "Param 'from' dan 'to' (format YYYY-MM-DD) wajib diisi." }, { status: 400 });
  }

  const fromDate = toAccurateDate(from);
  const toDate = toAccurateDate(to);

  try {
    const [adminFees, vendorPayments] = await Promise.all([
      fetchOtherPaymentAdminFees(dbId, fromDate, toDate),
      fetchPurchasePaymentsByVendor(dbId, fromDate, toDate),
    ]);
    return NextResponse.json({ adminFees, vendorPayments });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
