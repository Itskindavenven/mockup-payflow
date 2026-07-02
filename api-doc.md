# Dokumentasi API Accurate

Konversi dari halaman *Area Developer: Dokumentasi API* (HTML) ke Markdown.

Dokumen ini berisi dua kelompok API:

1. **API Dasar** — endpoint dasar (`https://account.accurate.id`)
2. **API Accurate** — endpoint data usaha (`https://xyz.accurate.id/accurate`)

> Catatan konversi: Untuk parameter bertipe objek kompleks (mis. `SortPaging`, `Money`, filter dinamis, atau parameter `Param$Parameter` dari masing-masing transaksi), tipe data ditampilkan dengan nama singkatnya (bagian terakhir dari nama kelas Java). Detail field dari objek-objek tersebut sangat banyak (ratusan tipe turunan) sehingga dirangkum secara umum di bagian **Tipe Data Umum** di akhir dokumen, bukan diulang di setiap parameter.

---

## 1. API Dasar

- **Endpoint:** `https://account.accurate.id`
- **Versi:** 1.0.0

| Method | Path | Scope | Deskripsi |
|---|---|---|---|
| GET | `/api/approved-scope.do` | – | Daftar scope OAuth2 yang telah disetujui oleh pengguna untuk token yang sedang digunakan |
| GET | `/api/auth-info.do` | – | Informasi pengguna dari token yang sedang digunakan |
| GET | `/api/db-check-session.do` | – | Memeriksa apakah Data Usaha session masih dapat digunakan |
| GET | `/api/db-detail.do` | – | Detil informasi database |
| GET | `/api/db-list.do` | – | Daftar data usaha yang dapat diakses |
| GET | `/api/db-refresh-session.do` | – | Memeriksa dan mengganti Data Usaha session jika sudah tidak dapat digunakan |
| GET | `/api/db-status.do` | – | Memeriksa status database |
| GET | `/api/open-db.do` | – | Mengakses database |
| GET | `/api/userinfo.do` | – | Informasi OAuth2 Claim dari pengguna yang digunakan |
| GET | `/api/webhook-history.do` | – | Daftar pengiriman webhook dalam 1 bulan terakhir (hanya untuk token developer aplikasi) |
| GET | `/api/webhook-renew.do` | – | Memperpanjang lama aktif webhook |

### Parameter penting

**`/api/db-check-session.do`**
- `session` (String, required) – Data Usaha session dari hasil `/open-db.do`

**`/api/db-detail.do`**, **`/api/db-status.do`**, **`/api/open-db.do`**
- `id` (Long, required) – ID data usaha yang ingin diakses

**`/api/db-refresh-session.do`**
- `id` (Long, required) – ID data usaha
- `session` (String, required) – Data Usaha session dari `/open-db.do`

**`/api/webhook-history.do`**
- `from` (String, required) – Filter tanggal mulai `createDate` (format `dd/MM/yyyy HH:mm:ss`)
- `to` (String, required) – Filter tanggal akhir `createDate` (rentang maksimal 24 jam)
- `databaseId` (Long, optional) – Filter berdasarkan ID data usaha
- `type` (String, optional) – Filter tipe webhook: `ITEM_QUANTITY, SALES_INVOICE_OWING, ITEM, SALES_ORDER, CUSTOMER, STOCK_MUTATION, GLACCOUNT, SALES_QUOTATION, DELIVERY_ORDER, SALES_INVOICE, SALES_RETURN, SALES_RECEIPT, ITEM_ADJUSTMENT, JOB_ORDER, ROLL_OVER, MATERIAL_ADJUSTMENT, WAREHOUSE, ITEM_TRANSFER, PURCHASE_ORDER, PURCHASE_REQUISITION, PURCHASE_INVOICE, PURCHASE_RETURN, RECEIVE_ITEM, PURCHASE_PAYMENT`

---

## 2. API Accurate

- **Endpoint:** `https://xyz.accurate.id/accurate`
- **Versi:** 1.0.1

Semua endpoint POST/GET/DELETE berada di bawah path `/accurate/api/<modul>/<action>.do`.

Header umum opsional pada hampir semua aksi: **`X-Session-ID`** (String) — hanya dibutuhkan jika menggunakan Metode Otorisasi OAuth; berisi Kode Session dari hasil `/api/open-db.do`.

Parameter umum yang sering muncul:
- `id` (Long) – Identitas unik record, didapat dari field `id` di setiap record data
- `number` (String) – Nomor transaksi (alternatif `id` saat delete/detail, atau untuk override penomoran otomatis saat save)
- `fields` (String) – Daftar field yang ingin ditampilkan pada `list.do`, dipisah koma
- `filter` (objek `ApiFilter`) – Filter dinamis spesifik per modul
- `sp` (objek `SortPaging`) – Pengaturan halaman & pengurutan: `page` (Integer), `pageSize` (Integer, default 20), `sort` (String, format `field|asc;field2|desc`)
- `keywords` (String, *deprecated*) – Kata kunci pencarian

---

### `/api/access-privilege` — Akses Grup

| Method | Action | Scope | Deskripsi |
|---|---|---|---|
| GET | `detail` | `access_privilege_view` | Detil data Akses Grup. Param: `id` (Long, required) |
| GET | `list` | `access_privilege_view` | Daftar data Akses Grup. Param: `filter`, `keywords` *(deprecated)*, `sp` |

### `/api/auto-number` — Penomoran

