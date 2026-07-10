// Master data of the company's own BNI outlet/branch accounts — extracted
// from docs/references/Daftar Rekening BNI Direct.xlsx (root repo). This is
// the "Rek. Debet" (source-of-funds) side of a BNI Direct payment file: one
// payment batch is always scoped to a single outlet + a single one of its
// three account types (CASH / CASHLESS / TABUNGAN), matching how the real
// MASTER CMS templates work (one file = one P-row = one debit account).
import outletsData from "./data/bni-outlets.json";

export type BniAccountType = "cash" | "cashless" | "tabungan";

export interface BniOutlet {
  code: string;
  name: string;
  cashAccountNo: string;
  cashAccountName: string;
  cashlessAccountNo: string;
  cashlessAccountName: string;
  tabunganAccountNo: string;
  tabunganAccountName: string;
}

export const BNI_OUTLETS: BniOutlet[] = outletsData;

export function findOutlet(code: string): BniOutlet | undefined {
  return BNI_OUTLETS.find((o) => o.code === code);
}

export function outletAccountNo(outlet: BniOutlet, type: BniAccountType): string {
  if (type === "cash") return outlet.cashAccountNo;
  if (type === "cashless") return outlet.cashlessAccountNo;
  return outlet.tabunganAccountNo;
}

export const ACCOUNT_TYPE_LABEL: Record<BniAccountType, string> = {
  cash: "Cash",
  cashless: "Cashless",
  tabungan: "Tabungan",
};
