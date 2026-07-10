// Builds a real BNI Direct bulk-payment upload file (.xlsx), matching the
// P-row/T-row structure from docs/references/0. MASTER CMS - INHOUSE.xls /
// KLIRING.xls (root repo) — one sheet per transfer rail present in the
// selection, since the real templates are one-rail-per-file.
import * as XLSX from "xlsx";
import type { PaymentBatchItem } from "@/lib/payment-batch-store";
import type { BniOutlet, BniAccountType } from "@/lib/bni-outlets";
import { outletAccountNo } from "@/lib/bni-outlets";
import { determineTransferRail, sanitizeForBni, type BniTransferRail } from "@/lib/payment-batch-data";
import { findBankCode } from "@/lib/bni-bank-codes";

const RAIL_SHEET_NAME: Record<BniTransferRail, string> = {
  inhouse: "INHOUSE",
  kliring: "Kliring",
};

const T_HEADER_COMMON_TAIL = [
  "NAMA CABANG(100)", "ALAMAT BANK1(50)", "ALAMAT BANK2(50)", "ALAMAT BANK3(50)",
  "NAMA KOTA(100)", "NAMA NEGARA(100)", "WARGA NEGARA(40)", "KODE WN(40)",
  "EMAIL FLAG(1)", "Email(100)", "Reff Num(16)", "FLAG(1)",
];

function tHeaderRow(rail: BniTransferRail): string[] {
  const bankCol = rail === "inhouse"
    ? ["KODEBANK(8)--(M)", "NAMA BANK TUJUAN(100)--(M)"]
    : ["Clearing Code(7)", "Bank Tujuan(35)"];
  return ["Rek. Tujuan(16)", "Nama Penerima(40)", "Amount", "Remark1(33)", "Remark2(50)", "Remark3(50)", ...bankCol, ...T_HEADER_COMMON_TAIL];
}

function tDataRow(rail: BniTransferRail, item: PaymentBatchItem): (string | number)[] {
  const receiverName = sanitizeForBni(item.bankAccountName).slice(0, 40);
  const remark1 = sanitizeForBni(`Pelunasan ${item.invoiceNo}`).slice(0, 33);
  const remark2 = sanitizeForBni(item.vendorName).slice(0, 50);
  let bankCode = "";
  let bankNameCol = "";
  if (rail === "kliring") {
    const match = findBankCode(item.bankName);
    bankCode = match?.clearingCode ?? "";
    bankNameCol = match?.name ?? item.bankName;
  }
  return [
    item.bankAccountNo,
    receiverName,
    item.amount,
    remark1,
    remark2,
    "",
    bankCode,
    bankNameCol,
    "", "", "", "", "", "", "", "", "", "", "", "",
  ];
}

export interface BniExportResult {
  fileName: string;
  base64: string;
  railsUsed: BniTransferRail[];
  unmatchedBankItems: PaymentBatchItem[]; // kliring items whose bank couldn't be matched to a clearing code
}

export function buildBniExportWorkbook(
  batchId: string,
  outlet: BniOutlet,
  accountType: BniAccountType,
  items: PaymentBatchItem[]
): BniExportResult {
  const debetAccountNo = outletAccountNo(outlet, accountType);
  const byRail = new Map<BniTransferRail, PaymentBatchItem[]>();
  for (const item of items) {
    const rail = determineTransferRail(item.bankName);
    if (!byRail.has(rail)) byRail.set(rail, []);
    byRail.get(rail)!.push(item);
  }

  const unmatchedBankItems = (byRail.get("kliring") ?? []).filter((i) => !findBankCode(i.bankName));

  const wb = XLSX.utils.book_new();
  const railsUsed: BniTransferRail[] = [];

  for (const [rail, railItems] of byRail) {
    railsUsed.push(rail);
    const totalAmount = railItems.reduce((s, i) => s + i.amount, 0);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const rows: (string | number)[][] = [
      ["P(auto)", "Tgl Transaksi", "Rek. Debet(16)", "Total Record(auto)", "Total Amount(auto)"],
      ["P", today, debetAccountNo, railItems.length, totalAmount],
      tHeaderRow(rail),
      ...railItems.map((item) => tDataRow(rail, item)),
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, RAIL_SHEET_NAME[rail]);
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return {
    fileName: `bni-import-${outlet.code}-${batchId}.xlsx`,
    base64: buf.toString("base64"),
    railsUsed,
    unmatchedBankItems,
  };
}
