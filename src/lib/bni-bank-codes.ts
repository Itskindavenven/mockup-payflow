// Destination-bank code lookup — extracted from docs/references/
// 0. MASTER CMS - INHOUSE.xls, sheet "KODE KLIRING" (root repo). Used to
// fill the required bank-code column for non-BNI transfer rails:
// Kliring needs `clearingCode`, RTGS needs `rtgsCode`, Online needs
// `onlineBankCode`. Matching is by exact bank name today — free-text bank
// names from vendor master data that don't match exactly fall back to
// "unmatched" and the batch UI flags it for manual entry rather than
// silently generating a file BNI will reject.
import bankCodesData from "./data/bni-bank-codes.json";

export interface BniBankCode {
  name: string;
  rtgsCode: string;
  clearingCode: string;
  onlineBankCode: string;
}

export const BNI_BANK_CODES: BniBankCode[] = bankCodesData;

const NAME_ALIASES: Record<string, string> = {
  BCA: "BANK CENTRAL ASIA",
  MANDIRI: "BANK MANDIRI (PERSERO)",
  BRI: "BANK RAKYAT INDONESIA (PERSERO)",
  BSI: "BANK SYARIAH INDONESIA",
  "CIMB NIAGA": "BANK CIMB NIAGA",
  DANAMON: "BANK DANAMON INDONESIA",
  PERMATA: "BANK PERMATA",
};

export function findBankCode(bankNameRaw: string): BniBankCode | undefined {
  const bankName = bankNameRaw.trim().toUpperCase();
  const aliased = NAME_ALIASES[bankName];
  const target = aliased ?? bankName;
  return BNI_BANK_CODES.find(
    (b) => b.name.toUpperCase() === target || b.name.toUpperCase().includes(target)
  );
}

export function isBni(bankNameRaw: string): boolean {
  return bankNameRaw.trim().toUpperCase() === "BNI";
}
