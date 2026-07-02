import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { apSessionStore, ApSessionRecord } from "@/lib/ap-session-store";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(apSessionStore.list());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Omit<ApSessionRecord, "id" | "createdAt" | "updatedAt" | "createdBy" | "status"> & {
    status?: ApSessionRecord["status"];
  };

  const now = new Date().toISOString();
  const createdByIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "Unknown";
  const record: ApSessionRecord = {
    id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    createdBy: { id: session.id, name: session.name },
    createdByEmail: session.email,
    createdByIp,
    database: body.database,
    kasBank: body.kasBank,
    branchName: body.branchName ?? null,
    selectedVendorCodes: body.selectedVendorCodes ?? [],
    fileName: body.fileName,
    groups: body.groups ?? [],
    pushedIds: body.pushedIds ?? [],
    resolvedIds: body.resolvedIds ?? [],
    accurateJournalNos: body.accurateJournalNos ?? {},
    status: body.status ?? "draft",
  };

  apSessionStore.create(record);
  return NextResponse.json(record);
}
