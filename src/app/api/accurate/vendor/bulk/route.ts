import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { parseVendorImportFile } from "@/lib/vendor-bulk-import";
import { saveVendor } from "@/lib/accurate-api";
import { resolveAccurateDbId } from "@/lib/db-alias";

export interface BulkVendorResultRow {
  name: string;
  status: "created" | "created_no_bank" | "failed";
  detail?: string;
}

// Import vendor massal dari file "Daftar Pemasok" (report export Accurate
// sendiri — lihat docs/daftar_pemasok_*.xlsx di root repo dan
// vendor-bulk-import.ts). Dijalankan sequential (bukan Promise.all) —
// bikin 100+ vendor sekaligus paralel berisiko kena rate limit Accurate,
// dan ini operasi tulis nyata ke akun Accurate user, bukan sekadar baca.
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const dbId = form.get("dbId");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan di request." }, { status: 400 });
  }
  if (typeof dbId !== "string" || !dbId) {
    return NextResponse.json({ error: "dbId wajib diisi." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, errors } = parseVendorImportFile(buffer);
  if (errors.length > 0 && rows.length === 0) {
    return NextResponse.json({ error: "File tidak bisa diproses.", details: errors }, { status: 400 });
  }

  const resolvedDbId = resolveAccurateDbId(dbId);
  const results: BulkVendorResultRow[] = [];

  for (const row of rows) {
    try {
      const result = await saveVendor(session.id, resolvedDbId, {
        name: row.name,
        bank: row.bankKey ?? undefined,
        accountName: row.name,
        accountNo: row.accountNo ?? undefined,
      });
      if (!result.s) {
        results.push({ name: row.name, status: "failed", detail: JSON.stringify(result.d) });
        continue;
      }
      results.push({
        name: row.name,
        status: row.bankKey ? "created" : "created_no_bank",
        detail: row.bankNameRaw && !row.bankKey ? `Bank "${row.bankNameRaw}" belum dikenal sistem — rekening belum ditambahkan.` : undefined,
      });
    } catch (e) {
      results.push({ name: row.name, status: "failed", detail: e instanceof Error ? e.message : String(e) });
    }
  }

  const summary = {
    total: results.length,
    created: results.filter((r) => r.status === "created").length,
    createdNoBank: results.filter((r) => r.status === "created_no_bank").length,
    failed: results.filter((r) => r.status === "failed").length,
  };

  return NextResponse.json({ summary, results, parseWarnings: errors });
}
