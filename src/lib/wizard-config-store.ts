// Server-only — never import in client components
import fs from "fs";
import path from "path";

export interface WizardDbConfig {
  bankAccountNo: string | null; // COA no Kas/Bank aktif — satu saja (radio)
  vendorNos: string[];          // vendorNo aktif — banyak (checklist)
}

const DATA_FILE = path.join(process.cwd(), "src/data/wizard-config.json");
const EMPTY_CONFIG: WizardDbConfig = { bankAccountNo: null, vendorNos: [] };

function readAll(): Record<string, WizardDbConfig> {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")).configs as Record<string, WizardDbConfig>;
  } catch {
    return {};
  }
}

function writeAll(configs: Record<string, WizardDbConfig>) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ configs }, null, 2), "utf-8");
}

export const wizardConfigStore = {
  get(dbId: string): WizardDbConfig {
    return readAll()[dbId] ?? EMPTY_CONFIG;
  },
  save(dbId: string, config: WizardDbConfig) {
    const all = readAll();
    all[dbId] = config;
    writeAll(all);
  },
};
