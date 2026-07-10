// Server-only — never import in client components
//
// Pool of outstanding hutang vendor (tahap 1-2 flow: siapkan file -> import
// ke sistem). Replaces the old hardcoded MOCK_OUTSTANDING_INVOICES — now a
// real (if still simple) import: user uploads an .xlsx built from
// /api/outstanding-invoices/template, we parse+validate it, and the whole
// pool is REPLACED (this mirrors how an AP aging export actually works —
// each upload is a fresh full snapshot, not an incremental add).
import fs from "fs";
import path from "path";
import type { OutstandingInvoice } from "@/lib/payment-batch-data";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { MOCK_OUTSTANDING_INVOICES } from "@/lib/payment-batch-data";

export interface OutstandingInvoiceImportMeta {
  importedAt: string;
  importedBy: { id: string; name: string };
  fileName: string;
  rowCount: number;
}

const DATA_FILE = path.join(process.cwd(), "src/data/outstanding-invoices.json");

interface FsShape {
  invoices: OutstandingInvoice[];
  lastImport: OutstandingInvoiceImportMeta | null;
}

function readFs(): FsShape {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as FsShape;
  } catch {
    // Belum pernah ada import — pakai 12 baris contoh biar app nggak kosong
    // total sebelum user upload file beneran.
    return { invoices: MOCK_OUTSTANDING_INVOICES, lastImport: null };
  }
}

function writeFs(shape: FsShape) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(shape, null, 2), "utf-8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToInvoice(row: any): OutstandingInvoice {
  return {
    id: row.id,
    sourceOutletCode: row.source_outlet_code,
    vendorCode: row.vendor_code,
    vendorName: row.vendor_name,
    invoiceNo: row.invoice_no,
    invoiceDate: row.invoice_date,
    dueDate: row.due_date,
    amount: Number(row.amount),
    bankName: row.bank_name,
    bankAccountNo: row.bank_account_no,
    bankAccountName: row.bank_account_name,
    description: row.description ?? "",
  };
}

function invoiceToRow(inv: OutstandingInvoice) {
  return {
    id: inv.id,
    source_outlet_code: inv.sourceOutletCode,
    vendor_code: inv.vendorCode,
    vendor_name: inv.vendorName,
    invoice_no: inv.invoiceNo,
    invoice_date: inv.invoiceDate,
    due_date: inv.dueDate,
    amount: inv.amount,
    bank_name: inv.bankName,
    bank_account_no: inv.bankAccountNo,
    bank_account_name: inv.bankAccountName,
    description: inv.description,
  };
}

export const outstandingInvoiceStore = {
  async list(): Promise<OutstandingInvoice[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin().from("outstanding_invoices").select("*").order("due_date");
      if (error) throw error;
      if ((data ?? []).length === 0) return MOCK_OUTSTANDING_INVOICES; // belum pernah import
      return data.map(rowToInvoice);
    }
    return readFs().invoices;
  },

  async lastImport(): Promise<OutstandingInvoiceImportMeta | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin()
        .from("outstanding_invoice_imports")
        .select("*")
        .order("imported_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        importedAt: data.imported_at,
        importedBy: data.imported_by,
        fileName: data.file_name,
        rowCount: data.row_count,
      };
    }
    return readFs().lastImport;
  },

  // Replace-all: hapus semua invoice lama, ganti sama isi upload baru.
  async replaceAll(invoices: OutstandingInvoice[], meta: Omit<OutstandingInvoiceImportMeta, "importedAt">): Promise<void> {
    const importedAt = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const client = supabaseAdmin();
      const { error: delErr } = await client.from("outstanding_invoices").delete().neq("id", "");
      if (delErr) throw delErr;
      if (invoices.length > 0) {
        const { error: insErr } = await client.from("outstanding_invoices").insert(invoices.map(invoiceToRow));
        if (insErr) throw insErr;
      }
      const { error: metaErr } = await client.from("outstanding_invoice_imports").insert({
        imported_at: importedAt,
        imported_by: meta.importedBy,
        file_name: meta.fileName,
        row_count: meta.rowCount,
      });
      if (metaErr) throw metaErr;
      return;
    }
    writeFs({ invoices, lastImport: { ...meta, importedAt } });
  },
};
