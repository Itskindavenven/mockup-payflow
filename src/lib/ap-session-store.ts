// Server-only — never import in client components
import fs from "fs";
import path from "path";
import type { JournalGroup } from "@/lib/parser";

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

function readAll(): ApSessionRecord[] {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")).sessions as ApSessionRecord[];
  } catch {
    return [];
  }
}

function writeAll(sessions: ApSessionRecord[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ sessions }, null, 2), "utf-8");
}

export const apSessionStore = {
  list(): ApSessionRecord[] {
    return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  get(id: string): ApSessionRecord | undefined {
    return readAll().find((s) => s.id === id);
  },
  create(session: ApSessionRecord) {
    const all = readAll();
    all.push(session);
    writeAll(all);
  },
  update(id: string, updates: Partial<Omit<ApSessionRecord, "id">>): boolean {
    const all = readAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    writeAll(all);
    return true;
  },
};
