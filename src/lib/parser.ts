export interface KeywordEntry {
  id: string;
  keyword: string;
  coa: string;
}

export const DEFAULT_KEYWORD_MAP: KeywordEntry[] = [
  { id: "k1", keyword: "admin bank", coa: "Beban Admin Bank" },
  { id: "k2", keyword: "pln prepaid", coa: "Beban Token Listrik" },
  { id: "k3", keyword: "top-up", coa: "Beban Token Listrik" },
  { id: "k4", keyword: "pulsa", coa: "Beban Pulsa & Internet" },
  { id: "k5", keyword: "internet", coa: "Beban Pulsa & Internet" },
  { id: "k6", keyword: "bensin", coa: "Beban Bensin" },
  { id: "k7", keyword: "uang makan", coa: "Beban Uang Makan" },
];

export type AccurateStatus = "sudah_tercatat" | "akan_dipush" | "perlu_review";
export type SyncAction = "purchase-payment" | "other-payment" | null;

export interface ParsedTransaction {
  detected_invoice_no: string | null;
  detected_vendor: string | null;
  detected_keyword: string | null;
  suggested_coa: string | null;
  accurate_status: AccurateStatus;
  sync_action: SyncAction;
  display_label: string;
}

const INVOICE_REGEX = /Inv\/(\d{4}\/\d{2}\/\d{2}\/\S+)/i;

export function parseTransaction(
  description_raw: string,
  alreadyRecorded: string[],
  keywordMap: KeywordEntry[]
): ParsedTransaction {
  // 1. Detect invoice number
  const invoiceMatch = description_raw.match(INVOICE_REGEX);
  const detected_invoice_no = invoiceMatch
    ? invoiceMatch[1].replace(/\s.*$/, "")
    : null;

  // 2. Detect keyword
  const lowerDesc = description_raw.toLowerCase();
  const matchedKeyword = keywordMap.find((k) =>
    lowerDesc.includes(k.keyword.toLowerCase())
  );
  const detected_keyword = matchedKeyword?.keyword ?? null;
  const suggested_coa_from_keyword = matchedKeyword?.coa ?? null;

  // 3. Resolve status
  let accurate_status: AccurateStatus;
  let sync_action: SyncAction;
  let suggested_coa: string | null = null;

  if (detected_invoice_no) {
    const invoiceNum = detected_invoice_no.split("/").pop() ?? detected_invoice_no;
    if (alreadyRecorded.includes(invoiceNum)) {
      accurate_status = "sudah_tercatat";
      sync_action = null;
    } else {
      accurate_status = "akan_dipush";
      sync_action = "purchase-payment";
    }
  } else if (detected_keyword) {
    accurate_status = "akan_dipush";
    sync_action = "other-payment";
    suggested_coa = suggested_coa_from_keyword;
  } else {
    accurate_status = "perlu_review";
    sync_action = null;
  }

  // 4. Build display_label
  let display_label: string;
  if (detected_invoice_no) {
    const invoiceNum = detected_invoice_no.split("/").pop() ?? detected_invoice_no;
    display_label = `Invoice ${invoiceNum}`;
  } else if (detected_keyword && suggested_coa_from_keyword) {
    display_label = suggested_coa_from_keyword.replace("Beban ", "") + ` (${matchedKeyword?.keyword})`;
  } else {
    const trimmed = description_raw.trim();
    display_label = trimmed.length > 40 ? trimmed.slice(0, 40) + "…" : trimmed;
  }

  return {
    detected_invoice_no,
    detected_vendor: null,
    detected_keyword,
    suggested_coa,
    accurate_status,
    sync_action,
    display_label,
  };
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}
