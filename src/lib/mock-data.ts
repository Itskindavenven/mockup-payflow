export interface AccurateDatabase {
  id: string;
  name: string;
  dbCode: string;
  env: "production" | "training" | "archive";
  connected?: boolean;
}

export const ACCURATE_DATABASES: AccurateDatabase[] = [
  { id: "db-retail", name: "Retail Sample (Accurate Online)", dbCode: "RSP-2744191", env: "training", connected: true },
  { id: "db-1", name: "PT Ega Accurate Indonesia", dbCode: "EGA-PROD", env: "production" },
  { id: "db-2", name: "PT Ega Accurate Indonesia — Training", dbCode: "EGA-TRAIN", env: "training" },
  { id: "db-3", name: "PT Ega Accurate Indonesia — Arsip 2025", dbCode: "EGA-2025", env: "archive" },
];

export interface RawTransaction {
  no: number;
  post_date: string;
  branch: string;
  journal_no: string;
  description_raw: string;
  amount: number;
  db_cr: "D" | "C";
  balance: number;
}

export interface COAEntry {
  code: string;
  name: string;
  type: "Aset Lancar" | "Aset Tetap" | "Kewajiban Lancar" | "Kewajiban Jangka Panjang" | "Ekuitas" | "Pendapatan" | "Harga Pokok" | "Beban Operasional";
  normal_balance: "D" | "C";
  is_active: boolean;
}

export interface VendorEntry {
  code: string;
  name: string;
  npwp: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: "push_single" | "push_batch" | "resolve_review" | "sync_coa" | "sync_vendor" | "import_statement";
  description: string;
  module: string | null;
  status: "sukses" | "gagal";
  affected_count?: number;
  amount?: number;
}

export interface BankAccountMapping {
  id: string;
  account_no: string;
  account_name: string;
  bank_name: string;
  coa_code: string;
  coa_name: string;
}

// ─── Transactions (mock data) ──────────────────────────────────────────────
// MTU-0891 sudah tercatat di Accurate
export const ALREADY_RECORDED_IN_ACCURATE: string[] = ["MTU-0891"];

