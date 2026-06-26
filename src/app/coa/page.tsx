"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, RefreshCw, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/AppShell";
import { COA_MASTER, COAEntry } from "@/lib/mock-data";

const COA_TYPES = [
  "Semua Tipe",
  "Aset Lancar",
  "Aset Tetap",
  "Kewajiban Lancar",
  "Kewajiban Jangka Panjang",
  "Ekuitas",
  "Pendapatan",
  "Harga Pokok",
  "Beban Operasional",
] as const;

const TYPE_BADGE: Record<COAEntry["type"], string> = {
  "Aset Lancar":              "bg-blue-50 text-blue-700 border-blue-100",
  "Aset Tetap":               "bg-blue-50 text-blue-700 border-blue-100",
  "Kewajiban Lancar":         "bg-orange-50 text-orange-700 border-orange-100",
  "Kewajiban Jangka Panjang": "bg-orange-50 text-orange-700 border-orange-100",
  "Ekuitas":                  "bg-purple-50 text-purple-700 border-purple-100",
  "Pendapatan":               "bg-green-50 text-green-700 border-green-100",
  "Harga Pokok":              "bg-rose-50 text-rose-700 border-rose-100",
  "Beban Operasional":        "bg-amber-50 text-amber-700 border-amber-100",
};

export default function COAPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Semua Tipe");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync] = useState("01 Apr 2026, 08:30");

  const filtered = useMemo(() => {
    let list = COA_MASTER;
    if (typeFilter !== "Semua Tipe") list = list.filter((c) => c.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, typeFilter]);

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast.success("Master COA berhasil disinkronisasi dari Accurate Online.", {
        description: `${COA_MASTER.length} akun diperbarui.`,
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
            <h1 className="text-xl font-semibold text-zinc-900">Master COA</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Chart of Account dari Accurate Online · Terakhir diperbarui: {lastSync}
            </p>
          </div>
          <Button
            className="h-10 gap-2 bg-zinc-900 hover:bg-zinc-700 text-white"
            onClick={handleSync}
            disabled={isSyncing}
            aria-label="Sinkronisasi ulang Master COA dari Accurate Online"
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
          <BookOpen size={15} className="text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-blue-700 leading-relaxed">
            Daftar akun ini diambil langsung dari Accurate Online via{" "}
            <span className="font-mono text-xs bg-blue-100 px-1.5 py-0.5 rounded">/api/glaccount</span>.
            Data ini digunakan sebagai referensi saat melakukan push transaksi dan saat membuat Keyword Mapping.
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
              placeholder="Cari kode atau nama akun..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white"
              aria-label="Cari akun COA"
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
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "Semua Tipe")}>
            <SelectTrigger className="w-52 h-10 bg-white" aria-label="Filter tipe akun">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COA_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-zinc-400 sm:ml-auto">{filtered.length} akun</span>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
        >
          {/* Table header */}
          <div className="grid grid-cols-[120px_1fr_200px_90px_80px] gap-0 border-b border-zinc-100 px-4 py-2.5 bg-zinc-50">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kode</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Nama Akun</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tipe</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Posisi Normal</span>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Status</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-zinc-400">Tidak ada akun yang cocok.</p>
              <button
                onClick={() => { setSearch(""); setTypeFilter("Semua Tipe"); }}
                className="text-sm text-zinc-500 underline underline-offset-2 mt-2 hover:text-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filtered.map((coa, i) => (
                <motion.div
                  key={coa.code}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="grid grid-cols-[120px_1fr_200px_90px_80px] gap-0 px-4 py-3.5 items-center hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-sm font-mono font-medium text-zinc-700">{coa.code}</span>
                  <span className="text-sm text-zinc-800 font-medium pr-4">{coa.name}</span>
                  <div>
                    <Badge className={`text-xs font-normal px-2.5 py-0.5 ${TYPE_BADGE[coa.type]}`}>
                      {coa.type}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${
                      coa.normal_balance === "D"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-green-50 text-green-700"
                    }`}>
                      {coa.normal_balance}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${coa.is_active ? "bg-teal-400" : "bg-zinc-300"}`} aria-label={coa.is_active ? "Aktif" : "Tidak aktif"} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="flex items-center gap-6 text-xs text-zinc-400"
        >
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-blue-50 text-blue-700 font-bold inline-flex items-center justify-center text-[11px]">D</span>
            Posisi Normal Debit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-green-50 text-green-700 font-bold inline-flex items-center justify-center text-[11px]">C</span>
            Posisi Normal Kredit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
            Aktif di Accurate
          </span>
        </motion.div>

      </div>
    </AppShell>
  );
}
