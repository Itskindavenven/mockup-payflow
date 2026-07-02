"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AccurateStatus,
  JournalGroup,
  formatRupiah,
  cleanDescription,
  extractRefNo,
  KeywordEntry,
} from "@/lib/parser";

const STATUS_CONFIG: Record<
  AccurateStatus,
  { label: string; badge: string; icon: typeof CheckCircle2 }
> = {
  sudah_tercatat: { label: "Sudah di Accurate", badge: "bg-zinc-100 text-zinc-500 border-zinc-200", icon: CheckCircle2 },
  akan_dipush:    { label: "Akan di-push",       badge: "bg-blue-50 text-blue-700 border-blue-100",  icon: ArrowUpRight  },
  perlu_review:   { label: "Perlu Review",        badge: "bg-amber-50 text-amber-700 border-amber-100", icon: AlertCircle },
};

const ENDPOINT_LABEL: Record<string, string> = {
  "purchase-payment": "Pembayaran Pembelian",
  "other-payment":    "Pengeluaran Lain",
};

// ─── Detail card (hover-triggered, fixed position) ────────────────────────
interface DetailCardProps {
  group: JournalGroup;
  pos: { top: number; left: number };
  onPush: (id: string) => void;
  pushingId: string | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  accurateJournalNos?: Map<string, string>;
}

