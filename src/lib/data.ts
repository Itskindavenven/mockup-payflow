export type TransactionStatus = "sudah_di_accurate" | "akan_dipush" | "perlu_review";

export type TransactionType =
  | "purchase_payment"
  | "other_payment"
  | "bank_transfer"
  | "unknown";

export interface BniTransaction {
  id: string;
  post_date: string;
  description: string;
  amount: number;
  db_cr: "D" | "C";
  detected_invoice?: string;
  detected_vendor?: string;
  detected_keyword?: string;
  suggested_type: TransactionType;
  status: TransactionStatus;
  accurate_ref?: string;
}

export const DUMMY_TRANSACTIONS: BniTransaction[] = [
  {
    id: "TRX-001",
    post_date: "2025-06-03",
    description: "TRF/Inv/2025/06/03/0042/PT SUMBER MAKMUR JAYA",
    amount: 15_750_000,
    db_cr: "D",
    detected_invoice: "Inv/2025/06/03/0042",
    detected_vendor: "PT Sumber Makmur Jaya",
    suggested_type: "purchase_payment",
    status: "sudah_di_accurate",
    accurate_ref: "PP/2025/06/0078",
  },
  {
    id: "TRX-002",
    post_date: "2025-06-03",
    description: "TRF/Inv/2025/06/01/0039/CV MITRA TEKNIK UTAMA",
    amount: 8_200_000,
    db_cr: "D",
    detected_invoice: "Inv/2025/06/01/0039",
    detected_vendor: "CV Mitra Teknik Utama",
    suggested_type: "purchase_payment",
    status: "akan_dipush",
  },
  {
    id: "TRX-003",
    post_date: "2025-06-03",
    description: "BIAYA ADMINISTRASI BULAN JUNI 2025",
    amount: 15_000,
    db_cr: "D",
    detected_keyword: "biaya administrasi",
    suggested_type: "other_payment",
    status: "akan_dipush",
  },
  {
    id: "TRX-004",
    post_date: "2025-06-04",
    description: "TRF/Inv/2025/05/28/0031/PT INDAH LOGISTIK",
    amount: 22_500_000,
    db_cr: "D",
    detected_invoice: "Inv/2025/05/28/0031",
    detected_vendor: "PT Indah Logistik",
    suggested_type: "purchase_payment",
    status: "akan_dipush",
  },
  {
    id: "TRX-005",
    post_date: "2025-06-04",
    description: "TOKEN LISTRIK PLN 535301000123",
    amount: 500_000,
    db_cr: "D",
    detected_keyword: "token listrik",
    suggested_type: "other_payment",
    status: "akan_dipush",
  },
  {
    id: "TRX-006",
    post_date: "2025-06-04",
    description: "TRANSFER KE REK 0123456789 BCA",
    amount: 5_000_000,
    db_cr: "D",
    suggested_type: "unknown",
    status: "perlu_review",
  },
  {
    id: "TRX-007",
    post_date: "2025-06-05",
    description: "TRF/Inv/2025/06/02/0041/PT KARYA MANDIRI",
    amount: 11_000_000,
    db_cr: "D",
    detected_invoice: "Inv/2025/06/02/0041",
    detected_vendor: "PT Karya Mandiri",
    suggested_type: "purchase_payment",
    status: "sudah_di_accurate",
    accurate_ref: "PP/2025/06/0079",
  },
  {
    id: "TRX-008",
    post_date: "2025-06-05",
    description: "PULSA/PAKET DATA KARYAWAN",
    amount: 300_000,
    db_cr: "D",
    detected_keyword: "pulsa",
    suggested_type: "other_payment",
    status: "akan_dipush",
  },
  {
    id: "TRX-009",
    post_date: "2025-06-05",
    description: "PEMINDAHBUKUAN REK 9876543210",
    amount: 50_000_000,
    db_cr: "D",
    suggested_type: "bank_transfer",
    status: "perlu_review",
  },
  {
    id: "TRX-010",
    post_date: "2025-06-06",
    description: "UANG MAKAN JUNI 2025",
    amount: 3_200_000,
    db_cr: "D",
    detected_keyword: "uang makan",
    suggested_type: "other_payment",
    status: "akan_dipush",
  },
  {
    id: "TRX-011",
    post_date: "2025-06-06",
    description: "TRF/Inv/2025/06/05/0045/CV BINTANG SEJAHTERA",
    amount: 6_750_000,
    db_cr: "D",
    detected_invoice: "Inv/2025/06/05/0045",
    detected_vendor: "CV Bintang Sejahtera",
    suggested_type: "purchase_payment",
    status: "akan_dipush",
  },
  {
    id: "TRX-012",
    post_date: "2025-06-06",
    description: "20250606 PEMBAYARAN TAG BPJS 998712",
    amount: 1_850_000,
    db_cr: "D",
    suggested_type: "unknown",
    status: "perlu_review",
  },
];

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getStatusLabel(status: TransactionStatus): string {
  const map: Record<TransactionStatus, string> = {
    sudah_di_accurate: "Sudah di Accurate",
    akan_dipush: "Akan di-push",
    perlu_review: "Perlu Review",
  };
  return map[status];
}

export function getTypeLabel(type: TransactionType): string {
  const map: Record<TransactionType, string> = {
    purchase_payment: "Pelunasan Invoice",
    other_payment: "Biaya Operasional",
    bank_transfer: "Transfer Bank",
    unknown: "Belum ditentukan",
  };
  return map[type];
}
