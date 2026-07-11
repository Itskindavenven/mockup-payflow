import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { pushOtherPayment, OtherPaymentDetail } from "@/lib/accurate-api";
import { resolveAccurateDbId } from "@/lib/db-alias";

interface PushBody {
  sync_action: "other-payment" | "purchase-payment";
  bankNo: string;
  payee: string;
  transDate: string; // dd/MM/yyyy
  detailAccount: OtherPaymentDetail[];
  branchName?: string;
  description?: string;
  dbId?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: PushBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.bankNo || !body.payee || !body.transDate || !body.detailAccount?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (body.sync_action !== "other-payment") {
    return NextResponse.json(
      { error: "purchase-payment not implemented yet" },
      { status: 501 }
    );
  }

  try {
    const result = await pushOtherPayment(session.id, resolveAccurateDbId(body.dbId ?? "db-retail"), {
      bankNo: body.bankNo,
      payee: body.payee,
      transDate: body.transDate,
      detailAccount: body.detailAccount,
      branchName: body.branchName,
      description: body.description,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
