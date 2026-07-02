"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FileBarChart2, Landmark, Users, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/AppShell";
import { formatRupiah } from "@/lib/parser";

interface AdminFeeEntry {
  transDate: string; // dd/MM/yyyy
  accountNo: string;
  accountName: string;
  amount: number;
}

interface VendorPaymentEntry {
  transDate: string;
  vendorNo: string;
  vendorName: string;
  amount: number;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// "dd/MM/yyyy" -> "yyyy-MM" (buat grouping per bulan) + label "MMM yyyy"
function periodKey(dmy: string): { key: string; label: string } {
  const [dd, mm, yyyy] = dmy.split("/");
  const key = `${yyyy}-${mm}`;
  const label = new Date(Number(yyyy), Number(mm) - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  return { key, label };
}

export default function ReportPage() {
  const [from, setFrom] = useState("2015-01-01");
  const [to, setTo] = useState(todayIso());

  const [adminFees, setAdminFees] = useState<AdminFeeEntry[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPaymentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accurate/report?from=${from}&to=${to}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAdminFees(json.adminFees ?? []);
      setVendorPayments(json.vendorPayments ?? []);
    } catch (e) {
      setError(String(e));
      toast.error("Gagal memuat data laporan dari Accurate.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Biaya Admin per Periode ───────────────────────────────────────────
  const adminByPeriod = useMemo(() => {
    const map = new Map<string, { label: string; total: number; count: number }>();
    for (const e of adminFees) {
      const { key, label } = periodKey(e.transDate);
      const cur = map.get(key) ?? { label, total: 0, count: 0 };
      cur.total += e.amount;
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, v]) => ({ key, ...v }));
  }, [adminFees]);

  const maxAdminTotal = Math.max(1, ...adminByPeriod.map((p) => p.total));
  const totalAdminFee = adminFees.reduce((s, e) => s + e.amount, 0);

  // ─── Pengeluaran per Vendor ─────────────────────────────────────────────
  const vendorTotals = useMemo(() => {
    const map = new Map<string, { vendorName: string; vendorNo: string; total: number; count: number }>();
    for (const e of vendorPayments) {
      const cur = map.get(e.vendorNo) ?? { vendorName: e.vendorName, vendorNo: e.vendorNo, total: 0, count: 0 };
      cur.total += e.amount;
      cur.count += 1;
      map.set(e.vendorNo, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [vendorPayments]);

  const totalVendorPayment = vendorPayments.reduce((s, e) => s + e.amount, 0);

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Report</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Beban biaya admin & pengeluaran per vendor — data langsung dari Accurate Online.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="report-from" className="text-[11px] text-zinc-500">Dari</Label>
              <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="report-to" className="text-[11px] text-zinc-500">Sampai</Label>
              <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
            </div>
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-blue-900 hover:bg-blue-800 text-white"
              onClick={loadReport}
              disabled={loading}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Muat Ulang
            </Button>
          </div>
        </motion.div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
            <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Gagal memuat data dari Accurate</p>
              <p className="text-xs text-red-500 mt-1 font-mono break-all">{error}</p>
            </div>
          </div>
        )}

        {loading && !error ? (
          <div className="bg-white border border-zinc-200 rounded-xl py-16 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            {/* ── Biaya Admin per Periode ── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.3 }} className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Landmark size={15} className="text-zinc-500" />
                  <h2 className="text-base font-semibold text-zinc-800">Beban Biaya Admin per Periode</h2>
                </div>
                <span className="text-sm text-zinc-500">
                  Total: <strong className="text-zinc-800">{formatRupiah(totalAdminFee)}</strong>
                </span>
              </div>

              {adminByPeriod.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-xl py-10 text-center">
                  <p className="text-sm text-zinc-400">Tidak ada biaya admin pada periode ini.</p>
                </div>
              ) : (
                <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden">
                  {adminByPeriod.map((p) => (
                    <div key={p.key} className="px-5 py-3.5 flex items-center gap-4">
                      <div className="w-32 flex-shrink-0">
                        <p className="text-sm font-medium text-zinc-800 capitalize">{p.label}</p>
                        <p className="text-[11px] text-zinc-400">{p.count} transaksi</p>
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-900 rounded-full"
                          style={{ width: `${Math.max(4, (p.total / maxAdminTotal) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-zinc-800 tabular-nums w-32 text-right flex-shrink-0">
                        {formatRupiah(p.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* ── Pengeluaran per Vendor ── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.3 }} className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-zinc-500" />
                  <h2 className="text-base font-semibold text-zinc-800">Pengeluaran per Vendor</h2>
                </div>
                <span className="text-sm text-zinc-500">
                  Total: <strong className="text-zinc-800">{formatRupiah(totalVendorPayment)}</strong>
                </span>
              </div>

              {vendorTotals.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-xl py-10 text-center">
                  <p className="text-sm text-zinc-400">Tidak ada pembayaran vendor pada periode ini.</p>
                </div>
              ) : (
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_100px_140px] gap-0 border-b border-zinc-100 px-5 py-2.5 bg-zinc-50">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Vendor</span>
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-center">Transaksi</span>
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">Total Dibayar</span>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {vendorTotals.map((v) => (
                      <div key={v.vendorNo} className="grid grid-cols-[1fr_100px_140px] gap-0 px-5 py-3 items-center">
                        <div>
                          <p className="text-sm text-zinc-800">{v.vendorName}</p>
                          <p className="text-[11px] text-zinc-400 font-mono">{v.vendorNo}</p>
                        </div>
                        <span className="text-sm text-zinc-500 text-center tabular-nums">{v.count}</span>
                        <span className="text-sm font-semibold text-zinc-800 text-right tabular-nums">{formatRupiah(v.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <div className="flex items-start gap-2 text-xs text-zinc-400">
              <FileBarChart2 size={13} className="mt-0.5 flex-shrink-0" />
              <p>
                Data diambil langsung dari transaksi Pembayaran Lain (biaya admin) dan Pembayaran Pembelian
                (per vendor) yang sudah terposting di Accurate Online pada rentang tanggal yang dipilih.
              </p>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