export const RAW_TRANSACTIONS: RawTransaction[] = [
  // 1. Invoice — PT Sumber Makmur Jaya
  { no: 1,  post_date: "2026-06-15 09:12:00", branch: "BNI DIRECT", journal_no: "110234",
    description_raw: "TRANSFER KE | PEMINDAHAN KE   1234100200    PT SUMBER MAKMUR JAYA | Inv/2026/04/14/SMJ-4521 | 202604151234567890",
    amount: 12_500_000, db_cr: "D", balance: 120_000_000 },

  // 2. Invoice — CV Mitra Teknik Utama (sudah tercatat)
  { no: 2,  post_date: "2026-06-15 10:30:00", branch: "BNI DIRECT", journal_no: "110301",
    description_raw: "TRANSFER KE | PEMINDAHAN KE   9988776655    CV MITRA TEKNIK UTAMA | Inv/2026/04/13/MTU-0891 | 202604151234567899",
    amount: 8_750_000, db_cr: "D", balance: 107_500_000 },

  // 3. PLN Prepaid + Biaya Admin
  { no: 3,  post_date: "2026-06-15 11:05:00", branch: "BNI DIRECT", journal_no: "220455",
    description_raw: "TRF/PAY/TOP-UP ECHANNEL | 6010043330000011 | BNI DIRECT | BILL PAYMENT (PLN PREPAID ) NO :86026222603",
    amount: 500_000, db_cr: "D", balance: 107_000_000 },
  { no: 4,  post_date: "2026-06-15 11:05:00", branch: "BNI DIRECT", journal_no: "220455",
    description_raw: "TRF/PAY/TOP-UP ECHANNEL | 6010043330000011 | BNI DIRECT | BIAYA ADMIN (PLN PREPAID ) NO :86026222603   550",
    amount: 3_500, db_cr: "D", balance: 106_996_500 },

  // 4. TLKM + Biaya Admin
  { no: 5,  post_date: "2026-06-16 14:22:00", branch: "BNI DIRECT", journal_no: "331102",
    description_raw: "TRF/PAY/TOP-UP ECHANNEL | 6010043330000011 | BNI DIRECT | BILL PAYMENT (TLKM BANDUNG) NO :0141505303714",
    amount: 429_570, db_cr: "D", balance: 106_566_930 },
  { no: 6,  post_date: "2026-06-16 14:22:00", branch: "BNI DIRECT", journal_no: "331102",
    description_raw: "TRF/PAY/TOP-UP ECHANNEL | 6010043330000011 | BNI DIRECT | BIAYA ADMIN (TLKM BANDUNG) NO :0141505303714 003",
    amount: 2_800, db_cr: "D", balance: 106_564_130 },

  // 5. Transfer keluar tanpa referensi (perlu review)
  { no: 7,  post_date: "2026-06-16 15:00:00", branch: "BNI DIRECT", journal_no: "440871",
    description_raw: "TRANSFER KE | PEMINDAHAN KE   1763434681    YATINAH | PSN 10 CK 160426 | 1763434681 202604165287008517",
    amount: 25_000_000, db_cr: "D", balance: 81_564_130 },

  // 6. BIFAST + fee
  { no: 8,  post_date: "2026-06-17 09:45:00", branch: "BNI DIRECT", journal_no: "551230",
    description_raw: "TRF/PAY/TOP-UP ECHANNEL | PEMINDAHAN KE   1380022032697 | 0000000000000000 | 1380022032697    Dansos Infaq Yatim Piatu",
    amount: 500_000, db_cr: "D", balance: 81_064_130 },
  { no: 9,  post_date: "2026-06-17 09:45:00", branch: "BNI DIRECT", journal_no: "551230",
    description_raw: "BY TRX BIFAST",
    amount: 2_500, db_cr: "D", balance: 81_061_630 },

  // 7. Incoming credit (perlu review)
  { no: 10, post_date: "2026-06-17 10:15:00", branch: "", journal_no: "660045",
    description_raw: "TRANSFER DARI | PEMINDAHAN DARI 8081000086    AIRPAY INTERNATIONAL IN | SF 8138 36091 01     17625496097290611238474569",
    amount: 2_150_000, db_cr: "C", balance: 83_211_630 },

  // 8. Invoice — PT Indah Logistik (besar)
  { no: 11, post_date: "2026-06-18 08:30:00", branch: "BNI DIRECT", journal_no: "770912",
    description_raw: "TRANSFER KE | PEMINDAHAN KE   5070535448    PT INDAH LOGISTIK | Inv/2026/04/17/ILG-7834 | 202604181386550976",
    amount: 47_500_000, db_cr: "D", balance: 35_711_630 },

  // 9. PLN Postpaid + Biaya Admin
  { no: 12, post_date: "2026-06-18 13:00:00", branch: "BNI DIRECT", journal_no: "880340",
    description_raw: "TRF/PAY/TOP-UP ECHANNEL | 6010043330000011 | BNI DIRECT | BILL PAYMENT (PLN POSTPAID) NO :520510266277",
    amount: 785_290, db_cr: "D", balance: 34_926_340 },
  { no: 13, post_date: "2026-06-18 13:00:00", branch: "BNI DIRECT", journal_no: "880340",
    description_raw: "TRF/PAY/TOP-UP ECHANNEL | 6010043330000011 | BNI DIRECT | BIAYA ADMIN (PLN POSTPAID) NO :520510266277  486",
    amount: 3_500, db_cr: "D", balance: 34_922_840 },

  // 10. Invoice — PT Global Supplier Indonesia
  { no: 14, post_date: "2026-06-20 08:00:00", branch: "BNI DIRECT", journal_no: "990711",
    description_raw: "TRANSFER KE | PEMINDAHAN KE   6789012345    PT GLOBAL SUPPLIER INDONESIA | Inv/2026/04/19/GSI-1102 | 202604201234567891",
    amount: 18_300_000, db_cr: "D", balance: 16_622_840 },
];

