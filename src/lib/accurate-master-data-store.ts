// Server-only — never import in client components
//
// Cache lokal buat master data Accurate (vendor & COA/gl-account) supaya
// load-nya nggak nunggu Accurate live tiap kali (fetchVendors() khususnya
// lambat — N+1 detail call per vendor). Bukan sumber kebenaran, cuma
// snapshot hasil sinkronisasi manual (tombol "Sync" di
// /settings/database/[id]) — replace-all penuh tiap sync, sama pola-nya
// kayak outstanding-invoice-store.ts.
import fs from "fs";
import path from "path";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { AccurateCOA, AccurateVendor } from "@/lib/accurate-api";

export interface SyncMeta {
  syncedAt: string;
  syncedBy: { id: string; name: string };
  rowCount: number;
}

type Entity = "vendors" | "gl_accounts";

const DATA_FILE = path.join(process.cwd(), "src/data/accurate-master-cache.json");

interface FsShape {
  vendors: Record<string, AccurateVendor[]>;
  glAccounts: Record<string, AccurateCOA[]>;
  lastSync: Record<string, SyncMeta>; // key = `${dbId}:${entity}`
}

function readFs(): FsShape {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as FsShape;
  } catch {
    return { vendors: {}, glAccounts: {}, lastSync: {} };
  }
}

function writeFs(shape: FsShape) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(shape, null, 2), "utf-8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToVendor(row: any): AccurateVendor {
  return {
    id: row.accurate_id,
    vendorNo: row.vendor_no,
    name: row.name,
    vendorBranchName: row.vendor_branch_name,
    bankName: row.bank_name ?? undefined,
    accountNo: row.account_no ?? undefined,
  };
}

function vendorToRow(dbId: string, v: AccurateVendor) {
  return {
    db_id: dbId,
    accurate_id: v.id,
    vendor_no: v.vendorNo,
    name: v.name,
    vendor_branch_name: v.vendorBranchName,
    bank_name: v.bankName ?? null,
    account_no: v.accountNo ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToGlAccount(row: any): AccurateCOA {
  return { no: row.no, name: row.name, accountType: row.account_type };
}

function glAccountToRow(dbId: string, c: AccurateCOA) {
  return { db_id: dbId, no: c.no, name: c.name, account_type: c.accountType };
}

async function insertLog(entity: Entity, dbId: string, meta: SyncMeta) {
  if (isSupabaseConfigured()) {
    const { error } = await supabaseAdmin().from("accurate_master_sync_log").insert({
      db_id: dbId,
      entity,
      synced_at: meta.syncedAt,
      synced_by: meta.syncedBy,
      row_count: meta.rowCount,
    });
    if (error) throw error;
    return;
  }
  const all = readFs();
  all.lastSync[`${dbId}:${entity}`] = meta;
  writeFs(all);
}

export const accurateMasterDataStore = {
  async listVendors(dbId: string): Promise<AccurateVendor[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin()
        .from("accurate_vendors_cache")
        .select("*")
        .eq("db_id", dbId)
        .order("name");
      if (error) throw error;
      return (data ?? []).map(rowToVendor);
    }
    return readFs().vendors[dbId] ?? [];
  },

  async listGlAccounts(dbId: string): Promise<AccurateCOA[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin()
        .from("accurate_gl_accounts_cache")
        .select("*")
        .eq("db_id", dbId)
        .order("no");
      if (error) throw error;
      return (data ?? []).map(rowToGlAccount);
    }
    return readFs().glAccounts[dbId] ?? [];
  },

  async getLastSync(dbId: string, entity: Entity): Promise<SyncMeta | null> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin()
        .from("accurate_master_sync_log")
        .select("*")
        .eq("db_id", dbId)
        .eq("entity", entity)
        .order("synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { syncedAt: data.synced_at, syncedBy: data.synced_by, rowCount: data.row_count };
    }
    return readFs().lastSync[`${dbId}:${entity}`] ?? null;
  },

  async replaceVendors(dbId: string, vendors: AccurateVendor[], syncedBy: { id: string; name: string }): Promise<SyncMeta> {
    const meta: SyncMeta = { syncedAt: new Date().toISOString(), syncedBy, rowCount: vendors.length };
    if (isSupabaseConfigured()) {
      const client = supabaseAdmin();
      const { error: delErr } = await client.from("accurate_vendors_cache").delete().eq("db_id", dbId);
      if (delErr) throw delErr;
      if (vendors.length > 0) {
        const { error: insErr } = await client.from("accurate_vendors_cache").insert(vendors.map((v) => vendorToRow(dbId, v)));
        if (insErr) throw insErr;
      }
    } else {
      const all = readFs();
      all.vendors[dbId] = vendors;
      writeFs(all);
    }
    await insertLog("vendors", dbId, meta);
    return meta;
  },

  async replaceGlAccounts(dbId: string, accounts: AccurateCOA[], syncedBy: { id: string; name: string }): Promise<SyncMeta> {
    const meta: SyncMeta = { syncedAt: new Date().toISOString(), syncedBy, rowCount: accounts.length };
    if (isSupabaseConfigured()) {
      const client = supabaseAdmin();
      const { error: delErr } = await client.from("accurate_gl_accounts_cache").delete().eq("db_id", dbId);
      if (delErr) throw delErr;
      if (accounts.length > 0) {
        const { error: insErr } = await client.from("accurate_gl_accounts_cache").insert(accounts.map((c) => glAccountToRow(dbId, c)));
        if (insErr) throw insErr;
      }
    } else {
      const all = readFs();
      all.glAccounts[dbId] = accounts;
      writeFs(all);
    }
    await insertLog("gl_accounts", dbId, meta);
    return meta;
  },
};
