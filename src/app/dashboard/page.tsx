"use client";

import { useEffect, useState } from "react";
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
  FileSpreadsheet,
  Loader2,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "@/components/AppShell";
import type { JournalGroup } from "@/lib/parser";

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
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
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

interface ApSessionRecord {
  id: string;
  createdAt: string;
  createdBy: { id: string; name: string };
  database: { id: string; name: string; dbCode: string };
  fileName: string;
  groups: JournalGroup[];
  pushedIds: string[];
  resolvedIds: string[];
  status: "draft" | "selesai";
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sessionProgress(session: ApSessionRecord): { done: number; total: number } {
  const pushed = new Set(session.pushedIds);
  const resolved = new Set(session.resolvedIds);
  let done = 0;
  for (const g of session.groups) {
    let status = g.accurate_status;
    if (pushed.has(g.group_id)) status = "sudah_tercatat";
    if (resolved.has(g.group_id) && status === "perlu_review") status = "akan_dipush";
    if (status === "sudah_tercatat") done++;
  }
  return { done, total: session.groups.length };
}

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ApSessionRecord[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  useEffect(() => {
    fetch("/api/ap-sessions")
      .then((r) => r.json())
      .then((data: ApSessionRecord[]) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setIsLoadingSessions(false));
  }, []);

  const recentSessions = sessions.slice(0, 6);

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
            className="h-10 gap-2 bg-blue-900 hover:bg-blue-800 text-white"
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
          className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight size={16} className="text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Ada 5 transaksi siap di-push ke Accurate Online
              </p>
              <p className="text-sm text-blue-600 mt-0.5">
                Dari import terakhir: Rekening_Koran_BNI_April2026.xlsx
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-9 bg-blue-700 hover:bg-blue-800 text-white flex-shrink-0"
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
                        ? "bg-blue-900 border-blue-900 text-white hover:bg-blue-800"
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

          {/* Riwayat Transaksi AP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-700">Riwayat Transaksi AP</h2>
              <span className="text-xs text-zinc-400">{sessions.length} sesi</span>
            </div>

            {isLoadingSessions ? (
              <div className="bg-white border border-zinc-200 rounded-xl py-12 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-zinc-400" />
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-xl py-10 px-6 text-center">
                <FileSpreadsheet size={20} className="text-zinc-300 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">Belum ada sesi Transaksi AP.</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Upload e-statement pertama kamu dari tombol &ldquo;Import e-Statement Baru&rdquo; di samping.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100">
                {recentSessions.map((s, i) => {
                  const { done, total } = sessionProgress(s);
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.45 + i * 0.05, duration: 0.25, ease: EASE_OUT }}
                      className="flex items-center gap-3 px-4 py-3.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0">
                        <FileSpreadsheet size={14} className="text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 truncate font-mono">{s.fileName}</p>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">
                          {s.database.name} · {done}/{total} transaksi · {s.createdBy.name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          className={`text-[11px] font-medium px-2 py-0 ${
                            s.status === "selesai"
                              ? "bg-blue-50 text-blue-700 border-blue-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}
                        >
                          {s.status === "selesai" ? "Selesai" : "Draft"}
                        </Badge>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {formatTimestamp(s.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => router.push(`/transaksi?session=${s.id}`)}
                          title={s.status === "draft" ? "Lanjutkan sesi ini" : "Lihat sesi ini"}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors focus-visible:ring-2 focus-visible:ring-ring outline-none"
                          aria-label={s.status === "draft" ? "Lanjutkan sesi ini" : "Lihat sesi ini"}
                        >
                          <ArrowUpRight size={14} />
                        </button>
                        <button
                          onClick={() => router.push(`/transaksi?reuse=${s.id}`)}
                          title="Gunakan data ini untuk database lain"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-700 hover:bg-blue-50 transition-colors focus-visible:ring-2 focus-visible:ring-ring outline-none"
                          aria-label="Gunakan ulang untuk database lain"
                        >
                          <RotateCw size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
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
