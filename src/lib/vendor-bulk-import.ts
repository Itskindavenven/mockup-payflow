// Server-only — parses Accurate's own "Daftar Pemasok" (vendor list) report
// export (see docs/daftar_pemasok_balibalirenon_*.xlsx, root repo) for bulk
// vendor creation. Header row isn't fixed-position (a few report-title rows
// come first), so it's located by content ("ID Pemasok") like the BNI
// statement parser.
import * as XLSX from "xlsx";
import { findBankKeyByName, type BankKey } from "@/lib/accurate-api";

export interface VendorImportRow {
  vendorCode: string;
  name: string;
  bankNameRaw: string | null;
  accountNo: string | null;
  bankKey: BankKey | null; // null = bank tidak dikenali, vendor dibuat tanpa rekening
}

export interface VendorImportParseResult {
  rows: VendorImportRow[];
  errors: string[];
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((cell) => String(cell ?? "").trim().toLowerCase() === "id pemasok")) return i;
  }
  throw new Error('Header "ID Pemasok" tidak ditemukan — format file tidak dikenali.');
}

export function parseVendorImportFile(buffer: Buffer): VendorImportParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { rows: [], errors: ["File tidak bisa dibaca — pastikan format .xls/.xlsx yang valid."] };
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], errors: ["File tidak punya sheet."] };
  const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: "" });

  let headerIdx: number;
  try {
    headerIdx = findHeaderRow(raw);
  } catch (e) {
    return { rows: [], errors: [e instanceof Error ? e.message : String(e)] };
  }

  const header = raw[headerIdx].map((c) => String(c ?? "").trim().toLowerCase());
  const idCol = header.indexOf("id pemasok");
  const nameCol = header.indexOf("nama");
  const bankCol = header.indexOf("nama bank rekening bank");
  const accountCol = header.indexOf("no. rekening bank");
  if (idCol === -1 || nameCol === -1) {
    return { rows: [], errors: ['Kolom "ID Pemasok" atau "Nama" tidak ditemukan di header.'] };
  }

  const rows: VendorImportRow[] = [];
  const errors: string[] = [];

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    const vendorCode = String(r[idCol] ?? "").trim();
    const name = String(r[nameCol] ?? "").trim();
    if (!vendorCode && !name) continue; // baris kosong

    if (!name) {
      errors.push(`Baris ${i + 1}: nama vendor kosong (ID: ${vendorCode || "-"}).`);
      continue;
    }

    const bankNameRaw = bankCol !== -1 ? String(r[bankCol] ?? "").trim() : "";
    const accountNo = accountCol !== -1 ? String(r[accountCol] ?? "").trim() : "";
    const hasBankInfo = Boolean(bankNameRaw && accountNo);

    rows.push({
      vendorCode,
      name,
      bankNameRaw: hasBankInfo ? bankNameRaw : null,
      accountNo: hasBankInfo ? accountNo : null,
      bankKey: hasBankInfo ? findBankKeyByName(bankNameRaw) : null,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("Tidak ada baris vendor yang terbaca dari file.");
  }

  return { rows, errors };
}
