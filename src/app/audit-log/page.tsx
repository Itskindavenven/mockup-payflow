"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ClipboardList,
  ArrowUpRight,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { formatRupiah } from "@/lib/parser";
import type { JournalGroup } from "@/lib/parser";

const DATE_FILTERS = [
  { label: "Semua", value: "semua" },
  { label: "Hari ini", value: "today" },
  { label: "7 hari terakhir", value: "7d" },
  { label: "30 hari terakhir", value: "30d" },
] as const;

interface ApSessionRecord {
  id: string;
  createdAt: string;
  createdBy: { id: string; name: string };
  createdByEmail?: string;
  createdByIp?: string;
  database: { id: string; name: string; dbCode: string };
  fileName: string;
  groups: JournalGroup[];
  pushedIds: string[];
  resolvedIds: string[];
  status: "draft" | "selesai";
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}

function isWithinDays(iso: string, days: number) {
  const d = new Date(iso);
  const now = new Date();
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= days;
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

function sessionTotalDebit(session: ApSessionRecord): number {
  return session.groups
    .filter((g) => g.db_cr === "D")
    .reduce((s, g) => s + g.total_debit, 0);
}

export default function AuditLogPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ApSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<"semua" | "today" | "7d" | "30d">("semua");

  useEffect(() => {
    fetch("/api/ap-sessions")
      .then((r) => r.json())
      .then((data: ApSessionRecord[]) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (dateFilter === "semua") return sessions;
    const days = dateFilter === "today" ? 1 : dateFilter === "7d" ? 7 : 30;
    return sessions.filter((s) => isWithinDays(s.createdAt, days));
  }, [sessions, dateFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    draft: filtered.filter((s) => s.status === "draft").length,
    selesai: filtered.filter((s) => s.status === "selesai").length,
    totalNilai: filtered.reduce((sum, s) => sum + sessionTotalDebit(s), 0),
  }), [filtered]);

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-semibold text-zinc-900">Audit Log</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Riwayat seluruh sesi Transaksi AP yang pernah dibuat
          </p>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { label: "Total Sesi",  value: String(stats.total),   icon: ClipboardList, color: "text-zinc-500" },
            { label: "Draft",       value: String(stats.draft),   icon: RefreshCw,     color: "text-amber-500" },
            { label: "Selesai",     value: String(stats.selesai), icon: CheckCircle2,  color: "text-blue-500" },
            { label: "Total Nilai", value: formatRupiah(stats.totalNilai), icon: ArrowUpRight, color: "text-zinc-600" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.25 }}
                className="bg-white border border-zinc-200 rounded-xl px-4 py-3.5"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={13} className={s.color} aria-hidden="true" />
                  <span className="text-xs text-zinc-400">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-zinc-900 tabular-nums">{s.value}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Date filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="flex items-center gap-2 flex-wrap"
        >
          <span className="text-sm text-zinc-500 font-medium">Tampilkan:</span>
          <div className="flex border border-zinc-200 rounded-lg bg-white overflow-hidden">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`px-4 h-9 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                  dateFilter === f.value
                    ? "bg-blue-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                }`}
                aria-pressed={dateFilter === f.value}
                aria-label={`Filter: ${f.label}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-sm text-zinc-400 ml-2">{filtered.length} sesi</span>
        </motion.div>

        {/* Log table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
        >
          {/* Header */}
          <div className="hidden lg:grid grid-cols-[100px_1fr_150px_110px_170px_90px_80px_70px_80px] gap-3 px-5 py-2.5 bg-zinc-50 border-b border-zinc-100">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tanggal</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Nama File</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Database</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Dibuat oleh</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">IP / Lokasi</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Progress</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Aksi</span>
          </div>

          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-zinc-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileSpreadsheet size={20} className="text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Tidak ada sesi Transaksi AP dalam rentang waktu ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filtered.map((s, i) => {
                const ts = formatTimestamp(s.createdAt);
                const { done, total } = sessionProgress(s);
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-[100px_1fr_150px_110px_170px_90px_80px_70px_80px] gap-1 lg:gap-3 px-5 py-4 items-center hover:bg-zinc-50 transition-colors"
                  >
                    {/* Tanggal */}
                    <div>
                      <p className="text-sm text-zinc-700 font-medium">{ts.date}</p>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{ts.time}</p>
                    </div>

                    {/* Nama file */}
                    <div className="pr-3 min-w-0">
                      <p className="text-sm text-zinc-700 font-mono truncate">{s.fileName}</p>
                    </div>

                    {/* Database */}
                    <div className="pr-3 min-w-0">
                      <p className="text-sm text-zinc-600 truncate">{s.database.name}</p>
                    </div>

                    {/* Dibuat oleh */}
                    <div className="pr-3 min-w-0">
                      <p className="text-sm text-zinc-600 truncate">{s.createdBy.name}</p>
                    </div>

                    {/* Email */}
                    <div className="pr-3 min-w-0">
                      <p className="text-sm text-zinc-500 truncate">{s.createdByEmail || "-"}</p>
                    </div>

                    {/* IP */}
                    <div className="pr-3 min-w-0">
                      <p className="text-xs text-zinc-500 font-mono truncate">{s.createdByIp || "-"}</p>
                    </div>

                    {/* Status */}
                    <div>
                      <Badge
                        className={`text-xs font-medium px-2.5 ${
                          s.status === "selesai"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {s.status === "selesai" ? "Selesai" : "Draft"}
                      </Badge>
                    </div>

                    {/* Progress */}
                    <div>
                      <span className="text-xs text-zinc-500 font-mono">{done}/{total}</span>
                    </div>

                    {/* Aksi */}
                    <div className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => router.push(`/audit-log/${s.id}`)}
                        aria-label={`Detail sesi ${s.fileName}`}
                      >
                        <Eye size={13} aria-hidden="true" />
                        Detail
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="text-xs text-zinc-400 flex items-center gap-1.5"
        >
          <RefreshCw size={11} aria-hidden="true" />
          Setiap baris merepresentasikan satu sesi Transaksi AP (satu file e-statement yang diproses).
        </motion.p>

      </div>
    </AppShell>
  );
}
