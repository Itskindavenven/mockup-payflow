"use client";

import { useState, useEffect, useMemo, use } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Landmark,
  Loader2,
  AlertCircle,
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CreditCard,
  ListChecks,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/components/session-provider";
import { ACCURATE_DATABASES, DEFAULT_BANK_MAPPINGS, BankAccountMapping } from "@/lib/mock-data";
import type { WizardDbConfig } from "@/lib/wizard-config-store";

interface ApiCOA {
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

interface ApiBankCOA {
  no: string;
  name: string;
  number: string;
  typeName: string;
}

interface Slice<T> {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  data: T[];
}

const EMPTY: Slice<never> = { loading: false, loaded: false, error: null, data: [] };

const ENV_LABEL: Record<string, string> = {
  production: "Produksi",
  training: "Training",
  archive: "Arsip",
};

let nextBankId = DEFAULT_BANK_MAPPINGS.length + 1;

export default function DatabaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = ACCURATE_DATABASES.find((d) => d.id === id);
  const session = useSession();
  const isAdmin = session?.role === "admin";

  const [coa, setCoa] = useState<Slice<ApiCOA>>(EMPTY);
  const [vendor, setVendor] = useState<Slice<ApiVendor>>(EMPTY);
  const [kasBank, setKasBank] = useState<Slice<ApiBankCOA>>(EMPTY);

