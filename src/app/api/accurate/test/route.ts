import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = "ebb46873-bb6f-4b71-a1f0-a130f5e62d51";
const DB_ID = 2744191;

export async function GET(req: NextRequest) {
  const step = req.nextUrl.searchParams.get("step") ?? "open";

  // Step 1: open-db → get session
  if (step === "open") {
    const res = await fetch(
      `https://account.accurate.id/api/open-db.do?id=${DB_ID}`,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  }

  const session = req.nextUrl.searchParams.get("session");
  if (!session) return NextResponse.json({ error: "session required" }, { status: 400 });

  const HOST = "https://zeus.accurate.id";
  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "X-Session-ID": session,
  };

  // COA Kas/Bank — accountType CASH_BANK, leaf only (bukan grup)
  if (step === "coa-bank") {
    const params = new URLSearchParams({
      "fields": "no,name,accountType",
      "sp.pageSize": "50",
      "filter.accountType.op": "EQUAL",
      "filter.accountType.val": "CASH_BANK",
      "filter.name.op": "CONTAIN",
      "filter.name.val": "bank",
    });
    const res = await fetch(`${HOST}/accurate/api/glaccount/list.do?${params}`, { headers });
    return NextResponse.json(await res.json());
  }

  // COA Beban — accountType EXPENSE
  if (step === "coa-beban") {
    const params = new URLSearchParams({
      "fields": "no,name,accountType",
      "sp.pageSize": "50",
      "filter.accountType.op": "EQUAL",
      "filter.accountType.val": "EXPENSE",
    });
    const res = await fetch(`${HOST}/accurate/api/glaccount/list.do?${params}`, { headers });
    return NextResponse.json(await res.json());
  }

  // Step 3: list vendor
  if (step === "vendor") {
    const res = await fetch(
      `${HOST}/accurate/api/vendor/list.do?fields=id,name,vendorNo,npwpNo&sp.pageSize=20`,
      { headers }
    );
    return NextResponse.json(await res.json());
  }

  return NextResponse.json({ error: "unknown step" }, { status: 400 });
}
