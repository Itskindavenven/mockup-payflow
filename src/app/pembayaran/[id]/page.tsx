"use client";

import { useEffect, useMemo, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  ArrowRight,
  Landmark,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { formatRupiah } from "@/lib/parser";
import { findRestrictedChars, determineTransferRail } from "@/lib/payment-batch-data";
import type { PaymentBatchRecord, PaymentBatchItem, PaymentBatchStatus } from "@/lib/payment-batch-store";
import { findOutlet, outletAccountNo, ACCOUNT_TYPE_LABEL } from "@/lib/bni-outlets";
import { toast } from "sonner";

const STEP_ORDER: PaymentBatchStatus[] = ["draft", "dikurasi", "file_exported", "rilis_selesai"];
const STEP_LABEL: Record<PaymentBatchStatus, string> = {
  draft:          "Kurasi",
  dikurasi:       "Kurasi",
  file_exported:  "Export File",
  rilis_selesai:  "Selesai",
};

function isEditable(status: PaymentBatchStatus) {
  return status === "draft" || status === "dikurasi";
}

export default function PaymentBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [batch, setBatch] = useState<PaymentBatchRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetch(`/api/payment-batches/${id}`)
      .then((r) => r.json())
      .then((data: PaymentBatchRecord) => setBatch(data))
      .catch(() => toast.error("Gagal memuat batch pembayaran."))
      .finally(() => setIsLoading(false));
  }, [id]);

  const outlet = batch ? findOutlet(batch.outletCode) : undefined;
  const debetAccountNo = outlet && batch ? outletAccountNo(outlet, batch.debetAccountType) : null;

  const selectedItems = useMemo(() => batch?.items.filter((i) => i.selected) ?? [], [batch]);
  const totalAmount = useMemo(() => selectedItems.reduce((s, i) => s + i.amount, 0), [selectedItems]);

  const restrictedIssues = useMemo(() => {
    const issues: { itemId: string; field: string; chars: string[] }[] = [];
    for (const item of selectedItems) {
      const nameChars = findRestrictedChars(item.bankAccountName);
      if (nameChars.length) issues.push({ itemId: item.id, field: "Nama rekening", chars: nameChars });
      const vendorChars = findRestrictedChars(item.vendorName);
      if (vendorChars.length) issues.push({ itemId: item.id, field: "Nama vendor", chars: vendorChars });
    }
    return issues;
  }, [selectedItems]);

  function toggleItem(itemId: string) {
    if (!batch || !isEditable(batch.status)) return;
    setBatch({
      ...batch,
      items: batch.items.map((i) => (i.id === itemId ? { ...i, selected: !i.selected } : i)),
    });
  }

  function toggleAll() {
    if (!batch || !isEditable(batch.status)) return;
    const allSelected = batch.items.every((i) => i.selected);
    setBatch({ ...batch, items: batch.items.map((i) => ({ ...i, selected: !allSelected })) });
  }

  async function persist(updates: Partial<PaymentBatchRecord>) {
    if (!batch) return;
    await fetch(`/api/payment-batches/${batch.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  async function handleSaveCuration() {
    if (!batch) return;
    if (selectedItems.length === 0) {
      toast.error("Pilih minimal satu invoice untuk dikurasi.");
      return;
    }
    setIsSaving(true);
    try {
      await persist({ items: batch.items, status: "dikurasi" });
      setBatch({ ...batch, status: "dikurasi" });
      toast.success(`Kurasi disimpan — ${selectedItems.length} invoice siap di-export.`);
    } catch {
      toast.error("Gagal menyimpan kurasi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExport() {
    if (!batch) return;
    if (restrictedIssues.length > 0) {
      toast.error("Ada field yang mengandung karakter terlarang BNI — perbaiki dulu sebelum export.");
      return;
    }
    setIsExporting(true);
    try {
      const res = await fetch(`/api/payment-batches/${batch.id}/export`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Export gagal");
      }
      const { fileName, base64, railsUsed, unmatchedBankItems } = await res.json();

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setBatch({ ...batch, status: "file_exported", exportedFileName: fileName, exportedFileContent: base64, exportedAt: new Date().toISOString() });

      const railLabel = (railsUsed as string[]).map((r) => (r === "inhouse" ? "INHOUSE" : "Kliring")).join(" + ");
      toast.success(`File BNI (${railLabel}) berhasil di-generate dan diunduh.`);

      if (unmatchedBankItems?.length) {
        toast.warning(`${unmatchedBankItems.length} transaksi ke bank yang kodenya tidak dikenali — kolom kode bank di file dikosongkan, isi manual sebelum upload.`, {
          description: (unmatchedBankItems as { vendorName: string; bankName: string }[]).map((i) => `${i.vendorName} (${i.bankName})`).join(", "),
          duration: 10000,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal export file BNI.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleMarkStatus(status: PaymentBatchStatus, message: string) {
    if (!batch) return;
    setIsUpdatingStatus(true);
    try {
      const updates: Partial<PaymentBatchRecord> = { status };
      if (status === "rilis_selesai") updates.releasedAt = new Date().toISOString();
      await persist(updates);
      setBatch({ ...batch, ...updates });
      toast.success(message);
    } catch {
      toast.error("Gagal mengubah status batch.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={20} className="animate-spin text-zinc-400" />
        </div>
      </AppShell>
    );
  }

  if (!batch) {
    return (
      <AppShell>
        <div className="px-6 py-6 max-w-3xl mx-auto text-center py-24">
          <p className="text-sm text-zinc-400">Batch pembayaran tidak ditemukan.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/pembayaran")}>
            Kembali
          </Button>
        </div>
      </AppShell>
    );
  }

  const stepIdx = STEP_ORDER.indexOf(batch.status);

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <button
            onClick={() => router.push("/pembayaran")}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 mb-3"
          >
            <ArrowLeft size={13} /> Kembali ke Pembayaran Vendor
          </button>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 font-mono">{batch.id}</h1>
              <p className="text-sm text-zinc-500 mt-1">Dibuat oleh {batch.createdBy.name}</p>
            </div>
            {outlet && (
              <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3.5 py-2">
                <Landmark size={15} className="text-blue-900" />
                <div className="text-right">
                  <p className="text-xs font-medium text-zinc-800">{outlet.name} — {ACCOUNT_TYPE_LABEL[batch.debetAccountType]}</p>
                  <p className="text-[10px] font-mono text-zinc-400">Rek. Debet: {debetAccountNo}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Step indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 flex-wrap">
          {(["draft", "file_exported", "rilis_selesai"] as PaymentBatchStatus[]).map((s, i, arr) => {
            const sIdx = STEP_ORDER.indexOf(s);
            const done = stepIdx > sIdx || (s === "draft" && stepIdx >= 1);
            const active = batch.status === s || (s === "draft" && batch.status === "dikurasi");
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  active ? "bg-blue-900 text-white border-blue-900" : done ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-zinc-50 text-zinc-400 border-zinc-200"
                }`}>
                  {done && !active ? <CheckCircle2 size={11} /> : null}
                  {STEP_LABEL[s]}
                </div>
                {i < arr.length - 1 && <ArrowRight size={12} className="text-zinc-300" />}
              </div>
            );
          })}
        </motion.div>

        {/* Restricted char warning */}
        {isEditable(batch.status) && restrictedIssues.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <p className="font-medium">{restrictedIssues.length} field mengandung karakter yang ditolak Internet Banking BNI</p>
              <p className="text-xs text-red-600 mt-0.5">
                Karakter terlarang: <code className="font-mono">, ` ~ ! @ # $ % ^ &amp; * _ {"{"} {"}"} &lt; &gt; [ ] = \ ;</code> — export akan otomatis menyaring karakter ini dari nama rekening &amp; nama vendor.
              </p>
            </div>
          </motion.div>
        )}

        {/* Curation table */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100">
            <span className="text-xs text-zinc-500">
              {selectedItems.length} dari {batch.items.length} invoice dipilih · Total {formatRupiah(totalAmount)}
            </span>
            {isEditable(batch.status) && (
              <button onClick={toggleAll} className="text-xs font-medium text-blue-700 hover:text-blue-600">
                {batch.items.every((i) => i.selected) ? "Batalkan Semua" : "Pilih Semua"}
              </button>
            )}
          </div>
          <div className="hidden lg:grid grid-cols-[32px_1fr_130px_110px_110px_90px_140px] gap-3 px-4 py-2 bg-zinc-50 border-b border-zinc-100">
            <span />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vendor / Invoice</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Jatuh Tempo</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Nominal</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bank</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rail</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rek. Tujuan</span>
          </div>
          <div className="divide-y divide-zinc-50 max-h-[420px] overflow-y-auto">
            {batch.items.map((item: PaymentBatchItem) => {
              const overdue = new Date(item.dueDate) < new Date();
              const hasIssue = restrictedIssues.some((iss) => iss.itemId === item.id);
              const rail = determineTransferRail(item.bankName);
              return (
                <label
                  key={item.id}
                  className={`grid grid-cols-1 lg:grid-cols-[32px_1fr_130px_110px_110px_90px_140px] gap-1 lg:gap-3 px-4 py-3 items-center transition-colors ${
                    isEditable(batch.status) ? "cursor-pointer hover:bg-zinc-50" : ""
                  } ${hasIssue ? "bg-red-50/40" : ""}`}
                >
                  <div
                    onClick={() => toggleItem(item.id)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                      item.selected ? "bg-blue-600 border-blue-600" : "border-zinc-300"
                    } ${!isEditable(batch.status) ? "opacity-60" : ""}`}
                  >
                    {item.selected && <CheckCircle2 size={11} className="text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-800 truncate">{item.vendorName}</p>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{item.invoiceNo}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={11} className={overdue ? "text-red-400" : "text-zinc-300"} />
                    <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-zinc-500"}`}>{item.dueDate}</span>
                  </div>
                  <p className="text-sm text-zinc-700 font-medium tabular-nums text-right">{formatRupiah(item.amount)}</p>
                  <div className="flex items-center gap-1">
                    <Building2 size={11} className="text-zinc-300" />
                    <span className="text-xs text-zinc-500">{item.bankName}</span>
                  </div>
                  <Badge className={`text-[10px] px-1.5 w-fit ${rail === "inhouse" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-violet-50 text-violet-700 border-violet-100"}`}>
                    {rail === "inhouse" ? "Inhouse" : "Kliring"}
                  </Badge>
                  <span className="text-xs text-zinc-500 font-mono truncate">{item.bankAccountNo}</span>
                </label>
              );
            })}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-end gap-2">
          {isEditable(batch.status) && (
            <>
              <Button variant="outline" disabled={isSaving} onClick={handleSaveCuration} className="h-9 gap-1.5">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Simpan Kurasi
              </Button>
              <Button disabled={isExporting || selectedItems.length === 0} onClick={handleExport} className="h-9 gap-1.5 bg-blue-900 hover:bg-blue-800 text-white">
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                Export File BNI
              </Button>
            </>
          )}

          {batch.status === "file_exported" && (
            <Button
              disabled={isUpdatingStatus}
              onClick={() => handleMarkStatus("rilis_selesai", "Batch ditandai sudah rilis. Lanjutkan rekonsiliasi di Transaksi AP begitu file mutasi tersedia.")}
              className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Tandai Sudah Rilis di BNI
            </Button>
          )}

          {batch.status === "rilis_selesai" && (
            <Button onClick={() => router.push("/transaksi")} className="h-9 gap-1.5 bg-blue-900 hover:bg-blue-800 text-white">
              Lanjut ke Transaksi AP <ArrowRight size={14} />
            </Button>
          )}
        </motion.div>

        {batch.exportedFileName && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-zinc-400 text-right">
            File terakhir di-export: <span className="font-mono">{batch.exportedFileName}</span>
            {batch.exportedAt && <> · {new Date(batch.exportedAt).toLocaleString("id-ID")}</>}
          </motion.p>
        )}

      </div>
    </AppShell>
  );
}
