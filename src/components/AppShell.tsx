"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { getConnection, saveConnection, AccurateConnection } from "@/lib/connection";
import { Loader2, Building2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Beranda",
  "/pembayaran": "Pembayaran Vendor",
  "/transaksi": "Transaksi AP",
  "/keyword-mapping": "Keyword Mapping",
  "/audit-log": "Audit Log",
  "/settings": "Pengaturan",
  "/admin/users": "Manajemen Pengguna",
};

function currentPageTitle(pathname: string): string {
  const exact = PAGE_TITLES[pathname];
  if (exact) return exact;
  const match = Object.keys(PAGE_TITLES).find((p) => pathname.startsWith(p + "/"));
  return match ? PAGE_TITLES[match] : "AP Validation";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [conn, setConn] = useState<AccurateConnection | null | "loading">("loading");

  useEffect(() => {
    let c = getConnection();
    if (!c) {
      // Login sudah memverifikasi identitas user — auto-hubungkan ke
      // Accurate (mock) supaya sidebar langsung tampil tanpa step tambahan.
      c = {
        companyName: "PT Ega Accurate Indonesia",
        userEmail: "finance@ega-accurate.id",
        connectedAt: new Date().toISOString(),
        accessToken: "mock_token_" + Math.random().toString(36).slice(2),
      };
      saveConnection(c);
    }
    setConn(c);
  }, []);

  useEffect(() => {
    // Set by /api/auth/callback after a successful Accurate OAuth
    // reconnect — lands here regardless of which page the user was
    // originally headed to (see `state` round-trip in
    // /api/auth/login + /api/auth/callback).
    if (new URLSearchParams(window.location.search).get("accurate_reconnected") === "1") {
      toast.success("Koneksi ke Accurate Online berhasil diperbarui — token baru sudah aktif.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (conn === "loading" || conn === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <AppSidebar connection={conn} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex-shrink-0 flex items-center justify-between px-5 bg-white border-b border-slate-200">
          <div className="flex items-center gap-1.5 text-[13px] text-slate-500 min-w-0">
            <span className="font-mono text-[11px] text-slate-400">AP Validation</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900 truncate">{currentPageTitle(pathname)}</span>
          </div>
          <button className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0">
            <Building2 size={13} className="text-blue-900" />
            <span className="max-w-[180px] truncate">{conn.companyName}</span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