  const [coaSearch, setCoaSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");

  // Tambah Vendor (admin only) — push langsung ke Accurate
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: "", bankName: "BNI", accountName: "", accountNo: "" });

  // Pemetaan Rekening Bank
  const [bankMappings, setBankMappings] = useState<BankAccountMapping[]>(DEFAULT_BANK_MAPPINGS);
  const [editMapping, setEditMapping] = useState<BankAccountMapping | null>(null);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [bankForm, setBankForm] = useState({ account_no: "", account_name: "", bank_name: "BNI", coa_no: "" });

  // Konfigurasi Wizard — rekening Kas/Bank aktif (satu) & vendor aktif (banyak)
  // yang dipakai employee tanpa akses master-data saat wizard Transaksi AP.
  // Disimpan server-side (bukan localStorage) supaya konsisten untuk semua
  // user, di browser/device mana pun.
  const [wizardConfig, setWizardConfig] = useState<WizardDbConfig>({ bankAccountNo: null, vendorNos: [] });

  useEffect(() => {
    if (!db) return;
    fetch(`/api/wizard-config/${db.id}`)
      .then((r) => r.json())
      .then((res: WizardDbConfig) => setWizardConfig(res))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function persistWizardConfig(next: WizardDbConfig) {
    if (!db) return;
    setWizardConfig(next);
    fetch(`/api/wizard-config/${db.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => toast.error("Gagal menyimpan konfigurasi wizard."));
  }

  function selectWizardBank(no: string) {
    persistWizardConfig({ ...wizardConfig, bankAccountNo: no });
    toast.success("Rekening Kas/Bank aktif untuk wizard diperbarui.");
  }

  function toggleWizardVendor(vendorNo: string) {
    const has = wizardConfig.vendorNos.includes(vendorNo);
    persistWizardConfig({
      ...wizardConfig,
      vendorNos: has
        ? wizardConfig.vendorNos.filter((v) => v !== vendorNo)
        : [...wizardConfig.vendorNos, vendorNo],
    });
  }

  function toggleAllWizardVendors() {
    const allSelected = wizardConfig.vendorNos.length === vendor.data.length && vendor.data.length > 0;
    persistWizardConfig({ ...wizardConfig, vendorNos: allSelected ? [] : vendor.data.map((v) => v.vendorNo) });
  }

  function refetchVendors() {
    setVendor((s) => ({ ...s, loading: true }));
    fetch("/api/accurate/vendors")
      .then((r) => r.json())
      .then((res) => {
        if (res?.error) throw new Error(res.error);
        setVendor({ loading: false, loaded: true, error: null, data: res });
      })
      .catch((e) => setVendor({ loading: false, loaded: true, error: String(e), data: [] }));
  }

  useEffect(() => {
    if (!db?.connected) return;

    setCoa((s) => ({ ...s, loading: true }));
    fetch("/api/accurate/coa")
      .then((r) => r.json())
      .then((res) => {
        if (res?.error) throw new Error(res.error);
        setCoa({ loading: false, loaded: true, error: null, data: res });
      })
      .catch((e) => setCoa({ loading: false, loaded: true, error: String(e), data: [] }));

    refetchVendors();

    setKasBank((s) => ({ ...s, loading: true }));
    fetch("/api/accurate/coa-bank")
      .then((r) => r.json())
      .then((res) => {
        if (res?.error) throw new Error(res.error);
        setKasBank({ loading: false, loaded: true, error: null, data: res });
      })
      .catch((e) => setKasBank({ loading: false, loaded: true, error: String(e), data: [] }));
  }, [db?.connected]);

  const filteredCoa = useMemo(() => {
    if (!coaSearch.trim()) return coa.data;
    const q = coaSearch.toLowerCase();
    return coa.data.filter((c) => c.no.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [coa.data, coaSearch]);

  const filteredVendor = useMemo(() => {
    if (!vendorSearch.trim()) return vendor.data;
    const q = vendorSearch.toLowerCase();
    return vendor.data.filter((v) => v.vendorNo.toLowerCase().includes(q) || v.name.toLowerCase().includes(q));
  }, [vendor.data, vendorSearch]);

  function openAddBank() {
    setBankForm({ account_no: "", account_name: "", bank_name: "BNI", coa_no: "" });
    setIsAddingBank(true);
    setEditMapping(null);
  }

  function openEditBank(m: BankAccountMapping) {
    setBankForm({ account_no: m.account_no, account_name: m.account_name, bank_name: m.bank_name, coa_no: m.coa_code });
    setEditMapping(m);
    setIsAddingBank(false);
  }

  function handleSaveBank() {
    if (!bankForm.account_no.trim() || !bankForm.account_name.trim() || !bankForm.coa_no) {
      toast.error("Semua kolom wajib diisi.");
      return;
    }
    const coaEntry = kasBank.data.find((c) => c.no === bankForm.coa_no);
    if (!coaEntry) return;

    if (isAddingBank) {
      setBankMappings((prev) => [
        ...prev,
        {
          id: `bm-${nextBankId++}`,
          account_no: bankForm.account_no.trim(),
          account_name: bankForm.account_name.trim(),
          bank_name: bankForm.bank_name,
          coa_code: coaEntry.no,
          coa_name: coaEntry.name,
        },
      ]);
      toast.success("Rekening berhasil ditambahkan.");
    } else if (editMapping) {
      setBankMappings((prev) =>
        prev.map((m) =>
          m.id === editMapping.id
            ? { ...m, account_no: bankForm.account_no.trim(), account_name: bankForm.account_name.trim(), bank_name: bankForm.bank_name, coa_code: coaEntry.no, coa_name: coaEntry.name }
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

  function openAddVendor() {
    setVendorForm({ name: "", bankName: "BNI", accountName: "", accountNo: "" });
    setIsAddingVendor(true);
  }

  async function handleSaveVendor() {
    if (
      !vendorForm.name.trim() ||
      !vendorForm.accountName.trim() ||
      !vendorForm.bankName ||
      !vendorForm.accountNo.trim()
    ) {
      toast.error("Semua kolom wajib diisi.");
      return;
    }
    setVendorSaving(true);
    try {
      const res = await fetch("/api/accurate/vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorForm),
      });
      const json = await res.json();
      if (json?.error) {
        toast.error(json.error);
        return;
      }
      if (json?.s === true) {
        toast.success("Vendor berhasil ditambahkan ke Accurate.");
        setIsAddingVendor(false);
        refetchVendors();
      } else {
        const msg = Array.isArray(json?.d) ? json.d.join(", ") : String(json?.d ?? "Gagal menambahkan vendor.");
        toast.error(msg);
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setVendorSaving(false);
    }
  }

  const bankDialogOpen = isAddingBank || editMapping !== null;

  if (!db) {
    return (
      <AppShell>
        <div className="px-6 py-6 max-w-3xl mx-auto space-y-4">
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
            <ArrowLeft size={14} /> Kembali ke Pengaturan
          </Link>
          <p className="text-sm text-zinc-500">Database tidak ditemukan.</p>
        </div>
      </AppShell>
    );
  }

  if (!db.connected) {
    return (
      <AppShell>
        <div className="px-6 py-6 max-w-3xl mx-auto space-y-4">
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
            <ArrowLeft size={14} /> Kembali ke Pengaturan
          </Link>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              Database &ldquo;{db.name}&rdquo; belum terhubung. Detail Master COA, Vendor, dan Pemetaan
              Rekening Bank hanya tersedia untuk database yang sedang terkoneksi.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
            <ArrowLeft size={14} /> Kembali ke Pengaturan
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-zinc-900">{db.name}</h1>
                <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Terkoneksi
                </span>
              </div>
              <p className="text-sm text-zinc-500 mt-1 font-mono">{db.dbCode}</p>
            </div>
            <Badge
              className={`text-xs font-medium px-2.5 ${
                db.env === "production"
                  ? "bg-blue-50 text-blue-700 border-blue-100"
                  : db.env === "training"
                  ? "bg-amber-50 text-amber-700 border-amber-100"
                  : "bg-zinc-100 text-zinc-400 border-zinc-200"
              }`}
            >
              {ENV_LABEL[db.env]}
            </Badge>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }}>
          <Tabs defaultValue="coa">
            <TabsList variant="line" className="border-b border-zinc-200 w-full justify-start rounded-none p-0 h-auto">
              <TabsTrigger value="coa" className="gap-1.5 px-3 py-2.5">
                <BookOpen size={14} /> Master COA
              </TabsTrigger>
              <TabsTrigger value="vendor" className="gap-1.5 px-3 py-2.5">
                <Users size={14} /> Master Vendor
              </TabsTrigger>
              <TabsTrigger value="bank-mapping" className="gap-1.5 px-3 py-2.5">
                <Landmark size={14} /> Pemetaan Rekening Bank
              </TabsTrigger>
              <TabsTrigger value="wizard-config" className="gap-1.5 px-3 py-2.5">
                <ListChecks size={14} /> Konfigurasi Wizard
              </TabsTrigger>
            </TabsList>

            {/* ── Master COA ── */}
            <TabsContent value="coa" className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Cari kode atau nama akun..."
                    value={coaSearch}
                    onChange={(e) => setCoaSearch(e.target.value)}
                    className="pl-9 h-9 bg-white"
                  />
                </div>
                {coa.loaded && !coa.error && (
                  <span className="text-sm text-zinc-400 ml-auto">{filteredCoa.length} akun</span>
                )}
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <SliceBody
                  slice={coa}
                  items={filteredCoa}
                  emptyLabel="Tidak ada akun."
                  renderRow={(c) => (
                    <div key={c.no} className="flex items-center gap-4 px-4 py-2.5 hover:bg-zinc-50 transition-colors">
                      <span className="text-sm font-mono font-medium text-zinc-700 w-28 flex-shrink-0">{c.no}</span>
                      <span className="text-sm text-zinc-800 flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-zinc-400">{c.accountType}</span>
                    </div>
                  )}
                />
              </div>
            </TabsContent>

            {/* ── Master Vendor ── */}
            <TabsContent value="vendor" className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Cari kode atau nama vendor..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="pl-9 h-9 bg-white"
                  />
                </div>
                {vendor.loaded && !vendor.error && (
                  <span className="text-sm text-zinc-400 ml-auto">{filteredVendor.length} vendor</span>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 gap-1.5 ${vendor.loaded && !vendor.error ? "" : "ml-auto"}`}
                    onClick={openAddVendor}
                    aria-label="Tambah vendor baru"
                  >
                    <Plus size={13} aria-hidden="true" />
                    Tambah Vendor
                  </Button>
                )}
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <SliceBody
                  slice={vendor}
                  items={filteredVendor}
                  emptyLabel="Tidak ada vendor."
                  renderRow={(v) => (
                    <div key={v.vendorNo} className="flex items-center gap-4 px-4 py-2.5 hover:bg-zinc-50 transition-colors">
                      <span className="text-sm font-mono font-medium text-zinc-700 w-24 flex-shrink-0">{v.vendorNo}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-zinc-800 block truncate">{v.name}</span>
                        {vendorBankLabel(v) && (
                          <span className="text-[11px] text-zinc-400 block truncate">{vendorBankLabel(v)}</span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 truncate max-w-[160px]">{v.vendorBranchName}</span>
                    </div>
                  )}
                />
              </div>
            </TabsContent>

            {/* ── Pemetaan Rekening Bank ── */}
            <TabsContent value="bank-mapping" className="pt-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-zinc-500 max-w-md">
                  Tentukan rekening bank mana yang dipetakan ke akun Kas/Bank mana di database ini.
                  Saat push transaksi, sistem menggunakan pemetaan ini untuk menentukan akun kredit.
                </p>
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
            </TabsContent>

            {/* ── Konfigurasi Wizard ── */}
            <TabsContent value="wizard-config" className="pt-4 space-y-6">
              <p className="text-sm text-zinc-500 max-w-lg">
                Rekening Kas/Bank dan vendor yang dipilih di sini akan otomatis dipakai oleh
                karyawan tanpa akses Master Data saat menjalankan wizard Transaksi AP. Admin dan
                karyawan dengan akses Master Data tetap bisa memilih ulang di wizard.
              </p>

              {/* Rekening Kas/Bank aktif — radio, satu saja */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-800">Rekening Kas/Bank Aktif</h3>
                <p className="text-xs text-zinc-400">Pilih satu rekening yang jadi sumber transaksi default.</p>
                {kasBank.loading ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-zinc-400">
                    <Loader2 size={14} className="animate-spin" /> Memuat dari Accurate...
                  </div>
                ) : (
                  <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-50 max-h-72 overflow-y-auto">
                    {kasBank.data.map((c) => {
                      const active = wizardConfig.bankAccountNo === c.no;
                      return (
                        <label
                          key={c.no}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors"
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                              active ? "border-blue-900 bg-blue-900" : "border-zinc-300"
                            }`}
                          >
                            {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <input
                            type="radio"
                            name="wizard-bank"
                            className="sr-only"
                            checked={active}
                            onChange={() => selectWizardBank(c.no)}
                            aria-label={c.name}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-800">{c.name}</p>
                            <p className="text-[10px] font-mono text-zinc-400 mt-0.5">{c.no}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Vendor aktif — checklist, banyak */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-800">Vendor Aktif</h3>
                <p className="text-xs text-zinc-400">Pilih vendor yang tersedia untuk pencocokan transaksi.</p>
                {vendor.loading ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-zinc-400">
                    <Loader2 size={14} className="animate-spin" /> Memuat dari Accurate...
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100">
                      <span className="text-xs text-zinc-500">
                        {wizardConfig.vendorNos.length} dari {vendor.data.length} vendor dipilih
                      </span>
                      <button
                        onClick={toggleAllWizardVendors}
                        className="text-xs font-medium text-blue-700 hover:text-blue-600 outline-none focus-visible:underline"
                      >
                        {wizardConfig.vendorNos.length === vendor.data.length && vendor.data.length > 0
                          ? "Batalkan Semua"
                          : "Pilih Semua"}
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-zinc-50">
                      {vendor.data.map((v) => {
                        const checked = wizardConfig.vendorNos.includes(v.vendorNo);
                        return (
                          <label
                            key={v.vendorNo}
                            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors"
                          >
                            <div
                              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                                checked ? "bg-blue-900 border-blue-900" : "border-zinc-300"
                              }`}
                            >
                              {checked && <Check size={10} className="text-white" />}
                            </div>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => toggleWizardVendor(v.vendorNo)}
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
              </div>
            </TabsContent>
          </Tabs>
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
              {kasBank.loading ? (
                <div className="flex items-center gap-2 h-10 px-3 border border-zinc-200 rounded-md text-sm text-zinc-400">
                  <Loader2 size={13} className="animate-spin" />
                  Memuat akun dari Accurate...
                </div>
              ) : (
                <Select
                  value={bankForm.coa_no}
                  onValueChange={(v) => setBankForm((f) => ({ ...f, coa_no: v ?? "" }))}
                >
                  <SelectTrigger id="bank-coa" className="h-10" aria-label="Pilih akun COA Kas/Bank">
                    <SelectValue placeholder="Pilih akun dari Accurate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {kasBank.data.map((c) => (
                      <SelectItem key={c.no} value={c.no}>
                        <span className="font-mono text-xs text-zinc-400 mr-2">{c.number}</span>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-zinc-400">
                Data akun diambil langsung dari database Accurate yang terkoneksi.
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
              className="h-10 bg-blue-900 hover:bg-blue-800 text-white"
              onClick={handleSaveBank}
              aria-label="Simpan pemetaan rekening bank"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tambah Vendor dialog (admin only) */}
      <Dialog
        open={isAddingVendor}
        onOpenChange={(o) => { if (!o && !vendorSaving) setIsAddingVendor(false); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Tambah Vendor</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-name" className="text-sm font-medium">Nama Vendor</Label>
              <Input
                id="vendor-name"
                placeholder="contoh: PT Sumber Makmur"
                value={vendorForm.name}
                onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))}
                className="h-10"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-account-name" className="text-sm font-medium">Nama Rekening</Label>
              <Input
                id="vendor-account-name"
                placeholder="Nama pemilik rekening bank vendor"
                value={vendorForm.accountName}
                onChange={(e) => setVendorForm((f) => ({ ...f, accountName: e.target.value }))}
                className="h-10"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-bank" className="text-sm font-medium">Nama Bank</Label>
              <Select
                value={vendorForm.bankName}
                onValueChange={(v) => setVendorForm((f) => ({ ...f, bankName: v ?? "" }))}
              >
                <SelectTrigger id="vendor-bank" className="h-10" aria-label="Pilih bank">
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
              <Label htmlFor="vendor-account-no" className="text-sm font-medium">No Rekening</Label>
              <Input
                id="vendor-account-no"
                placeholder="contoh: 0123456789"
                value={vendorForm.accountNo}
                onChange={(e) => setVendorForm((f) => ({ ...f, accountNo: e.target.value }))}
                className="h-10 font-mono"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-10"
              onClick={() => setIsAddingVendor(false)}
              disabled={vendorSaving}
            >
              Batal
            </Button>
            <Button
              className="h-10 bg-blue-900 hover:bg-blue-800 text-white"
              onClick={handleSaveVendor}
              disabled={vendorSaving}
              aria-label="Simpan vendor baru"
            >
              {vendorSaving ? <Loader2 size={14} className="animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function SliceBody<T>({
  slice,
  items,
  renderRow,
  emptyLabel,
}: {
  slice: Slice<T>;
  items: T[];
  renderRow: (item: T) => React.ReactNode;
  emptyLabel: string;
}) {
  if (slice.loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-8 text-sm text-zinc-400 justify-center">
        <Loader2 size={14} className="animate-spin" />
        Memuat dari Accurate...
      </div>
    );
  }
  if (slice.error) {
    return (
      <div className="flex items-start gap-2 px-4 py-6 text-sm text-red-500">
        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
        <span>Gagal memuat data: {slice.error}</span>
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="px-4 py-8 text-sm text-zinc-400 text-center">{emptyLabel}</p>;
  }
  return <div className="divide-y divide-zinc-100 max-h-[420px] overflow-y-auto">{items.map(renderRow)}</div>;
}
