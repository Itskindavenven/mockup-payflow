"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  ArrowUpRight,
  RefreshCw,
  FileText,
  CheckCircle2,
  BookOpen,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { AUDIT_LOG, AuditLogEntry } from "@/lib/mock-data";
import { formatRupiah } from "@/lib/parser";

const DATE_FILTERS = [
  { label: "Semua", value: "semua" },
  { label: "Hari ini", value: "today" },
  { label: "7 hari terakhir", value: "7d" },
  { label: "30 hari terakhir", value: "30d" },
] as const;

const ACTION_CONFIG: Record<
  AuditLogEntry["action"],
  { label: string; icon: typeof ArrowUpRight; color: string }
> = {
  push_single:      { label: "Push Transaksi",    icon: ArrowUpRight, color: "text-teal-500"  },
  push_batch:       { label: "Push Batch",         icon: ArrowUpRight, color: "text-teal-500"  },
  resolve_review:   { label: "Selesaikan Review",  icon: CheckCircle2, color: "text-blue-500"  },
  sync_coa:         { label: "Sync COA",           icon: BookOpen,     color: "text-purple-500" },
  sync_vendor:      { label: "Sync Vendor",         icon: Users,        color: "text-purple-500" },
  import_statement: { label: "Import e-Statement", icon: FileText,     color: "text-zinc-500"  },
};

function formatTimestamp(ts: string) {
  const d = new Date(ts.replace(" ", "T"));
  return {
    date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}

function isWithinDays(ts: string, days: number) {
  const d = new Date(ts.replace(" ", "T"));
  const now = new Date("2026-04-03T23:59:59"); // demo date
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= days;
}

export default function AuditLogPage() {
  const [dateFilter, setDateFilter] = useState<"semua" | "today" | "7d" | "30d">("semua");

  const filtered = useMemo(() => {
    if (dateFilter === "semua") return AUDIT_LOG;
    if (dateFilter === "today") return AUDIT_LOG.filter((l) => isWithinDays(l.timestamp, 1));
    if (dateFilter === "7d") return AUDIT_LOG.filter((l) => isWithinDays(l.timestamp, 7));
    if (dateFilter === "30d") return AUDIT_LOG.filter((l) => isWithinDays(l.timestamp, 30));
    return AUDIT_LOG;
  }, [dateFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    sukses: filtered.filter((l) => l.status === "sukses").length,
    gagal: filtered.filter((l) => l.status === "gagal").length,
    totalPushed: filtered
      .filter((l) => (l.action === "push_single" || l.action === "push_batch") && l.status === "sukses")
      .reduce((s, l) => s + (l.amount || 0), 0),
  }), [filtered]);

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-semibold text-zinc-900">Audit Log</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Riwayat seluruh aktivitas push ke Accurate Online dan sinkronisasi data
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
            { label: "Total Aktivitas",   value: String(stats.total),  icon: ClipboardList, color: "text-zinc-500"  },
            { label: "Sukses",            value: String(stats.sukses), icon: CheckCircle2,  color: "text-teal-500"  },
            { label: "Gagal",             value: String(stats.gagal),  icon: XCircle,       color: "text-red-500"   },
            { label: "Total Nilai Push",  value: formatRupiah(stats.totalPushed), icon: ArrowUpRight, color: "text-zinc-600" },
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
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                }`}
                aria-pressed={dateFilter === f.value}
                aria-label={`Filter: ${f.label}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-sm text-zinc-400 ml-2">{filtered.length} entri</span>
        </motion.div>

        {/* Log table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-[140px_160px_1fr_160px_90px] gap-0 px-5 py-2.5 bg-zinc-50 border-b border-zinc-100">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Waktu</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Jenis Aksi</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Keterangan</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Modul / Nilai</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Status</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-zinc-400">Tidak ada aktivitas dalam rentang waktu ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filtered.map((log, i) => {
                const cfg = ACTION_CONFIG[log.action];
                const Icon = cfg.icon;
                const ts = formatTimestamp(log.timestamp);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="grid grid-cols-[140px_160px_1fr_160px_90px] gap-0 px-5 py-4 items-start hover:bg-zinc-50 transition-colors"
                  >
                    {/* Waktu */}
                    <div>
                      <p className="text-sm text-zinc-700 font-medium">{ts.date}</p>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{ts.time}</p>
                    </div>

                    {/* Jenis */}
                    <div className="flex items-center gap-2 pr-3">
                      <Icon size={14} className={cfg.color} aria-hidden="true" />
                      <span className="text-sm text-zinc-700">{cfg.label}</span>
                    </div>

                    {/* Keterangan */}
                    <div className="pr-4">
                      <p className="text-sm text-zinc-600 leading-snug">{log.description}</p>
                      {log.affected_count && (
                        <p className="text-xs text-zinc-400 mt-0.5">{log.affected_count} item</p>
                      )}
                    </div>

                    {/* Modul & nilai */}
                    <div>
                      {log.module && (
                        <p className="text-xs text-zinc-500 font-medium">{log.module}</p>
                      )}
                      {log.amount && (
                        <p className="text-sm font-semibold text-zinc-700 tabular-nums mt-0.5">
                          {formatRupiah(log.amount)}
                        </p>
                      )}
                      {!log.module && !log.amount && (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-center">
                      <Badge
                        className={`text-xs font-medium px-2.5 ${
                          log.status === "sukses"
                            ? "bg-teal-50 text-teal-700 border-teal-100"
                            : "bg-red-50 text-red-600 border-red-100"
                        }`}
                      >
                        {log.status === "sukses" ? "Sukses" : "Gagal"}
                      </Badge>
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
          Log disimpan selama 90 hari. Pada Fase 2, log akan tersimpan di database dan dapat diekspor ke Excel.
        </motion.p>

      </div>
    </AppShell>
  );
}
