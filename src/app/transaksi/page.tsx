"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, type Variants, type Easing } from "framer-motion";
import { toast } from "sonner";
import {
  Upload,
  Search,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { TransactionDetailSheet, EnrichedTransaction } from "@/components/TransactionDetailSheet";
import {
  DEFAULT_KEYWORD_MAP,
  parseTransaction,
  formatRupiah,
  AccurateStatus,
  KeywordEntry,
} from "@/lib/parser";
import { RAW_TRANSACTIONS, ALREADY_RECORDED_IN_ACCURATE } from "@/lib/mock-data";

type FilterStatus = AccurateStatus | "semua";

const STATUS_CONFIG: Record<
  AccurateStatus,
  { label: string; badge: string; icon: typeof CheckCircle2; dot: string }
> = {
  sudah_tercatat: {
    label: "Sudah di Accurate",
    badge: "bg-zinc-100 text-zinc-500 border-zinc-200",
    icon: CheckCircle2,
    dot: "bg-zinc-400",
  },
  akan_dipush: {
    label: "Akan di-push",
    badge: "bg-teal-50 text-teal-700 border-teal-100",
    icon: ArrowUpRight,
    dot: "bg-teal-400",
  },
  perlu_review: {
    label: "Perlu Review",
    badge: "bg-amber-50 text-amber-700 border-amber-100",
    icon: AlertCircle,
    dot: "bg-amber-400",
  },
};

const EASE_OUT: Easing = "easeOut";

const CARD_ANIMATION: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: EASE_OUT },
  }),
};

const ROW_ANIMATION: Variants = {
  hidden: { opacity: 0, x: -6 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: EASE_OUT },
  }),
};

