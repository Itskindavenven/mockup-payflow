# AP Automation App — Project Docs
**PT Ega Accurate Indonesia · June 2026**

---

## 1. Tujuan Aplikasi

Otomasi pencatatan transaksi pengeluaran (AP — Accounts Payable) dari rekening koran bank BNI ke Accurate Online.

**Masalah yang diselesaikan:**
- Finance team saat ini membaca rekening koran BNI secara manual, lalu mencari invoice/PO terkait, lalu input satu per satu ke Accurate Online.
- Proses itu lambat, rawan salah ketik, dan butuh skill Accurate yang cukup dalam.

**Solusi:**
- User upload file e-statement XLS dari BNI.
- Sistem otomatis membaca setiap baris transaksi, mendeteksi pola (nomor invoice, jenis biaya), memetakan ke COA yang tepat, lalu menyajikan tabel siap-push.
- User tinggal review singkat → tekan tombol push → jurnal masuk ke Accurate Online via API.

---

## 2. Tech Stack

| Layer | Pilihan | Versi |
|---|---|---|
| Framework | Next.js App Router | 16.2.9 |
| Language | TypeScript | strict mode |
| Styling | Tailwind CSS | v4 |
| UI Components | shadcn/ui | (Table, Sheet, Badge, Button, Select, dll) |
| Animation | framer-motion | AnimatePresence, motion.tr |
| Toast | sonner | |
| Icons | lucide-react | |

Struktur folder:
```
src/
  app/
    page.tsx                  ← Dashboard / landing
    transaksi/
      page.tsx                ← Halaman utama AP (wizard + tabel)
  components/
    AppShell.tsx              ← Layout wrapper (sidebar/nav)
    TransactionWizard.tsx     ← 4-step wizard sebelum analisis
    TransactionTable.tsx      ← Tabel jurnal + popover + push button
    TransactionDetailSheet.tsx← Side sheet detail + manual review
  lib/
    mock-data.ts              ← Data statis (DB, COA, vendor, raw txn, audit log)
    parser.ts                 ← Logic parsing, enriching, grouping
```

---

## 3. User Flow Lengkap

```
Login
  └─ Dashboard
       └─ Klik menu "Transaksi AP"
            └─ Wizard (4 langkah)
                 Step 1: Pilih database Accurate (Production / Training / Archive)
                 Step 2: Pilih rekening Kas/Bank (dropdown COA yang tipe Bank)
                 Step 3: Konfirmasi daftar vendor aktif (pull dari Accurate)
                 Step 4: Upload e-statement XLS/XLSX BNI
                           └─ "Gunakan data demo" tersedia sebagai shortcut
                 Klik "Mulai Analisis"
                      └─ Tabel Transaksi AP
                           ├─ Summary cards (Total / Sudah / Akan di-push / Perlu Review)
                           ├─ Search + filter status
                           ├─ Tombol "Push Semua"
                           └─ Per baris:
                                ├─ Hover label → tooltip ringkas
                                ├─ Klik label → popover detail + tombol Push Jurnal
                                └─ Tombol Aksi: Push Jurnal / Review / Selesai
```

---

## 4. Data Model

### 4.1 RawTransaction — input dari CSV/XLS

```typescript
interface RawTransaction {
  no: number;
  post_date: string;         // "2026-04-01 06:24:32"
  branch: string;            // nama cabang BNI
  journal_no: string;        // "969857" — KUNCI GROUPING
  description_raw: string;   // keterangan asli dari bank (panjang, berantakan)
  amount: number;            // nominal transaksi
  db_cr: "D" | "C";         // Debit atau Kredit
  balance: number;           // saldo setelah transaksi
}
```

**Catatan kritis:** `journal_no` adalah kunci utama grouping. Satu jurnal di Accurate bisa terdiri dari beberapa baris di CSV — contoh: pembayaran PLN + biaya admin → dua baris CSV, satu `journal_no` yang sama ("969857").

### 4.2 EnrichedTransaction — setelah parsing

```typescript
interface EnrichedTransaction extends RawTransaction, ParsedTransaction {
  id: string;                // `${journal_no}-${no}`
  is_admin_fee: boolean;     // true jika baris ini adalah biaya admin bank
  // dari ParsedTransaction:
  detected_invoice_no: string | null;
  detected_vendor: string | null;
  detected_keyword: string | null;
  suggested_coa: string | null;
  accurate_status: AccurateStatus;
  sync_action: SyncAction;
  display_label: string;     // label singkat untuk ditampilkan di tabel
}
```

