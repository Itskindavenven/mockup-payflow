import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { wizardConfigStore, WizardDbConfig } from "@/lib/wizard-config-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ dbId: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dbId } = await params;
  return NextResponse.json(await wizardConfigStore.get(dbId));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ dbId: string }> }
) {
  const session = await getServerSession();
  const canConfigure = session?.role === "admin" || (session?.permissions ?? []).includes("master-data");
  if (!canConfigure) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { dbId } = await params;
  const body = (await req.json()) as WizardDbConfig;
  if (!Array.isArray(body.vendorNos)) {
    return NextResponse.json({ error: "vendorNos must be an array" }, { status: 400 });
  }

  await wizardConfigStore.save(dbId, { bankAccountNo: body.bankAccountNo ?? null, vendorNos: body.vendorNos });
  return NextResponse.json({ ok: true });
}
