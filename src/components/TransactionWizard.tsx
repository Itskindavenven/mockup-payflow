"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Loader2,
  ServerIcon,
  Landmark,
  Users,
  Upload,
  X,
  Lock,
  AlertTriangle,
} from "lucide-react";
import type { Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  COAEntry,
  RAW_TRANSACTIONS,
  ALREADY_RECORDED_IN_ACCURATE,
  RawTransaction,
} from "@/lib/mock-data";
import {
  enrichRow,
  groupByJournalNo,
  JournalGroup,
  KeywordEntry,
} from "@/lib/parser";
import { useSession } from "@/components/session-provider";

interface WizardDbConfig {
  bankAccountNo: string | null;
  vendorNos: string[];
}

export interface AccurateDb {
  id: string;
  name: string;
  dbCode: string;
  expired: boolean;
}

export interface SessionConfig {
  database: AccurateDb;
  kasBank: COAEntry;
  branchName: string | null;  // derived from bank account name
  selectedVendorCodes: string[];
}

export interface ReuseSession {
  fileName: string;
  groups: JournalGroup[];
}

interface TransactionWizardProps {
  keywordMap: KeywordEntry[];
  onComplete: (config: SessionConfig, groups: JournalGroup[], fileName: string) => void;
  reuseSession?: ReuseSession | null;
}

interface ApiBankCOA {
  no: string;
  name: string;
  accountType: string;
}