### 4.3 JournalGroup — unit yang ditampilkan di tabel

```typescript
interface JournalGroup {
  group_id: string;             // = journal_no
  journal_no: string;
  rows: EnrichedTransaction[];  // SEMUA baris dengan journal_no ini (flat, tidak di-collapse)
  primary: EnrichedTransaction; // baris pertama yang bukan admin fee
  total_debit: number;          // jumlah semua baris D dalam grup
  accurate_status: AccurateStatus;
  sync_action: SyncAction;
  display_label: string;
  detected_invoice_no: string | null;
  detected_keyword: string | null;
  suggested_coa: string | null;
  post_date: string;
  db_cr: "D" | "C";
}
```

**Penting:** Status, tombol Push, badge status — semuanya ada di level `JournalGroup`, bukan per baris. Ini sesuai cara kerja Accurate: satu `journal_no` = satu jurnal entry dengan multiple debit lines.

### 4.4 Status & Action Types

```typescript
type AccurateStatus =
  | "sudah_tercatat"   // sudah ada di Accurate, skip
  | "akan_dipush"      // siap di-push
  | "perlu_review";    // tidak bisa dideteksi otomatis

type SyncAction =
  | "purchase-payment"  // transaksi vendor/invoice → /api/purchase-payment
  | "other-payment"     // biaya operasional → /api/other-payment
  | null;               // perlu_review atau kredit (tidak ada action)
```

---

## 5. Logic Parsing (src/lib/parser.ts)

### 5.1 Deteksi Admin Fee

```typescript
function isAdminFee(desc: string): boolean {
  const lower = desc.toLowerCase();
  return lower.includes("biaya admin") || lower.trim() === "by trx bifast";
}
```

Tiga pola admin fee dari data nyata BNI:
- `BIAYA ADMIN (PLN PREPAID)` → Rp 3.500
- `BIAYA ADMIN (TLKM BANDUNG)` → Rp 2.800
- `BY TRX BIFAST` → Rp 2.500

Admin fee selalu di-hardcode ke:
- `suggested_coa` = "Beban Admin Bank"
- `accurate_status` = "akan_dipush"
- `sync_action` = "other-payment"
- `display_label` = "↳ Biaya Admin"

### 5.2 Deteksi Invoice (Purchase Payment)

Pattern regex: `/Inv\/(\d{4}\/\d{2}\/\d{2}\/\S+)/i`

Jika terdeteksi nomor invoice:
- Cek apakah sudah ada di `ALREADY_RECORDED_IN_ACCURATE[]`
- Jika belum → `akan_dipush` + `sync_action = "purchase-payment"`
- Jika sudah → `sudah_tercatat`

### 5.3 Keyword Map (Other Payment)

```typescript
const DEFAULT_KEYWORD_MAP = [
  { keyword: "pln prepaid",  coa: "Beban Token Listrik" },
  { keyword: "pln postpaid", coa: "Beban Listrik PLN" },
  { keyword: "tlkm",         coa: "Beban Telepon" },
  { keyword: "pulsa",        coa: "Beban Pulsa & Internet" },
  { keyword: "bensin",       coa: "Beban BBM" },
  { keyword: "uang makan",   coa: "Beban Uang Makan" },
];
```

Match pertama (case-insensitive) pada `description_raw` → `akan_dipush` + `sync_action = "other-payment"`.

### 5.4 Transaksi Kredit

`db_cr === "C"` → selalu `perlu_review`, `sync_action = null`. Uang masuk bukan scope AP.

### 5.5 Fallback

Tidak ada invoice, tidak ada keyword, bukan kredit → `perlu_review`. User harus manual input COA atau nomor invoice via sheet.

### 5.6 Grouping

`groupByJournalNo(rows)` → `JournalGroup[]`
- Group by `journal_no`, preserve insertion order dari CSV
- `primary` = baris pertama yang bukan admin fee (fallback ke baris pertama jika semua admin fee)
- `total_debit` = sum semua baris dengan `db_cr === "D"` dalam grup
- Status grup = status dari `primary`

---

## 6. Komponen UI Detail

### 6.1 TransactionWizard

4 step dengan AnimatePresence slide transition. State disimpan lokal di wizard.

