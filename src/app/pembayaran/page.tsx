"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Banknote,
  Plus,
  Loader2,
  FileSpreadsheet,
  Eye,
  ListChecks,
  FileDown,
  CheckCircle2,
  Building2,
  Upload,
  Download,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { formatRupiah } from "@/lib/parser";
import type { PaymentBatchRecord, PaymentBatchStatus } from "@/lib/payment-batch-store";
import { ACCOUNT_TYPE_LABEL, type BniAccountType } from "@/lib/bni-outlets";
import { toast } from "sonner";

const STATUS_LABEL: Record<PaymentBatchStatus, { label: string; className: string }> = {
  draft:          { label: "Draft — belum dikurasi", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  dikurasi:       { label: "Sudah dikurasi",          className: "bg-sky-50 text-sky-700 border-sky-100" },
  file_exported:  { label: "File BNI siap diupload",  className: "bg-amber-50 text-amber-700 border-amber-100" },
  rilis_selesai:  { label: "Rilis selesai",           className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
};

interface OutletOption {
  code: string;
  name: string;
  invoiceCount: number;
  totalAmount: number;
}

interface ImportMeta {
  importedAt: string;
  importedBy: { id: string; name: string };
  fileName: string;
  rowCount: number;
}

function batchTotal(batch: PaymentBatchRecord): number {
  return batch.items.filter((i) => i.selected).reduce((s, i) => s + i.amount, 0);
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PembayaranPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<PaymentBatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<BniAccountType>("cash");

  const [lastImport, setLastImport] = useState<ImportMeta | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/payment-batches")
      .then((r) => r.json())
      .then((data: PaymentBatchRecord[]) => setBatches(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setIsLoading(false));

    fetch("/api/outstanding-invoices")
      .then((r) => r.json())
      .then((data: { lastImport: ImportMeta | null }) => setLastImport(data.lastImport))
      .catch(() => {});
  }, []);

  async function handleUploadFile(file: File) {
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/outstanding-invoices/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Import gagal.", {
          description: Array.isArray(data.details) ? data.details.slice(0, 5).join("\n") : undefined,
          duration: 10000,
        });
        return;
      }
      toast.success(`Import berhasil — ${data.rowCount} baris outstanding hutang dimuat.`);
      const meta = await fetch("/api/outstanding-invoices").then((r) => r.json());
      setLastImport(meta.lastImport);
    } catch {
      toast.error("Gagal upload file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openPicker() {
    setPickerOpen(true);
    setSelectedOutlet(null);
    setAccountType("cash");
    setIsLoadingOutlets(true);
    fetch("/api/payment-batches/outlets")
      .then((r) => r.json())
      .then((data: OutletOption[]) => setOutlets(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Gagal memuat daftar outlet."))
      .finally(() => setIsLoadingOutlets(false));
  }

  async function handleCreateBatch() {
    if (!selectedOutlet) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/payment-batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletCode: selectedOutlet, debetAccountType: accountType }),
      });
      if (!res.ok) throw new Error();
      const record: PaymentBatchRecord = await res.json();
      router.push(`/pembayaran/${record.id}`);
    } catch {
      toast.error("Gagal membuat batch pembayaran baru.");
      setIsCreating(false);
    }
  }

  const stats = {
    total: batches.length,
    siapUpload: batches.filter((b) => b.status === "file_exported").length,
    selesai: batches.filter((b) => b.status === "rilis_selesai").length,
  };

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Pembayaran Vendor</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Kurasi hutang outstanding per outlet → export file Internet Banking BNI → tracking rilis pembayaran.
            </p>
          </div>
          <Button
            onClick={openPicker}
            className="h-9 gap-1.5 bg-blue-900 hover:bg-blue-800 text-white"
          >
            <Plus size={14} />
            Batch Pembayaran Baru
          </Button>
        </motion.div>

        {/* Import outstanding hutang */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.3 }}
          className="bg-white border border-zinc-200 rounded-xl px-4 py-3.5"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <Upload size={15} className="text-zinc-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800">Import Outstanding Hutang Vendor</p>
                {lastImport ? (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Terakhir: <span className="font-mono">{lastImport.fileName}</span> · {lastImport.rowCount} baris · {lastImport.importedBy.name} · {new Date(lastImport.importedAt).toLocaleString("id-ID")}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                    <AlertTriangle size={11} /> Belum pernah import — masih pakai 12 baris data contoh.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => window.open("/api/outstanding-invoices/template", "_blank")}
              >
                <Download size={13} /> Download Template
              </Button>
              <Button
                size="sm"
                disabled={isUploading}
                className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white"
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Upload File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadFile(file);
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {[
            { label: "Total Batch",    value: String(stats.total),     icon: ListChecks,   color: "text-zinc-500" },
            { label: "Siap Diupload",  value: String(stats.siapUpload), icon: FileDown,     color: "text-amber-500" },
            { label: "Rilis Selesai",  value: String(stats.selesai),   icon: CheckCircle2, color: "text-emerald-500" },
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

        {/* List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
        >
          <div className="hidden lg:grid grid-cols-[140px_100px_1fr_140px_180px_120px_90px] gap-3 px-5 py-2.5 bg-zinc-50 border-b border-zinc-100">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Dibuat</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Outlet</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Batch ID</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Item Dipilih</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Nominal</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Aksi</span>
          </div>

          {isLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-zinc-400" />
            </div>
          ) : batches.length === 0 ? (
            <div className="py-16 text-center">
              <Banknote size={20} className="text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Belum ada batch pembayaran. Mulai dengan &quot;Batch Pembayaran Baru&quot;.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {batches.map((b, i) => {
                const st = STATUS_LABEL[b.status];
                const selectedCount = b.items.filter((it) => it.selected).length;
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-[140px_100px_1fr_140px_180px_120px_90px] gap-1 lg:gap-3 px-5 py-4 items-center hover:bg-zinc-50 transition-colors"
                  >
                    <p className="text-sm text-zinc-700 font-medium">{formatTimestamp(b.createdAt)}</p>
                    <p className="text-sm text-zinc-600">{b.outletCode}</p>
                    <p className="text-sm text-zinc-600 font-mono truncate pr-3">{b.id}</p>
                    <p className="text-sm text-zinc-600">{selectedCount} / {b.items.length} invoice</p>
                    <p className="text-sm text-zinc-700 font-medium tabular-nums">{formatRupiah(batchTotal(b))}</p>
                    <div>
                      <Badge className={`text-xs font-medium px-2.5 ${st.className}`}>{st.label}</Badge>
                    </div>
                    <div className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => router.push(`/pembayaran/${b.id}`)}
                      >
                        {b.status === "draft" ? <FileSpreadsheet size={13} /> : b.status === "file_exported" ? <FileDown size={13} /> : <Eye size={13} />}
                        {b.status === "draft" ? "Kurasi" : "Detail"}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-xs text-zinc-400"
        >
          Setelah file di-upload &amp; dirilis di Internet Banking BNI, lanjutkan rekonsiliasi lewat menu{" "}
          <button onClick={() => router.push("/transaksi")} className="underline hover:text-zinc-600">
            Transaksi AP
          </button>{" "}
          begitu file mutasi rekening koran tersedia.
        </motion.p>

      </div>

      {/* Outlet + Rek. Debet picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Batch Pembayaran Baru</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-zinc-500 -mt-2">
            Satu file BNI Direct = satu Rek. Debet. Pilih outlet dan rekening sumber dana dulu, baru kurasi invoice-nya.
          </p>

          {isLoadingOutlets ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-zinc-400" />
            </div>
          ) : outlets.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">Tidak ada outlet dengan hutang outstanding.</p>
          ) : (
            <div className="space-y-3">
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {outlets.map((o) => (
                  <button
                    key={o.code}
                    onClick={() => setSelectedOutlet(o.code)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                      selectedOutlet === o.code
                        ? "border-blue-600 bg-blue-50"
                        : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={13} className="text-zinc-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-zinc-800 truncate">{o.name}</span>
                        <span className="text-[10px] font-mono text-zinc-400">{o.code}</span>
                      </div>
                      <span className="text-xs text-zinc-500 flex-shrink-0">{o.invoiceCount} invoice</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{formatRupiah(o.totalAmount)}</p>
                  </button>
                ))}
              </div>

              {selectedOutlet && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-medium text-zinc-600">Rekening Sumber (Rek. Debet)</p>
                  <div className="flex gap-1.5">
                    {(["cash", "cashless", "tabungan"] as BniAccountType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAccountType(t)}
                        className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                          accountType === t
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {ACCOUNT_TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              disabled={!selectedOutlet || isCreating}
              onClick={handleCreateBatch}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white gap-1.5"
            >
              {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Buat Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
