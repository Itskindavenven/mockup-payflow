// Server-only — never import this in client components

import { getDbSession, loadAccountToken, refreshAccountToken, refreshDbSession } from "./accurate-token-store";

export interface AccurateCOA {
  no: string;
  name: string;
  accountType: string;
}

export interface AccurateVendor {
  id: number;
  vendorNo: string;
  name: string;
  vendorBranchName: string;
  bankName?: string;
  accountNo?: string;
}

export interface OtherPaymentDetail {
  accountNo: string;
  amount: number;
  memo?: string;
}

export interface AccurateDatabaseInfo {
  id: number;
  alias: string;
  dataAccessType: string;
  admin: boolean;
  expired: boolean;
  licenseEnd: string;
}

// Accurate signals a stale access token differently from a stale
// per-database session, and each needs a different fix (refresh the
// OAuth token vs. just re-mint the session) — sniff which one this is
// instead of parsing, since the XML fault body (e.g.
// `<InvalidTokenException>...`) isn't valid JSON and would otherwise
// surface as a confusing "Unexpected token '<'" crash.
function looksLikeInvalidToken(text: string): boolean {
  if (text.startsWith("<")) return /InvalidToken|invalid_token|ExpiredToken/i.test(text);
  try {
    const json = JSON.parse(text);
    return json?.s === false && /token/i.test(JSON.stringify(json.d ?? "")) && !/session/i.test(JSON.stringify(json.d ?? ""));
  } catch {
    return false;
  }
}

function looksLikeInvalidSession(text: string): boolean {
  if (text.startsWith("<")) return /InvalidSession|Session/i.test(text);
  try {
    const json = JSON.parse(text);
    return json?.s === false && /session/i.test(JSON.stringify(json.d ?? ""));
  } catch {
    return false;
  }
}

// Central fetch wrapper: attaches the current token/session for the
// given database, and on an auth error, refreshes the right thing (OAuth
// token vs. just the database session) and retries once. Accurate
// invalidates the previous access_token every time a new one is issued
// (e.g. a fresh OAuth login), so relying on static env vars alone breaks
// in production the moment that happens.
async function accurateFetch(dbId: string, pathAndQuery: string, init: RequestInit = {}): Promise<Response> {
  let { account, db } = await getDbSession(dbId);
  const doFetch = () =>
    fetch(`${db.host}${pathAndQuery}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${account.accessToken}`,
        "X-Session-ID": db.session,
      },
    });

  let res = await doFetch();
  const text = await res.clone().text();
  if (looksLikeInvalidToken(text)) {
    account = await refreshAccountToken();
    db = await refreshDbSession(dbId, account.accessToken);
    res = await doFetch();
  } else if (looksLikeInvalidSession(text)) {
    db = await refreshDbSession(dbId, account.accessToken);
    res = await doFetch();
  }
  return res;
}

export async function fetchAccurateDatabases(): Promise<AccurateDatabaseInfo[]> {
  // db-list.do is account-level (not tied to any one database), so it
  // needs its own light retry instead of accurateFetch's per-db flow.
  const account = await loadAccountToken();
  const call = (token: string) =>
    fetch("https://account.accurate.id/api/db-list.do", { headers: { Authorization: `Bearer ${token}` } });

  let res = await call(account.accessToken);
  let json = await res.json();
  if (json?.error === "invalid_token") {
    const refreshed = await refreshAccountToken();
    res = await call(refreshed.accessToken);
    json = await res.json();
  }
  if (!json.s) throw new Error("fetchAccurateDatabases failed: " + JSON.stringify(json));
  return json.d;
}

export async function fetchCOABank(dbId: string): Promise<AccurateCOA[]> {
  const params = new URLSearchParams({
    fields: "no,name,accountType",
    "sp.pageSize": "100",
    "filter.accountType.op": "EQUAL",
    "filter.accountType.val": "CASH_BANK",
  });
  const res = await accurateFetch(dbId, `/accurate/api/glaccount/list.do?${params}`, { cache: "no-store" });
  const json = await res.json();
  if (!json.s) throw new Error("fetchCOABank failed: " + JSON.stringify(json));
  return json.d;
}

// Tipe akun yang relevan buat validasi AP: Beban & Beban Lainnya.
const EXPENSE_ACCOUNT_TYPES = new Set(["EXPENSE", "OTHER_EXPENSE"]);

