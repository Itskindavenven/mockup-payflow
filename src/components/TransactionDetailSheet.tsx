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
  ParsedTransaction,
  formatRupiah,
  KeywordEntry,
} from "@/lib/parser";
import { RawTransaction } from "@/lib/mock-data";

export interface EnrichedTransaction extends RawTransaction, ParsedTransaction {
  id: string;
}

const STATUS_CONFIG: Record<
  AccurateStatus,
  { label: string; class: string; icon: typeof CheckCircle2 }
> = {
  sudah_tercatat: {
    label: "Sudah di Accurate",
    class: "bg-zinc-100 text-zinc-500 border-zinc-200",
    icon: CheckCircle2,
  },
  akan_dipush: {
    label: "Akan di-push",
    class: "bg-teal-50 text-teal-700 border-teal-100",
    icon: ArrowUpRight,
  },
  perlu_review: {
    label: "Perlu Review",
    class: "bg-amber-50 text-amber-700 border-amber-100",
    icon: AlertCircle,
  },
};

const ENDPOINT_MAP: Record<string, string> = {
  "purchase-payment": "/api/purchase-payment",
  "other-payment": "/api/other-payment",
};

interface TransactionDetailSheetProps {
  tx: EnrichedTransaction | null;
  open: boolean;
  onClose: () => void;
  keywordMap: KeywordEntry[];
  onPush: (id: string) => void;
  onManualResolve: (id: string, invoiceNo: string, coa: string) => void;
}

export function TransactionDetailSheet({
  tx,
  open,
  onClose,
  keywordMap,
  onPush,
  onManualResolve,
}: TransactionDetailSheetProps) {
  const [manualInvoice, setManualInvoice] = useState("");
  const [manualCoa, setManualCoa] = useState<string>("");
  const [pushing, setPushing] = useState(false);

  if (!tx) return null;

  const cfg = STATUS_CONFIG[tx.accurate_status];
  const StatusIcon = cfg.icon;
  const coaOptions = Array.from(new Set(keywordMap.map((k) => k.coa)));

  function handlePush() {
    setPushing(true);
    setTimeout(() => {
      setPushing(false);
      onPush(tx!.id);
    }, 800);
  }

  function handleManualSubmit() {
    if (!manualInvoice && !manualCoa) {
      toast.error("Isi nomor invoice atau pilih COA terlebih dahulu.");
      return;
    }
    onManualResolve(tx!.id, manualInvoice, manualCoa);
    setManualInvoice("");
    setManualCoa("");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto p-0 bg-white border-l border-zinc-200">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold text-zinc-800">
              Transaksi #{tx.no}
            </SheetTitle>
            <Badge className={`text-[10px] font-normal px-2 ${cfg.class}`}>
              <StatusIcon size={10} className="mr-1 inline" aria-hidden="true" />
              {cfg.label}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-xl font-semibold tabular-nums ${
                tx.db_cr === "D" ? "text-red-600" : "text-green-600"
              }`}
            >
              {tx.db_cr === "D" ? "−" : "+"} {formatRupiah(tx.amount)}
            </span>
            <span className="text-xs text-zinc-400">{tx.post_date.slice(0, 10)}</span>
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
          {/* Raw description */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Terminal size={11} className="text-zinc-400" aria-hidden="true" />
              <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                Raw Description
              </h3>
            </div>
            <div className="bg-zinc-950 rounded-lg p-3 font-mono text-[11px] text-zinc-300 leading-relaxed break-all">
              {tx.description_raw}
            </div>
          </section>

          <Separator />

          {/* Parsed fields */}
          <section>
            <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
              Hasil Parsing Otomatis
            </h3>
            <div className="space-y-2">
              {[
                {
                  label: "No. Invoice",
                  value: tx.detected_invoice_no,
                  mono: true,
                  accent: "text-indigo-600",
                },
                { label: "Keyword terdeteksi", value: tx.detected_keyword, mono: true },
                { label: "Suggested COA", value: tx.suggested_coa },
                {
                  label: "Endpoint Accurate",
                  value: tx.sync_action ? ENDPOINT_MAP[tx.sync_action] : null,
                  mono: true,
                  accent: "text-teal-600",
                },
              ].map(({ label, value, mono, accent }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-xs text-zinc-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
                  <span
                    className={`text-xs font-medium flex-1 ${
                      value
                        ? `${accent ?? "text-zinc-700"} ${mono ? "font-mono" : ""}`
                        : "text-zinc-300"
                    }`}
                  >
                    {value ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Action section */}
          <AnimatePresence mode="wait">
            {tx.accurate_status === "sudah_tercatat" && (
              <motion.section
                key="done"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-4 py-3 flex items-start gap-3">
                  <CheckCircle2 size={14} className="text-zinc-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-zinc-500">
                    Transaksi ini sudah tercatat di Accurate Online. Tidak ada aksi yang diperlukan.
                  </p>
                </div>
              </motion.section>
            )}

            {tx.accurate_status === "akan_dipush" && (
              <motion.section
                key="push"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                  Aksi
                </h3>
                <div className="rounded-lg bg-teal-50 border border-teal-100 px-3 py-2.5 flex items-start gap-2">
                  <ChevronRight size={13} className="text-teal-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-teal-700">
                    Siap di-push sebagai{" "}
                    <code className="font-mono bg-teal-100/60 px-1 rounded text-[10px]">
                      {tx.sync_action}
                    </code>{" "}
                    ke Accurate Online.
                  </p>
                </div>
                <Button
                  onClick={handlePush}
                  disabled={pushing}
                  className="w-full bg-zinc-900 hover:bg-zinc-700 text-white text-sm h-9"
                  aria-label="Push transaksi ini ke Accurate Online"
                >
                  {pushing ? (
                    <><Loader2 size={14} className="animate-spin mr-2" /> Memproses...</>
                  ) : (
                    <><ArrowUpRight size={14} className="mr-1.5" /> Push ke Accurate</>
                  )}
                </Button>
              </motion.section>
            )}

            {tx.accurate_status === "perlu_review" && (
              <motion.section
                key="review"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                  Review Manual
                </h3>
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                  <p className="text-xs text-amber-700">
                    Tidak ada sinyal terdeteksi. Isi nomor invoice atau pilih COA untuk melanjutkan.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="manual-invoice" className="text-xs text-zinc-600">
                    Nomor Invoice (opsional)
                  </Label>
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
                  <Label htmlFor="manual-coa" className="text-xs text-zinc-600">
                    COA / Kategori Biaya
                  </Label>
                  <Select value={manualCoa} onValueChange={(v) => setManualCoa(v ?? "")}>
                    <SelectTrigger id="manual-coa" className="h-8 text-sm">
                      <SelectValue placeholder="Pilih COA..." />
                    </SelectTrigger>
                    <SelectContent>
                      {coaOptions.map((coa) => (
                        <SelectItem key={coa} value={coa} className="text-sm">
                          {coa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleManualSubmit}
                  className="w-full bg-zinc-900 hover:bg-zinc-700 text-white text-sm h-9"
                  aria-label="Tandai transaksi ini sudah direview dan siap di-push"
                >
                  Tandai Sudah Direview
                </Button>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
