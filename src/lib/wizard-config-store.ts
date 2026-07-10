// Server-only — never import in client components
import fs from "fs";
import path from "path";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export interface WizardDbConfig {
  bankAccountNo: string | null; // COA no Kas/Bank aktif — satu saja (radio)
  vendorNos: string[];          // vendorNo aktif — banyak (checklist)
}

const DATA_FILE = path.join(process.cwd(), "src/data/wizard-config.json");
const EMPTY_CONFIG: WizardDbConfig = { bankAccountNo: null, vendorNos: [] };

function readFs(): Record<string, WizardDbConfig> {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")).configs as Record<string, WizardDbConfig>;
  } catch {
    return {};
  }
}

function writeFs(configs: Record<string, WizardDbConfig>) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ configs }, null, 2), "utf-8");
}

export const wizardConfigStore = {
  async get(dbId: string): Promise<WizardDbConfig> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin().from("wizard_configs").select("*").eq("db_id", dbId).maybeSingle();
      if (error) throw error;
      return data ? { bankAccountNo: data.bank_account_no, vendorNos: data.vendor_nos } : EMPTY_CONFIG;
    }
    return readFs()[dbId] ?? EMPTY_CONFIG;
  },

  async save(dbId: string, config: WizardDbConfig): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabaseAdmin()
        .from("wizard_configs")
        .upsert({ db_id: dbId, bank_account_no: config.bankAccountNo, vendor_nos: config.vendorNos });
      if (error) throw error;
      return;
    }
    const all = readFs();
    all[dbId] = config;
    writeFs(all);
  },
};
