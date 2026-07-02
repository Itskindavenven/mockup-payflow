import type { RawTransaction } from "@/lib/mock-data";

export interface KeywordEntry {
  id: string;
  keyword: string;
  coa: string;    // display name
  coaNo: string;  // Accurate COA number (e.g. "611.002-02")
}

// COA numbers from Retail Sample database
export const DEFAULT_KEYWORD_MAP: KeywordEntry[] = [
  { id: "k1", keyword: "pln prepaid",  coa: "Beban Listrik dan Air",           coaNo: "611.002-02" },
  { id: "k2", keyword: "pln postpaid", coa: "Beban Listrik dan Air",           coaNo: "611.002-02" },
  { id: "k3", keyword: "tlkm",         coa: "Beban Telepon",                   coaNo: "611.002-04" },
  { id: "k4", keyword: "pulsa",        coa: "Beban Internet",                  coaNo: "611.002-05" },
  { id: "k5", keyword: "bensin",       coa: "Beban Bensin, Tol dan Parkir",    coaNo: "611.001-08" },
  { id: "k6", keyword: "uang makan",   coa: "Beban Konsumsi",                  coaNo: "611.001-03" },
];

// COA for bank admin fees (Beban Umum & Admin Lainnya in Retail Sample)
export const ADMIN_FEE_COA_NO = "611.002-99";

export type AccurateStatus = "sudah_tercatat" | "akan_dipush" | "perlu_review";
export type SyncAction = "purchase-payment" | "other-payment" | null;

export interface ParsedTransaction {
  detected_invoice_no: string | null;
  detected_vendor: string | null;
  detected_keyword: string | null;
  suggested_coa: string | null;
  suggested_coa_no: string | null;  // Accurate COA number for push
  accurate_status: AccurateStatus;
  sync_action: SyncAction;
  display_label: string;
}

// Single enriched row — one CSV line
export interface EnrichedTransaction extends RawTransaction, ParsedTransaction {
  id: string;
  is_admin_fee: boolean;
}

// Group of rows sharing the same Journal No
export interface JournalGroup {
  group_id: string;             // = journal_no
  journal_no: string;
  rows: EnrichedTransaction[];  // all rows in this journal
  primary: EnrichedTransaction; // first non-admin-fee row (drives status/label)
  total_debit: number;          // sum of all D rows
  accurate_status: AccurateStatus;
  sync_action: SyncAction;
  display_label: string;
  detected_invoice_no: string | null;
  detected_keyword: string | null;
  suggested_coa: string | null;
  suggested_coa_no: string | null;
  post_date: string;
  db_cr: "D" | "C";
}

// ─── Detection helpers ─────────────────────────────────────────────────────

export function isAdminFee(desc: string): boolean {
  const lower = desc.toLowerCase();
  return lower.includes("biaya admin") || lower.trim() === "by trx bifast";
}

const INVOICE_REGEX = /Inv\/(\d{4}\/\d{2}\/\d{2}\/\S+)/i;

export function parseTransaction(
  description_raw: string,
  alreadyRecorded: string[],
  keywordMap: KeywordEntry[]
): ParsedTransaction {
  const invoiceMatch = description_raw.match(INVOICE_REGEX);
  const detected_invoice_no = invoiceMatch
    ? invoiceMatch[1].replace(/\s.*$/, "")
    : null;

  const lowerDesc = description_raw.toLowerCase();
  const matchedKeyword = keywordMap.find((k) =>
    lowerDesc.includes(k.keyword.toLowerCase())
  );
  const detected_keyword = matchedKeyword?.keyword ?? null;
  const suggested_coa_from_keyword = matchedKeyword?.coa ?? null;
  const suggested_coa_no_from_keyword = matchedKeyword?.coaNo ?? null;

  let accurate_status: AccurateStatus;
  let sync_action: SyncAction;
  let suggested_coa: string | null = null;
  let suggested_coa_no: string | null = null;

  if (detected_invoice_no) {
    const invoiceNum = detected_invoice_no.split("/").pop() ?? detected_invoice_no;
    accurate_status = alreadyRecorded.includes(invoiceNum) ? "sudah_tercatat" : "akan_dipush";
    sync_action = accurate_status === "akan_dipush" ? "purchase-payment" : null;
  } else if (detected_keyword) {
    accurate_status = "akan_dipush";
    sync_action = "other-payment";
    suggested_coa = suggested_coa_from_keyword;
    suggested_coa_no = suggested_coa_no_from_keyword;
  } else {
    accurate_status = "perlu_review";
    sync_action = null;
  }

  let display_label: string;
  if (detected_invoice_no) {
    display_label = `Invoice ${detected_invoice_no.split("/").pop()}`;
  } else if (detected_keyword && suggested_coa_from_keyword) {
    display_label = suggested_coa_from_keyword.replace("Beban ", "");
  } else {
    const t = description_raw.trim();
    display_label = t.length > 40 ? t.slice(0, 40) + "…" : t;
  }

  return {
    detected_invoice_no,
    detected_vendor: null,
    detected_keyword,
    suggested_coa,
    suggested_coa_no,
    accurate_status,
    sync_action,
    display_label,
  };
}

// ─── Enrich a raw row into EnrichedTransaction ─────────────────────────────