- **Step 1 (Database):** 3 pilihan hardcoded (Production, Training, Archive). Radio-style buttons.
- **Step 2 (Kas Bank):** Filter `COA_MASTER` yang nama mengandung "bank". Radio-style.
- **Step 3 (Vendor):** Checklist vendor aktif dari `VENDOR_MASTER`. Toggle-all support. Max-height scroll.
- **Step 4 (Upload):** Drag-drop atau click-to-browse. Accept `.xls,.xlsx`. "Gunakan data demo" sebagai shortcut (simulasi 1.6s processing).

`handleComplete()`: enrich semua `RAW_TRANSACTIONS` → group → panggil `onComplete(config, groups)` ke page.

### 6.2 TransactionTable

**Kolom:** `#` · `Tanggal` · `Journal` · `Keterangan` · `Nominal` · `D/K` · `COA` · `Status` · `Aksi`

**Visual grouping** untuk jurnal dengan >1 baris CSV:
- Background `bg-teal-50/25` di semua baris grup
- Border kiri `border-l-2 border-teal-300`
- `Journal No`, `Status badge`, `Tombol Aksi` → hanya di baris pertama (`isFirst`)
- Baris admin fee → "↳ Biaya Admin" dalam warna amber

**RefCell** (cell Keterangan):
- Hover → dark tooltip (rounderd, panah bawah): Journal No + label + nominal
- Klik → `DetailCard` popover (fixed position via `getBoundingClientRect()`)
- Click outside → tutup popover

**DetailCard** (popover fixed position, z-50):
- Header: Journal No + badge status + total nominal (merah/hijau)
- Body: semua line items dalam grup
- Fields: COA, Modul Accurate, Tanggal
- Footer: tombol "Push Jurnal ke Accurate" (jika `akan_dipush`)

**Tombol Aksi** per grup (hanya row pertama):
- `akan_dipush` → tombol "Push Jurnal" (hitam, loading spinner saat push)
- `perlu_review` → tombol "Review" (outline amber) → buka `TransactionDetailSheet`
- `sudah_tercatat` → teks "✓ Selesai" (zinc, non-interactable)

### 6.3 TransactionDetailSheet

Side sheet (lebar 480px, slide dari kanan) — dibuka via tombol "Review":
- **Header:** Journal No + badge status + total debit/kredit
- **Line items:** semua row dalam grup ditampilkan (debit rows gelap, admin fee rows amber)
- **Hasil Parsing:** invoice no detected, keyword detected, COA, endpoint Accurate
- **Actions** (conditional per status):
  - `sudah_tercatat` → info box saja
  - `akan_dipush` → info endpoint + tombol "Push Jurnal ke Accurate"
  - `perlu_review` → form: input nomor invoice manual + dropdown pilih COA + tombol "Tandai Sudah Direview"

### 6.4 transaksi/page.tsx (Orchestrator)

State utama:
```
mode: "wizard" | "table"
baseGroups: JournalGroup[]      ← immutable, dari wizard
pushedIds: Set<string>          ← group_id yang sudah di-push
resolvedIds: Set<string>        ← group_id yang manual-resolved
pushingId: string | null        ← animasi loading per tombol
filter: AccurateStatus | "semua"
search: string
reviewGroup: JournalGroup | null ← yang sedang dibuka di sheet
```

`allGroups` (memo): overlay `pushedIds` dan `resolvedIds` ke atas `baseGroups` tanpa mutasi.

`handlePush(group_id)`: setTimeout 1s simulasi → tambah ke `pushedIds` → toast sukses.

`handlePushAll()`: ambil semua grup `akan_dipush` → setTimeout 1.8s → batch add ke `pushedIds`.

`handleManualResolve(group_id)`: tambah ke `resolvedIds` → status berubah dari `perlu_review` ke `akan_dipush` via memo.

---

## 7. Data Mock Saat Ini

14 baris `RAW_TRANSACTIONS` dari file nyata `PSN_CASH.csv` (rekening koran April 2026):

| Journal No | Isi | Baris | Status Grup |
|---|---|---|---|
| 059808 | Transfer keluar ke Sedaap Sejahtera Rp500rb | 1 | `perlu_review` |
| 123849 | Transfer masuk dari Airpay Rp721.875 (Kredit) | 1 | `perlu_review` |
| 969790 | PLN Prepaid Rp500.000 + Admin Rp3.500 | 2 | `akan_dipush` |
| 969857 | PLN Prepaid Rp200.000 + Admin Rp3.500 | 2 | `akan_dipush` |
| 092593 | Transfer masuk dari SIMSEM Rp282.645 (Kredit) | 1 | `perlu_review` |
| 900270 | PLN Postpaid Rp785.290 + Admin Rp3.500 | 2 | `akan_dipush` |
| 427385 | Transfer keluar besar Rp33.070.000 | 1 | `perlu_review` |
| 201125 | TLKM Bandung Rp429.570 + Admin Rp2.800 | 2 | `akan_dipush` |
| 928150 | BIFAST Rp300.000 + BY TRX BIFAST Rp2.500 | 2 | `akan_dipush` |