| Method | Action | Scope | Deskripsi |
|---|---|---|---|
| GET | `list` | `auto_number_view` | Daftar data Penomoran. Param: `filter`, `sp` |

### `/api/bank-transfer` — Transfer Bank

| Method | Action | Scope | Deskripsi |
|---|---|---|---|
| POST | `bulk-save` | `bank_transfer_save` | Simpan banyak Transfer Bank sekaligus (maks 100). Param: `data[]` (`BankTransferParam$Parameter`, required) |
| DELETE | `delete` | `bank_transfer_delete` | Hapus data. Param: `id` atau `number` |
| GET | `detail` | `bank_transfer_view` | Detil data. Param: `id` atau `number` |
| GET | `list` | `bank_transfer_view` | Daftar data. Param: `fields`, `filter`, `sp` |
| POST | `save` | `bank_transfer_save` | Simpan/ubah data Transfer Bank. Body: `BankTransferParam$Parameter` (lihat skema di bawah) |

**Skema `BankTransferParam$Parameter` (ringkas):**
`fromBankAmount`*(Money, req)*, `fromBankNo`*(String, req)*, `toBankNo`*(String, req)*, `transDate`*(Date, req)*, `branchId`/`branchName`, `description`, `detailBankTransfer[]` (`BankTransferDetailParam$Parameter`: `accountNo`*(req)*, `amount`*(Money, req)*, `bankChargeType`*(enum, req)*, `expenseName`*(req)*, plus kategori keuangan 1–10, `departmentName`, `memo`, dll.), `differenceAccountNo`, `fromBankRate`, `id`, `toBankRate`, `toBranchName`, `typeAutoNumber`.

### `/api/bill-of-material` — Formula Produksi

| Method | Action | Scope | Deskripsi |
|---|---|---|---|
| DELETE | `delete` | `bill_of_material_delete` | Hapus. Param: `id`/`number` |
| GET | `detail` | `bill_of_material_view` | Detil. Param: `id`/`number` |
| GET | `list` | `bill_of_material_view` | Daftar. Param: `approvalStatusFilter`*(deprecated)*, `branchFilter`*(deprecated)*, `fields`, `filter`, `keywords`*(deprecated)*, `lastUpdateFilter`*(deprecated)*, `sp`, `transDateFilter`*(deprecated)* |
| POST | `save` | `bill_of_material_save` | Simpan. Body: `BillOfMaterialParam$Parameter` |

### `/api/bom-process-category` — Tahapan Produksi

| Method | Action | Scope | Deskripsi |
|---|---|---|---|
| DELETE | `delete` | `bom_process_category_delete` | Hapus. Param: `id` |
| GET | `list` | `bom_process_category_view` | Daftar. Param: `fields`, `filter`, `keywords`*(deprecated)*, `sp` |

### `/api/branch` — Cabang

| Method | Action | Scope |
|---|---|---|
| POST | `bulk-save` | `branch_save` |
| DELETE | `delete` | `branch_delete` |
| GET | `detail` | `branch_view` |
| GET | `list` | `branch_view` |
| POST | `save` | `branch_save` |

Delete/Detail dapat memakai `branchName` sebagai alternatif `id`. Body save: `BranchParam$Parameter` (`name`*(req)*, `city`, `country`, `id`, `province`, `street`, `zipCode`).

### `/api/currency` — Mata Uang

| Method | Action | Scope | Deskripsi |
|---|---|---|---|
| POST | `bulk-save` | `currency_save` | Simpan banyak sekaligus |
| GET | `detail` | `currency_view` | Param: `id` |
| GET | `exchange-rate` | `currency_view` | Histori kurs. Param: `code`*(req)*, `id` |
| GET | `fiscal-rate` | `currency_view` | Histori kurs pajak. Param: `code`*(req)*, `id` |
| GET | `list` | `currency_view` | Param: `keywords`*(deprecated)*, `sp` |
| POST | `save` | `currency_save` | Body: `CurrencyParam$Parameter` (`code`*(req)*, `id`) |

### `/api/customer` — Pelanggan

| Method | Action | Scope |
|---|---|---|
| POST | `bulk-save` | `customer_save` |
| DELETE | `delete` | `customer_delete` |
| GET | `detail` | `customer_view` |
| GET | `list` | `customer_view` |
| POST | `save` | `customer_save` |

Param tambahan `list`: `npwpNo`*(deprecated)*, `lastUpdateFilter`*(deprecated)*, `suspendedFilter`*(deprecated)*, `wpNumber`. Delete/detail bisa pakai `customerNo`. Body save: `CustomerParam$Parameter` — lihat **Skema Master Pelanggan/Pemasok** di bawah.

### `/api/customer-category` — Kategori Pelanggan

CRUD standar (`bulk-save`, `delete`, `detail`, `list`, `save`), scope `customer_category_*`. Body: `CustomerCategoryParam$Parameter` (`name`*(req)*, `defaultCategory`, `id`, `parentName`).

### `/api/customer-claim` — Klaim Pelanggan

CRUD standar, scope `customer_claim_*`. Body: `CustomerClaimParam$Parameter` (`customerClaimType`*(enum CUSTOMER_CLAIM_IN/OUT, req)*, `customerNo`*(req)*, `detailItem[]`*(req)*, `transDate`*(req)*, `branchId/Name`, `description`, `fromCustomerClaimNo`, `saveAsStatusType`, `toAddress`, `typeAutoNumber`).

### `/api/data-classification` — Kategori Keuangan