export async function fetchCOA(dbId: string): Promise<AccurateCOA[]> {
  const pageSize = 100;
  const all: AccurateCOA[] = [];
  let page = 1;
  // Accurate cap sp.pageSize di 100/request — paginate sampai halaman terakhir
  // (length < pageSize) supaya semua akun (315+) kebaca, bukan cuma 200 pertama.
  for (;;) {
    const params = new URLSearchParams({
      fields: "no,name,accountType",
      "sp.pageSize": String(pageSize),
      "sp.page": String(page),
    });
    const res = await accurateFetch(dbId, `/accurate/api/glaccount/list.do?${params}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.s) throw new Error("fetchCOA failed: " + JSON.stringify(json));
    const rows: AccurateCOA[] = json.d ?? [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    page += 1;
  }
  return all.filter((c) => EXPENSE_ACCOUNT_TYPES.has(c.accountType));
}

export async function fetchVendors(dbId: string): Promise<AccurateVendor[]> {
  const params = new URLSearchParams({
    fields: "id,name,vendorNo,vendorBranchName",
    "sp.pageSize": "100",
  });
  const res = await accurateFetch(dbId, `/accurate/api/vendor/list.do?${params}`, { cache: "no-store" });
  const json = await res.json();
  if (!json.s) throw new Error("fetchVendors failed: " + JSON.stringify(json));
  const vendors: AccurateVendor[] = json.d;

  // list.do nggak expose field nested (detailBank) — ambil rekening bank
  // vendor (kalau ada) lewat detail.do per vendor. detailBank[0] dipakai
  // (satu vendor bisa punya lebih dari satu rekening, kita ambil yang utama).
  await Promise.all(
    vendors.map(async (v) => {
      try {
        const detailRes = await accurateFetch(dbId, `/accurate/api/vendor/detail.do?id=${v.id}`, { cache: "no-store" });
        const detailJson = await detailRes.json();
        const bank = detailJson?.d?.detailBank?.[0];
        if (bank) {
          v.bankName = bank.bankName ?? bank.bank ?? undefined;
          v.accountNo = bank.accountNo ?? bank.bankAccountNo ?? undefined;
        }
      } catch {
        // biarin vendor tanpa info bank kalau gagal fetch detail-nya
      }
    })
  );

  return vendors;
}

export interface AdminFeeEntry {
  transDate: string; // dd/MM/yyyy
  accountNo: string;
  accountName: string;
  amount: number;
}

// Biaya admin (bank fee) per periode — dikorek dari other-payment yang sudah
// terposting di Accurate, baris detail yang nama akunnya mengandung "admin".
export async function fetchOtherPaymentAdminFees(dbId: string, fromDate: string, toDate: string): Promise<AdminFeeEntry[]> {
  const listParams = new URLSearchParams({
    fields: "id,transDate",
    "sp.pageSize": "100",
    "filter.transDate.op": "BETWEEN",
  });
  listParams.append("filter.transDate.val[0]", fromDate);
  listParams.append("filter.transDate.val[1]", toDate);
  const listRes = await accurateFetch(dbId, `/accurate/api/other-payment/list.do?${listParams}`, { cache: "no-store" });
  const listJson = await listRes.json();
  if (!listJson.s) throw new Error("fetchOtherPaymentAdminFees failed: " + JSON.stringify(listJson));

  const entries: AdminFeeEntry[] = [];
  for (const row of listJson.d as { id: number; transDate: string }[]) {
    const res = await accurateFetch(dbId, `/accurate/api/other-payment/detail.do?id=${row.id}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.s) continue;
    const detailAccount = json.d?.detailAccount ?? [];
    for (const line of detailAccount) {
      const accountName: string = line.account?.name ?? line.expenseName ?? "";
      if (/admin/i.test(accountName)) {
        entries.push({
          transDate: json.d.transDate ?? row.transDate,
          accountNo: line.account?.no ?? "",
          accountName,
          amount: line.amount ?? 0,
        });
      }
    }
  }
  return entries;
}

export interface VendorPaymentEntry {
  transDate: string; // dd/MM/yyyy
  vendorNo: string;
  vendorName: string;
  amount: number;
}