**Total:** 9 jurnal, 14 rows. 5 grup berisi 2 baris, 4 grup solo.

---

## 8. Apa yang Masih Mock / Belum Real

| Fitur | Kondisi Sekarang | Yang Dibutuhkan Nanti |
|---|---|---|
| Upload XLS | Simulasi (1.6s delay, file tidak benar-benar di-parse) | Parse XLS server-side pakai `xlsx`/SheetJS, validasi format kolom BNI |
| Data transaksi | Hardcoded 14 baris dari CSV | Parse dari file upload nyata |
| Database Accurate | Hardcoded 3 opsi | `GET /accurate/api/databases` |
| COA Master | Hardcoded 30 entry | `GET /accurate/api/coa` |
| Vendor Master | Hardcoded 10 entry | `GET /accurate/api/vendors` |
| Push ke Accurate | `setTimeout` simulasi | `POST` ke Accurate API dengan payload jurnal |
| Auth | Tidak ada | Accurate OAuth / API key per database |
| `ALREADY_RECORDED_IN_ACCURATE` | Array kosong (semua dianggap baru) | Query Accurate API untuk cek duplikat |

---

## 9. Pertanyaan Terbuka untuk Didiskusikan

### A. Arsitektur Push ke Accurate
- Accurate Online punya public API yang bisa dipanggil dari server/browser?
- Format payload untuk "Pembayaran Lain" vs "Pembayaran Pembelian" — field-nya berbeda?
- Jika push batch gagal sebagian, bagaimana rollback?
- Rate limit API Accurate?

### B. Parsing File XLS BNI
- Format rekening koran BNI bisa berbeda antar jenis produk (BNI Giro, Tabungan, BNI Direct) — perlu mapping kolom yang fleksibel.
- Kolom yang diharapkan: Tanggal, Cabang, Journal No, Keterangan, Debet, Kredit, Saldo.
- Baris header/footer/summary BNI perlu di-skip.
- Parse di server (API route) atau client-side?

### C. Keyword Map
- Saat ini hardcoded, user tidak bisa kelola dari UI.
- Perlu halaman settings untuk mapping keyword → COA?
- Keyword map per-database atau global?

### D. Transaksi Kredit / Transfer Internal
- Uang masuk saat ini auto `perlu_review` — correct?
- Transfer antar rekening sendiri (mis. BNI ke BCA) — bagaimana handle? Skip atau jurnal khusus?

### E. Transaksi Perlu Review
- Setelah user input manual (invoice no / COA) → langsung push, atau hanya "siap push" dulu?
- Jika nomor invoice manual tidak ketemu di Accurate → error handling?

### F. Multi-user / Auth
- Hanya satu user admin finance, atau ada roles?
- Credentials Accurate (API key per database) disimpan di mana — environment variables, database, atau user input setiap sesi?

### G. Halaman Lain yang Belum Ada
- **Audit Log:** Interface `AuditLogEntry` dan data mock sudah siap di `mock-data.ts`, halamannya belum dibuat.
- **Dashboard:** `/` masih placeholder — mau menampilkan apa? (Ringkasan bulan ini, saldo, transaksi pending?)
- **Settings:** Keyword map, mapping rekening bank ↔ COA, koneksi Accurate.

---

## 10. Cara Jalankan (Dev)

```bash
npm install
npm run dev
# Buka http://localhost:3000 (atau :3002 jika port sudah dipakai)
```

**Path ke fitur AP:**
1. Klik "Transaksi AP" di sidebar
2. Ikuti wizard: pilih database → pilih kas bank → konfirmasi vendor → step upload
3. Klik "Gunakan data demo" di step 4
4. Klik "Mulai Analisis"
5. Tabel muncul dengan 9 jurnal, 5 di antaranya siap di-push

**TypeScript check:**
```bash
npx tsc --noEmit
# Harus keluar tanpa output (clean)
```