CRUD (`bulk-save`,`delete`,`list`,`save`), scope `data_classification_*`. List punya param `index` (Kategori Keuangan 1–10 sesuai Preferensi). Body: `DataClassificationParam$Parameter` (`index`*(Integer, req)*, `name`*(req)*, `id`, `suspended`).

### `/api/delivery-order` — Pengiriman Pesanan

CRUD standar, scope `delivery_order_*`. Body: `DeliveryOrderParam$Parameter` — header transaksi pengiriman + `detailItem[]` (`DeliveryOrderDetailParam$Parameter`).

### `/api/department` — Departemen

CRUD standar, scope `department_*`. Delete/detail bisa pakai `departmentName`. Body: `DepartmentParam$Parameter` (`description`*(req)*, `name`*(req)*, `id`).

### `/api/employee` — Karyawan

| Method | Action | Scope |
|---|---|---|
| DELETE | `delete` | `employee_delete` |
| GET | `detail` | `employee_view` |
| GET | `list` | `employee_view` |
| POST | `save` | `employee_save` |

Body save: `EmployeeParam$Parameter` (`name`, `salutation`*(enum MR/MRS)*, `transDate`, banyak field administrasi pajak/PPh21: `npwpNo`, `pph`, `pphBefore`, `employeeTaxStatus`*(K0/K1/K2/K3/TK0-3)*, `employeeWorkStatus`*(enum, lihat tipe `EmployeeWorkStatusType`)*, alamat, dll.)

### `/api/exchange-invoice` — Tukar Faktur

CRUD standar, scope `exchange_invoice_*`. Body: `ExchangeInvoiceParam$Parameter` (`collectDate`*(req)*, `currencyCode`*(req)*, `detailInvoice[]`*(req)*, `dueDate`*(req)*, `transDate`*(req)*).

### `/api/expense` — Pencatatan Beban

CRUD standar, scope `expense_accrual_*`. Body: `ExpenseAccrualParam$Parameter` (`detailAccount[]`*(req)*, `dueDate`*(req)*, `expensePayableNo`*(req)*, `transDate`*(req)*).

### `/api/finished-good-slip` — Penyelesaian Barang Jadi

CRUD standar, scope `finished_good_slip_*`. Body: `FinishedGoodSlipParam$Parameter` (`branchId`*(req)*, `detailItem[]`*(req)*, `transDate`*(req)*, `workOrderNumber`*(req)*).

### `/api/fixed-asset` — Aset Tetap

| Method | Action | Scope |
|---|---|---|
| DELETE | `delete` | `fixed_asset_delete` |
| GET | `detail` | `fixed_asset_view` |
| GET | `list` | `fixed_asset_view` |

(Tidak ada endpoint `save` untuk Aset Tetap pada dokumentasi ini.)

### `/api/fob` — FOB (Free On Board)

CRUD standar, scope `fob_*`. Body: `FreeOnBoardParam$Parameter` (`name`*(req)*, `id`).

### `/api/freeonboard` *(deprecated, gunakan `/api/fob`)*

CRUD standar (seluruh aksi ditandai *deprecated*), scope `freeonboard_*`.

### `/api/glaccount` — Akun Perkiraan

| Method | Action | Scope | Deskripsi |
|---|---|---|---|
| POST | `bulk-save` | `glaccount_save` | Simpan banyak sekaligus |
| DELETE | `delete` | `glaccount_delete` | `id` atau `no` |
| GET | `detail` | `glaccount_view` | `id` atau `no` |
| GET | `get-balance` | `glaccount_view` | Saldo akun per tanggal. Param: `no`*(req)*, `asOfDate`, `branchName`, `departmentName`, `fromDate`, `id`, `projectNo`, `toDate` |
| GET | `get-bs-account-amount` | `glaccount_view` | Saldo akun Neraca per tanggal. Param: `asOfDate`*(req)* |
| GET | `get-pl-account-amount` | `glaccount_view` | Saldo akun Laba Rugi per periode. Param: `fromDate`*(req)*, `toDate`*(req)* |
| GET | `list` | `glaccount_view` | Param: `accountType`*(deprecated)*, `fields`, `filter`, `keywords`*(deprecated)*, `leafOnly`*(deprecated)*, `sp` |
| POST | `save` | `glaccount_save` | Body: `GlAccountParam$Parameter` |

**`GlAccountParam$Parameter`:** `accountType`*(enum GlAccountType, req)*, `asOf`*(Date, req)*, `currencyCode`*(req)*, `name`*(req)*, `no`*(req)*, `bankAccount`, `bankAccountName`, `bankCode`, `id`, `memo`, `openBalance`*(Money)*, `parentNo`, `rate`, `useUserRoleAccessListId[]`.

### `/api/item` — Barang & Jasa

