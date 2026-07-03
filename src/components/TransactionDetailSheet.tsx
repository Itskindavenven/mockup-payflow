"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ArrowUpRight,
  AlertCircle,
  Terminal,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  AccurateStatus,
  JournalGroup,
  formatRupiah,
  KeywordEntry,
} from "@/lib/parser";

const STATUS_CONFIG: Record<
  AccurateStatus,
  { label: string; class: string; icon: typeof CheckCircle2 }
> = {
  sudah_tercatat: { label: "Sudah di Accurate", class: "bg-zinc-100 text-zinc-500 border-zinc-200", icon: CheckCircle2 },
  akan_dipush:    { label: "Akan di-push",       class: "bg-blue-50 text-blue-700 border-blue-100",  icon: ArrowUpRight  },
  perlu_review:   { label: "Perlu Review",        class: "bg-amber-50 text-amber-700 border-amber-100", icon: AlertCircle },
};

const ENDPOINT_MAP: Record<string, string> = {
  "purchase-payment": "Pembayaran Pembelian",
  "other-payment":    "Pengeluaran Lain",
};

interface TransactionDetailSheetProps {
  group: JournalGroup | null;
  open: boolean;
  onClose: () => void;
  keywordMap: KeywordEntry[];
  onPush: (group_id: string) => void;
  onManualResolve: (group_id: string, override: { coaNo?: string; invoiceNo?: string }) => void;
  accurateJournalNo?: string;
}