export function enrichRow(
  raw: RawTransaction,
  alreadyRecorded: string[],
  keywordMap: KeywordEntry[]
): EnrichedTransaction {
  const adminFee = isAdminFee(raw.description_raw);
  const parsed = parseTransaction(raw.description_raw, alreadyRecorded, keywordMap);

  if (adminFee) {
    return {
      ...raw,
      ...parsed,
      id: `${raw.journal_no}-${raw.no}`,
      is_admin_fee: true,
      suggested_coa: "Beban Admin Bank",
      suggested_coa_no: ADMIN_FEE_COA_NO,
      display_label: "↳ Biaya Admin",
      accurate_status: "akan_dipush",
      sync_action: "other-payment",
    };
  }

  // Credit transactions → perlu_review by default (incoming money, not AP)
  if (raw.db_cr === "C") {
    return {
      ...raw,
      ...parsed,
      id: `${raw.journal_no}-${raw.no}`,
      is_admin_fee: false,
      accurate_status: "perlu_review",
      sync_action: null,
    };
  }

  return {
    ...raw,
    ...parsed,
    id: `${raw.journal_no}-${raw.no}`,
    is_admin_fee: false,
  };
}

// ─── Group enriched rows by Journal No ────────────────────────────────────

export function groupByJournalNo(rows: EnrichedTransaction[]): JournalGroup[] {
  const orderMap = new Map<string, EnrichedTransaction[]>();
  for (const row of rows) {
    const key = row.journal_no;
    if (!orderMap.has(key)) orderMap.set(key, []);
    orderMap.get(key)!.push(row);
  }

  const groups: JournalGroup[] = [];
  for (const [journal_no, groupRows] of orderMap) {
    const primary = groupRows.find((r) => !r.is_admin_fee) ?? groupRows[0];
    const total_debit = groupRows
      .filter((r) => r.db_cr === "D")
      .reduce((s, r) => s + r.amount, 0);

    groups.push({
      group_id: journal_no,
      journal_no,
      rows: groupRows,
      primary,
      total_debit,
      accurate_status: primary.accurate_status,
      sync_action: primary.sync_action,
      display_label: primary.display_label,
      detected_invoice_no: primary.detected_invoice_no,
      detected_keyword: primary.detected_keyword,
      suggested_coa: primary.suggested_coa,
      suggested_coa_no: primary.suggested_coa_no,
      post_date: primary.post_date,
      db_cr: primary.db_cr,
    });
  }

  return groups;
}

// ─── Utilities ─────────────────────────────────────────────────────────────

export interface RefNo {
  value: string;
  type: "invoice" | "ref";
}

export function extractRefNo(desc: string): RefNo | null {
  // Invoice pattern: Inv/YYYY/MM/DD/CODE
  const invoiceMatch = desc.match(/Inv\/(\d{4}\/\d{2}\/\d{2}\/\S+)/i);
  if (invoiceMatch) {
    const code = invoiceMatch[1].split("/").pop() ?? invoiceMatch[1];
    return { value: code, type: "invoice" };
  }

  // Skip admin fee rows — they have no meaningful ref
  const lower = desc.toLowerCase();
  if (lower.includes("biaya admin") || desc.trim() === "BY TRX BIFAST") return null;

  // BILL PAYMENT account/meter number
  const billMatch = desc.match(/BILL PAYMENT[^)]*\)\s*NO\s*:?\s*(\d+)/i);
  if (billMatch) return { value: billMatch[1], type: "ref" };

  // Transfer: last 4 digits of destination/source account
  const transferMatch = desc.match(/PEMINDAHAN (?:KE|DARI)\s+(\d{6,})/i);
  if (transferMatch) {
    const acct = transferMatch[1];
    return { value: `···${acct.slice(-4)}`, type: "ref" };
  }

  return null;
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

export function cleanDescription(desc: string): string {
  const raw = desc.trim();

  if (raw === "BY TRX BIFAST") return "Biaya Admin BIFAST";

  // BIAYA ADMIN (SERVICE NAME)
  const adminMatch = raw.match(/BIAYA ADMIN \(([^)]+)\)/i);
  if (adminMatch) return `Biaya Admin ${toTitleCase(adminMatch[1].trim())}`;

  // BILL PAYMENT (SERVICE) NO :XXXXX
  const billMatch = raw.match(/BILL PAYMENT \(([^)]+?)\s*\)\s*NO\s*:?\s*(\S+)/i);
  if (billMatch) return `${toTitleCase(billMatch[1].trim())} · ${billMatch[2]}`;

  // Search pipe-separated parts for PEMINDAHAN KE / DARI
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    // Multi-space between account no and name: "PEMINDAHAN KE   123456    NAMA PIHAK"
    const multiSpace = part.match(/PEMINDAHAN (?:KE|DARI)\s+\d+\s{2,}(.+)/i);
    if (multiSpace) return toTitleCase(multiSpace[1].trim());

    // Single-space variant: "PEMINDAHAN DARI 123456 NAMA PIHAK"
    const singleSpace = part.match(/PEMINDAHAN (?:KE|DARI)\s+\d+\s+([A-Z].+)/i);
    if (singleSpace) {
      const name = singleSpace[1].trim();
      if (!/^\d+$/.test(name) && !name.startsWith("#"))
        return toTitleCase(name);
    }
  }

  // Last part pattern: "123456    nama dari sini"
  const lastPart = parts[parts.length - 1];
  const lastMatch = lastPart.match(/\d+\s{2,}(.+)/);
  if (lastMatch) return toTitleCase(lastMatch[1].trim());

  // Fallback: first meaningful part
  const fallback =
    parts.find((p) => p.length > 6 && !/^\d+$/.test(p) && !p.startsWith("#")) ??
    parts[0];
  return toTitleCase(fallback.slice(0, 50));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}