| Method | Action | Scope | Deskripsi |
|---|---|---|---|
| POST | `bulk-save` | `item_save` | Simpan banyak sekaligus |
| DELETE | `delete` | `item_delete` | `id` atau `no` |
| GET | `detail` | `item_view` | `id` atau `no` |
| GET | `get-nearest-cost` | `purchase_invoice_save` | HPP barang pada tanggal tertentu. Param: `itemNo`*(req)*, `transDate` |
| GET | `get-selling-price` | `item_view` | Harga & diskon barang. Param: `no`*(req)*, `branchName`, `currencyCode`, `discountCategoryName`, `effectiveDate`, `priceCategoryName`, `upcNo` |
| GET | `get-stock` | `item_view` | Jumlah stok. Param: `no`*(req)*, `warehouseName` |
| GET | `list` | `item_view` | Param: `fields`, `filter`, `itemCategoryFilter`*(deprecated)*, `itemTypeFilter`*(deprecated)*, `keywords`*(deprecated)*, `lastUpdateFilter`*(deprecated)*, `preferedVendorFilter`*(deprecated)*, `sp`, `suspendedFilter`*(deprecated)* |
| GET | `list-stock` | `item_view` | Daftar stok semua barang. Param: `asOfDate`, `sp`, `warehouseId`, `warehouseName` |
| POST | `save` | `item_save` | Body: `ItemParam$Parameter` |
| GET | `search-by-item-or-sn` | `item_view` | Param: `keywords`*(req)*, `sp` |
| GET | `search-by-no-upc` | `item_view` | Cari berdasarkan kode/UPC. Param: `keywords` |
| GET | `stock-mutation-history` | `stock_mutation_history_view` | Histori mutasi stok 7 hari terakhir. Param: `filter`, `sp` |
| GET | `vendor-price` | `item_view` | Harga beli terakhir dari pemasok. Param: `itemNo`*(req)*, `vendorNo`*(req)*, `currencyCode`, `currencyId`, `itemId`, `transDate`, `unitId`, `unitName`, `vendorId` |

**`ItemParam$Parameter` (ringkas):** `itemCategoryName`*(req)*, `itemType`*(enum ItemType: GROUP/INVENTORY/NON_INVENTORY/PRODUCTION_COST/SERVICE, req)*, `name`*(req)*, `unit1Name`*(req)*; opsional: `calculateGroupPrice`, akun-akun (`cogsGlAccountNo`, `inventoryGlAccountNo`, `salesGlAccountNo`, dll.), `controlQuantity`, `defaultDiscount`, `detailGroup[]`, `detailOpenBalance[]` (incl. nomor seri), dimensi (`dimDepth/Height/Width`, `weight`), `manageSN`/`manageExpired`/`serialNumberType`, `minimumQuantity(Reorder)`, `no`, `notes`, `percentTaxable`, `preferedVendorName`, satuan 2–5 beserta harga, pajak (`tax1Name`–`tax4Name`), `unitPrice`, `upcNo`, `usePpn`, `useWholesalePrice`, `vendorPrice`, `vendorUnitName`, dll.

### `/api/item-adjustment` — Penyesuaian Persediaan

| Method | Action | Scope |
|---|---|---|
| POST | `bulk-save` | `item_adjustment_save` |
| DELETE | `delete` | `item_adjustment_delete` |
| GET | `detail` | `item_adjustment_view` |
| GET | `list` | `item_adjustment_view` |
| POST | `save` | `item_adjustment_save` |
| POST | `save-target-quantity` | `item_adjustment_save` |

`save-target-quantity` menyimpan dengan kuantitas akhir yang diinginkan. Param: `detail[]`*(`AdjustmentDetail`, req: `itemNo`, `targetQuantity`, `warehouseName`; opsional `unitCost`)*, `adjustmentAccountNo`, `branchName`, `transDate`.

Body `save`: `ItemAdjustmentParam$Parameter` (`adjustmentAccountNo`*(req)*, `detailItem[]`*(req)*, `transDate`*(req)*).

### `/api/item-category` — Kategori Barang

CRUD standar, scope `item_category_*`. Body: `ItemCategoryParam$Parameter` (`name`*(req)*, `defaultCategory`, `id`, `parentName`).

### `/api/item-transfer` — Pemindahan Barang

CRUD standar, scope `item_transfer_*`. List punya `itemTransferOutStatus`, `itemTransferType`, `referenceWarehouseId`, `warehouseId`. Body: `ItemTransferParam$Parameter` (`detailItem[]`*(req)*, `itemTransferType`*(enum TRANSFER_IN/TRANSFER_OUT, req)*, `transDate`*(req)*, `fromItemTransferNo`, `referenceWarehouseName`, `warehouseName`, dll.).

### `/api/job-order` — Pekerjaan Pesanan

CRUD standar, scope `job_order_*`. Body: `JobOrderParam$Parameter` (`transDate`*(req)*, `customerNo`, `detailExpense[]`, `detailItem[]`, `differenceAccountNo`, `jobAccountNo`, `manualClosed`).

### `/api/journal-voucher` — Jurnal Umum

CRUD standar, scope `journal_voucher_*`. Body: `JournalVoucherParam$Parameter` (`detailJournalVoucher[]`*(req)*, `transDate`*(req)*) — detail: `accountNo`*(req)*, `amount`*(req)*, `amountType`*(enum DEBIT/CREDIT, req)*, plus subsidiary (`customerNo`/`vendorNo`/`employeeNo`) & `subsidiaryType`.

### `/api/manufacture-order` — Rencana Produksi

| Method | Action | Scope |
|---|---|---|
| DELETE | `delete` | `manufacture_order_delete` |
| GET | `detail` | `manufacture_order_view` |
| GET | `list` | `manufacture_order_view` |
| POST | `save` | `manufacture_order_save` |

Body: `ManufactureOrderParam$Parameter` (`branchId`*(req)*, `detailManufactureOrder[]`*(req)*, `transDate`*(req)*) — detail: `billOfMaterialNumber`*(req)*, `endDate`*(req)*, `quantity`*(req)*, `startDate`*(req)*, `manualClosed`.

### `/api/material-adjustment` — Penambahan Bahan Baku