function DetailCard({ group, pos, onPush, pushingId, onMouseEnter, onMouseLeave, accurateJournalNos }: DetailCardProps) {
  const pushing = pushingId === group.group_id;
  const cfg = STATUS_CONFIG[group.accurate_status];
  const StatusIcon = cfg.icon;
  const journalNo = accurateJournalNos?.get(group.group_id);

  const cardW = 300;
  const left = Math.min(pos.left, window.innerWidth - cardW - 8);
  const top  = Math.min(pos.top,  window.innerHeight - 380);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6, scale: 0.97 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{ opacity: 0, x: -4, scale: 0.97 }}
      transition={{ duration: 0.14 }}
      style={{ top, left, width: cardW }}
      className="fixed z-50 bg-white rounded-xl border border-zinc-200 shadow-xl overflow-hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs text-zinc-500">Jurnal #{group.journal_no}</p>
          <Badge className={`text-[10px] font-normal px-2 py-0.5 ${cfg.badge}`}>
            <StatusIcon size={9} className="mr-1 inline" />
            {cfg.label}
          </Badge>
        </div>
        <p className={`text-lg font-semibold tabular-nums mt-1 ${group.db_cr === "D" ? "text-red-600" : "text-green-600"}`}>
          {group.db_cr === "D" ? "−" : "+"} {formatRupiah(group.total_debit || group.primary.amount)}
        </p>
        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{group.post_date.slice(0, 10)}</p>
      </div>

      {/* Line items */}
      <div className="px-4 py-3 space-y-1.5">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-2">
          <Terminal size={9} /> {group.rows.length} line item
        </p>
        {group.rows.map((row) => (
          <div
            key={row.id}
            className={`flex items-start gap-2 text-xs rounded-lg px-2.5 py-2 ${
              row.is_admin_fee ? "bg-amber-50 text-amber-800" : "bg-zinc-50 text-zinc-700"
            }`}
          >
            <span className="flex-1 min-w-0 leading-relaxed">
              {cleanDescription(row.description_raw)}
            </span>
            <span className={`font-semibold tabular-nums flex-shrink-0 ${row.db_cr === "D" ? "text-red-500" : "text-green-500"}`}>
              {row.db_cr === "D" ? "−" : "+"} {formatRupiah(row.amount)}
            </span>
          </div>
        ))}
        {group.rows.length > 1 && (
          <div className="flex justify-end pt-0.5">
            <span className="text-[11px] text-zinc-500">
              Total: <strong>{formatRupiah(group.total_debit)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* COA + Modul */}
      <div className="px-4 py-2 border-t border-zinc-100 space-y-1">
        {[
          { label: "COA",   value: group.suggested_coa ?? (group.detected_invoice_no ? "Hutang Usaha" : "—") },
          { label: "Modul", value: group.sync_action ? (ENDPOINT_LABEL[group.sync_action] ?? "—") : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start gap-3 text-xs">
            <span className="text-zinc-400 w-12 flex-shrink-0">{label}</span>
            <span className="text-zinc-700 font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Push action */}
      {group.accurate_status === "akan_dipush" && group.sync_action === "other-payment" && (
        <div className="px-4 pb-4 pt-2">
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-blue-900 hover:bg-blue-800 text-white gap-1.5"
            onClick={() => onPush(group.group_id)}
            disabled={pushing}
          >
            {pushing
              ? <><Loader2 size={12} className="animate-spin" /> Memproses…</>
              : <><ArrowUpRight size={12} /> Push Jurnal ke Accurate</>
            }
          </Button>
        </div>
      )}
      {group.accurate_status === "akan_dipush" && group.sync_action === "purchase-payment" && (
        <div className="px-4 pb-4 pt-2">
          <p className="text-[11px] text-amber-700 text-center bg-amber-50 rounded-lg py-2 px-3">
            Invoice — Matching manual di Accurate
          </p>
        </div>
      )}
      {group.accurate_status === "sudah_tercatat" && (
        <div className="px-4 pb-3 pt-1">
          <p className="text-[11px] text-center text-zinc-400 flex items-center justify-center gap-1">
            <CheckCircle2 size={11} /> Sudah tercatat di Accurate
          </p>
          {journalNo && (
            <p className="text-[10px] font-mono text-center text-emerald-600 mt-0.5">{journalNo}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main table ─────────────────────────────────────────────────────────────
interface TransactionTableProps {
  groups: JournalGroup[];
  onPush: (group_id: string) => void;
  pushedIds: Set<string>;
  pushingId: string | null;
  onOpenReview: (group: JournalGroup) => void;
  keywordMap: KeywordEntry[];
  accurateJournalNos?: Map<string, string>;
}

const COL_HEADERS = [
  { label: "No. Jurnal",  cls: "w-28" },
  { label: "No. Invoice", cls: "w-36" },
  { label: "Keterangan",  cls: "" },
  { label: "Nominal",     cls: "w-36" },
  { label: "COA",         cls: "w-44" },
  { label: "Status",      cls: "w-40" },
  { label: "Aksi",        cls: "w-32 text-center" },
];

export function TransactionTable({
  groups,
  onPush,
  pushingId,
  onOpenReview,
  accurateJournalNos,
}: TransactionTableProps) {
  const [previewGroup, setPreviewGroup] = useState<JournalGroup | null>(null);
  const [previewPos, setPreviewPos]     = useState<{ top: number; left: number } | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    hideTimeout.current = setTimeout(() => {
      setPreviewGroup(null);
      setPreviewPos(null);
    }, 180);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  }, []);

  function showPreview(group: JournalGroup, el: HTMLElement) {
    cancelHide();
    const rect = el.getBoundingClientRect();
    setPreviewPos({ top: rect.top, left: rect.right + 10 });
    setPreviewGroup(group);
  }

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-zinc-400">Tidak ada transaksi yang cocok.</p>
      </div>
    );
  }

  let rowCounter = 0;

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 border-b border-zinc-200 hover:bg-zinc-50">
                {COL_HEADERS.map(({ label, cls }) => (
                  <TableHead
                    key={label}
                    className={`text-[11px] font-semibold text-zinc-400 uppercase tracking-wider py-2.5 ${cls}`}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const isGrouped = group.rows.length > 1;
                const cfg = STATUS_CONFIG[group.accurate_status];
                const StatusIcon = cfg.icon;
                const pushing = pushingId === group.group_id;
                const journalNo = accurateJournalNos?.get(group.group_id);

                return group.rows.map((row, rowIdx) => {
                  rowCounter++;
                  const isFirst = rowIdx === 0;
                  const isLast  = rowIdx === group.rows.length - 1;

                  const groupedBg     = isGrouped ? "bg-blue-50/25" : "";
                  const groupedBorder = isGrouped
                    ? `border-l-2 border-blue-300 ${isFirst ? "rounded-tl" : ""} ${isLast ? "rounded-bl" : ""}`
                    : "";

                  const ref = extractRefNo(row.description_raw);

                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: rowCounter * 0.02 }}
                      className={`border-b border-zinc-100 last:border-0 transition-colors hover:bg-zinc-50/80 ${groupedBg}`}
                    >
                      {/* No. Jurnal */}
                      <TableCell
                        className={`py-2.5 ${groupedBorder}`}
                        onMouseEnter={(e) => isFirst && showPreview(group, e.currentTarget)}
                        onMouseLeave={scheduleHide}
                      >
                        {isFirst && (
                          <span className="font-mono text-xs text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded cursor-default hover:bg-zinc-200 transition-colors">
                            {group.journal_no}
                          </span>
                        )}
                      </TableCell>

                      {/* No. Invoice / Ref */}
                      <TableCell
                        className="py-2.5"
                        onMouseEnter={(e) => showPreview(group, e.currentTarget)}
                        onMouseLeave={scheduleHide}
                      >
                        {ref ? (
                          ref.type === "invoice" ? (
                            <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded cursor-default hover:bg-indigo-100 transition-colors">
                              {ref.value}
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded cursor-default hover:bg-zinc-200 transition-colors">
                              {ref.value}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-zinc-300">—</span>
                        )}
                      </TableCell>

                      {/* Keterangan */}
                      <TableCell className="py-2.5">
                        <div>
                          <span className={`text-xs ${row.is_admin_fee ? "text-amber-600" : "text-zinc-700"}`}>
                            {cleanDescription(row.description_raw)}
                          </span>
                          {isFirst && (
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {row.post_date.slice(0, 10)}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Nominal */}
                      <TableCell className="text-left text-xs font-semibold tabular-nums whitespace-nowrap py-2.5">
                        <span className={row.db_cr === "D" ? "text-red-600" : "text-green-600"}>
                          {formatRupiah(row.amount)}
                        </span>
                      </TableCell>

                      {/* COA */}
                      <TableCell className="py-2.5">
                        {row.is_admin_fee ? (
                          <span className="text-xs text-amber-700">Beban Admin Bank</span>
                        ) : row.suggested_coa ? (
                          <span className="text-xs text-zinc-600">{row.suggested_coa}</span>
                        ) : row.detected_invoice_no ? (
                          <span className="text-xs text-zinc-400 italic">Hutang Usaha</span>
                        ) : (
                          <span className="text-xs text-zinc-300">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-2.5">
                        {isFirst && (
                          <div>
                            <Badge className={`text-[10px] font-normal px-2 py-0.5 gap-1 ${cfg.badge}`}>
                              <StatusIcon size={9} aria-hidden="true" />
                              {cfg.label}
                            </Badge>
                            {group.accurate_status === "sudah_tercatat" && journalNo && (
                              <p className="text-[10px] font-mono text-emerald-600 mt-1 leading-none">
                                {journalNo}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Aksi */}
                      <TableCell className="text-center py-2.5">
                        {isFirst && (
                          <>
                            {group.accurate_status === "akan_dipush" && group.sync_action === "other-payment" && (
                              <Button
                                size="sm"
                                className="h-7 text-[11px] px-3 bg-blue-900 hover:bg-blue-800 text-white gap-1"
                                onClick={() => onPush(group.group_id)}
                                disabled={pushing}
                              >
                                {pushing
                                  ? <RefreshCw size={11} className="animate-spin" />
                                  : <><ArrowUpRight size={11} /> Push Jurnal</>
                                }
                              </Button>
                            )}
                            {group.accurate_status === "akan_dipush" && group.sync_action === "purchase-payment" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="h-7 text-[11px] px-3 border-amber-200 text-amber-600 opacity-70 cursor-not-allowed gap-1"
                                title="Invoice — perlu matching manual di Accurate"
                              >
                                <AlertCircle size={10} /> Invoice
                              </Button>
                            )}
                            {group.accurate_status === "perlu_review" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] px-3 border-amber-200 text-amber-700 hover:bg-amber-50"
                                onClick={() => onOpenReview(group)}
                              >
                                Review
                              </Button>
                            )}
                            {group.accurate_status === "sudah_tercatat" && (
                              <span className="text-[11px] text-zinc-400 flex items-center justify-center gap-1">
                                <CheckCircle2 size={11} /> Selesai
                              </span>
                            )}
                          </>
                        )}
                      </TableCell>
                    </motion.tr>
                  );
                });
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Hover detail card */}
      <AnimatePresence>
        {previewGroup && previewPos && (
          <DetailCard
            group={previewGroup}
            pos={previewPos}
            onPush={onPush}
            pushingId={pushingId}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            accurateJournalNos={accurateJournalNos}
          />
        )}
      </AnimatePresence>
    </>
  );
}
