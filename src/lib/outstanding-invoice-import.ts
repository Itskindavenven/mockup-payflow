// Server-only — template builder + parser for the outstanding-hutang-vendor
// upload (tahap 1-2 flow). Column format is OUR OWN design (no real
// reference file existed for this — see docs/PRD.md §4.2) — download the
// template from /api/outstanding-invoices/template, fill it in, upload via
// /api/outstanding-invoices/upload. Adjust COLUMNS below if the real format
// finance actually uses turns out to differ.
import * as XLSX from "xlsx";
import type { OutstandingInvoice } from "@/lib/payment-batch-data";
import { findOutlet } from "@/lib/bni-outlets";

export const TEMPLATE_HEADERS = [
  "Kode Outlet",
  "Kode Vendor",
  "Nama Vendor",
  "No. Invoice",
  "Tanggal Invoice (YYYY-MM-DD)",
  "Jatuh Tempo (YYYY-MM-DD)",
  "Nominal",
  "Nama Bank Tujuan",
  "No. Rekening Tujuan",
  "Nama Pemilik Rekening",
  "Keterangan",
] as const;

export function buildTemplateWorkbook(): Buffer {
  const rows: (string | number)[][] = [
    [...TEMPLATE_HEADERS],
    // Baris contoh — hapus sebelum upload beneran, kode outlet harus cocok
    // dengan yang ada di Daftar Rekening BNI Direct (lihat kolom "Kode").
    ["TRN", "V-001", "PT Sumber Makmur Jaya", "SMJ-4521", "2026-06-15", "2026-07-15", 12500000, "BCA", "1234100200", "PT SUMBER MAKMUR JAYA", "Pelunasan Inv/2026/04/14/SMJ-4521"],
  ];
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, sheet, "Outstanding Hutang");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export interface ParseResult {
  invoices: OutstandingInvoice[];
  errors: string[];
}

function excelDateToIso(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    return null;
  }
  if (typeof value === "number") {
    // Excel serial date -> ISO
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return null;
}

export function parseUploadedWorkbook(buffer: Buffer): ParseResult {
  const errors: string[] = [];
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { invoices: [], errors: ["File tidak bisa dibaca — pastikan format .xlsx yang valid."] };
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { invoices: [], errors: ["File tidak punya sheet."] };
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });

  if (rows.length === 0) return { invoices: [], errors: ["File tidak punya baris data."] };

  const invoices: OutstandingInvoice[] = [];
  rows.forEach((row, idx) => {
    const rowNo = idx + 2; // +1 header, +1 1-indexed
    const outletCode = String(row["Kode Outlet"] ?? "").trim();
    const vendorCode = String(row["Kode Vendor"] ?? "").trim();
    const vendorName = String(row["Nama Vendor"] ?? "").trim();
    const invoiceNo = String(row["No. Invoice"] ?? "").trim();
    const invoiceDate = excelDateToIso(row["Tanggal Invoice (YYYY-MM-DD)"]);
    const dueDate = excelDateToIso(row["Jatuh Tempo (YYYY-MM-DD)"]);
    const amountRaw = row["Nominal"];
    const amount = typeof amountRaw === "number" ? amountRaw : Number(String(amountRaw).replace(/[^\d.-]/g, ""));
    const bankName = String(row["Nama Bank Tujuan"] ?? "").trim();
    const bankAccountNo = String(row["No. Rekening Tujuan"] ?? "").trim();
    const bankAccountName = String(row["Nama Pemilik Rekening"] ?? "").trim();
    const description = String(row["Keterangan"] ?? "").trim();

    if (!outletCode) { errors.push(`Baris ${rowNo}: Kode Outlet kosong.`); return; }
    if (!findOutlet(outletCode)) { errors.push(`Baris ${rowNo}: Kode Outlet "${outletCode}" tidak dikenali.`); return; }
    if (!vendorName) { errors.push(`Baris ${rowNo}: Nama Vendor kosong.`); return; }
    if (!invoiceNo) { errors.push(`Baris ${rowNo}: No. Invoice kosong.`); return; }
    if (!invoiceDate) { errors.push(`Baris ${rowNo}: Tanggal Invoice tidak valid (format YYYY-MM-DD).`); return; }
    if (!dueDate) { errors.push(`Baris ${rowNo}: Jatuh Tempo tidak valid (format YYYY-MM-DD).`); return; }
    if (!amount || amount <= 0 || Number.isNaN(amount)) { errors.push(`Baris ${rowNo}: Nominal tidak valid.`); return; }
    if (!bankName) { errors.push(`Baris ${rowNo}: Nama Bank Tujuan kosong.`); return; }
    if (!bankAccountNo) { errors.push(`Baris ${rowNo}: No. Rekening Tujuan kosong.`); return; }
    if (!bankAccountName) { errors.push(`Baris ${rowNo}: Nama Pemilik Rekening kosong.`); return; }

    invoices.push({
      id: `oi-${Date.now()}-${idx}`,
      sourceOutletCode: outletCode,
      vendorCode: vendorCode || "-",
      vendorName,
      invoiceNo,
      invoiceDate,
      dueDate,
      amount,
      bankName,
      bankAccountNo,
      bankAccountName,
      description,
    });
  });

  return { invoices, errors };
}