CRUD standar, scope `material_adjustment_*`. Body: `MaterialAdjustmentParam$Parameter` (`detailItem[]`*(req)*, `jobOrderNumber`*(req)*, `materialAdjustmentAccountNo`*(req)*, `materialAdjustmentType`*(enum ITEM_PICK/ITEM_RETURN, req)*, `transDate`*(req)*).

### `/api/material-slip` — Pengambilan Bahan Baku

CRUD standar, scope `material_slip_*`. List punya `typeFilter`*(deprecated, ITEM_PICK/ITEM_RETURN)*. Body: `MaterialSlipParam$Parameter` (`detailItem[]`*(req)*, `materialSlipType`*(enum, req)*, `transDate`*(req)*, `workOrderNumber`*(req)*).

### `/api/other-deposit` — Penerimaan (Kas/Bank)

CRUD standar, scope `other_deposit_*`. Body: `OtherDepositParam$Parameter` (`bankNo`*(req)*, `detailAccount[]`*(req)*, `payee`*(req)*, `transDate`*(req)*).

### `/api/other-payment` — Pembayaran (Kas/Bank)

CRUD standar, scope `other_payment_*`. Body: `OtherPaymentParam$Parameter` (`bankNo`*(req)*, `detailAccount[]`*(req)*, `payee`*(req)*, `transDate`*(req)*).

### `/api/payment-term` — Syarat Pembayaran

CRUD standar, scope `payment_term_*`. Body: `PaymentTermParam$Parameter` (`discDays`*(req)*, `discPC`*(req)*, `name`*(req)*, `netDays`*(req)*, `defaultTerm`, `id`, `memo`).

### `/api/pos/customer`, `/api/pos/item`, `/api/pos/transaction` — Integrasi POS

| Endpoint | Method | Scope | Deskripsi |
|---|---|---|---|
| `/api/pos/customer/save.do` | POST | `customer_save` | Import/update master Pelanggan dari sistem POS |
| `/api/pos/item/save.do` | POST | `item_save` | Import/update master Barang & Jasa dari sistem POS |
| `/api/pos/transaction/save.do` | POST | `sales_invoice_save, sales_receipt_save, sales_return_save` | Import Faktur Penjualan, Pembayaran Pelanggan, dan Retur Penjualan sekaligus (param `invoices[]`, `payments[]`, `returns[]`, masing-masing `PosSaveParameter`) |

### `/api/price-category` — Kategori Penjualan

| Method | Action | Scope |
|---|---|---|
| GET | `detail` | `price_category_view` |
| GET | `list` | `price_category_view` |
| POST | `save` | `price_category_save` |

Body: `PriceCategoryParam$Parameter` (`name`, `description`, `id`).

### `/api/process-stages` — Tahapan Proses

| Method | Action | Scope |
|---|---|---|
| DELETE | `delete` | `process_stages_delete` |
| GET | `detail` | `process_stages_view` |
| GET | `list` | `process_stages_view` |
| POST | `save` | `process_stages_save` |

Body: `ProcessStagesParam$Parameter` (`processCategoryId`*(req)*, `processCategoryName`*(req)*, `processStagesType`*(enum START_PROCESS/END_PROCESS, req)*, `transDate`*(req)*, `workOrderNumber`*(req)*, `quantity`, `workTimeHours`, `workTimeMinutes`).

### `/api/project` — Proyek

CRUD standar, scope `project_*`. Delete/detail bisa pakai `projectNo`. Body: `ProjectParam$Parameter` (`name`*(req)*, `branchId`, `description`, `finishDate`, `id`, `no`, `startDate`, `suspended`).

### `/api/purchase-invoice` — Faktur Pembelian

| Method | Action | Scope |
|---|---|---|
| POST | `bulk-save` | `purchase_invoice_save` |
| POST | `create-down-payment` | `purchase_invoice_save` |
| DELETE | `delete` | `purchase_invoice_delete` |
| GET | `detail` | `purchase_invoice_view` |
| GET | `list` | `purchase_invoice_view` |
| POST | `save` | `purchase_invoice_save` |

`create-down-payment` — buat/ubah Uang Muka Pembelian. Param wajib: `billNumber`, `dpAmount`*(Money)*, `vendorNo`; opsional: `branchName`, `currencyCode`, `description`, `documentCode`/`documentTransaction`*(enum pajak)*, `fiscalRate`, `inclusiveTax`, `isTaxable`, `number`, `paymentTermName`, `poNumber`, `rate`, `tax1Name`, `taxDate`, `taxNumber`, `toAddress`, `transDate`, `typeAutoNumber`, `vendorTaxType`.

Body `save`: `PurchaseInvoiceParam$Parameter` — header faktur pembelian lengkap (`vendorNo`*(req)*) + `detailDownPayment[]`, `detailExpense[]`, `detailItem[]`, plus field pajak CoreTax (`documentCode`, `documentTransaction`), `invoiceDp`, `reverseInvoice`, dll.

### `/api/purchase-order` — Pesanan Pembelian

| Method | Action | Scope |
|---|---|---|
| POST | `bulk-save` | `purchase_order_save` |
| DELETE | `delete` | `purchase_order_delete` |
| GET | `detail` | `purchase_order_view` |
| GET | `list` | `purchase_order_view` |
| POST | `manual-close-order` | `purchase_order_save` |
| POST | `save` | `purchase_order_save` |

