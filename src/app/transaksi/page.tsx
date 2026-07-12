"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  RefreshCw,
  X,
  RotateCcw,
  Save,
  Loader2,
  Landmark,
  Users,
  Database,
  ChevronDown,
  Check,
  Lock,
  FileDown,
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
import { TransactionWizard, SessionConfig, ReuseSession, AccurateDb } from "@/components/TransactionWizard";
import { TransactionTable } from "@/components/TransactionTable";
import { TransactionDetailSheet } from "@/components/TransactionDetailSheet";
import { useSession } from "@/components/session-provider";
import {
  DEFAULT_KEYWORD_MAP,
  JournalGroup,
  formatRupiah,
  AccurateStatus,
  KeywordEntry,
  cleanDescription,
} from "@/lib/parser";
import { generateApReportPdf } from "@/lib/pdf-report";

type FilterStatus = AccurateStatus | "semua";

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.25 } }),
};

interface ApSessionRecordShape {
  id: string;
  database: { id: string; name: string; dbCode: string };
  kasBank: { code: string; name: string };
  branchName: string | null;
  selectedVendorCodes: string[];
  fileName: string;
  groups: JournalGroup[];
  pushedIds: string[];
  resolvedIds: string[];
  accurateJournalNos: Record<string, string>;
  manualOverrides?: Record<string, { coaNo?: string; invoiceNo?: string }>;
  status: "draft" | "selesai";
}

interface ApiVendor {
  vendorNo: string;
  name: string;
  vendorBranchName: string;
  bankName?: string;
  accountNo?: string;
}

function vendorBankLabel(v: ApiVendor): string | null {
  if (!v.bankName && !v.accountNo) return null;
  return [v.bankName, v.accountNo].filter(Boolean).join(" - ");
}

function sessionConfigFromRecord(record: ApSessionRecordShape): SessionConfig {
  return {
    database: {
      id: record.database.id,
      name: record.database.name,
      dbCode: record.database.dbCode,
      expired: false,
    },
    kasBank: { code: record.kasBank.code, name: record.kasBank.name, type: "Aset Lancar", normal_balance: "D", is_active: true },
    branchName: record.branchName,
    selectedVendorCodes: record.selectedVendorCodes,
  };
}