// ─── COA Master ──────────────────────────────────────────
export const COA_MASTER: COAEntry[] = [
  { code: "1-10001", name: "Kas Tunai",                         type: "Aset Lancar",       normal_balance: "D", is_active: true },
  { code: "1-10002", name: "Kas Kecil",                         type: "Aset Lancar",       normal_balance: "D", is_active: true },
  { code: "1-10101", name: "Bank BNI - Giro Utama",             type: "Aset Lancar",       normal_balance: "D", is_active: true },
  { code: "1-10102", name: "Bank BCA - Tabungan Operasional",   type: "Aset Lancar",       normal_balance: "D", is_active: true },
  { code: "1-10201", name: "Piutang Usaha",                     type: "Aset Lancar",       normal_balance: "D", is_active: true },
  { code: "1-10202", name: "Piutang Lain-lain",                 type: "Aset Lancar",       normal_balance: "D", is_active: true },
  { code: "1-10301", name: "Persediaan Barang",                 type: "Aset Lancar",       normal_balance: "D", is_active: true },
  { code: "1-10401", name: "Biaya Dibayar di Muka",             type: "Aset Lancar",       normal_balance: "D", is_active: true },
  { code: "1-20001", name: "Aset Tetap - Kendaraan",            type: "Aset Tetap",        normal_balance: "D", is_active: true },
  { code: "1-20002", name: "Akumulasi Penyusutan Kendaraan",    type: "Aset Tetap",        normal_balance: "C", is_active: true },
  { code: "1-20003", name: "Aset Tetap - Peralatan Kantor",     type: "Aset Tetap",        normal_balance: "D", is_active: true },
  { code: "2-10001", name: "Hutang Usaha",                      type: "Kewajiban Lancar",  normal_balance: "C", is_active: true },
  { code: "2-10002", name: "Hutang Bank BNI",                   type: "Kewajiban Lancar",  normal_balance: "C", is_active: true },
  { code: "2-10101", name: "Hutang Pajak PPh 21",               type: "Kewajiban Lancar",  normal_balance: "C", is_active: true },
  { code: "2-10102", name: "Hutang PPN",                        type: "Kewajiban Lancar",  normal_balance: "C", is_active: true },
  { code: "3-10001", name: "Modal Disetor",                     type: "Ekuitas",           normal_balance: "C", is_active: true },
  { code: "4-10001", name: "Pendapatan Penjualan",              type: "Pendapatan",        normal_balance: "C", is_active: true },
  { code: "4-10002", name: "Pendapatan Jasa",                   type: "Pendapatan",        normal_balance: "C", is_active: true },
  { code: "5-10001", name: "HPP - Pembelian Barang",            type: "Harga Pokok",       normal_balance: "D", is_active: true },
  { code: "5-10002", name: "HPP - Ongkos Kirim",                type: "Harga Pokok",       normal_balance: "D", is_active: true },
  { code: "6-10001", name: "Beban Gaji Karyawan",               type: "Beban Operasional", normal_balance: "D", is_active: true },
  { code: "6-10002", name: "Beban Administrasi Bank",           type: "Beban Operasional", normal_balance: "D", is_active: true },
  { code: "6-10003", name: "Beban Token Listrik",               type: "Beban Operasional", normal_balance: "D", is_active: true },
  { code: "6-10004", name: "Beban Pulsa & Internet",            type: "Beban Operasional", normal_balance: "D", is_active: true },
  { code: "6-10005", name: "Beban Sewa Kantor",                 type: "Beban Operasional", normal_balance: "D", is_active: true },
  { code: "6-10006", name: "Beban Transportasi & BBM",          type: "Beban Operasional", normal_balance: "D", is_active: true },
  { code: "6-10007", name: "Beban Perlengkapan Kantor",         type: "Beban Operasional", normal_balance: "D", is_active: true },
  { code: "6-10008", name: "Beban Iklan & Promosi",             type: "Beban Operasional", normal_balance: "D", is_active: true },
  { code: "6-10009", name: "Beban Pemeliharaan Aset",           type: "Beban Operasional", normal_balance: "D", is_active: true },
  { code: "6-10010", name: "Beban Uang Makan Karyawan",         type: "Beban Operasional", normal_balance: "D", is_active: true },
];

// ─── Vendor Master ──────────────────────────────────────────
export const VENDOR_MASTER: VendorEntry[] = [
  { code: "V-001", name: "PT Sumber Makmur Jaya",       npwp: "01.234.567.8-091.000", phone: "021-5551234", email: "billing@sumbermakmur.co.id",   is_active: true  },
  { code: "V-002", name: "PT Karya Mandiri",             npwp: "02.345.678.9-012.000", phone: "021-5552345", email: "finance@karyamandiri.co.id",    is_active: true  },
  { code: "V-003", name: "CV Mitra Teknik Utama",        npwp: "03.456.789.0-123.000", phone: "022-7778888", email: "ar@mitrateknik.co.id",           is_active: true  },
  { code: "V-004", name: "PT Indah Logistik",            npwp: "04.567.890.1-234.000", phone: "021-6667777", email: "invoice@indahlogistik.com",      is_active: true  },
  { code: "V-005", name: "CV Bintang Sejahtera",         npwp: "05.678.901.2-345.000", phone: "031-8889999", email: "keuangan@bintangsejahtera.id",   is_active: true  },
  { code: "V-006", name: "PT Global Supplier Indonesia", npwp: "06.789.012.3-456.000", phone: "021-3334444", email: "ap@globalsupplier.co.id",        is_active: true  },
  { code: "V-007", name: "UD Maju Bersama",              npwp: "07.890.123.4-567.000", phone: "024-5556666", email: "udmajubersama@gmail.com",        is_active: true  },
  { code: "V-008", name: "PT Prima Teknindo",            npwp: "08.901.234.5-678.000", phone: "021-7778888", email: "billing@primateknindo.co.id",    is_active: false },
  { code: "V-009", name: "CV Anugrah Sejati",            npwp: "09.012.345.6-789.000", phone: "022-9990000", email: "invoice@anugrahsejati.co.id",   is_active: true  },
  { code: "V-010", name: "PT Nusantara Trade",           npwp: "10.123.456.7-890.000", phone: "021-1112222", email: "ar@nusantaratrade.com",          is_active: true  },
];