`manual-close-order`: `number`*(req)*, `orderClosed`*(Boolean, req)*. Body `save`: `PurchaseOrderParam$Parameter` (`vendorNo`*(req)*, `detailExpense[]`, `detailItem[]`, `fillPriceByVendorPrice`, `fobName`, `shipDate`, `shipmentName`, `vendorBankAccountId`, dll.).

### `/api/purchase-payment` — Pembayaran Pembelian

CRUD standar, scope `purchase_payment_*`. Body: `PurchasePaymentParam$Parameter` (`bankNo`*(req)*, `chequeAmount`*(req)*, `detailInvoice[]`*(req)*, `transDate`*(req)*, `vendorNo`*(req)*, `paymentMethod`*(enum PaymentMethodType)*).

### `/api/purchase-requisition` — Permintaan Barang

CRUD standar, scope `purchase_requisition_*`. Body: `PurchaseRequisitionParam$Parameter` (`detailItem[]`*(req)*, `transDate`*(req)*, `requisitionType`*(enum ALL/PURCHASE/TRANSFER)*, `saveAsStatusType`, `warehouseName`).

### `/api/purchase-return` — Retur Pembelian

CRUD standar, scope `purchase_return_*`. Body: `PurchaseReturnParam$Parameter` (`detailExpense[]`*(req)*, `detailItem[]`*(req)*, `returnType`*(enum INVOICE/INVOICE_DP/NO_INVOICE/RECEIVE, req)*, `taxDate`*(req)*, `taxNumber`*(req)*, `vendorNo`*(req)*).

### `/api/receive-item` — Penerimaan Barang

CRUD standar, scope `receive_item_*`. List punya `status`*(enum ReceiveItemStatus)*. Body: `ReceiveItemParam$Parameter` (`detailItem[]`*(req)*, `receiveNumber`*(req)*, `vendorNo`*(req)*, `fobName`, `paymentTermName`, `shipDate`, dll.).

### `/api/report` — Laporan

| Method | Action | Scope | Deskripsi |
|---|---|---|---|
| GET | `serial-number-mutation` | `stock_mutation_history_view` | Param: `itemNo`*(req)*, `fromDate`, `serialNumber`, `toDate` |
| GET | `serial-number-per-warehouse` | `stock_mutation_history_view` | Param: `itemNo`*(req)* |
| GET | `stock-mutation-summary` | `stock_mutation_history_view` | Param: `fromDate`*(req)*, `itemNo`*(req)*, `toDate`*(req)*, `itemId`, `warehouseName` |
| GET | `work-order-detail` | `work_order_view` | Param: `workOrderNo`*(req)* |

### `/api/roll-over` — Penyelesaian Pesanan

CRUD standar, scope `roll_over_*`. Body: `RollOverParam$Parameter` (`detailExpense[]`*(req)*, `detailItem[]`*(req)*, `jobOrderNumber`*(req)*, `rollOverType`*(enum ACCOUNT/ITEM, req)*, `transDate`*(req)*).

### `/api/sales-checkin` — Check In Sales

| Method | Action | Scope |
|---|---|---|
| GET | `detail` | `sales_checkin_view` |
| GET | `list` | `sales_checkin_view` |

List punya `branchFilter`, `createdDateFilter`, `customerFilter`, `employeeFilter`.

### `/api/sales-invoice` — Faktur Penjualan

| Method | Action | Scope |
|---|---|---|
| POST | `bulk-save` | `sales_invoice_save` |
| POST | `create-down-payment` | `sales_invoice_save` |
| DELETE | `delete` | `sales_invoice_save` |
| GET | `detail` | `sales_invoice_view` |
| GET | `detail-invoice` | `sales_invoice_view` |
| GET | `list` | `sales_invoice_view` |
| POST | `save` | `sales_invoice_save` |

`create-down-payment` mirip versi pembelian, tapi param wajib `customerNo`, `dpAmount`. `detail-invoice`: param `customerNo`*(req)*, `fromDate`, `itemNo`, `salesmanName`, `serialNumber`, `toDate`. Body `save`: `SalesInvoiceParam$Parameter` (`customerNo`*(req)*, `detailDownPayment[]`*(req)*, `detailExpense[]`*(req)*, `detailItem[]`*(req)*, field pajak CoreTax & retail (`notesIdTax`, `retailIdCard`, `retailIdTku`, `retailWpName/Number/Type`), `reverseInvoice`, `shipDate`, `taxType`, dll.).

### `/api/sales-order` — Pesanan Penjualan

| Method | Action | Scope |
|---|---|---|
| POST | `bulk-save` | `sales_order_save` |
| DELETE | `delete` | `sales_order_delete` |
| GET | `detail` | `sales_order_view` |
| GET | `list` | `sales_order_view` |
| POST | `manual-close-order` | `sales_order_save` |
| POST | `save` | `sales_order_save` |

Body: `SalesOrderParam$Parameter` (`customerNo`*(req)*, `detailExpense[]`*(req)*, `detailItem[]`*(req)*, `fobName`, `poNumber`, `shipDate`, `shipmentName`).

### `/api/sales-quotation` — Penawaran Penjualan

CRUD standar, scope `sales_quotation_*`. List punya `status`*(enum SalesQuotationStatus)*. Body: `SalesQuotationParam$Parameter` (`customerNo`*(req)*, `detailItem[]`*(req)*, `cashDiscPercent/cashDiscount`, `detailExpense[]`, `fobName`, `paymentTermName`, `shipmentName`).

### `/api/sales-receipt` — Penerimaan Penjualan

