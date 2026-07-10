export type Permission = "transaksi" | "pembayaran" | "keyword-mapping" | "master-data" | "audit-log";

export const PERMISSION_LABELS: Record<Permission, string> = {
  "transaksi": "Transaksi AP",
  "pembayaran": "Pembayaran Vendor",
  "keyword-mapping": "Keyword Mapping",
  "master-data": "Master Data (COA & Vendor)",
  "audit-log": "Audit Log",
};

export const ALL_PERMISSIONS: Permission[] = [
  "transaksi",
  "pembayaran",
  "keyword-mapping",
  "master-data",
  "audit-log",
];

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  permissions: Permission[];
}