// ─── Audit Log ──────────────────────────────────────────
export const AUDIT_LOG: AuditLogEntry[] = [
  {
    id: "log-015",
    timestamp: "2026-06-03 14:22:10",
    user: "bonaventuraoctavito@gmail.com",
    action: "push_single",
    description: "Push transaksi Invoice 205001122 - PT Indah Logistik",
    module: "Pembayaran Pembelian",
    status: "sukses",
    amount: 25_000_000,
  },
  {
    id: "log-014",
    timestamp: "2026-06-03 14:20:05",
    user: "bonaventuraoctavito@gmail.com",
    action: "push_single",
    description: "Push transaksi Beban Admin Bank (April 2026)",
    module: "Pengeluaran Kas/Bank Lain",
    status: "sukses",
    amount: 15_000,
  },
  {
    id: "log-013",
    timestamp: "2026-06-03 09:00:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "import_statement",
    description: "Import e-statement Rekening_Koran_BNI_April2026.xlsx",
    module: null,
    status: "sukses",
    affected_count: 10,
  },
  {
    id: "log-012",
    timestamp: "2026-06-01 08:30:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "sync_coa",
    description: "Sinkronisasi Master COA dari Accurate Online",
    module: null,
    status: "sukses",
    affected_count: 30,
  },
  {
    id: "log-011",
    timestamp: "2026-03-31 16:45:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "push_batch",
    description: "Push batch 8 transaksi periode Maret 2026",
    module: "Pembayaran Pembelian",
    status: "sukses",
    affected_count: 8,
    amount: 142_500_000,
  },
  {
    id: "log-010",
    timestamp: "2026-03-31 16:40:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "import_statement",
    description: "Import e-statement Rekening_Koran_BNI_Maret2026.xlsx",
    module: null,
    status: "sukses",
    affected_count: 13,
  },
  {
    id: "log-009",
    timestamp: "2026-03-15 11:20:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "push_single",
    description: "Push transaksi Invoice 204312001 - PT Global Supplier Indonesia",
    module: "Pembayaran Pembelian",
    status: "gagal",
    amount: 8_750_000,
  },
  {
    id: "log-008",
    timestamp: "2026-03-15 11:18:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "resolve_review",
    description: "Tandai direview: transfer internal ke rekening BCA",
    module: null,
    status: "sukses",
  },
  {
    id: "log-007",
    timestamp: "2026-03-10 09:00:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "sync_vendor",
    description: "Sinkronisasi Master Vendor dari Accurate Online",
    module: null,
    status: "sukses",
    affected_count: 10,
  },
  {
    id: "log-006",
    timestamp: "2026-03-01 08:00:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "push_batch",
    description: "Push batch 6 transaksi periode Februari 2026",
    module: "Pembayaran Pembelian",
    status: "sukses",
    affected_count: 6,
    amount: 98_200_000,
  },
  {
    id: "log-005",
    timestamp: "2026-02-28 15:30:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "import_statement",
    description: "Import e-statement Rekening_Koran_BNI_Feb2026.xlsx",
    module: null,
    status: "sukses",
    affected_count: 9,
  },
  {
    id: "log-004",
    timestamp: "2026-02-14 10:00:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "push_single",
    description: "Push transaksi Beban Token Listrik",
    module: "Pengeluaran Kas/Bank Lain",
    status: "sukses",
    amount: 500_000,
  },
  {
    id: "log-003",
    timestamp: "2026-02-01 09:15:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "push_batch",
    description: "Push batch 5 transaksi periode Januari 2026",
    module: "Pembayaran Pembelian",
    status: "sukses",
    affected_count: 5,
    amount: 76_400_000,
  },
  {
    id: "log-002",
    timestamp: "2026-01-31 14:00:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "sync_coa",
    description: "Sinkronisasi Master COA dari Accurate Online",
    module: null,
    status: "sukses",
    affected_count: 30,
  },
  {
    id: "log-001",
    timestamp: "2026-01-15 08:00:00",
    user: "bonaventuraoctavito@gmail.com",
    action: "import_statement",
    description: "Import e-statement Rekening_Koran_BNI_Jan2026.xlsx",
    module: null,
    status: "sukses",
    affected_count: 8,
  },
];

// ─── Bank Account Mapping ──────────────────────────────────────────
export const DEFAULT_BANK_MAPPINGS: BankAccountMapping[] = [
  {
    id: "bm-1",
    account_no: "0123456789",
    account_name: "Giro Utama PT Ega Accurate Indonesia",
    bank_name: "BNI",
    coa_code: "1-10101",
    coa_name: "Bank BNI - Giro Utama",
  },
];
