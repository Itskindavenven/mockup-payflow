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

// Checklist 4-sinyal validasi untuk baris invoice (bukan beban) — semua
// harus true supaya baris dianggap siap push otomatis. `reason` diisi
// penjelasan singkat sinyal mana yang gagal, buat ditampilkan ke reviewer.
export interface InvoiceValidation {
  invoiceNo: boolean;
  vendorName: boolean;
  accountNo: boolean;
  noConflictingKeyword: boolean;
  reason: string | null;
}

export interface ParsedTransaction {
  detected_invoice_no: string | null;
  detected_vendor: string | null;
  detected_keyword: string | null;
  suggested_coa: string | null;
  suggested_coa_no: string | null;  // Accurate COA number for push
  accurate_status: AccurateStatus;
  sync_action: SyncAction;
  display_label: string;
  invoice_validation: InvoiceValidation | null; // null untuk baris non-invoice
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
  detected_vendor: string | null;
  detected_keyword: string | null;
  suggested_coa: string | null;
  suggested_coa_no: string | null;
  post_date: string;
  db_cr: "D" | "C";
  invoice_validation: InvoiceValidation | null;
  is_admin_fee_split?: boolean; // true untuk grup singleton hasil split biaya admin
  payee_override?: string;      // payee transaksi induk, dipakai saat push grup biaya admin
}

// ─── Detection helpers ─────────────────────────────────────────────────────

export function isAdminFee(desc: string): boolean {
  const lower = desc.toLowerCase();
  return lower.includes("biaya admin") || lower.trim() === "by trx bifast";
}

const INVOICE_REGEX = /Inv\/(\d{4}\/\d{2}\/\d{2}\/\S+)/i;

// Nomor rekening tujuan/sumber di deskripsi transfer BNI — sama pola yang
// dipakai extractRefNo() untuk mask 4-digit terakhir, di sini dipakai utuh
// buat dicocokkan ke rekening bank vendor yang sudah di-set di Accurate
// Online (vendor.accountNo, ditarik dari vendor/detail.do — lihat
// accurate-api.ts fetchVendors()).
const ACCOUNT_NO_REGEX = /PEMINDAHAN (?:KE|DARI)\s+(\d{6,})/i;

export function extractBankAccountNo(desc: string): string | null {
  const match = desc.match(ACCOUNT_NO_REGEX);
  return match ? match[1] : null;
}

export interface VendorLookup {
  name: string;
  accountNo?: string;
}

function findVendorByAccountNo(desc: string, vendors: VendorLookup[]): VendorLookup | null {
  const acctNo = extractBankAccountNo(desc);
  if (!acctNo) return null;
  return vendors.find((v) => v.accountNo && v.accountNo.trim() === acctNo) ?? null;
}

// Nama vendor sebagai substring bebas di deskripsi — sinyal lebih lemah
// daripada rekening (nama sering disingkat/typo di rekening koran), jadi
// dipakai sebagai sinyal kedua yang saling menguatkan/mengecek silang
// findVendorByAccountNo, bukan pengganti. Nama pendek (<=3 char) di-skip
// biar nggak nyangkut ke substring yang kebetulan sama.
function findVendorByNameInDescription(desc: string, vendors: VendorLookup[]): VendorLookup | null {
  const lowerDesc = desc.toLowerCase();
  return (
    vendors.find(
      (v) => v.name.trim().length > 3 && lowerDesc.includes(v.name.trim().toLowerCase())
    ) ?? null
  );
}

