import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { buildTemplateWorkbook } from "@/lib/outstanding-invoice-import";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const buf = buildTemplateWorkbook();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=template-outstanding-hutang-vendor.xlsx",
    },
  });
}