export function TransactionDetailSheet({
  group,
  open,
  onClose,
  keywordMap,
  onPush,
  onManualResolve,
  accurateJournalNo,
}: TransactionDetailSheetProps) {
  const [manualInvoice, setManualInvoice] = useState("");
  const [manualCoa, setManualCoa] = useState("");
  const [pushing, setPushing] = useState(false);

  if (!group) return null;

  const cfg = STATUS_CONFIG[group.accurate_status];
  const StatusIcon = cfg.icon;
  const coaOptions = Array.from(new Set(keywordMap.map((k) => k.coa)));

  async function handlePush() {
    setPushing(true);
    try {
      await onPush(group!.group_id);
    } finally {
      setPushing(false);
    }
  }

  function handleManualSubmit() {
    if (!manualInvoice && !manualCoa) {
      toast.error("Isi nomor invoice atau pilih COA terlebih dahulu.");
      return;
    }
    const coaNo = keywordMap.find((k) => k.coa === manualCoa)?.coaNo;
    if (manualCoa && !coaNo) {
      toast.error("COA yang dipilih tidak dikenali.");
      return;
    }
    onManualResolve(group!.group_id, { coaNo, invoiceNo: manualInvoice || undefined });
    setManualInvoice("");
    setManualCoa("");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto p-0 bg-white border-l border-zinc-200">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold text-zinc-800 font-mono">
              Jurnal #{group.journal_no}
            </SheetTitle>
            <Badge className={`text-[10px] font-normal px-2 ${cfg.class}`}>
              <StatusIcon size={10} className="mr-1 inline" aria-hidden="true" />
              {cfg.label}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-xl font-semibold tabular-nums ${group.db_cr === "D" ? "text-red-600" : "text-green-600"}`}>
              {group.db_cr === "D" ? "−" : "+"} {formatRupiah(group.total_debit || group.primary.amount)}
            </span>
            <span className="text-xs text-zinc-400">{group.post_date.slice(0, 10)}</span>
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
          {/* Line items */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Terminal size={11} className="text-zinc-400" aria-hidden="true" />
              <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                Line Items ({group.rows.length})
              </h3>
            </div>
            <div className="space-y-1">
              {group.rows.map((row) => (
                <div
                  key={row.id}
                  className={`rounded-lg px-3 py-2.5 flex items-start gap-3 ${
                    row.is_admin_fee
                      ? "bg-amber-50/60 border border-amber-100"
                      : "bg-zinc-950 border border-zinc-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] leading-relaxed break-all font-mono ${row.is_admin_fee ? "text-amber-800" : "text-zinc-300"}`}>
                      {row.description_raw}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums flex-shrink-0 ${row.db_cr === "D" ? "text-red-400" : "text-green-400"}`}>
                    {row.db_cr === "D" ? "−" : "+"} {formatRupiah(row.amount)}
                  </span>
                </div>
              ))}
            </div>
            {group.rows.length > 1 && (
              <div className="mt-2 flex justify-end">
                <span className="text-xs text-zinc-500">
                  Total debit: <strong className="text-zinc-800">{formatRupiah(group.total_debit)}</strong>
                </span>
              </div>
            )}
          </section>

          <Separator />

          {/* Parsed fields */}
          <section>
            <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
              Hasil Parsing
            </h3>
            <div className="space-y-2">
              {[
                { label: "No. Invoice",   value: group.detected_invoice_no, mono: true, accent: "text-indigo-600" },
                { label: "Keyword",       value: group.detected_keyword,    mono: true },
                { label: "Suggested COA", value: group.suggested_coa },
                { label: "Modul",         value: group.sync_action ? ENDPOINT_MAP[group.sync_action] : null, mono: false, accent: "text-blue-600" },
              ].map(({ label, value, mono, accent }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-xs text-zinc-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
                  <span className={`text-xs font-medium flex-1 ${value ? `${accent ?? "text-zinc-700"} ${mono ? "font-mono" : ""}` : "text-zinc-300"}`}>
                    {value ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Actions */}
          <AnimatePresence mode="wait">
            {group.accurate_status === "sudah_tercatat" && (
              <motion.section key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-start gap-3">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-emerald-700 font-medium">Berhasil dicatat di Accurate Online</p>
                    {accurateJournalNo && (
                      <p className="text-[11px] font-mono text-emerald-600 mt-1">{accurateJournalNo}</p>
                    )}
                  </div>
                </div>
              </motion.section>
            )}

            {group.accurate_status === "akan_dipush" && group.sync_action === "purchase-payment" && (
              <motion.section key="invoice" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Aksi</h3>
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-3 flex items-start gap-2">
                  <AlertCircle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-amber-700 font-medium">Invoice — Matching Manual di Accurate</p>
                    <p className="text-[11px] text-amber-600 mt-1 leading-relaxed">
                      Transaksi ini merupakan pembayaran hutang usaha. Lakukan matching secara manual melalui menu{" "}
                      <span className="font-semibold">Pembelian → Pembayaran Pembelian</span> di Accurate Online.
                    </p>
                  </div>
                </div>
              </motion.section>
            )}

            {group.accurate_status === "akan_dipush" && group.sync_action === "other-payment" && (
              <motion.section key="push" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Aksi</h3>
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 flex items-start gap-2">
                  <ChevronRight size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    Push sebagai{" "}
                    <code className="font-mono bg-blue-100/60 px-1 rounded text-[10px]">{group.sync_action}</code>
                    {" "}— {group.rows.length} baris dalam satu jurnal.
                  </p>
                </div>
                <Button
                  onClick={handlePush}
                  disabled={pushing}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white text-sm h-9"
                >
                  {pushing
                    ? <><Loader2 size={14} className="animate-spin mr-2" /> Memproses...</>
                    : <><ArrowUpRight size={14} className="mr-1.5" /> Push Jurnal ke Accurate</>
                  }
                </Button>
              </motion.section>
            )}

            {group.accurate_status === "perlu_review" && (
              <motion.section key="review" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Review Manual</h3>
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                  <p className="text-xs text-amber-700">Tidak ada sinyal terdeteksi. Isi nomor invoice atau pilih COA untuk melanjutkan.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-invoice" className="text-xs text-zinc-600">Nomor Invoice (opsional)</Label>
                  <Input
                    id="manual-invoice"
                    placeholder="contoh: 204501234"
                    value={manualInvoice}
                    onChange={(e) => setManualInvoice(e.target.value)}
                    className="h-8 text-sm font-mono"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-coa" className="text-xs text-zinc-600">COA / Kategori Biaya</Label>
                  <Select value={manualCoa} onValueChange={(v) => setManualCoa(v ?? "")}>
                    <SelectTrigger id="manual-coa" className="h-8 text-sm">
                      <SelectValue placeholder="Pilih COA..." />
                    </SelectTrigger>
                    <SelectContent>
                      {coaOptions.map((coa) => (
                        <SelectItem key={coa} value={coa} className="text-sm">{coa}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleManualSubmit}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white text-sm h-9"
                >
                  Tandai Sudah Direview
                </Button>
                {!manualCoa && (
                  <p className="text-[11px] text-zinc-400">
                    Tanpa COA, jurnal ditandai sudah direview tapi belum otomatis siap di-push
                    (perlu COA untuk push sebagai Pengeluaran Lain).
                  </p>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
