"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertTriangle, Tag } from "lucide-react";
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
import { DEFAULT_KEYWORD_MAP, KeywordEntry } from "@/lib/parser";
import { COA_MASTER } from "@/lib/mock-data";

// Only expense accounts make sense for keyword → COA mapping
const EXPENSE_COAS = COA_MASTER.filter((c) => c.type === "Beban Operasional");

let nextId = DEFAULT_KEYWORD_MAP.length + 1;

export default function KeywordMappingPage() {
  const [keywords, setKeywords] = useState<KeywordEntry[]>(DEFAULT_KEYWORD_MAP);
  const [editTarget, setEditTarget] = useState<KeywordEntry | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ keyword: "", coa: "" });

  function openAdd() {
    setForm({ keyword: "", coa: "" });
    setIsAdding(true);
    setEditTarget(null);
  }

  function openEdit(entry: KeywordEntry) {
    setForm({ keyword: entry.keyword, coa: entry.coa });
    setEditTarget(entry);
    setIsAdding(false);
  }

  function handleSave() {
    if (!form.keyword.trim()) {
      toast.error("Keyword wajib diisi.");
      return;
    }
    if (!form.coa) {
      toast.error("Pilih akun COA terlebih dahulu.");
      return;
    }
    const coaNo = EXPENSE_COAS.find((c) => c.name === form.coa)?.code ?? "";
    if (isAdding) {
      setKeywords((prev) => [
        ...prev,
        { id: `k${nextId++}`, keyword: form.keyword.trim().toLowerCase(), coa: form.coa, coaNo },
      ]);
      toast.success("Keyword berhasil ditambahkan.");
    } else if (editTarget) {
      setKeywords((prev) =>
        prev.map((k) =>
          k.id === editTarget.id
            ? { ...k, keyword: form.keyword.trim().toLowerCase(), coa: form.coa, coaNo }
            : k
        )
      );
      toast.success("Keyword berhasil diperbarui.");
    }
    setIsAdding(false);
    setEditTarget(null);
  }

  function handleDelete(id: string, keyword: string) {
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    toast.success(`Keyword "${keyword}" dihapus.`);
  }

  const dialogOpen = isAdding || editTarget !== null;

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-semibold text-zinc-900">Keyword Mapping</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Petakan kata kunci pada description transaksi ke akun COA di Accurate
          </p>
        </motion.div>

        {/* Warning banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="rounded-xl border border-amber-100 bg-amber-50 px-5 py-4 flex gap-3"
        >
          <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-semibold text-amber-700">Data COA diambil langsung dari Accurate Online</p>
            <p className="leading-relaxed">
              Daftar akun yang tersedia di bawah sudah tersinkronisasi dengan Master COA Anda.
              Pada Fase 2, perubahan di sini akan langsung tersimpan ke konfigurasi akun Accurate.
              Saat ini tersimpan sementara di memori browser.
            </p>
          </div>
        </motion.div>

        <Separator />

        {/* Cara kerja */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="bg-zinc-50 border border-zinc-100 rounded-xl px-5 py-4"
        >
          <p className="text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
            <Tag size={14} className="text-zinc-500" aria-hidden="true" />
            Cara kerja keyword matching
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Sistem mencari setiap keyword pada kolom description transaksi secara{" "}
            <span className="font-mono text-xs bg-zinc-200 px-1.5 py-0.5 rounded">case-insensitive</span>.
            Jika cocok, transaksi akan otomatis dipetakan ke COA yang ditentukan dan
            siap di-push ke modul{" "}
            <span className="font-mono text-xs bg-zinc-200 px-1.5 py-0.5 rounded">Pengeluaran Kas/Bank Lain</span>{" "}
            di Accurate.
          </p>
          <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
            Contoh: keyword <span className="font-mono text-xs bg-zinc-200 px-1.5 py-0.5 rounded">admin bank</span> akan mencocokkan
            description <span className="italic">"BIAYA ADMIN BANK BULAN APRIL 2026"</span>.
          </p>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-medium text-zinc-700">{keywords.length} keyword terdaftar</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pencocokan dilakukan terhadap kolom{" "}
              <span className="font-mono">description_raw</span> secara case-insensitive
            </p>
          </div>
          <Button
            className="h-10 gap-2 bg-blue-900 hover:bg-blue-800 text-white"
            onClick={openAdd}
            aria-label="Tambah keyword mapping baru"
          >
            <Plus size={14} aria-hidden="true" />
            Tambah Keyword
          </Button>
        </motion.div>

        {/* Keyword list */}
        <div className="space-y-2">
          <AnimatePresence>
            {keywords.map((entry, i) => {
              const coaEntry = EXPENSE_COAS.find((c) => c.name === entry.coa);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                  transition={{ delay: i * 0.04, duration: 0.25, ease: "easeOut" }}
                  layout
                  className="bg-white border border-zinc-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-zinc-300 transition-colors"
                >
                  {/* Keyword pill */}
                  <div className="flex-shrink-0">
                    <code className="text-sm bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-lg font-mono font-medium">
                      {entry.keyword}
                    </code>
                  </div>

                  <span className="text-zinc-300 text-lg flex-shrink-0" aria-hidden="true">→</span>

                  {/* COA */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800">{entry.coa}</p>
                    {coaEntry && (
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{coaEntry.code}</p>
                    )}
                  </div>

                  {/* Module badge */}
                  <Badge className="text-xs font-normal bg-purple-50 text-purple-700 border-purple-100 hidden sm:inline-flex flex-shrink-0">
                    other-payment
                  </Badge>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(entry)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors focus-visible:ring-2 focus-visible:ring-ring outline-none"
                      aria-label={`Edit keyword ${entry.keyword}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id, entry.keyword)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 outline-none"
                      aria-label={`Hapus keyword ${entry.keyword}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {keywords.length === 0 && (
            <div className="py-16 text-center text-sm text-zinc-400">
              Belum ada keyword. Klik <strong className="text-zinc-600">Tambah Keyword</strong> untuk mulai.
            </div>
          )}
        </div>

      </div>

      {/* Add/Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) { setIsAdding(false); setEditTarget(null); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {isAdding ? "Tambah Keyword Baru" : "Edit Keyword"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Keyword input */}
            <div className="space-y-2">
              <Label htmlFor="kw-keyword" className="text-sm font-medium">
                Keyword
              </Label>
              <Input
                id="kw-keyword"
                placeholder="contoh: uang makan"
                value={form.keyword}
                onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
                className="h-10 font-mono"
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-zinc-400">
                Tulis dalam huruf kecil. Sistem akan mencocokkan secara case-insensitive
                terhadap description transaksi.
              </p>
            </div>

            {/* COA select */}
            <div className="space-y-2">
              <Label htmlFor="kw-coa" className="text-sm font-medium">
                Akun COA (Beban)
              </Label>
              <Select
                value={form.coa}
                onValueChange={(v) => setForm((f) => ({ ...f, coa: v ?? "" }))}
              >
                <SelectTrigger id="kw-coa" className="h-10" aria-label="Pilih akun COA untuk keyword ini">
                  <SelectValue placeholder="Pilih akun dari Master COA..." />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_COAS.map((coa) => (
                    <SelectItem key={coa.code} value={coa.name}>
                      <span className="font-mono text-xs text-zinc-400 mr-2">{coa.code}</span>
                      {coa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-400">
                Hanya menampilkan akun tipe <strong>Beban Operasional</strong> dari Master COA.
              </p>
            </div>

            {/* Preview */}
            {form.keyword && form.coa && (
              <div className="bg-zinc-50 rounded-lg px-4 py-3 border border-zinc-100">
                <p className="text-xs text-zinc-400 mb-2 font-medium uppercase tracking-wider">Preview mapping</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-sm bg-zinc-200 text-zinc-700 px-2.5 py-1 rounded font-mono">
                    {form.keyword}
                  </code>
                  <span className="text-zinc-400" aria-hidden="true">→</span>
                  <span className="text-sm font-medium text-zinc-800">{form.coa}</span>
                  <Badge className="text-xs font-normal bg-purple-50 text-purple-700 border-purple-100">
                    other-payment
                  </Badge>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-10"
              onClick={() => { setIsAdding(false); setEditTarget(null); }}
            >
              Batal
            </Button>
            <Button
              className="h-10 bg-blue-900 hover:bg-blue-800 text-white"
              onClick={handleSave}
              aria-label="Simpan keyword mapping"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