function TransaksiPageInner() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("session");
  const reuseId = searchParams.get("reuse");
  const session = useSession();
  // Sama seperti gate di wizard: admin & karyawan dengan akses Master Data
  // boleh ganti database/vendor sesi langsung dari halaman ini.
  const canConfigure = session?.role === "admin" || (session?.permissions ?? []).includes("master-data");

  const [keywordMap] = useState<KeywordEntry[]>(DEFAULT_KEYWORD_MAP);
  const [mode, setMode] = useState<"wizard" | "table">("wizard");
  const [isResolvingEntry, setIsResolvingEntry] = useState(!!resumeId || !!reuseId);
  const [reuseData, setReuseData] = useState<ReuseSession | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [baseGroups, setBaseGroups] = useState<JournalGroup[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [vendorOptions, setVendorOptions] = useState<ApiVendor[]>([]);
  const [databaseOptions, setDatabaseOptions] = useState<AccurateDb[]>([]);
  const [dbPickerOpen, setDbPickerOpen] = useState(false);
  const [vendorPickerOpen, setVendorPickerOpen] = useState(false);
  const [vendorPickerSearch, setVendorPickerSearch] = useState("");

  const [pushedIds, setPushedIds] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [accurateJournalNos, setAccurateJournalNos] = useState<Map<string, string>>(new Map());
  const [manualOverrides, setManualOverrides] = useState<Map<string, { coaNo?: string; invoiceNo?: string }>>(new Map());

  const [filter, setFilter] = useState<FilterStatus>("semua");
  const [search, setSearch] = useState("");

  const [reviewGroup, setReviewGroup] = useState<JournalGroup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Resume draft (?session=id) atau reuse data lama untuk sesi baru (?reuse=id)
  useEffect(() => {
    if (resumeId) {
      fetch(`/api/ap-sessions/${resumeId}`)
        .then((r) => r.json())
        .then((record: ApSessionRecordShape) => {
          if (!record?.id) throw new Error("not found");
          setSessionId(record.id);
          setSessionConfig(sessionConfigFromRecord(record));
          setBaseGroups(record.groups);
          setFileName(record.fileName);
          setPushedIds(new Set(record.pushedIds));
          setResolvedIds(new Set(record.resolvedIds));
          setAccurateJournalNos(new Map(Object.entries(record.accurateJournalNos)));
          setManualOverrides(new Map(Object.entries(record.manualOverrides ?? {})));
          setMode("table");
        })
        .catch(() => toast.error("Draft tidak ditemukan."))
        .finally(() => setIsResolvingEntry(false));
    } else if (reuseId) {
      fetch(`/api/ap-sessions/${reuseId}`)
        .then((r) => r.json())
        .then((record: ApSessionRecordShape) => {
          if (!record?.id) throw new Error("not found");
          setReuseData({ fileName: record.fileName, groups: record.groups });
          setMode("wizard");
        })
        .catch(() => toast.error("Sesi sumber tidak ditemukan."))
        .finally(() => setIsResolvingEntry(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nama vendor (buat dropdown vendor di toolbar) — sessi cuma nyimpen kode-nya.
  useEffect(() => {
    if (!sessionConfig) return;
    fetch(`/api/accurate/vendors?dbId=${sessionConfig.database.id}`)
      .then((r) => r.json())
      .then((data: ApiVendor[]) => setVendorOptions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [sessionConfig?.database.id]);

  // Daftar database real (buat dropdown "Ganti Database").
  useEffect(() => {
    fetch("/api/accurate/databases")
      .then((r) => r.json())
      .then((data: AccurateDb[] | { error: string }) => setDatabaseOptions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Apply push/resolve overrides at group level — AP cuma soal pembayaran
  // keluar, jadi jurnal kredit (uang masuk) diabaikan dari sini seterusnya.
  const allGroups = useMemo<JournalGroup[]>(
    () =>
      baseGroups
        .filter((g) => g.db_cr === "D")
        .map((g) => {
          let accurate_status = g.accurate_status;
          if (pushedIds.has(g.group_id)) accurate_status = "sudah_tercatat";

          const override = manualOverrides.get(g.group_id);
          let group = g;
          if (resolvedIds.has(g.group_id) && accurate_status === "perlu_review") {
            // Manual review cuma bisa bikin group beneran pushable kalau ada
            // COA yang diisi — tanpa itu, status tetap "perlu_review" (cuma
            // invoice tercatat) supaya nggak jadi "akan_dipush" hantu yang
            // gagal push diam-diam.
            if (override?.coaNo) {
              accurate_status = "akan_dipush";
              group = {
                ...g,
                suggested_coa_no: override.coaNo,
                sync_action: "other-payment",
                detected_invoice_no: override.invoiceNo ?? g.detected_invoice_no,
                rows: g.rows.map((r) =>
                  r.db_cr === "D" ? { ...r, suggested_coa_no: override.coaNo ?? null } : r
                ),
                primary: g.primary.db_cr === "D"
                  ? { ...g.primary, suggested_coa_no: override.coaNo ?? null }
                  : g.primary,
              };
            } else if (override?.invoiceNo) {
              group = { ...g, detected_invoice_no: override.invoiceNo };
            }
          }
          return { ...group, accurate_status };
        }),
    [baseGroups, pushedIds, resolvedIds, manualOverrides]
  );

  const counts = useMemo(
    () => ({
      total: allGroups.length,
      sudah: allGroups.filter((g) => g.accurate_status === "sudah_tercatat").length,
      akan:  allGroups.filter((g) => g.accurate_status === "akan_dipush").length,
      review: allGroups.filter((g) => g.accurate_status === "perlu_review").length,
    }),
    [allGroups]
  );

  const totalDebit = useMemo(
    () => allGroups.filter((g) => g.db_cr === "D").reduce((s, g) => s + g.total_debit, 0),
    [allGroups]
  );

  const filtered = useMemo(() => {
    let list = allGroups;
    if (filter !== "semua") list = list.filter((g) => g.accurate_status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) =>
        g.rows.some((r) => r.description_raw.toLowerCase().includes(q)) ||
        g.journal_no.includes(q)
      );
    }
    return list;
  }, [allGroups, filter, search]);

  // ─── Sesi (draft) — auto-save & simpan manual ─────────────────────────────
  function sessionStatusFor(newPushedIds: Set<string>, newResolvedIds: Set<string>): "draft" | "selesai" {
    const stillPending = baseGroups.some((g) => {
      let status = g.accurate_status;
      if (newPushedIds.has(g.group_id)) status = "sudah_tercatat";
      if (newResolvedIds.has(g.group_id) && status === "perlu_review") status = "akan_dipush";
      return status === "akan_dipush";
    });
    return stillPending ? "draft" : "selesai";
  }

  async function syncSession(
    newPushedIds: Set<string>,
    newResolvedIds: Set<string>,
    newJournalNos: Map<string, string>,
    newManualOverrides: Map<string, { coaNo?: string; invoiceNo?: string }> = manualOverrides,
    { silent = true }: { silent?: boolean } = {}
  ) {
    if (!sessionId) return;
    try {
      await fetch(`/api/ap-sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pushedIds: Array.from(newPushedIds),
          resolvedIds: Array.from(newResolvedIds),
          accurateJournalNos: Object.fromEntries(newJournalNos),
          manualOverrides: Object.fromEntries(newManualOverrides),
          status: sessionStatusFor(newPushedIds, newResolvedIds),
        }),
      });
      if (!silent) toast.success("Draft tersimpan.");
    } catch {
      if (!silent) toast.error("Gagal menyimpan draft.");
    }
  }

  async function handleSaveDraft() {
    setIsSavingDraft(true);
    await syncSession(pushedIds, resolvedIds, accurateJournalNos, manualOverrides, { silent: false });
    setIsSavingDraft(false);
  }

  function handleExportPdf() {
    if (!sessionConfig) return;
    generateApReportPdf(
      {
        fileName,
        databaseName: sessionConfig.database.name,
        kasBankName: sessionConfig.kasBank.name,
        createdAt: new Date().toISOString(),
        status: sessionStatus ?? "draft",
        createdByName: session?.name ?? "-",
      },
      allGroups
    );
    toast.success("Laporan PDF berhasil diunduh.");
  }

  async function handleChangeDatabase(db: AccurateDb) {
    if (!canConfigure || !sessionConfig) return;
    setSessionConfig({ ...sessionConfig, database: db });
    setDbPickerOpen(false);
    toast.success(`Database diganti ke "${db.name}".`);
    if (sessionId) {
      fetch(`/api/ap-sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ database: { id: db.id, name: db.name, dbCode: db.dbCode } }),
      }).catch(() => toast.error("Gagal menyimpan perubahan database."));
    }
  }

  function handleToggleSessionVendor(vendorNo: string) {
    if (!canConfigure || !sessionConfig) return;
    const has = sessionConfig.selectedVendorCodes.includes(vendorNo);
    const next = has
      ? sessionConfig.selectedVendorCodes.filter((v) => v !== vendorNo)
      : [...sessionConfig.selectedVendorCodes, vendorNo];
    setSessionConfig({ ...sessionConfig, selectedVendorCodes: next });
    if (sessionId) {
      fetch(`/api/ap-sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedVendorCodes: next }),
      }).catch(() => toast.error("Gagal menyimpan perubahan vendor."));
    }
  }

  // ─── Push helpers ──────────────────────────────────────────────────────────
  function toAccurateDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  async function pushGroupToAccurate(group: JournalGroup): Promise<{ ok: boolean; journalNo?: string }> {
    if (!sessionConfig || group.sync_action !== "other-payment") return { ok: false };
    const detailAccount = group.rows
      .filter((r) => r.db_cr === "D" && r.suggested_coa_no)
      .map((r) => ({
        accountNo: r.suggested_coa_no!,
        amount: r.amount,
        memo: cleanDescription(r.description_raw),
      }));
    if (!detailAccount.length) return { ok: false };
    const res = await fetch("/api/accurate/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sync_action: group.sync_action,
        bankNo: sessionConfig.kasBank.code,
        transDate: toAccurateDate(group.post_date),
        payee: group.payee_override ?? cleanDescription(group.primary.description_raw),
        detailAccount,
        dbId: sessionConfig.database.id,
        ...(sessionConfig.branchName ? { branchName: sessionConfig.branchName } : {}),
      }),
    });
    const result = await res.json();
    if (!result.s) {
      const errMsg = Array.isArray(result.d) ? result.d[0] : result.error ?? "Unknown error";
      toast.error(`Push gagal: ${errMsg}`);
      return { ok: false };
    }
    return { ok: true, journalNo: result.r?.number };
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────
  async function handleWizardComplete(config: SessionConfig, groups: JournalGroup[], uploadedFileName: string) {
    setSessionConfig(config);
    setBaseGroups(groups);
    setPushedIds(new Set());
    setResolvedIds(new Set());
    setAccurateJournalNos(new Map());
    setFilter("semua");
    setSearch("");
    setFileName(uploadedFileName);
    setMode("table");

    try {
      const res = await fetch("/api/ap-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database: { id: config.database.id, name: config.database.name, dbCode: config.database.dbCode },
          kasBank: { code: config.kasBank.code, name: config.kasBank.name },
          branchName: config.branchName,
          selectedVendorCodes: config.selectedVendorCodes,
          fileName: uploadedFileName,
          groups,
          pushedIds: [],
          resolvedIds: [],
          accurateJournalNos: {},
          status: "draft",
        }),
      });
      const record = await res.json();
      setSessionId(record.id);
    } catch {
      toast.error("Gagal menyimpan sesi sebagai draft. Progress hanya tersimpan di halaman ini.");
    }
  }

  function handleRestart() {
    setMode("wizard");
    setSessionId(null);
    setSessionConfig(null);
    setBaseGroups([]);
    setPushedIds(new Set());
    setResolvedIds(new Set());
    setAccurateJournalNos(new Map());
    setReuseData(null);
  }

  async function handlePush(group_id: string) {
    const group = allGroups.find((g) => g.group_id === group_id);
    if (!group) return;

    if (group.sync_action === "purchase-payment") {
      toast.info("Purchase payment — matching manual di Accurate Online.");
      return;
    }

    setPushingId(group_id);
    try {
      const { ok, journalNo } = await pushGroupToAccurate(group);
      if (ok) {
        const newPushedIds = new Set(pushedIds).add(group_id);
        const newJournalNos = journalNo ? new Map(accurateJournalNos).set(group_id, journalNo) : accurateJournalNos;
        setPushedIds(newPushedIds);
        if (journalNo) setAccurateJournalNos(newJournalNos);
        setReviewGroup((prev) =>
          prev?.group_id === group_id ? { ...prev, accurate_status: "sudah_tercatat" } : prev
        );
        toast.success("Berhasil di-push ke Accurate.", {
          description: journalNo ? `No. Jurnal: ${journalNo}` : undefined,
        });
        syncSession(newPushedIds, resolvedIds, newJournalNos);
      }
    } catch {
      toast.error("Koneksi ke Accurate gagal.");
    } finally {
      setPushingId(null);
    }
  }

  async function handlePushAll() {
    const targets = allGroups.filter(
      (g) => g.accurate_status === "akan_dipush" && g.sync_action === "other-payment"
    );
    if (!targets.length) {
      toast.info("Tidak ada jurnal other-payment yang perlu di-push.");
      return;
    }
    setIsPushingAll(true);
    let successCount = 0;
    const newPushedIds = new Set(pushedIds);
    const newJournalNos = new Map(accurateJournalNos);
    for (const group of targets) {
      try {
        const { ok, journalNo } = await pushGroupToAccurate(group);
        if (ok) {
          newPushedIds.add(group.group_id);
          if (journalNo) newJournalNos.set(group.group_id, journalNo);
          successCount++;
        }
      } catch { /* toast already shown inside pushGroupToAccurate */ }
    }
    setPushedIds(newPushedIds);
    setAccurateJournalNos(newJournalNos);
    setIsPushingAll(false);
    if (successCount > 0) {
      toast.success(`${successCount} dari ${targets.length} jurnal berhasil di-push ke Accurate Online.`);
      syncSession(newPushedIds, resolvedIds, newJournalNos);
    }
  }

  function handleManualResolve(group_id: string, override: { coaNo?: string; invoiceNo?: string }) {
    const newResolvedIds = new Set(resolvedIds).add(group_id);
    const newManualOverrides = new Map(manualOverrides).set(group_id, override);
    setResolvedIds(newResolvedIds);
    setManualOverrides(newManualOverrides);
    toast.success(
      override.coaNo
        ? "Ditandai sudah direview — siap di-push."
        : "Ditandai sudah direview — nomor invoice tercatat, belum bisa di-push tanpa COA."
    );
    syncSession(pushedIds, newResolvedIds, accurateJournalNos, newManualOverrides);
  }

  function handleOpenReview(group: JournalGroup) {
    setReviewGroup(group);
    setSheetOpen(true);
  }

  // Count pushable other-payment
  const pushableCount = allGroups.filter(
    (g) => g.accurate_status === "akan_dipush" && g.sync_action === "other-payment"
  ).length;

  const sessionStatus = sessionId ? sessionStatusFor(pushedIds, resolvedIds) : null;

  // ─── Render ────────────────────────────────────────────────────────────────
  if (isResolvingEntry) {
    return (
      <AppShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-zinc-400" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {mode === "wizard" ? (
        <TransactionWizard keywordMap={keywordMap} onComplete={handleWizardComplete} reuseSession={reuseData} />
      ) : (
        <div className="px-6 py-6 max-w-7xl mx-auto space-y-5">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
            className="flex items-start justify-between gap-4 flex-wrap"
          >
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-zinc-900">Transaksi AP</h1>
                {sessionStatus && (
                  <Badge
                    className={`text-[10px] font-medium px-2 ${
                      sessionStatus === "selesai"
                        ? "bg-blue-50 text-blue-700 border-blue-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}
                  >
                    {sessionStatus === "selesai" ? "Selesai" : "Draft"}
                  </Badge>
                )}
              </div>
              {sessionConfig && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-zinc-500">{sessionConfig.database.name}</span>
                  <span className="text-zinc-300 text-xs">·</span>
                  <span className="text-xs text-zinc-500">{sessionConfig.kasBank.name}</span>
                  <span className="text-zinc-300 text-xs">·</span>
                  <span className="text-xs text-zinc-500 font-mono">{fileName}</span>
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-zinc-200 text-zinc-400">
                    {sessionConfig.database.dbCode}
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Terhubung ke Accurate Online
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-zinc-600"
                onClick={handleExportPdf}
                disabled={allGroups.length === 0}
              >
                <FileDown size={13} /> Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-zinc-600"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || !sessionId}
              >
                {isSavingDraft ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Simpan Draft
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-zinc-600" onClick={handleRestart}>
                <RotateCcw size={13} /> Mulai Ulang Sesi
              </Button>
            </div>
          </motion.div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Jurnal",      value: counts.total,  sub: formatRupiah(totalDebit), filter: "semua" as FilterStatus,          icon: RefreshCw,   accent: "text-zinc-600" },
              { label: "Sudah di Accurate", value: counts.sudah,  filter: "sudah_tercatat" as FilterStatus, icon: CheckCircle2, accent: "text-zinc-500" },
              { label: "Akan di-push",      value: counts.akan,   filter: "akan_dipush" as FilterStatus,    icon: ArrowUpRight, accent: "text-blue-600" },
              { label: "Perlu Review",       value: counts.review, filter: "perlu_review" as FilterStatus,   icon: AlertCircle,  accent: "text-amber-600" },
            ].map((card, i) => {
              const Icon = card.icon;
              const isActive = filter === card.filter;
              return (
                <motion.button
                  key={card.filter}
                  custom={i}
                  initial="hidden"
                  animate="show"
                  variants={CARD_VARIANTS}
                  onClick={() => setFilter(card.filter)}
                  className={`text-left bg-white border rounded-xl px-4 py-4 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isActive ? "border-zinc-300 shadow-sm" : "border-zinc-200 hover:border-zinc-300"}`}
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.25 }}
            className="flex flex-col sm:flex-row gap-2 items-start sm:items-center"
          >
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <Input
                placeholder="Cari deskripsi atau journal no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  <X size={13} />
                </button>
              )}
            </div>

            <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
              <SelectTrigger className="w-48 h-9 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua status</SelectItem>
                <SelectItem value="sudah_tercatat">Sudah di Accurate</SelectItem>
                <SelectItem value="akan_dipush">Akan di-push</SelectItem>
                <SelectItem value="perlu_review">Perlu Review</SelectItem>
              </SelectContent>
            </Select>

            {/* Kas Bank — info saja */}
            {sessionConfig && (
              <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-zinc-200 bg-white text-xs text-zinc-600 flex-shrink-0">
                <Landmark size={13} className="text-zinc-400" aria-hidden="true" />
                {sessionConfig.kasBank.name}
              </div>
            )}

            {/* Vendor — read-only kalau nggak punya akses Master Data, checklist kalau punya */}
            {sessionConfig && (
              <div className="relative">
                <button
                  onClick={() => setVendorPickerOpen((o) => !o)}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-zinc-200 bg-white text-xs text-zinc-600 hover:bg-zinc-50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-expanded={vendorPickerOpen}
                >
                  {canConfigure ? <Users size={13} className="text-zinc-400" /> : <Lock size={11} className="text-zinc-400" />}
                  {sessionConfig.selectedVendorCodes.length} vendor
                  <ChevronDown size={12} className={`text-zinc-400 transition-transform ${vendorPickerOpen ? "rotate-180" : ""}`} />
                </button>
                {vendorPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setVendorPickerOpen(false)} />
                    <div className="absolute z-50 mt-1.5 w-80 bg-white border border-zinc-200 rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-zinc-100 sticky top-0 bg-white">
                        <div className="relative">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            autoFocus
                            value={vendorPickerSearch}
                            onChange={(e) => setVendorPickerSearch(e.target.value)}
                            placeholder="Cari vendor..."
                            className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-zinc-50">
                        {!canConfigure && (
                          <p className="px-3 py-2 text-[11px] text-zinc-400 bg-zinc-50">
                            Read-only — hanya admin/karyawan dengan akses Master Data yang bisa mengubah.
                          </p>
                        )}
                        {vendorOptions.length === 0 ? (
                          <p className="px-3 py-4 text-xs text-zinc-400 text-center">Memuat vendor…</p>
                        ) : (
                          (() => {
                            const q = vendorPickerSearch.trim().toLowerCase();
                            const filteredVendors = q
                              ? vendorOptions.filter(
                                  (v) => v.name.toLowerCase().includes(q) || v.vendorNo.toLowerCase().includes(q)
                                )
                              : vendorOptions;
                            if (filteredVendors.length === 0) {
                              return <p className="px-3 py-4 text-xs text-zinc-400 text-center">Vendor tidak ditemukan.</p>;
                            }
                            return filteredVendors.map((v) => {
                              const checked = sessionConfig.selectedVendorCodes.includes(v.vendorNo);
                              return (
                                <label
                                  key={v.vendorNo}
                                  className={`flex items-center gap-2.5 px-3 py-2 text-xs ${canConfigure ? "cursor-pointer hover:bg-zinc-50" : "cursor-default"}`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${checked ? "bg-blue-900 border-blue-900" : "border-zinc-300"}`}>
                                    {checked && <Check size={9} className="text-white" />}
                                  </div>
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    disabled={!canConfigure}
                                    onChange={() => handleToggleSessionVendor(v.vendorNo)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate text-zinc-700">{v.name}</p>
                                    {vendorBankLabel(v) && (
                                      <p className="text-[10px] text-zinc-400 truncate">{vendorBankLabel(v)}</p>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-zinc-400 flex-shrink-0">{v.vendorNo}</span>
                                </label>
                              );
                            });
                          })()
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Ganti Database — cuma admin/karyawan dengan akses Master Data */}
            {sessionConfig && canConfigure && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-zinc-600"
                  onClick={() => setDbPickerOpen((o) => !o)}
                  aria-expanded={dbPickerOpen}
                >
                  <Database size={13} />
                  Ganti Database
                  <ChevronDown size={12} className={`transition-transform ${dbPickerOpen ? "rotate-180" : ""}`} />
                </Button>
                {dbPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDbPickerOpen(false)} />
                    <div className="absolute z-50 mt-1.5 w-72 bg-white border border-zinc-200 rounded-lg shadow-lg divide-y divide-zinc-50">
                      {databaseOptions.map((db) => {
                        const active = sessionConfig.database.id === db.id;
                        return (
                          <button
                            key={db.id}
                            onClick={() => handleChangeDatabase(db)}
                            className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors ${
                              active ? "bg-blue-50" : "hover:bg-zinc-50"
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? "border-blue-900 bg-blue-900" : "border-zinc-300"}`}>
                              {active && <div className="w-1 h-1 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-zinc-800 truncate">{db.name}</p>
                              <p className="text-[10px] font-mono text-zinc-400">{db.dbCode}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            <span className="text-sm text-zinc-400 hidden sm:block tabular-nums">
              {filtered.length} jurnal
            </span>

            <div className="sm:ml-auto">
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-blue-900 hover:bg-blue-800 text-white"
                onClick={handlePushAll}
                disabled={isPushingAll || pushableCount === 0}
              >
                {isPushingAll
                  ? <><RefreshCw size={13} className="animate-spin" /> Memproses…</>
                  : <><ArrowUpRight size={14} /> Push Semua ({pushableCount})</>
                }
              </Button>
            </div>
          </motion.div>

          <Separator />

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.3 }}>
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-zinc-400">Tidak ada jurnal yang cocok.</p>
                <button
                  onClick={() => { setSearch(""); setFilter("semua"); }}
                  className="text-sm text-zinc-500 underline underline-offset-2 mt-2 hover:text-zinc-700"
                >
                  Reset filter
                </button>
              </div>
            ) : (
              <TransactionTable
                groups={filtered}
                onPush={handlePush}
                pushedIds={pushedIds}
                pushingId={pushingId}
                onOpenReview={handleOpenReview}
                keywordMap={keywordMap}
                accurateJournalNos={accurateJournalNos}
              />
            )}
          </motion.div>
        </div>
      )}

      <TransactionDetailSheet
        group={reviewGroup}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        keywordMap={keywordMap}
        onPush={handlePush}
        onManualResolve={handleManualResolve}
        accurateJournalNo={reviewGroup ? accurateJournalNos.get(reviewGroup.group_id) : undefined}
      />
    </AppShell>
  );
}

export default function TransaksiPage() {
  return (
    <Suspense>
      <TransaksiPageInner />
    </Suspense>
  );
}
