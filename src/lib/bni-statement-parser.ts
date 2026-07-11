// Server-only — parses a real BNI e-statement export (.xls/.xlsx) into
// RawTransaction[]. Previously this step was entirely simulated (upload
// just faked a delay and the app always used the hardcoded RAW_TRANSACTIONS
// mock regardless of the file — see docs/PRD.md §8 "Upload XLS — Simulasi").
//
// The export (see docs/sample BNI Upload.xls, sheet transaction_history_c08)
// has ~11 rows of decorative header/account-summary junk before the real
// column headers, so this locates the header row by content ("Journal No.")
// rather than assuming a fixed row number — more robust to minor export
// variations (extra/missing summary rows) than a hardcoded offset.
import * as XLSX from "xlsx";
import type { RawTransaction } from "@/lib/mock-data";

const REQUIRED_HEADERS = ["No.", "Post Date", "Branch", "Journal No.", "Description", "Amount", "Db/Cr", "Balance"] as const;
type HeaderName = (typeof REQUIRED_HEADERS)[number];

function normalizeHeader(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.some((cell) => normalizeHeader(cell) === "journal no.")) return i;
  }
  throw new Error('Header "Journal No." tidak ditemukan di file — format e-statement tidak dikenali.');
}

function buildColumnMap(headerRow: unknown[]): Record<HeaderName, number> {
  const map = {} as Record<HeaderName, number>;
  for (const name of REQUIRED_HEADERS) {
    const idx = headerRow.findIndex((cell) => normalizeHeader(cell) === name.toLowerCase());
    if (idx === -1) throw new Error(`Kolom "${name}" tidak ditemukan di header file.`);
    map[name] = idx;
  }
  return map;
}

function excelSerialToDateTime(value: unknown): string {
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return String(value);
    const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
    return `${d.y}-${pad(d.m)}-${pad(d.d)} ${pad(d.H)}:${pad(d.M)}:${pad(d.S)}`;
  }
  // Sudah string tanggal (mis. "01/04/2026 03.07.25") — normalisasi minimal.
  const str = String(value ?? "").trim();
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}:${m[6]}`;
  return str;
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  return Number(cleaned) || 0;
}

export interface StatementParseResult {
  transactions: RawTransaction[];
  errors: string[];
}

export function parseBniStatement(buffer: Buffer): StatementParseResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { transactions: [], errors: ["File tidak bisa dibaca — pastikan format .xls/.xlsx yang valid."] };
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { transactions: [], errors: ["File tidak punya sheet."] };
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: "" });

  let headerIdx: number;
  let colMap: Record<HeaderName, number>;
  try {
    headerIdx = findHeaderRow(rows);
    colMap = buildColumnMap(rows[headerIdx]);
  } catch (e) {
    return { transactions: [], errors: [e instanceof Error ? e.message : String(e)] };
  }

  const errors: string[] = [];
  const transactions: RawTransaction[] = [];
  let fallbackNo = 1;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const journalNo = String(row[colMap["Journal No."]] ?? "").trim();
    const description = String(row[colMap["Description"]] ?? "").trim();
    // Baris kosong (di antara data atau di akhir file) -> berhenti/skip,
    // bukan error, karena export BNI sering nyisain baris kosong trailing.
    if (!journalNo && !description) continue;

    const dbCrRaw = String(row[colMap["Db/Cr"]] ?? "").trim().toUpperCase();
    if (dbCrRaw !== "D" && dbCrRaw !== "C") {
      errors.push(`Baris ${i + 1}: kolom Db/Cr bukan "D" atau "C" (dapat "${dbCrRaw}").`);
      continue;
    }

    const noRaw = row[colMap["No."]];
    const no = typeof noRaw === "number" ? noRaw : Number(noRaw) || fallbackNo;
    fallbackNo = no + 1;

    transactions.push({
      no,
      post_date: excelSerialToDateTime(row[colMap["Post Date"]]),
      branch: String(row[colMap["Branch"]] ?? "").trim(),
      journal_no: journalNo,
      description_raw: description,
      amount: parseAmount(row[colMap["Amount"]]),
      db_cr: dbCrRaw as "D" | "C",
      balance: parseAmount(row[colMap["Balance"]]),
    });
  }

  if (transactions.length === 0 && errors.length === 0) {
    errors.push("Tidak ada baris transaksi yang terbaca dari file.");
  }

  return { transactions, errors };
}
