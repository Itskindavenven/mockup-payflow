import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { parseBniStatement } from "@/lib/bni-statement-parser";

// Parse e-statement BNI beneran (bukan simulasi) — dipanggil dari step
// Upload di TransactionWizard. Lihat bni-statement-parser.ts untuk detail
// format yang di-handle (docs/sample BNI Upload.xls).
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan di request." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { transactions, errors } = parseBniStatement(buffer);

  if (errors.length > 0 && transactions.length === 0) {
    return NextResponse.json({ error: "File tidak bisa diproses.", details: errors }, { status: 400 });
  }

  return NextResponse.json({ transactions, warnings: errors });
}
