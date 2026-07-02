import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { saveVendor, BANK_MASTER, BankKey } from "@/lib/accurate-api";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    name?: string;
    bankName?: string;
    accountName?: string;
    accountNo?: string;
  };

  if (!body.name || !body.bankName || !body.accountName || !body.accountNo) {
    return NextResponse.json({ error: "Semua field wajib diisi." }, { status: 400 });
  }

  const bankKey = body.bankName.toUpperCase() as BankKey;
  if (!(bankKey in BANK_MASTER)) {
    return NextResponse.json({ error: `Bank "${body.bankName}" tidak dikenali.` }, { status: 400 });
  }

  try {
    const result = await saveVendor({
      name: body.name,
      bank: bankKey,
      accountName: body.accountName,
      accountNo: body.accountNo,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
