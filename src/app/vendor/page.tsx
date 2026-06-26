"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, RefreshCw, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/AppShell";
import { VENDOR_MASTER } from "@/lib/mock-data";

export default function VendorPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"semua" | "aktif" | "nonaktif">("semua");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync] = useState("10 Mar 2026, 09:00");

  const filtered = useMemo(() => {
    let list = VENDOR_MASTER;
    if (statusFilter === "aktif") list = list.filter((v) => v.is_active);
    if (statusFilter === "nonaktif") list = list.filter((v) => !v.is_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.code.toLowerCase().includes(q) ||
          v.name.toLowerCase().includes(q) ||
          v.npwp.includes(q)
      );
    }
    return list;
  }, [search, statusFilter]);

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast.success("Master Vendor berhasil disinkronisasi dari Accurate Online.", {
        description: `${VENDOR_MASTER.length} vendor diperbarui.`,
      });
    }, 1800);
  }

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Master Vendor</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Daftar supplier dari Accurate Online · Terakhir diperbarui: {lastSync}
            </p>
          </div>
          <Button
            className="h-10 gap-2 bg-zinc-900 hover:bg-zinc-700 text-white"
            onClick={handleSync}
            disabled={isSyncing}
            aria-label="Sinkronisasi ulang Master Vendor dari Accurate Online"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} aria-hidden="true" />
            {isSyncing ? "Menyinkronkan..." : "Sync dari Accurate"}
          </Button>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex items-start gap-3"
        >
          <Users size={15} className="text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-blue-700 leading-relaxed">
            Daftar vendor ini diambil dari Accurate Online via{" "}
            <span className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded">/api/vendor</span>.
            Saat push transaksi, sistem menggunakan kode vendor (kolom{" "}
            <span className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded">vendorNo</span>) — bukan nama teks.
          </p>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="flex flex-col sm:flex-row gap-2 items-start sm:items-center"
        >
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <Input
              placeholder="Cari nama, kode, atau NPWP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white"
              aria-label="Cari vendor"
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

          {/* Status filter tabs */}
          <div className="flex border border-zinc-200 rounded-lg bg-white overflow-hidden">
            {(["semua", "aktif", "nonaktif"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 h-10 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset capitalize ${
                  statusFilter === s
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                }`}
                aria-pressed={statusFilter === s}
                aria-label={`Filter vendor: ${s}`}
              >
                {s === "semua" ? "Semua" : s === "aktif" ? "Aktif" : "Nonaktif"}
              </button>
            ))}
          </div>

          <span className="text-sm text-zinc-400 sm:ml-auto">{filtered.length} vendor</span>
        </motion.div>

        {/* Vendor list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
        >
          {/* Header row */}
          <div className="grid grid-cols-[90px_1fr_160px_140px_80px] gap-0 px-5 py-2.5 bg-zinc-50 border-b border-zinc-100">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kode</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Nama Vendor</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">NPWP</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kontak</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Status</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-zinc-400">Tidak ada vendor yang cocok.</p>
              <button
                onClick={() => { setSearch(""); setStatusFilter("semua"); }}
                className="text-sm text-zinc-500 underline underline-offset-2 mt-2 hover:text-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filtered.map((vendor, i) => (
                <motion.div
                  key={vendor.code}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="grid grid-cols-[90px_1fr_160px_140px_80px] gap-0 px-5 py-4 items-center hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-sm font-mono font-semibold text-zinc-700">{vendor.code}</span>
                  <div className="pr-4">
                    <p className="text-sm font-medium text-zinc-800">{vendor.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{vendor.email}</p>
                  </div>
                  <span className="text-sm font-mono text-zinc-500 text-xs">{vendor.npwp}</span>
                  <span className="text-sm text-zinc-500">{vendor.phone}</span>
                  <div className="text-center">
                    <Badge
                      className={`text-xs font-medium px-2.5 ${
                        vendor.is_active
                          ? "bg-teal-50 text-teal-700 border-teal-100"
                          : "bg-zinc-100 text-zinc-400 border-zinc-200"
                      }`}
                    >
                      {vendor.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </AppShell>
  );
}