interface ApiVendor {
  id: number;
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

const FADE: Variants = {
  hidden: { opacity: 0, x: 16 },
  show:   { opacity: 1, x: 0,  transition: { duration: 0.22 } },
  exit:   { opacity: 0, x: -16, transition: { duration: 0.16 } },
};

// ─── Step 1 ────────────────────────────────────────────────────────────────
function StepDatabase({
  databases,
  isLoading,
  selected,
  onSelect,
}: {
  databases: AccurateDb[];
  isLoading: boolean;
  selected: AccurateDb | null;
  onSelect: (db: AccurateDb) => void;
}) {
  return (
    <motion.div key="step-db" variants={FADE} initial="hidden" animate="show" exit="exit">
      <StepHeader icon={ServerIcon} title="Pilih Database Accurate" subtitle="Pilih environment yang akan digunakan untuk sesi ini." />
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {databases.map((db) => {
            const active = selected?.id === db.id;
            return (
              <button
                key={db.id}
                onClick={() => onSelect(db)}
                className={`w-full text-left rounded-xl border px-4 py-3.5 flex items-center gap-3 transition-all duration-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? "border-blue-600 bg-blue-50/60 shadow-sm"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    active ? "border-blue-600 bg-blue-600" : "border-zinc-300"
                  }`}
                >
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{db.name}</p>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{db.dbCode}</p>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─── Step 2 ────────────────────────────────────────────────────────────────
function StepKasBank({
  banks,
  isLoading,
  selected,
  onSelect,
  locked,
}: {
  banks: ApiBankCOA[];
  isLoading: boolean;
  selected: COAEntry | null;
  onSelect: (coa: COAEntry) => void;
  locked: boolean;
}) {
  if (!isLoading && locked) {
    return (
      <motion.div key="step-bank-locked" variants={FADE} initial="hidden" animate="show" exit="exit">
        <StepHeader icon={Landmark} title="Rekening Kas/Bank" subtitle="Rekening ini dikonfigurasi oleh admin untuk sesi Transaksi AP." />
        {selected ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <Lock size={13} className="text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800">{selected.name}</p>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">{selected.code}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-start gap-3">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              Admin belum mengatur rekening Kas/Bank aktif untuk database ini. Hubungi admin di
              Pengaturan → Detail Database → Konfigurasi Wizard.
            </p>
          </div>
        )}
        <p className="text-xs text-zinc-400 mt-3">
          Hanya admin atau karyawan dengan akses Master Data yang bisa mengubah rekening ini.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div key="step-bank" variants={FADE} initial="hidden" animate="show" exit="exit">
      <StepHeader icon={Landmark} title="Pilih Rekening Kas/Bank" subtitle="Rekening yang menjadi sumber transaksi pada sesi ini." />
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
          <Loader2 size={16} className="animate-spin" />
          Memuat daftar rekening…
        </div>
      ) : (
        <div className="space-y-2">
          {banks.map((bank) => {
            const active = selected?.code === bank.no;
            return (
              <button
                key={bank.no}
                onClick={() =>
                  onSelect({ code: bank.no, name: bank.name, type: "Aset Lancar", normal_balance: "D", is_active: true })
                }
                className={`w-full text-left rounded-xl border px-4 py-3.5 flex items-center gap-3 transition-all duration-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? "border-blue-600 bg-blue-50/60 shadow-sm"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    active ? "border-blue-600 bg-blue-600" : "border-zinc-300"
                  }`}
                >
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{bank.name}</p>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">{bank.no}</p>
                </div>
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {bank.accountType}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─── Step 3 ────────────────────────────────────────────────────────────────
function StepVendor({
  vendors,
  isLoading,
  selected,
  onToggle,
  onToggleAll,
  locked,
}: {
  vendors: ApiVendor[];
  isLoading: boolean;
  selected: Set<string>;
  onToggle: (code: string) => void;
  onToggleAll: () => void;
  locked: boolean;
}) {
  const allSelected = vendors.length > 0 && selected.size === vendors.length;

  if (!isLoading && locked) {
    const activeVendors = vendors.filter((v) => selected.has(v.vendorNo));
    return (
      <motion.div key="step-vendor-locked" variants={FADE} initial="hidden" animate="show" exit="exit">
        <StepHeader icon={Users} title="Vendor Aktif" subtitle="Daftar vendor ini dikonfigurasi oleh admin untuk sesi Transaksi AP." />
        {activeVendors.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 flex items-start gap-3">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              Admin belum mengatur vendor aktif untuk database ini. Hubungi admin di
              Pengaturan → Detail Database → Konfigurasi Wizard.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100 text-xs text-zinc-500">
              <Lock size={11} className="text-zinc-400" />
              {activeVendors.length} vendor aktif
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50">
              {activeVendors.map((v) => (
                <div key={v.vendorNo} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800">{v.name}</p>
                    <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                      {v.vendorBranchName}
                      {vendorBankLabel(v) && <> · {vendorBankLabel(v)}</>}
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-400">{v.vendorNo}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-zinc-400 mt-3">
          Hanya admin atau karyawan dengan akses Master Data yang bisa mengubah daftar ini.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div key="step-vendor" variants={FADE} initial="hidden" animate="show" exit="exit">
      <StepHeader icon={Users} title="Konfirmasi Vendor Aktif" subtitle="Vendor berikut akan di-pull dari Accurate. Hapus centang jika tidak relevan untuk sesi ini." />
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
          <Loader2 size={16} className="animate-spin" />
          Memuat daftar vendor…
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100">
            <span className="text-xs text-zinc-500">{selected.size} dari {vendors.length} vendor dipilih</span>
            <button
              onClick={onToggleAll}
              className="text-xs font-medium text-blue-700 hover:text-blue-600 outline-none focus-visible:underline"
            >
              {allSelected ? "Batalkan Semua" : "Pilih Semua"}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50">
            {vendors.map((v) => {
              const checked = selected.has(v.vendorNo);
              return (
                <label
                  key={v.vendorNo}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                      checked ? "bg-blue-600 border-blue-600" : "border-zinc-300"
                    }`}
                  >
                    {checked && <Check size={10} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => onToggle(v.vendorNo)}
                    aria-label={v.name}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800">{v.name}</p>
                    <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                      {v.vendorBranchName}
                      {vendorBankLabel(v) && <> · {vendorBankLabel(v)}</>}
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-400">{v.vendorNo}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Step 4 ────────────────────────────────────────────────────────────────
function StepUpload({
  uploadState,
  dragOver,
  fileName,
  fileInputRef,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileInput,
  onUseDemo,
  transactionCount,
  isReused,
}: {
  uploadState: "idle" | "processing" | "done";
  dragOver: boolean;
  fileName: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUseDemo: () => void;
  transactionCount: number;
  isReused: boolean;
}) {
  return (
    <motion.div key="step-upload" variants={FADE} initial="hidden" animate="show" exit="exit">
      <StepHeader icon={Upload} title="Upload E-Statement BNI" subtitle="File XLS/XLSX rekening koran dari BNI Direct atau BNI Mobile." />

      {uploadState === "idle" && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`w-full rounded-xl border-2 border-dashed px-6 py-10 flex flex-col items-center gap-3 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              dragOver
                ? "border-blue-500 bg-blue-50/40"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-700">Klik atau drop file di sini</p>
              <p className="text-xs text-zinc-400 mt-0.5">XLS · XLSX — maks 10 MB</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            className="sr-only"
            onChange={onFileInput}
          />
          <div className="mt-3 text-center">
            <button
              onClick={onUseDemo}
              className="text-xs text-zinc-400 hover:text-zinc-600 underline underline-offset-2 outline-none focus-visible:text-zinc-700"
            >
              Gunakan data demo
            </button>
          </div>
        </>
      )}

      {uploadState === "processing" && (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 flex flex-col items-center gap-3">
          <Loader2 size={22} className="animate-spin text-blue-600" />
          <p className="text-sm text-zinc-600">Memproses file…</p>
          <p className="text-xs text-zinc-400 font-mono">{fileName}</p>
        </div>
      )}

      {uploadState === "done" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-5 py-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check size={15} className="text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-800">
              {isReused ? "Menggunakan data dari sesi sebelumnya" : "File berhasil diproses"}
            </p>
            <p className="text-xs font-mono text-zinc-500 truncate mt-0.5">{fileName}</p>
            <div className="mt-2.5 flex items-center gap-3 text-xs text-zinc-600">
              <span><strong className="text-zinc-800">{transactionCount}</strong> transaksi ditemukan</span>
              <span className="text-zinc-300">·</span>
              <span className="text-blue-700">Siap dianalisis</span>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-zinc-400 hover:text-zinc-600 outline-none"
            aria-label="Ganti file"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Shared header ─────────────────────────────────────────────────────────
function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof ServerIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 mb-1.5">
        <Icon size={15} className="text-blue-600 flex-shrink-0" />
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      </div>
      <p className="text-sm text-zinc-500 leading-relaxed">{subtitle}</p>
    </div>
  );
}

// ─── Main wizard ────────────────────────────────────────────────────────────
export function TransactionWizard({ keywordMap, onComplete, reuseSession }: TransactionWizardProps) {
  const session = useSession();
  // Admin dan karyawan dengan akses Master Data boleh pilih ulang rekening/vendor
  // di wizard. Karyawan lain memakai konfigurasi yang sudah dikunci admin.
  const canConfigure = session?.role === "admin" || (session?.permissions ?? []).includes("master-data");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [databases, setDatabases] = useState<AccurateDb[]>([]);
  const [isLoadingDbs, setIsLoadingDbs] = useState(true);
  const [selectedDb, setSelectedDb] = useState<AccurateDb | null>(null);
  const [selectedBank, setSelectedBank] = useState<COAEntry | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set());
  // Kalau reuse dari sesi lama, file & datanya udah ada — step Upload langsung "done".
  const [uploadState, setUploadState] = useState<"idle" | "processing" | "done">(reuseSession ? "done" : "idle");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(reuseSession?.fileName ?? null);
  // null = pakai data demo (RAW_TRANSACTIONS); array = hasil parse file upload beneran.
  const [uploadedTransactions, setUploadedTransactions] = useState<RawTransaction[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [banks, setBanks] = useState<ApiBankCOA[]>([]);
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);

  useEffect(() => {
    fetch("/api/accurate/databases")
      .then((r) => r.json())
      .then((data: AccurateDb[] | { error: string }) => {
        if (!Array.isArray(data)) return;
        setDatabases(data);
        // "db-retail" tetap jadi default legacy — kalau nggak ada, pakai yang pertama.
        const preferred = data.find((db) => db.id === "db-retail") ?? data[0];
        if (preferred) setSelectedDb(preferred);
      })
      .catch(() => {})
      .finally(() => setIsLoadingDbs(false));
  }, []);

  useEffect(() => {
    if (!selectedDb) return;
    const dbId = selectedDb.id;
    const configFetch: Promise<WizardDbConfig> = canConfigure
      ? Promise.resolve({ bankAccountNo: null, vendorNos: [] })
      : fetch(`/api/wizard-config/${dbId}`).then((r) => r.json());

    setIsLoadingMaster(true);
    Promise.all([
      fetch(`/api/accurate/coa-bank?dbId=${dbId}`).then((r) => r.json()),
      fetch(`/api/accurate/vendors?dbId=${dbId}`).then((r) => r.json()),
      configFetch,
    ])
      .then(([bankData, vendorData, config]: [ApiBankCOA[], ApiVendor[], WizardDbConfig]) => {
        // API routes return `{ error }` (not an array) when the Accurate
        // connection itself fails (e.g. expired token) — surface that
        // instead of crashing on .map() over a non-array.
        if (!Array.isArray(bankData) || !Array.isArray(vendorData)) {
          throw new Error(
            "Gagal memuat data Kas Bank/Vendor dari Accurate: " +
              ((bankData as unknown as { error?: string })?.error ??
                (vendorData as unknown as { error?: string })?.error ??
                "respons tidak valid")
          );
        }
        setBanks(bankData);
        setVendors(vendorData);

        if (canConfigure) {
          setSelectedVendors(new Set(vendorData.map((v) => v.vendorNo)));
        } else {
          const lockedBank = bankData.find((b) => b.no === config.bankAccountNo);
          if (lockedBank) {
            setSelectedBank({ code: lockedBank.no, name: lockedBank.name, type: "Aset Lancar", normal_balance: "D", is_active: true });
          }
          setSelectedVendors(new Set(config.vendorNos));
        }
      })
      .catch((e) => {
        console.error("Failed to load Accurate master data:", e);
        toast.error(e instanceof Error ? e.message : "Gagal memuat data Kas Bank/Vendor dari Accurate.");
      })
      .finally(() => setIsLoadingMaster(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDb?.id, canConfigure]);

  function toggleVendor(code: string) {
    setSelectedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAllVendors() {
    setSelectedVendors(
      selectedVendors.size === vendors.length
        ? new Set()
        : new Set(vendors.map((v) => v.vendorNo))
    );
  }

  async function handleFileUpload(file: File) {
    setFileName(file.name);
    setUploadState("processing");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/statement/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memproses file.", {
          description: Array.isArray(data.details) ? data.details.slice(0, 5).join("\n") : undefined,
          duration: 10000,
        });
        setUploadState("idle");
        return;
      }
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        toast.warning(`${data.warnings.length} baris dilewati saat parsing.`, {
          description: data.warnings.slice(0, 5).join("\n"),
          duration: 8000,
        });
      }
      setUploadedTransactions(data.transactions);
      setUploadState("done");
    } catch {
      toast.error("Gagal upload file.");
      setUploadState("idle");
    }
  }

  function handleUseDemo() {
    setFileName("Rekening_Koran_BNI_April2026.xlsx");
    setUploadedTransactions(null);
    setUploadState("processing");
    setTimeout(() => setUploadState("done"), 1600);
  }

  function canProceed(): boolean {
    if (step === 2 || step === 3) {
      if (isLoadingMaster) return false;
    }
    if (step === 1) return selectedDb !== null;
    if (step === 2) return selectedBank !== null;
    if (step === 3) return selectedVendors.size > 0;
    return uploadState === "done";
  }

  function goNext() {
    setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
  }

  function goBack() {
    setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
  }

  function deriveBranchName(bankName: string): string | null {
    // Extract location from account name — e.g. "Bank BCA IDR Jakarta" → "JAKARTA"
    const KNOWN_BRANCHES = ["JAKARTA", "SURABAYA", "BANDUNG", "MEDAN", "BALI", "SEMARANG"];
    const upper = bankName.toUpperCase();
    return KNOWN_BRANCHES.find((b) => upper.includes(b)) ?? null;
  }

  function handleComplete() {
    const config: SessionConfig = {
      database: selectedDb!,
      kasBank: selectedBank!,
      branchName: selectedBank ? deriveBranchName(selectedBank.name) : null,
      selectedVendorCodes: Array.from(selectedVendors),
    };
    if (reuseSession) {
      onComplete(config, reuseSession.groups, reuseSession.fileName);
      return;
    }
    const sourceRows = uploadedTransactions ?? RAW_TRANSACTIONS;
    const vendorLookups = vendors.map((v) => ({ name: v.name, accountNo: v.accountNo }));
    const enriched = sourceRows.map((raw) =>
      enrichRow(raw, ALREADY_RECORDED_IN_ACCURATE, keywordMap, vendorLookups)
    );
    const groups = groupByJournalNo(enriched);
    onComplete(config, groups, fileName ?? "e-statement.xlsx");
  }

  const STEPS = [
    { n: 1, label: "Database" },
    { n: 2, label: "Kas Bank" },
    { n: 3, label: "Vendor" },
    { n: 4, label: "Upload" },
  ] as const;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-2rem)] px-4 py-12">
      {/* Step indicator */}
      <div className="flex items-center mb-10">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                  step > s.n
                    ? "bg-blue-600 text-white"
                    : step === s.n
                    ? "bg-blue-900 text-white"
                    : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {step > s.n ? <Check size={13} /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  step === s.n ? "text-zinc-800" : "text-zinc-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-14 h-px mx-2 mb-4 transition-colors duration-300 ${
                  step > s.n ? "bg-blue-500" : "bg-zinc-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepDatabase databases={databases} isLoading={isLoadingDbs} selected={selectedDb} onSelect={setSelectedDb} />
          )}
          {step === 2 && (
            <StepKasBank
              banks={banks}
              isLoading={isLoadingMaster}
              selected={selectedBank}
              onSelect={setSelectedBank}
              locked={!canConfigure}
            />
          )}
          {step === 3 && (
            <StepVendor
              vendors={vendors}
              isLoading={isLoadingMaster}
              selected={selectedVendors}
              onToggle={toggleVendor}
              onToggleAll={toggleAllVendors}
              locked={!canConfigure}
            />
          )}
          {step === 4 && (
            <StepUpload
              uploadState={uploadState}
              dragOver={dragOver}
              fileName={fileName}
              fileInputRef={fileInputRef}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onFileInput={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              onUseDemo={handleUseDemo}
              transactionCount={reuseSession ? reuseSession.groups.reduce((s, g) => s + g.rows.length, 0) : (uploadedTransactions ?? RAW_TRANSACTIONS).length}
              isReused={!!reuseSession}
            />
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={goBack}
            disabled={step === 1}
            className="h-9 gap-1.5"
          >
            <ChevronLeft size={14} />
            Kembali
          </Button>

          {step < 4 ? (
            <Button
              size="sm"
              onClick={goNext}
              disabled={!canProceed()}
              className="h-9 gap-1.5 bg-blue-900 hover:bg-blue-800 text-white"
            >
              Lanjut
              <ChevronRight size={14} />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={!canProceed()}
              className="h-9 gap-1.5 bg-blue-700 hover:bg-blue-600 text-white"
            >
              <Check size={14} />
              Mulai Analisis
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