// Nomor invoice/faktur bisa ditulis beda format antara Accurate (mis.
// "SI.123", "SI-123") dan teks bebas di rekening koran (mis. "SI123") —
// normalisasi dengan buang semua karakter non-alfanumerik + uppercase
// supaya perbandingannya nggak kejebak beda tanda baca/kapitalisasi.
export function normalizeInvoiceNo(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function parseTransaction(
  description_raw: string,
  alreadyRecorded: string[],
  keywordMap: KeywordEntry[],
  vendors: VendorLookup[] = []
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

  // Cocokkan identitas vendor dari 2 sinyal independen — rekening tujuan
  // (kuat) dan nama vendor sebagai substring deskripsi (lebih lemah).
  // Dijalankan untuk SEMUA baris, termasuk yang sudah punya nomor invoice,
  // supaya baris invoice juga bisa divalidasi silang identitas vendornya
  // (bukan cuma dipercaya begitu saja dari nomor invoice).
  const vendorByAccount = findVendorByAccountNo(description_raw, vendors);
  const vendorByName = findVendorByNameInDescription(description_raw, vendors);
  const vendorConflict = !!vendorByAccount && !!vendorByName && vendorByAccount.name !== vendorByName.name;
  const matchedVendor = vendorConflict ? null : vendorByAccount ?? vendorByName;
  const detected_vendor = matchedVendor?.name ?? null;

  let accurate_status: AccurateStatus;
  let sync_action: SyncAction;
  let suggested_coa: string | null = null;
  let suggested_coa_no: string | null = null;
  let invoice_validation: InvoiceValidation | null = null;

  if (detected_invoice_no) {
    const invoiceNum = detected_invoice_no.split("/").pop() ?? detected_invoice_no;
    const alreadyMatch = alreadyRecorded.some(
      (rec) => normalizeInvoiceNo(rec) === normalizeInvoiceNo(invoiceNum)
    );

    // 4 sinyal validasi wajib buat baris invoice: nomor invoice (selalu
    // true di branch ini), nama vendor, nomor rekening tujuan cocok
    // vendor, dan deskripsi TIDAK mengandung keyword beban (kalau ada,
    // berarti klasifikasinya ambigu — bisa jadi bukan invoice beneran).
    const vendorNameOk = !!detected_vendor && !vendorConflict;
    const accountNoOk = !!vendorByAccount && !vendorConflict;
    const noConflictingKeyword = !detected_keyword;

    let reason: string | null = null;
    if (vendorConflict) {
      reason = "Nama vendor dan rekening tujuan menunjuk ke vendor yang berbeda.";
    } else if (!vendorNameOk) {
      reason = "Nama vendor tidak terdeteksi dari deskripsi maupun rekening tujuan.";
    } else if (!accountNoOk) {
      reason = "Nomor rekening tujuan tidak cocok dengan rekening vendor yang terdaftar.";
    } else if (!noConflictingKeyword) {
      reason = `Deskripsi juga cocok dengan keyword beban "${detected_keyword}" — klasifikasi ambigu.`;
    }

    invoice_validation = {
      invoiceNo: true,
      vendorName: vendorNameOk,
      accountNo: accountNoOk,
      noConflictingKeyword,
      reason,
    };

    if (alreadyMatch) {
      accurate_status = "sudah_tercatat";
      sync_action = null;
    } else if (vendorNameOk && accountNoOk && noConflictingKeyword) {
      accurate_status = "akan_dipush";
      sync_action = "purchase-payment";
    } else {
      accurate_status = "perlu_review";
      sync_action = null;
    }
  } else if (detected_keyword) {
    accurate_status = "akan_dipush";
    sync_action = "other-payment";
    suggested_coa = suggested_coa_from_keyword;
    suggested_coa_no = suggested_coa_no_from_keyword;
  } else {
    // Vendor kedetect lewat rekening bank tapi belum ada nomor invoice/PO
    // maupun COA yang bisa dipastikan otomatis — tetap "perlu_review" biar
    // COA-nya dipilih manual (nggak nebak COA yang salah), tapi nama
    // vendor-nya udah kepasang biar reviewer nggak mulai dari nol.
    accurate_status = "perlu_review";
    sync_action = null;
  }

  let display_label: string;
  if (detected_invoice_no) {
    display_label = `Invoice ${detected_invoice_no.split("/").pop()}`;
  } else if (detected_keyword && suggested_coa_from_keyword) {
    display_label = suggested_coa_from_keyword.replace("Beban ", "");
  } else if (detected_vendor) {
    display_label = detected_vendor;
  } else {
    const t = description_raw.trim();
    display_label = t.length > 40 ? t.slice(0, 40) + "…" : t;
  }

  return {
    detected_invoice_no,
    detected_vendor,
    detected_keyword,
    suggested_coa,
    suggested_coa_no,
    accurate_status,
    sync_action,
    display_label,
    invoice_validation,
  };
}

// ─── Enrich a raw row into EnrichedTransaction ─────────────────────────────

export function enrichRow(
  raw: RawTransaction,
  alreadyRecorded: string[],
  keywordMap: KeywordEntry[],
  vendors: VendorLookup[] = []
): EnrichedTransaction {
  const adminFee = isAdminFee(raw.description_raw);
  const parsed = parseTransaction(raw.description_raw, alreadyRecorded, keywordMap, vendors);

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
    const parentRows = groupRows.filter((r) => !r.is_admin_fee);
    const feeRows = groupRows.filter((r) => r.is_admin_fee);
    const parent = parentRows[0] ?? null;

    // Grup induk — hanya baris non-biaya-admin. Skip kalau bucket ini
    // isinya cuma baris biaya admin (nggak ada transaksi induk).
    if (parent) {
      const total_debit = parentRows
        .filter((r) => r.db_cr === "D")
        .reduce((s, r) => s + r.amount, 0);

      groups.push({
        group_id: journal_no,
        journal_no,
        rows: parentRows,
        primary: parent,
        total_debit,
        accurate_status: parent.accurate_status,
        sync_action: parent.sync_action,
        display_label: parent.display_label,
        detected_invoice_no: parent.detected_invoice_no,
        detected_vendor: parent.detected_vendor,
        detected_keyword: parent.detected_keyword,
        suggested_coa: parent.suggested_coa,
        suggested_coa_no: parent.suggested_coa_no,
        post_date: parent.post_date,
        db_cr: parent.db_cr,
        invoice_validation: parent.invoice_validation,
      });
    }

    // Tiap baris biaya admin jadi grup jurnal tersendiri (voucher Accurate
    // terpisah dari transaksi induknya), tapi tetap "meminjam" payee dari
    // transaksi induk kalau ada — biaya admin sendiri bukan nama payee yang
    // berguna.
    for (const feeRow of feeRows) {
      const total_debit = feeRow.db_cr === "D" ? feeRow.amount : 0;

      groups.push({
        group_id: `admin-fee-${feeRow.id}`,
        journal_no,
        rows: [feeRow],
        primary: feeRow,
        total_debit,
        accurate_status: feeRow.accurate_status,
        sync_action: feeRow.sync_action,
        display_label: feeRow.display_label,
        detected_invoice_no: feeRow.detected_invoice_no,
        detected_vendor: feeRow.detected_vendor,
        detected_keyword: feeRow.detected_keyword,
        suggested_coa: feeRow.suggested_coa,
        suggested_coa_no: feeRow.suggested_coa_no,
        post_date: feeRow.post_date,
        db_cr: feeRow.db_cr,
        invoice_validation: feeRow.invoice_validation,
        is_admin_fee_split: true,
        ...(parent ? { payee_override: cleanDescription(parent.description_raw) } : {}),
      });
    }
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
