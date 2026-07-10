// Server-only — never import in client components
import fs from "fs";
import path from "path";
import type { OutstandingInvoice } from "@/lib/payment-batch-data";
import type { BniAccountType } from "@/lib/bni-outlets";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

// Satu file BNI Direct = satu Rek. Debet (lihat P-row di template asli), jadi
// begitu file di-export, dia langsung siap-upload — nggak ada status
// "menunggu diimpor" terpisah. User upload+release di sisi BNI Direct, lalu
// tandai selesai di sini begitu itu kelar.
export type PaymentBatchStatus =
  | "draft"           // baru dibuat, belum dikurasi
  | "dikurasi"        // invoice sudah dipilih, siap export
  | "file_exported"   // file BNI sudah di-generate, siap diupload ke Internet Banking BNI
  | "rilis_selesai";  // user tandai sudah rilis -> lanjut import mutasi di Transaksi AP

export interface PaymentBatchItem extends OutstandingInvoice {
  selected: boolean;
}

export interface PaymentBatchRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
  status: PaymentBatchStatus;
  outletCode: string;           // lihat bni-outlets.ts — satu batch = satu outlet
  debetAccountType: BniAccountType;
  items: PaymentBatchItem[];
  exportedFileName: string | null;
  exportedFileContent: string | null; // base64 .xlsx
  exportedAt: string | null;
  releasedAt: string | null;
  apSessionId: string | null; // link ke sesi Transaksi AP setelah lanjut ke rekonsiliasi
}

const DATA_FILE = path.join(process.cwd(), "src/data/payment-batches.json");

function readFs(): PaymentBatchRecord[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")).batches as PaymentBatchRecord[];
  } catch {
    return [];
  }
}

function writeFs(batches: PaymentBatchRecord[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ batches }, null, 2), "utf-8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecord(row: any): PaymentBatchRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    status: row.status,
    outletCode: row.outlet_code,
    debetAccountType: row.debet_account_type,
    items: row.items,
    exportedFileName: row.exported_file_name,
    exportedFileContent: row.exported_file_content,
    exportedAt: row.exported_at,
    releasedAt: row.released_at,
    apSessionId: row.ap_session_id,
  };
}

function recordToRow(r: Partial<PaymentBatchRecord>) {
  const row: Record<string, unknown> = {};
  if (r.id !== undefined) row.id = r.id;
  if (r.createdAt !== undefined) row.created_at = r.createdAt;
  if (r.updatedAt !== undefined) row.updated_at = r.updatedAt;
  if (r.createdBy !== undefined) row.created_by = r.createdBy;
  if (r.status !== undefined) row.status = r.status;
  if (r.outletCode !== undefined) row.outlet_code = r.outletCode;
  if (r.debetAccountType !== undefined) row.debet_account_type = r.debetAccountType;
  if (r.items !== undefined) row.items = r.items;
  if (r.exportedFileName !== undefined) row.exported_file_name = r.exportedFileName;
  if (r.exportedFileContent !== undefined) row.exported_file_content = r.exportedFileContent;
  if (r.exportedAt !== undefined) row.exported_at = r.exportedAt;
  if (r.releasedAt !== undefined) row.released_at = r.releasedAt;
  if (r.apSessionId !== undefined) row.ap_session_id = r.apSessionId;
  return row;
}

export const paymentBatchStore = {
  async list(): Promise<PaymentBatchRecord[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin().from("payment_batches").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToRecord);
    }
    return readFs().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async get(id: string): Promise<PaymentBatchRecord | undefined> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin().from("payment_batches").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? rowToRecord(data) : undefined;
    }
    return readFs().find((b) => b.id === id);
  },

  async create(batch: PaymentBatchRecord): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabaseAdmin().from("payment_batches").insert(recordToRow(batch));
      if (error) throw error;
      return;
    }
    const all = readFs();
    all.push(batch);
    writeFs(all);
  },

  async update(id: string, updates: Partial<Omit<PaymentBatchRecord, "id">>): Promise<boolean> {
    const updatedAt = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const patch = recordToRow({ ...updates, updatedAt });
      const { data, error } = await supabaseAdmin().from("payment_batches").update(patch).eq("id", id).select("id");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    }
    const all = readFs();
    const idx = all.findIndex((b) => b.id === id);
    if (idx < 0) return false;
    all[idx] = { ...all[idx], ...updates, updatedAt };
    writeFs(all);
    return true;
  },
};