export default function TransaksiPage() {
  const [keywordMap] = useState<KeywordEntry[]>(DEFAULT_KEYWORD_MAP);
  const [filter, setFilter] = useState<FilterStatus>("semua");
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<EnrichedTransaction | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pushedIds, setPushedIds] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [isPushingAll, setIsPushingAll] = useState(false);

  const allTransactions = useMemo<EnrichedTransaction[]>(() =>
    RAW_TRANSACTIONS.map((raw) => {
      const parsed = parseTransaction(raw.description_raw, ALREADY_RECORDED_IN_ACCURATE, keywordMap);
      const id = `tx-${raw.no}`;
      let accurate_status = parsed.accurate_status;
      if (pushedIds.has(id)) accurate_status = "sudah_tercatat";
      if (resolvedIds.has(id) && accurate_status === "perlu_review")
        accurate_status = "akan_dipush";
      return { ...raw, ...parsed, id, accurate_status };
    }),
    [keywordMap, pushedIds, resolvedIds]
  );

  const counts = useMemo(() => ({
    total: allTransactions.length,
    sudah: allTransactions.filter((t) => t.accurate_status === "sudah_tercatat").length,
    akan: allTransactions.filter((t) => t.accurate_status === "akan_dipush").length,
    review: allTransactions.filter((t) => t.accurate_status === "perlu_review").length,
  }), [allTransactions]);

  const filtered = useMemo(() => {
    let list = allTransactions;
    if (filter !== "semua") list = list.filter((t) => t.accurate_status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.description_raw.toLowerCase().includes(q));
    }
    return list;
  }, [allTransactions, filter, search]);

  const totalDebit = useMemo(
    () => allTransactions.filter((t) => t.db_cr === "D").reduce((s, t) => s + t.amount, 0),
    [allTransactions]
  );

  function handleRowClick(tx: EnrichedTransaction) {
    setSelectedTx(tx);
    setSheetOpen(true);
  }

  function handlePush(id: string) {
    setPushingId(id);
    setTimeout(() => {
      setPushedIds((prev) => new Set(prev).add(id));
      setPushingId(null);
      setSelectedTx((prev) =>
        prev?.id === id ? { ...prev, accurate_status: "sudah_tercatat" } : prev
      );
      toast.success("Transaksi berhasil di-push ke Accurate Online.", {
        description: "Simulasi — tidak ada network call nyata",
      });
    }, 1000);
  }

  function handlePushAll() {
    const ids = allTransactions
      .filter((t) => t.accurate_status === "akan_dipush")
      .map((t) => t.id);
    if (!ids.length) { toast.info("Tidak ada transaksi yang perlu di-push."); return; }
    setIsPushingAll(true);
    setTimeout(() => {
      setPushedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setIsPushingAll(false);
      toast.success(`${ids.length} transaksi berhasil di-push ke Accurate Online.`, {
        description: "Simulasi — tidak ada network call nyata",
      });
    }, 1800);
  }

  function handleManualResolve(id: string) {
    setResolvedIds((prev) => new Set(prev).add(id));
    toast.success("Ditandai sudah direview — siap di-push.");
  }

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Transaksi AP</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Periode: 1 Apr 2026 – 3 Apr 2026 · BNI Giro Utama
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-600 border-amber-100 font-normal">
              Demo · Data Dummy
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              aria-label="Import e-statement baru dari file"
              onClick={() => toast.info("Import e-statement tersedia di Fase 2.")}
            >
              <Upload size={14} aria-hidden="true" />
              Import e-Statement
            </Button>
          </div>
        </motion.div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Transaksi", value: counts.total, sub: formatRupiah(totalDebit), filter: "semua" as FilterStatus, icon: RefreshCw, accent: "text-zinc-600" },
            { label: "Sudah di Accurate", value: counts.sudah, filter: "sudah_tercatat" as FilterStatus, icon: CheckCircle2, accent: "text-zinc-500" },
            { label: "Akan di-push", value: counts.akan, filter: "akan_dipush" as FilterStatus, icon: ArrowUpRight, accent: "text-teal-600" },
            { label: "Perlu Review", value: counts.review, filter: "perlu_review" as FilterStatus, icon: AlertCircle, accent: "text-amber-600" },
          ].map((card, i) => {
            const Icon = card.icon;
            const isActive = filter === card.filter;
            return (
              <motion.button
                key={card.filter}
                custom={i}
                initial="hidden"
                animate="show"
                variants={CARD_ANIMATION}
                onClick={() => setFilter(card.filter)}
                className={`text-left bg-white border rounded-lg px-4 py-4 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none ${
                  isActive ? "border-zinc-300 shadow-sm" : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={13} className={card.accent} aria-hidden="true" />
                  <span className="text-xs text-zinc-500 font-medium">{card.label}</span>
                </div>
                <div className="text-2xl font-semibold text-zinc-900 tabular-nums">{card.value}</div>
                {card.sub && <div className="text-xs text-zinc-400 mt-0.5 font-mono">{card.sub}</div>}
              </motion.button>
            );
          })}
        </div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="flex flex-col sm:flex-row gap-2 items-start sm:items-center"
        >
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <Input
              placeholder="Cari description transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-white"
              aria-label="Cari transaksi berdasarkan description"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                aria-label="Hapus pencarian"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
            <SelectTrigger className="w-48 h-9 bg-white" aria-label="Filter status transaksi">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua status</SelectItem>
              <SelectItem value="sudah_tercatat">Sudah di Accurate</SelectItem>
              <SelectItem value="akan_dipush">Akan di-push</SelectItem>
              <SelectItem value="perlu_review">Perlu Review</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-zinc-400 hidden sm:block">{filtered.length} baris</span>

          <div className="sm:ml-auto">
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-zinc-900 hover:bg-zinc-700 text-white"
              onClick={handlePushAll}
              disabled={isPushingAll || counts.akan === 0}
              aria-label="Push semua transaksi yang siap ke Accurate"
            >
              {isPushingAll ? (
                <><RefreshCw size={13} className="animate-spin" /> Memproses...</>
              ) : (
                <><ArrowUpRight size={14} /> Push Semua ({counts.akan})</>
              )}
            </Button>
          </div>
        </motion.div>

        <Separator />

        {/* Transaction list */}
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center"
              >
                <p className="text-sm text-zinc-400">Tidak ada transaksi yang cocok.</p>
                <button
                  onClick={() => { setSearch(""); setFilter("semua"); }}
                  className="text-sm text-zinc-500 underline underline-offset-2 mt-2 hover:text-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Reset filter
                </button>
              </motion.div>
            )}
            {filtered.map((tx, i) => {
              const cfg = STATUS_CONFIG[tx.accurate_status];
              const StatusIcon = cfg.icon;
              const isPushing = pushingId === tx.id;
              return (
                <motion.button
                  key={tx.id}
                  custom={i}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, x: 4, transition: { duration: 0.15 } }}
                  variants={ROW_ANIMATION}
                  layout
                  onClick={() => handleRowClick(tx)}
                  className="w-full text-left bg-white border border-zinc-200 rounded-lg px-4 py-3.5 flex items-center gap-4 hover:border-zinc-300 hover:shadow-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 outline-none group"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${isPushing ? "animate-pulse" : ""}`} aria-hidden="true" />
                  <span className="text-sm text-zinc-400 font-mono w-24 flex-shrink-0 hidden sm:block">
                    {tx.post_date.slice(0, 10)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{tx.display_label}</p>
                    <p className="text-xs text-zinc-400 truncate font-mono mt-0.5">
                      {tx.description_raw.length > 60 ? tx.description_raw.slice(0, 60) + "…" : tx.description_raw}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${tx.db_cr === "D" ? "text-red-600" : "text-green-600"}`}>
                    {tx.db_cr === "D" ? "−" : "+"} {formatRupiah(tx.amount)}
                  </span>
                  <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                    <Badge className={`text-xs font-normal px-2.5 py-0.5 ${cfg.badge}`}>
                      <StatusIcon size={11} className="mr-1 inline" aria-hidden="true" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <ChevronDown size={14} className="text-zinc-300 group-hover:text-zinc-500 flex-shrink-0 -rotate-90 transition-colors" aria-hidden="true" />
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <TransactionDetailSheet
        tx={selectedTx}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        keywordMap={keywordMap}
        onPush={handlePush}
        onManualResolve={(_id) => handleManualResolve(_id)}
      />
    </AppShell>
  );
}
