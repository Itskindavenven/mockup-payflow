// Mock data & shared helpers untuk modul Pembayaran Vendor (tahap 1-4 BNI PayFlow):
// import outstanding hutang -> kurasi -> export file Internet Banking BNI.
import { isBni } from "@/lib/bni-bank-codes";

export type BniTransferRail = "inhouse" | "kliring";

export interface OutstandingInvoice {
  id: string;
  sourceOutletCode: string; // outlet BNI mana yang bayar ini — lihat bni-outlets.ts
  vendorCode: string;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string;     // YYYY-MM-DD
  amount: number;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  description: string;
}

// Karakter yang ditolak oleh format import Internet Banking BNI.
export const BNI_RESTRICTED_CHARS = [
  ",", "`", "~", "!", "@", "#", "$", "%", "^", "&", "*",
  "_", "{", "}", "<", ">", "[", "]", "=", "\\", ";",
];

const RESTRICTED_CHARS_REGEX = new RegExp(
  `[${BNI_RESTRICTED_CHARS.map((c) => "\\" + c).join("")}]`,
  "g"
);

export function findRestrictedChars(text: string): string[] {
  const found = text.match(RESTRICTED_CHARS_REGEX);
  return found ? Array.from(new Set(found)) : [];
}

export function sanitizeForBni(text: string): string {
  return text.replace(RESTRICTED_CHARS_REGEX, "").replace(/\s+/g, " ").trim();
}

// Rail hanya inhouse vs kliring untuk sekarang (RTGS/Online/Autodebet/IFT/BIFAST
// ada di template asli tapi belum ada aturan bisnis kapan dipakai — kliring
// dipakai sebagai default aman untuk transfer antar bank retail biasa).
export function determineTransferRail(bankName: string): BniTransferRail {
  return isBni(bankName) ? "inhouse" : "kliring";
}

// 12 baris hutang outstanding contoh — meniru format export "AP Aging" dari Accurate,
// dipetakan ke rekening tujuan vendor buat kebutuhan file transfer BNI. Setiap
// baris "milik" satu outlet (sourceOutletCode, lihat bni-outlets.ts) karena satu
// file BNI Direct = satu Rek. Debet = satu outlet.
export const MOCK_OUTSTANDING_INVOICES: OutstandingInvoice[] = [
  { id: "oi-001", sourceOutletCode: "TRN", vendorCode: "V-001", vendorName: "PT Sumber Makmur Jaya", invoiceNo: "SMJ-4521", invoiceDate: "2026-06-15", dueDate: "2026-07-15", amount: 12_500_000, bankName: "BCA", bankAccountNo: "1234100200", bankAccountName: "PT SUMBER MAKMUR JAYA", description: "Pelunasan Inv/2026/04/14/SMJ-4521" },
  { id: "oi-002", sourceOutletCode: "TRN", vendorCode: "V-002", vendorName: "PT Karya Mandiri", invoiceNo: "KM-2201", invoiceDate: "2026-06-18", dueDate: "2026-07-18", amount: 8_750_000, bankName: "BNI", bankAccountNo: "0223456789", bankAccountName: "PT KARYA MANDIRI", description: "Pembayaran jasa konsultasi Juni" },
  { id: "oi-003", sourceOutletCode: "TRN", vendorCode: "V-003", vendorName: "CV Mitra Teknik Utama", invoiceNo: "MTU-0902", invoiceDate: "2026-06-20", dueDate: "2026-07-05", amount: 45_300_000, bankName: "Mandiri", bankAccountNo: "1330099887", bankAccountName: "CV MITRA TEKNIK UTAMA", description: "Pengadaan sparepart mesin" },
  { id: "oi-004", sourceOutletCode: "BHL", vendorCode: "V-004", vendorName: "PT Indah Logistik", invoiceNo: "IL-77102", invoiceDate: "2026-06-21", dueDate: "2026-07-21", amount: 25_000_000, bankName: "BNI", bankAccountNo: "0334455667", bankAccountName: "PT INDAH LOGISTIK", description: "Ongkos kirim & pergudangan Q2" },
  { id: "oi-005", sourceOutletCode: "BHL", vendorCode: "V-005", vendorName: "CV Bintang Sejahtera", invoiceNo: "BS-1188", invoiceDate: "2026-06-22", dueDate: "2026-06-30", amount: 3_200_000, bankName: "BRI", bankAccountNo: "445566778899", bankAccountName: "CV BINTANG SEJAHTERA", description: "Sewa alat berat 2 minggu" },
  { id: "oi-006", sourceOutletCode: "BHL", vendorCode: "V-006", vendorName: "PT Global Supplier Indonesia", invoiceNo: "GSI-3390", invoiceDate: "2026-06-24", dueDate: "2026-07-24", amount: 67_800_000, bankName: "BNI", bankAccountNo: "0556677889", bankAccountName: "PT GLOBAL SUPPLIER INDONESIA", description: "Pembelian bahan baku batch 12" },
  { id: "oi-007", sourceOutletCode: "CKS", vendorCode: "V-007", vendorName: "UD Maju Bersama", invoiceNo: "UMB-0044", invoiceDate: "2026-06-25", dueDate: "2026-07-02", amount: 1_450_000, bankName: "BCA", bankAccountNo: "6677889900", bankAccountName: "UD MAJU BERSAMA", description: "ATK & perlengkapan kantor" },
  { id: "oi-008", sourceOutletCode: "CKS", vendorCode: "V-009", vendorName: "CV Anugrah Sejati", invoiceNo: "AS-2276", invoiceDate: "2026-06-27", dueDate: "2026-07-27", amount: 9_900_000, bankName: "Mandiri", bankAccountNo: "1440099221", bankAccountName: "CV ANUGRAH SEJATI", description: "Jasa maintenance server bulanan" },
  { id: "oi-009", sourceOutletCode: "CTR", vendorCode: "V-010", vendorName: "PT Nusantara Trade", invoiceNo: "NT-5567", invoiceDate: "2026-06-28", dueDate: "2026-07-10", amount: 33_600_000, bankName: "BNI", bankAccountNo: "0778899001", bankAccountName: "PT NUSANTARA TRADE", description: "Pembelian unit distribusi" },
  { id: "oi-010", sourceOutletCode: "CTR", vendorCode: "V-001", vendorName: "PT Sumber Makmur Jaya", invoiceNo: "SMJ-4602", invoiceDate: "2026-06-29", dueDate: "2026-08-01", amount: 5_600_000, bankName: "BCA", bankAccountNo: "1234100200", bankAccountName: "PT SUMBER MAKMUR JAYA", description: "Retur & penyesuaian kirim ulang" },
  { id: "oi-011", sourceOutletCode: "TGL", vendorCode: "V-003", vendorName: "CV Mitra Teknik Utama", invoiceNo: "MTU-0915", invoiceDate: "2026-06-30", dueDate: "2026-07-08", amount: 14_200_000, bankName: "Mandiri", bankAccountNo: "1330099887", bankAccountName: "CV MITRA TEKNIK UTAMA", description: "Kalibrasi & servis mesin produksi" },
  { id: "oi-012", sourceOutletCode: "TGL", vendorCode: "V-006", vendorName: "PT Global Supplier Indonesia", invoiceNo: "GSI-3405", invoiceDate: "2026-07-01", dueDate: "2026-06-25", amount: 21_150_000, bankName: "BNI", bankAccountNo: "0556677889", bankAccountName: "PT GLOBAL SUPPLIER INDONESIA", description: "Pembelian bahan baku batch 13 (jatuh tempo terlewat)" },
];
