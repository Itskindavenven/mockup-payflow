"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  RefreshCw,
  FileText,
  BookOpen,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "@/components/AppShell";
import { AUDIT_LOG } from "@/lib/mock-data";
import { formatRupiah } from "@/lib/parser";

const EASE_OUT = "easeOut" as const;

const STATS = [
  {
    label: "Transaksi bulan ini",
    value: "10",
    sub: "dari 1 file diimpor",
    icon: FileText,
    color: "text-zinc-600",
    bg: "bg-zinc-50",
    border: "border-zinc-200",
  },
  {
    label: "Sudah di Accurate",
    value: "2",
    sub: "tidak perlu aksi",
    icon: CheckCircle2,
    color: "text-zinc-500",
    bg: "bg-zinc-50",
    border: "border-zinc-200",
  },
  {
    label: "Menunggu di-push",
    value: "5",
    sub: "siap dikirim sekarang",
    icon: ArrowUpRight,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
  {
    label: "Perlu review manual",
    value: "3",
    sub: "butuh input tambahan",
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
];

const ACTION_LOG_LABELS: Record<string, string> = {
  push_single: "Push transaksi",
  push_batch: "Push batch",
  resolve_review: "Selesaikan review",
  sync_coa: "Sync COA",
  sync_vendor: "Sync Vendor",
  import_statement: "Import e-Statement",
};

function formatTimestamp(ts: string) {
  const d = new Date(ts.replace(" ", "T"));
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const recentLogs = AUDIT_LOG.slice(0, 6);

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-4xl mx-auto space-y-8">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Beranda</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Ringkasan aktivitas AP · April 2026 · PT Ega Accurate Indonesia
            </p>
          </div>
          <Button
            className="h-10 gap-2 bg-zinc-900 hover:bg-zinc-700 text-white"
            onClick={() => router.push("/transaksi")}
            aria-label="Lihat semua transaksi AP"
          >
            <ArrowUpRight size={15} aria-hidden="true" />
            Lihat Transaksi
          </Button>
        </motion.div>

        {/* Status alert - ada yang perlu di-push */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3, ease: EASE_OUT }}
          className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight size={16} className="text-teal-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-teal-800">
                Ada 5 transaksi siap di-push ke Accurate Online
              </p>
              <p className="text-sm text-teal-600 mt-0.5">
                Dari import terakhir: Rekening_Koran_BNI_April2026.xlsx
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-9 bg-teal-700 hover:bg-teal-800 text-white flex-shrink-0"
            onClick={() => router.push("/transaksi")}
            aria-label="Buka halaman transaksi untuk push ke Accurate"
          >
            Proses sekarang
          </Button>
        </motion.div>

        {/* Stat cards */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Statistik Bulan Ini</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07, duration: 0.3, ease: EASE_OUT }}
                  className={`${s.bg} border ${s.border} rounded-xl px-4 py-4`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className={s.color} aria-hidden="true" />
                    <span className="text-xs text-zinc-500 font-medium">{s.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 tabular-nums">{s.value}</p>
                  <p className="text-xs text-zinc-400 mt-1">{s.sub}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Quick actions + Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.3 }}
          >
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">Aksi Cepat</h2>
            <div className="space-y-2">
              {[
                {
                  label: "Import e-Statement Baru",
                  desc: "Upload file mutasi BNI (.xlsx)",
                  icon: Upload,
                  href: "/transaksi",
                  primary: true,
                },
                {
                  label: "Sync Master COA",
                  desc: "Perbarui daftar akun dari Accurate",
                  icon: BookOpen,
                  href: "/coa",
                  primary: false,
                },
                {
                  label: "Sync Master Vendor",
                  desc: "Perbarui daftar supplier dari Accurate",
                  icon: Users,
                  href: "/vendor",
                  primary: false,
                },
                {
                  label: "Lihat Audit Log",
                  desc: "Riwayat semua aktivitas push",
                  icon: Clock,
                  href: "/audit-log",
                  primary: false,
                },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => router.push(action.href)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-lg border transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 outline-none ${
                      action.primary
                        ? "bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800"
                        : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                    aria-label={action.label}
                  >
                    <Icon size={15} className={action.primary ? "text-zinc-300" : "text-zinc-400"} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${action.primary ? "text-white" : "text-zinc-800"}`}>
                        {action.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${action.primary ? "text-zinc-400" : "text-zinc-400"}`}>
                        {action.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Recent activity */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-700">Aktivitas Terbaru</h2>
              <button
                onClick={() => router.push("/audit-log")}
                className="text-sm text-zinc-400 hover:text-zinc-600 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Lihat semua riwayat aktivitas"
              >
                Lihat semua
              </button>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100">
              {recentLogs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 + i * 0.05, duration: 0.25, ease: EASE_OUT }}
                  className="flex items-start gap-3 px-4 py-3.5"
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${log.status === "sukses" ? "bg-teal-400" : "bg-red-400"}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">
                      {ACTION_LOG_LABELS[log.action] || log.action}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">{log.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge
                      className={`text-[11px] font-medium px-2 py-0 ${
                        log.status === "sukses"
                          ? "bg-teal-50 text-teal-700 border-teal-100"
                          : "bg-red-50 text-red-600 border-red-100"
                      }`}
                    >
                      {log.status === "sukses" ? "Sukses" : "Gagal"}
                    </Badge>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-4 flex items-start gap-3"
        >
          <RefreshCw size={15} className="text-zinc-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-zinc-700">Cara kerja AP Validation</p>
            <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
              Upload e-statement BNI → sistem deteksi otomatis invoice & keyword → cocokkan ke Master COA & Vendor →
              push ke modul <span className="font-mono text-xs bg-zinc-200 px-1.5 py-0.5 rounded">Pembayaran Pembelian</span> atau{" "}
              <span className="font-mono text-xs bg-zinc-200 px-1.5 py-0.5 rounded">Pengeluaran Kas/Bank Lain</span> di Accurate Online.
            </p>
          </div>
        </motion.div>

      </div>
    </AppShell>
  );
}