// Pembayaran ke vendor (Pembayaran Pembelian) per periode, buat report per vendor.
export async function fetchPurchasePaymentsByVendor(dbId: string, fromDate: string, toDate: string): Promise<VendorPaymentEntry[]> {
  const listParams = new URLSearchParams({
    fields: "id,transDate,chequeAmount",
    "sp.pageSize": "100",
    "filter.transDate.op": "BETWEEN",
  });
  listParams.append("filter.transDate.val[0]", fromDate);
  listParams.append("filter.transDate.val[1]", toDate);
  const listRes = await accurateFetch(dbId, `/accurate/api/purchase-payment/list.do?${listParams}`, { cache: "no-store" });
  const listJson = await listRes.json();
  if (!listJson.s) throw new Error("fetchPurchasePaymentsByVendor failed: " + JSON.stringify(listJson));

  const entries: VendorPaymentEntry[] = [];
  for (const row of listJson.d as { id: number; transDate: string; chequeAmount: number }[]) {
    const res = await accurateFetch(dbId, `/accurate/api/purchase-payment/detail.do?id=${row.id}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.s) continue;
    entries.push({
      transDate: json.d.transDate ?? row.transDate,
      vendorNo: json.d.vendor?.no ?? "-",
      vendorName: json.d.vendor?.name ?? "Tidak diketahui",
      amount: json.d.chequeAmount ?? row.chequeAmount ?? 0,
    });
  }
  return entries;
}

export async function pushOtherPayment(dbId: string, payload: {
  bankNo: string;
  payee: string;
  transDate: string; // dd/MM/yyyy
  detailAccount: OtherPaymentDetail[];
  branchName?: string;
  description?: string;
}) {
  const body = new URLSearchParams();
  body.set("bankNo", payload.bankNo);
  body.set("payee", payload.payee);
  body.set("transDate", payload.transDate);
  if (payload.description) body.set("description", payload.description);
  if (payload.branchName) body.set("branchName", payload.branchName);
  payload.detailAccount.forEach((row, i) => {
    body.set(`detailAccount[${i}].accountNo`, row.accountNo);
    body.set(`detailAccount[${i}].amount`, String(row.amount));
    if (row.memo) body.set(`detailAccount[${i}].memo`, row.memo);
  });
  const res = await accurateFetch(dbId, `/accurate/api/other-payment/save.do`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res.json();
}

// Master bank Accurate (dari endpoint pencarian bank internal mereka) — id
// dan beneBankId WAJIB dikirim berpasangan pas nyimpen detailBank vendor,
// kalau nggak Accurate nolak dengan "Rekening Bank tidak terdaftar".
// Diverifikasi langsung ke API real (bukan tebakan).
export const BANK_MASTER = {
  BRI:     { vendorBankId: "200", bankId: "002", bankName: "BANK RAKYAT INDONESIA",    sortBankName: "BRI" },
  MANDIRI: { vendorBankId: "201", bankId: "008", bankName: "BANK MANDIRI",             sortBankName: "MANDIRI" },
  BNI:     { vendorBankId: "202", bankId: "009", bankName: "BANK NEGARA INDONESIA 1946", sortBankName: "BNI" },
  BCA:     { vendorBankId: "203", bankId: "014", bankName: "BANK CENTRAL ASIA",        sortBankName: "BCA" },
  CIMB:    { vendorBankId: "217", bankId: "022", bankName: "BANK CIMB NIAGA",          sortBankName: "CIMB NIAGA" },
  PERMATA: { vendorBankId: "214", bankId: "013", bankName: "BANK PERMATA",             sortBankName: "PERMATA" },
} as const;

export type BankKey = keyof typeof BANK_MASTER;

// Cocokkan nama bank apa adanya (dari file import, laporan Accurate, dll)
// ke BankKey yang udah kekonfirmasi vendorBankId/bankId-nya. Cuma exact
// match ke bankName resmi BANK_MASTER — bank yang belum ada di daftar
// (mis. Bank Syariah Indonesia, Bank Mayapada) sengaja TIDAK ditebak,
// karena vendorBankId salah bikin Accurate nolak simpan detailBank.
export function findBankKeyByName(bankNameRaw: string): BankKey | null {
  const target = bankNameRaw.trim().toUpperCase();
  const entry = (Object.entries(BANK_MASTER) as [BankKey, typeof BANK_MASTER[BankKey]][])
    .find(([, b]) => b.bankName.toUpperCase() === target);
  return entry ? entry[0] : null;
}

// Tambah vendor baru (nama vendor, opsional 1 rekening bank vendor). Field
// nested detailBank[0].* diverifikasi langsung ke API real Accurate lewat
// network trace form "Tambah Vendor" mereka sendiri — bukan tebakan:
//   bankAccount (no rekening), bankAccountName (nama pemilik rekening),
//   bankName/sortBankName/bankId/vendorBankId (identitas bank, harus match
//   pasangan valid dari master bank Accurate, lihat BANK_MASTER di atas).
// `bank` dibiarkan undefined untuk vendor tanpa rekening bank (mis. bank-nya
// nggak ada di BANK_MASTER — lihat findBankKeyByName) — vendor tetap
// dibuat, rekening ditambah manual belakangan.
export async function saveVendor(dbId: string, payload: {
  name: string;
  bank?: BankKey;
  accountName?: string;
  accountNo?: string;
}): Promise<{ s: boolean; d: unknown }> {
  const body = new URLSearchParams();
  body.set("name", payload.name);
  if (payload.bank && payload.accountNo) {
    const bank = BANK_MASTER[payload.bank];
    body.set("detailBank[0]._status", "insert");
    body.set("detailBank[0].seq", "1");
    body.set("detailBank[0].bankAccount", payload.accountNo);
    body.set("detailBank[0].bankAccountName", payload.accountName ?? payload.name);
    body.set("detailBank[0].bankName", bank.bankName);
    body.set("detailBank[0].sortBankName", bank.sortBankName);
    body.set("detailBank[0].bankId", bank.bankId);
    body.set("detailBank[0].vendorBankId", bank.vendorBankId);
  }
  const res = await accurateFetch(dbId, `/accurate/api/vendor/save.do`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Accurate kadang balikin XML/HTML (mis. InsufficientScopeException) kalau
    // token OAuth-nya kurang scope — bukan JSON, jadi tampilkan apa adanya.
    return { s: false, d: [text || `HTTP ${res.status}`] };
  }
}