CRUD standar, scope `sales_receipt_*`. Body: `SalesReceiptParam$Parameter` (`bankNo`*(req)*, `chequeAmount`*(req)*, `customerNo`*(req)*, `detailInvoice[]`*(req)*, `transDate`*(req)*, `paymentMethod`, `useCredit`).

### `/api/sales-return` — Retur Penjualan

CRUD standar, scope `sales_return_*`. List punya `returnType`*(enum SalesReturnReturnType)*. Body: `SalesReturnParam$Parameter` (`customerNo`*(req)*, `detailExpense[]`*(req)*, `detailItem[]`*(req)*, `returnType`*(enum DELIVERY/INVOICE/INVOICE_DP/NO_INVOICE, req)*, `taxDate`*(req)*, `taxNumber`*(req)*, `returnStatusType`*(enum ReturnStatusType)*).

### `/api/salesman-commission` — Komisi Penjual

| Method | Action | Scope |
|---|---|---|
| GET | `detail` | `salesman_commission_view` |
| GET | `list` | `salesman_commission_view` |

### `/api/sellingprice-adjustment` — Penyesuaian Harga/Diskon

| Method | Action | Scope |
|---|---|---|
| DELETE | `delete` | `sellingprice_adjustment_save` |
| GET | `detail` | `sellingprice_adjustment_view` |
| GET | `list` | `sellingprice_adjustment_view` |
| POST | `save` | `sellingprice_adjustment_save` |

Body: `SellingPriceAdjustmentParam$Parameter` (`detailItem[]`*(req)*, `priceCategoryName`*(req)*, `salesAdjustmentType`*(enum ITEM_DISCOUNT_TYPE/ITEM_PRICE_TYPE, req)*, `transDate`*(req)*).

### `/api/shipment` — Pengiriman (Kurir)

CRUD standar, scope `shipment_*`. Delete/detail pakai `shipmentName`. Body: `ShipmentParam$Parameter` (`name`*(req)*, `id`).

### `/api/standard-product-cost` — Standar Biaya Produksi

CRUD standar (tanpa `bulk-save`), scope `standard_product_cost_*`. Body: `StandardProductCostParam$Parameter` (`branchId`*(req)*, `detailItem[]`*(req)*, `transDate`*(req)*).

### `/api/stock-opname-order` — Perintah Stok Opname

CRUD standar, scope `stock_opname_order_*`. Body: `StockOpnameOrderParam$Parameter` (`detailItem[]`*(req)*, `orderNumber`*(req)*, `transDate`*(req)*).

### `/api/stock-opname-result` — Hasil Stok Opname

CRUD standar, scope `stock_opname_result_*`. Body: `StockOpnameResultParam$Parameter` (`detailItem[]`*(req)*, `orderNumber`*(req)*, `transDate`*(req)*).

### `/api/tax` — Pajak

CRUD standar, scope `tax_*`. List punya `taxType` (PPN, PPNBM, PPH23, PPHPS4, PPH21, PPH15, PPH22). Body: `TaxParam$Parameter` (`purchaseTaxGlAccountNo`*(req)*, `salesTaxGlAccountNo`*(req)*, `description`, `pph22Type`, `pph23Type`, `rate`, `taxType`).

### `/api/unit` — Satuan Barang

CRUD standar, scope `unit_*`. Delete/detail pakai `unitName`. Body: `UnitParam$Parameter` (`name`*(req)*, `id`).

### `/api/vendor` — Pemasok

CRUD standar, scope `vendor_*`. Delete/detail pakai `vendorNo`. Body: `VendorParam$Parameter` — sama strukturnya dengan `CustomerParam$Parameter`, plus `vendorDownPaymentAccountListNo[]`, `vendorPayableAccountListNo[]`, `vendorTaxType`.

### `/api/vendor-category` — Kategori Pemasok

CRUD standar, scope `vendor_category_*`. Delete/detail pakai `name`. Body: `VendorCategoryParam$Parameter` (`name`*(req)*, `defaultCategory`, `id`, `parentId`, `parentName`).

### `/api/vendor-claim` — Klaim Pemasok

CRUD standar, scope `vendor_claim_*`. Body: `VendorClaimParam$Parameter` (`detailItem[]`*(req)*, `transDate`*(req)*, `vendorClaimType`*(enum VENDOR_CLAIM_IN/OUT, req)*, `vendorNo`*(req)*).

### `/api/vendor-price` — Harga Pemasok

CRUD standar, scope `vendor_price_*`. Body: `VendorPriceParam$Parameter` (`transDate`*(req)*, `detailItem[]`, `vendorNo`).

### `/api/warehouse` — Gudang

| Method | Action | Scope |
|---|---|---|
| DELETE | `delete` | `warehouse_delete` |
| GET | `detail` | `warehouse_view` |
| GET | `list` | `warehouse_view` |
| POST | `save` | `warehouse_save` |

Body: `WarehouseParam$Parameter` (`name`*(req)*, `city`, `country`, `description`, `pic`, `province`, `scrapWarehouse`, `street`, `suspended`, `zipCode`).

### `/api/wo-pic` — Penanggung Jawab Perintah Kerja

| Method | Action | Scope |
|---|---|---|
| DELETE | `delete` | `wo_person_in_charge_delete` |
| GET | `list` | `wo_person_in_charge_view` |
| POST | `save` | `wo_person_in_charge_save` |

Body: `WOPersonInChargeParam$Parameter` (`name`*(req)*, `id`).

### `/api/work-order` — Perintah Kerja

