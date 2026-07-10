// Server-only — never import in client components
import fs from "fs";
import path from "path";
import type { JournalGroup } from "@/lib/parser";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type ApSessionStatus = "draft" | "selesai";

export interface ApSessionRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
  createdByEmail: string;
  createdByIp: string;
  database: { id: string; name: string; dbCode: string };
  kasBank: { code: string; name: string };
  branchName: string | null;
  selectedVendorCodes: string[];
  fileName: string;
  groups: JournalGroup[];
  pushedIds: string[];
  resolvedIds: string[];
  accurateJournalNos: Record<string, string>;
  // COA/nomor invoice yang diisi manual lewat sheet review, untuk group
  // yang tadinya "perlu_review" (nggak ada sinyal invoice/keyword) —
  // tanpa ini, "Tandai Sudah Direview" cuma mengubah badge status tapi
  // group-nya tetap nggak bisa di-push (suggested_coa_no/sync_action
  // tetap kosong).
  manualOverrides?: Record<string, { coaNo?: string; invoiceNo?: string }>;
  status: ApSessionStatus;
}

const DATA_FILE = path.join(process.cwd(), "src/data/ap-sessions.json");

function readFs(): ApSessionRecord[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")).sessions as ApSessionRecord[];
  } catch {
    return [];
  }
}

function writeFs(sessions: ApSessionRecord[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ sessions }, null, 2), "utf-8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecord(row: any): ApSessionRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    createdByIp: row.created_by_ip,
    database: row.database,
    kasBank: row.kas_bank,
    branchName: row.branch_name,
    selectedVendorCodes: row.selected_vendor_codes,
    fileName: row.file_name,
    groups: row.groups,
    pushedIds: row.pushed_ids,
    resolvedIds: row.resolved_ids,
    accurateJournalNos: row.accurate_journal_nos,
    manualOverrides: row.manual_overrides,
    status: row.status,
  };
}

function recordToRow(r: Partial<ApSessionRecord>) {
  const row: Record<string, unknown> = {};
  if (r.id !== undefined) row.id = r.id;
  if (r.createdAt !== undefined) row.created_at = r.createdAt;
  if (r.updatedAt !== undefined) row.updated_at = r.updatedAt;
  if (r.createdBy !== undefined) row.created_by = r.createdBy;
  if (r.createdByEmail !== undefined) row.created_by_email = r.createdByEmail;
  if (r.createdByIp !== undefined) row.created_by_ip = r.createdByIp;
  if (r.database !== undefined) row.database = r.database;
  if (r.kasBank !== undefined) row.kas_bank = r.kasBank;
  if (r.branchName !== undefined) row.branch_name = r.branchName;
  if (r.selectedVendorCodes !== undefined) row.selected_vendor_codes = r.selectedVendorCodes;
  if (r.fileName !== undefined) row.file_name = r.fileName;
  if (r.groups !== undefined) row.groups = r.groups;
  if (r.pushedIds !== undefined) row.pushed_ids = r.pushedIds;
  if (r.resolvedIds !== undefined) row.resolved_ids = r.resolvedIds;
  if (r.accurateJournalNos !== undefined) row.accurate_journal_nos = r.accurateJournalNos;
  if (r.manualOverrides !== undefined) row.manual_overrides = r.manualOverrides;
  if (r.status !== undefined) row.status = r.status;
  return row;
}

export const apSessionStore = {
  async list(): Promise<ApSessionRecord[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin().from("ap_sessions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToRecord);
    }
    return readFs().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async get(id: string): Promise<ApSessionRecord | undefined> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin().from("ap_sessions").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? rowToRecord(data) : undefined;
    }
    return readFs().find((s) => s.id === id);
  },

  async create(session: ApSessionRecord): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabaseAdmin().from("ap_sessions").insert(recordToRow(session));
      if (error) throw error;
      return;
    }
    const all = readFs();
    all.push(session);
    writeFs(all);
  },

  async update(id: string, updates: Partial<Omit<ApSessionRecord, "id">>): Promise<boolean> {
    const updatedAt = new Date().toISOString();
    if (isSupabaseConfigured()) {
      const patch = recordToRow({ ...updates, updatedAt });
      const { data, error } = await supabaseAdmin().from("ap_sessions").update(patch).eq("id", id).select("id");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    }
    const all = readFs();
    const idx = all.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    all[idx] = { ...all[idx], ...updates, updatedAt };
    writeFs(all);
    return true;
  },
};
