"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileDown,
  Loader2,
  FileSpreadsheet,
  Landmark,
  Database,
  User,
  Mail,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { formatRupiah, cleanDescription } from "@/lib/parser";
import type { JournalGroup, AccurateStatus } from "@/lib/parser";
import { generateApReportPdf } from "@/lib/pdf-report";

interface ApSessionRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
  createdByEmail?: string;
  createdByIp?: string;
  database: { id: string; name: string; dbCode: string };
  kasBank: { code: string; name: string };
  branchName: string | null;
  fileName: string;
  groups: JournalGroup[];
  pushedIds: string[];
  resolvedIds: string[];
  accurateJournalNos: Record<string, string>;
  status: "draft" | "selesai";
}

const STATUS_LABEL: Record<AccurateStatus, string> = {
  sudah_tercatat: "Sudah di Accurate",
  akan_dipush: "Akan di-push",
  perlu_review: "Perlu Review",
};

const STATUS_CLASS: Record<AccurateStatus, string> = {
  sudah_tercatat: "bg-blue-50 text-blue-700 border-blue-100",
  akan_dipush: "bg-zinc-100 text-zinc-700 border-zinc-200",
  perlu_review: "bg-amber-50 text-amber-700 border-amber-100",
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AuditLogDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<ApSessionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/ap-sessions/${params.id}`)
      .then(async (r) => {
        if (!r.ok) {
          setNotFound(true);
          return;
        }
        const data = (await r.json()) as ApSessionRecord;
        setRecord(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [params?.id]);

  const overlayGroups = useMemo(() => {
    if (!record) return [];
    const pushed = new Set(record.pushedIds);
    const resolved = new Set(record.resolvedIds);
    return record.groups.map((g) => {
      let accurate_status = g.accurate_status;
      if (pushed.has(g.group_id)) accurate_status = "sudah_tercatat";
      if (resolved.has(g.group_id) && accurate_status === "perlu_review") accurate_status = "akan_dipush";
      return { ...g, accurate_status };
    });
  }, [record]);

  function handleDownload() {
    if (!record) return;
    generateApReportPdf(
      {
        fileName: record.fileName,
        databaseName: record.database.name,
        kasBankName: record.kasBank.name,
        createdAt: record.createdAt,
        status: record.status,
        createdByName: record.createdBy.name,
      },
      overlayGroups
    );
    toast.success("Laporan PDF berhasil diunduh.");
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="px-6 py-16 flex items-center justify-center">
          <Loader2 size={18} className="animate-spin text-zinc-400" />
        </div>
      </AppShell>
    );
  }

  if (notFound || !record) {
    return (
      <AppShell>
        <div className="px-6 py-16 max-w-2xl mx-auto text-center">
          <AlertTriangle size={22} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700">Sesi tidak ditemukan</p>
          <p className="text-sm text-zinc-400 mt-1">
            Sesi Transaksi AP ini mungkin sudah dihapus atau ID-nya tidak valid.
          </p>
          <Button
            variant="outline"
            className="mt-5 gap-2"
            onClick={() => router.push("/audit-log")}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Kembali ke Audit Log
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between gap-4 flex-wrap"
        >
          <button
            onClick={() => router.push("/audit-log")}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Audit Log
          </button>
          <Button
            className="h-9 gap-2 bg-blue-900 hover:bg-blue-800 text-white"
            onClick={handleDownload}
            aria-label="Unduh laporan PDF sesi ini"
          >
            <FileDown size={15} aria-hidden="true" />
            Download
          </Button>
        </motion.div>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.3 }}
          className="bg-white border border-zinc-200 rounded-xl px-5 py-5"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet size={16} className="text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800 font-mono">{record.fileName}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{formatTimestamp(record.createdAt)}</p>
              </div>
            </div>
            <Badge
              className={`text-xs font-medium px-2.5 ${
                record.status === "selesai"
                  ? "bg-blue-50 text-blue-700 border-blue-100"
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}
            >
              {record.status === "selesai" ? "Selesai" : "Draft"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 pt-5 border-t border-zinc-100">
            <div className="flex items-start gap-2">
              <Database size={14} className="text-zinc-400 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">Database</p>
                <p className="text-sm text-zinc-700 truncate">{record.database.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Landmark size={14} className="text-zinc-400 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">Kas / Bank</p>
                <p className="text-sm text-zinc-700 truncate">{record.kasBank.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User size={14} className="text-zinc-400 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">Dibuat oleh</p>
                <p className="text-sm text-zinc-700 truncate">{record.createdBy.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail size={14} className="text-zinc-400 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">Email</p>
                <p className="text-sm text-zinc-700 truncate">{record.createdByEmail || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-zinc-400 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-400">IP</p>
                <p className="text-sm text-zinc-700 font-mono truncate">{record.createdByIp || "-"}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Transactions table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">Transaksi ({overlayGroups.length})</h2>
          </div>

          <div className="hidden lg:grid grid-cols-[130px_100px_1fr_130px_130px_150px] gap-3 px-5 py-2.5 bg-zinc-50 border-b border-zinc-100">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">No. Jurnal</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tanggal</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Keterangan</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Nominal</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">No. Jurnal Accurate</span>
          </div>

          {overlayGroups.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-zinc-400">Tidak ada transaksi pada sesi ini.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {overlayGroups.map((g, i) => (
                <motion.div
                  key={g.group_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                  className="grid grid-cols-1 lg:grid-cols-[130px_100px_1fr_130px_130px_150px] gap-1 lg:gap-0 px-5 py-3.5 items-center hover:bg-zinc-50 transition-colors"
                >
                  <div className="text-sm text-zinc-700 font-mono">{g.journal_no}</div>
                  <div className="text-sm text-zinc-500">{formatDateShort(g.post_date)}</div>
                  <div className="text-sm text-zinc-600 truncate pr-3">
                    {cleanDescription(g.primary.description_raw)}
                  </div>
                  <div className="text-sm font-semibold text-zinc-700 tabular-nums text-right pr-3">
                    {formatRupiah(g.total_debit)}
                  </div>
                  <div>
                    <Badge className={`text-xs font-medium px-2.5 ${STATUS_CLASS[g.accurate_status]}`}>
                      {STATUS_LABEL[g.accurate_status]}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {record.accurateJournalNos?.[g.group_id] || "-"}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </AppShell>
  );
}