CRUD standar (tanpa `bulk-save`), scope `work_order_*`. Body: `WorkOrderParam$Parameter` — header lengkap (`billOfMaterialNo`*(req)*, `branchId`*(req)*, `detailExpense[]`*(req)*, `detailMaterial[]`*(req)*, `endDate`*(req)*, `itemNo`*(req)*, `quantity`*(req)*, `startDate`*(req)*, `transDate`*(req)*, `varianceAccountNo`*(req)*, `workAccountNo`*(req)*, `workOrderType`*(enum BILL_OF_MATERIAL/MANUFACTURE_ORDER/PRODUCT, req)*) + `detailExtraFinishGood[]`, `detailProcess[]`.

---

## 3. Skema Master Pelanggan/Pemasok (`CustomerParam$Parameter` / `VendorParam$Parameter`)

Field utama yang sama untuk kedua master:

| Field | Tipe | Wajib | Deskripsi |
|---|---|---|---|
| `name` | String | Ya | Nama entitas (PT, perorangan, dll.) |
| `transDate` | Date | Ya | Tanggal pengakuan transaksi |
| `branchId`/`branchName` | Long/String | – | Cabang |
| `categoryName` | String | – | Kategori pelanggan/pemasok |
| `currencyCode` | String | – | Kode mata uang default |
| `customerNo`/`vendorNo` | String | – | Nomor identitas |
| `billCity/Country/Province/Street/ZipCode` | String | – | Alamat penagihan |
| `shipCity/Country/Province/Street/ZipCode`, `shipSameAsBill` | String/Boolean | – | Alamat pengiriman (khusus pelanggan) |
| `taxCity/Country/Province/Street/ZipCode`, `taxSameAsBill` | String/Boolean | – | Alamat pajak |
| `detailContact[]` | `CompanyParam$CompanyContact` | – | Kontak tambahan (nama, email, telepon, dll.) |
| `detailOpenBalance[]` | `CompanyParam$DetailOpenBalance` | – | Saldo awal piutang/utang |
| `detailShipAddress[]` *(khusus pelanggan)* | `CompanyParam$DetailShipAddress` | – | Alamat pengiriman tambahan |
| `npwpNo` / `wpNumber`, `wpName`, `wpType`, `pkpNo`, `nitku` | String/enum | – | Data perpajakan |
| `email`, `mobilePhone`, `workPhone`, `fax`, `website` | String | – | Kontak |
| `notes` | String | – | Catatan |
| `termName` | String | – | Termin pembayaran default |
| `typeAutoNumber` | Long | – | ID penomoran otomatis |

---

## 4. Tipe Data Umum

| Tipe | Deskripsi |
|---|---|
| `java.lang.Long` / `java.lang.Integer` | Angka non-desimal, mis. `1, 2, 3` |
| `java.lang.String` | Teks bebas |
| `java.lang.Boolean` | `true` / `false` |
| `com.cpssoft...orm.type.Money` / `java.math.BigDecimal` | Desimal, mis. `95275.123456` (maks 999 miliar, 6 digit desimal) |
| `java.sql.Date` | Format `dd/MM/yyyy`, mis. `31/03/2016` |
| `java.sql.Timestamp` | Format `dd/MM/yyyy HH:mm:ss`, mis. `31/03/2016 18:30:43` |
| `SortPaging` | `page` (Integer), `pageSize` (Integer, default 20), `sort` (String `field|asc;field2|desc`) |
| `ApprovalStatus` (enum) | `DRAFT, UNAPPROVED, APPROVED, REJECTED, NEXTUSER_TOAPPROVED` |
| `DetailStateType` (enum) | nilai `delete` — dipakai pada `_status` untuk menghapus baris detail |
| `*FilterValue` (dynamic filter) | Objek filter generik: `BooleanFilterValue`, `DateFilterValue`, `StringFilterValue`, `StringListFilterValue`, `LongListFilterValue`, `LookupFilterValue` (`[{"id":50}]`), dll. — semuanya **deprecated**, digantikan parameter `filter` per modul |
| `*Filter` (mis. `LongFilter`, `StringFilter`, `DateFilter`, `TimestampFilter`, `ApprovalStatusFilter`) | Filter modern dengan sub-field `op` (enum operator, lihat di bawah) dan `val` (nilai, bisa lebih dari satu via index `[n]`) |

**Operator filter (`BasicFilterOperator` / `StringFilterOperator`):**
`EQUAL`(default), `NOT_EQUAL`, `GREATER_THAN`, `GREATER_EQUAL_THAN`, `LESS_THAN`, `LESS_EQUAL_THAN`, `BETWEEN`, `NOT_BETWEEN`, `EMPTY`, `NOT_EMPTY`, dan khusus String: `CONTAIN`.

---

## 5. Catatan Umum Penggunaan

- Endpoint transaksi pada umumnya menyediakan 4–5 aksi standar: `bulk-save` (maks 100 data/request, gunakan index `data[0]`, `data[1]`, dst.), `delete`, `detail`, `list`, `save`.
- Hampir semua transaksi mendukung penghapusan baris detail saat update dengan mengisi `_status: "delete"` pada baris detail terkait.
- Parameter `X-Session-ID` dikirim sebagai HTTP header, bukan query/body, dan hanya diperlukan untuk Metode Otorisasi OAuth.
- Untuk modul yang mendukung "Persetujuan" (approval), gunakan `saveAsStatusType` (`DRAFT`/`UNAPPROVED`) saat `save` agar transaksi otomatis masuk status diajukan.