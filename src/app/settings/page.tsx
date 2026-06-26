"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Database,
  CreditCard,
  Settings,
  AlertTriangle,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { DEFAULT_BANK_MAPPINGS, BankAccountMapping, COA_MASTER } from "@/lib/mock-data";

// Only bank/cash accounts for mapping
const BANK_COAS = COA_MASTER.filter((c) => c.type === "Aset Lancar" && c.normal_balance === "D");

const MOCK_DATABASES = [
  { id: "db-1", name: "PT Ega Accurate Indonesia", year: "2026", status: "aktif" },
  { id: "db-2", name: "PT Ega Accurate Indonesia", year: "2025", status: "arsip" },
];

const PUSH_MODES = [
  {
    value: "manual",
    label: "Manual",
    desc: "Anda yang menentukan kapan transaksi di-push. Lebih aman, cocok untuk verifikasi manual.",
  },
  {
    value: "auto",
    label: "Otomatis",
    desc: "Transaksi dengan confidence 100% langsung di-push setelah import. Cocok untuk volume tinggi.",
  },
];

let nextBankId = DEFAULT_BANK_MAPPINGS.length + 1;

export default function SettingsPage() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const companyName = "PT Ega Accurate Indonesia";
  const userEmail = "bonaventuraoctavito@gmail.com";
  const [activeDb, setActiveDb] = useState("db-1");
  const [pushMode, setPushMode] = useState<"manual" | "auto">("manual");
  const [bankMappings, setBankMappings] = useState<BankAccountMapping[]>(DEFAULT_BANK_MAPPINGS);
  const [editMapping, setEditMapping] = useState<BankAccountMapping | null>(null);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [bankForm, setBankForm] = useState({ account_no: "", account_name: "", bank_name: "BNI", coa_code: "" });

  function handleReconnect() {
    setIsReconnecting(true);
    setTimeout(() => {
      setIsReconnecting(false);
      toast.success("Koneksi ke Accurate Online berhasil diperbarui.");
    }, 2000);
  }

  function openAddBank() {
    setBankForm({ account_no: "", account_name: "", bank_name: "BNI", coa_code: "" });
    setIsAddingBank(true);
    setEditMapping(null);
  }

  function openEditBank(m: BankAccountMapping) {
    setBankForm({ account_no: m.account_no, account_name: m.account_name, bank_name: m.bank_name, coa_code: m.coa_code });
    setEditMapping(m);
    setIsAddingBank(false);
  }

  function handleSaveBank() {
    if (!bankForm.account_no.trim() || !bankForm.account_name.trim() || !bankForm.coa_code) {
      toast.error("Semua kolom wajib diisi.");
      return;
    }
    const coaEntry = BANK_COAS.find((c) => c.code === bankForm.coa_code);
    if (!coaEntry) return;

    if (isAddingBank) {
      setBankMappings((prev) => [
        ...prev,
        {
          id: `bm-${nextBankId++}`,
          account_no: bankForm.account_no.trim(),
          account_name: bankForm.account_name.trim(),
          bank_name: bankForm.bank_name,
          coa_code: coaEntry.code,
          coa_name: coaEntry.name,
        },
      ]);
      toast.success("Rekening berhasil ditambahkan.");
    } else if (editMapping) {
      setBankMappings((prev) =>
        prev.map((m) =>
          m.id === editMapping.id
            ? { ...m, account_no: bankForm.account_no.trim(), account_name: bankForm.account_name.trim(), bank_name: bankForm.bank_name, coa_code: coaEntry.code, coa_name: coaEntry.name }
            : m
        )
      );
      toast.success("Pemetaan rekening diperbarui.");
    }
    setIsAddingBank(false);
    setEditMapping(null);
  }

  function handleDeleteBank(id: string, name: string) {
    setBankMappings((prev) => prev.filter((m) => m.id !== id));
    toast.success(`Rekening "${name}" dihapus dari pemetaan.`);
  }

  const bankDialogOpen = isAddingBank || editMapping !== null;

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-semibold text-zinc-900">Pengaturan</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Konfigurasi koneksi dan preferensi integrasi dengan Accurate Online
          </p>
        </motion.div>

        {/* ── SECTION 1: Status Koneksi ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-zinc-500" aria-hidden="true" />
            <h2 className="text-base font-semibold text-zinc-800">Status Koneksi Accurate Online</h2>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={18} className="text-teal-500" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Terhubung</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{companyName}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">{userEmail}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="h-9 gap-2"
                onClick={handleReconnect}
                disabled={isReconnecting}
                aria-label="Perbarui koneksi ke Accurate Online"
              >
                <RefreshCw size={13} className={isReconnecting ? "animate-spin" : ""} aria-hidden="true" />
                {isReconnecting ? "Memperbarui..." : "Perbarui Koneksi"}
              </Button>
            </div>

            <Separator />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Token berlaku hingga</p>
                <p className="font-medium text-zinc-700">03 Jul 2026</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">Terhubung sejak</p>
                <p className="font-medium text-zinc-700">01 Jan 2026</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">Versi API</p>
                <p className="font-mono font-medium text-zinc-700">v1 (OAuth 2.0)</p>
              </div>
            </div>
          </div>
        </motion.div>

        <Separator />

        {/* ── SECTION 2: Database Aktif ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Database size={15} className="text-zinc-500" aria-hidden="true" />
            <h2 className="text-base font-semibold text-zinc-800">Database Accurate Aktif</h2>
          </div>
          <p className="text-sm text-zinc-500">
            Pilih database (tahun buku) Accurate yang akan digunakan untuk menerima data push dari tool ini.
          </p>

          <div className="space-y-2">
            {MOCK_DATABASES.map((db) => (
              <button
                key={db.id}
                onClick={() => {
                  setActiveDb(db.id);
                  toast.success(`Database "${db.name} ${db.year}" dipilih sebagai aktif.`);
                }}
                className={`w-full text-left flex items-center justify-between px-5 py-4 rounded-xl border transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none ${
                  activeDb === db.id
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
                aria-pressed={activeDb === db.id}
                aria-label={`Pilih database ${db.name} ${db.year}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                    activeDb === db.id ? "border-zinc-900 bg-zinc-900" : "border-zinc-300"
                  }`} aria-hidden="true">
                    {activeDb === db.id && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-[3px]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{db.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Tahun Buku {db.year}</p>
                  </div>
                </div>
                <Badge
                  className={`text-xs font-medium px-2.5 ${
                    db.status === "aktif"
                      ? "bg-teal-50 text-teal-700 border-teal-100"
                      : "bg-zinc-100 text-zinc-400 border-zinc-200"
                  }`}
                >
                  {db.status === "aktif" ? "Aktif" : "Arsip"}
                </Badge>
              </button>
            ))}
          </div>
        </motion.div>

        <Separator />

        {/* ── SECTION 3: Pemetaan Rekening Bank ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CreditCard size={15} className="text-zinc-500" aria-hidden="true" />
              <h2 className="text-base font-semibold text-zinc-800">Pemetaan Rekening Bank</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={openAddBank}
              aria-label="Tambah pemetaan rekening bank baru"
            >
              <Plus size={13} aria-hidden="true" />
              Tambah Rekening
            </Button>
          </div>
          <p className="text-sm text-zinc-500">
            Tentukan rekening bank mana yang dipetakan ke akun Kas/Bank mana di Accurate.
            Saat push transaksi, sistem menggunakan pemetaan ini untuk menentukan akun kredit.
          </p>

          {bankMappings.length === 0 ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 flex items-start gap-3">
              <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm text-amber-700">
                Belum ada rekening yang dipetakan. Push transaksi tidak akan bisa dilakukan sebelum setidaknya satu rekening dipetakan.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden">
              {bankMappings.map((m) => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <CreditCard size={16} className="text-zinc-500" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800">{m.account_name}</p>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      {m.bank_name} · {m.account_no}
                    </p>
                  </div>
                  <div className="hidden sm:block text-right flex-shrink-0">
                    <p className="text-xs text-zinc-400 mb-0.5">→ COA Accurate</p>
                    <p className="text-sm font-medium text-zinc-700">{m.coa_name}</p>
                    <p className="text-xs text-zinc-400 font-mono">{m.coa_code}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditBank(m)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors focus-visible:ring-2 focus-visible:ring-ring outline-none"
                      aria-label={`Edit pemetaan rekening ${m.account_no}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteBank(m.id, m.account_no)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
                      aria-label={`Hapus pemetaan rekening ${m.account_no}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <Separator />

        {/* ── SECTION 4: Preferensi Push ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Settings size={15} className="text-zinc-500" aria-hidden="true" />
            <h2 className="text-base font-semibold text-zinc-800">Preferensi Push</h2>
          </div>
          <p className="text-sm text-zinc-500">
            Tentukan bagaimana sistem menangani transaksi yang siap di-push setelah proses import selesai.
          </p>

          <div className="space-y-3">
            {PUSH_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => {
                  setPushMode(mode.value as "manual" | "auto");
                  toast.success(`Mode push diubah ke: ${mode.label}.`);
                }}
                className={`w-full text-left flex items-start gap-3 px-5 py-4 rounded-xl border transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring outline-none ${
                  pushMode === mode.value
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
                aria-pressed={pushMode === mode.value}
                aria-label={`Pilih mode push: ${mode.label}`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                  pushMode === mode.value ? "border-zinc-900 bg-zinc-900" : "border-zinc-300"
                }`} aria-hidden="true">
                  {pushMode === mode.value && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-[3px]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{mode.label}</p>
                  <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">{mode.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        <Separator />

        {/* ── Danger zone ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Unplug size={15} className="text-red-400" aria-hidden="true" />
            <h2 className="text-base font-semibold text-zinc-800">Putuskan Koneksi</h2>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-red-700">Putuskan dari Accurate Online</p>
              <p className="text-sm text-red-500 mt-1 leading-relaxed">
                Token OAuth akan dihapus. Anda perlu login ulang untuk melanjutkan push transaksi.
                Semua konfigurasi (keyword, pemetaan rekening) akan tetap tersimpan.
              </p>
            </div>
            <Button
              variant="outline"
              className="h-9 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 flex-shrink-0"
              onClick={() => toast.error("Simulasi: koneksi diputus. Redirect ke halaman login.")}
              aria-label="Putuskan koneksi dari Accurate Online"
            >
              Putuskan Koneksi
            </Button>
          </div>
        </motion.div>

      </div>

      {/* Bank account mapping dialog */}
      <Dialog
        open={bankDialogOpen}
        onOpenChange={(o) => {
          if (!o) { setIsAddingBank(false); setEditMapping(null); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {isAddingBank ? "Tambah Pemetaan Rekening" : "Edit Pemetaan Rekening"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="bank-no" className="text-sm font-medium">Nomor Rekening</Label>
              <Input
                id="bank-no"
                placeholder="contoh: 0123456789"
                value={bankForm.account_no}
                onChange={(e) => setBankForm((f) => ({ ...f, account_no: e.target.value }))}
                className="h-10 font-mono"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-name" className="text-sm font-medium">Nama Rekening</Label>
              <Input
                id="bank-name"
                placeholder="contoh: Giro Utama PT Ega Accurate Indonesia"
                value={bankForm.account_name}
                onChange={(e) => setBankForm((f) => ({ ...f, account_name: e.target.value }))}
                className="h-10"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-bank" className="text-sm font-medium">Bank</Label>
              <Select
                value={bankForm.bank_name}
                onValueChange={(v) => setBankForm((f) => ({ ...f, bank_name: v ?? "" }))}
              >
                <SelectTrigger id="bank-bank" className="h-10" aria-label="Pilih bank">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["BNI", "BCA", "Mandiri", "BRI", "CIMB", "Permata"].map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-coa" className="text-sm font-medium">Akun Kas/Bank di Accurate</Label>
              <Select
                value={bankForm.coa_code}
                onValueChange={(v) => setBankForm((f) => ({ ...f, coa_code: v ?? "" }))}
              >
                <SelectTrigger id="bank-coa" className="h-10" aria-label="Pilih akun COA Kas/Bank">
                  <SelectValue placeholder="Pilih akun dari Master COA..." />
                </SelectTrigger>
                <SelectContent>
                  {BANK_COAS.map((coa) => (
                    <SelectItem key={coa.code} value={coa.code}>
                      <span className="font-mono text-xs text-zinc-400 mr-2">{coa.code}</span>
                      {coa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-400">
                Rekening bank ini akan digunakan sebagai akun kredit saat push transaksi pembayaran.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-10"
              onClick={() => { setIsAddingBank(false); setEditMapping(null); }}
            >
              Batal
            </Button>
            <Button
              className="h-10 bg-zinc-900 hover:bg-zinc-700 text-white"
              onClick={handleSaveBank}
              aria-label="Simpan pemetaan rekening bank"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
