"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  RefreshCw,
  Building2,
  Database,
  Settings,
  Unplug,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ACCURATE_DATABASES } from "@/lib/mock-data";

const ENV_LABEL: Record<string, string> = {
  production: "Produksi",
  training: "Training",
  archive: "Arsip",
};

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

const connectedDb = ACCURATE_DATABASES.find((db) => db.connected)!;

export default function SettingsPage() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [activeDb, setActiveDb] = useState(connectedDb.id);
  const [pushMode, setPushMode] = useState<"manual" | "auto">("manual");

  function handleReconnect() {
    setIsReconnecting(true);
    setTimeout(() => {
      setIsReconnecting(false);
      toast.success("Koneksi ke Accurate Online berhasil diperbarui.");
    }, 2000);
  }

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
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={18} className="text-emerald-500" aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-800">Terhubung</p>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700 mt-0.5 font-medium">{connectedDb.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">{connectedDb.dbCode}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">bonaventuraoctavito@gmail.com</p>
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
                {isReconnecting ? "Memperbarui..." : "Perbarui Token"}
              </Button>
            </div>

            <Separator />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Token berlaku hingga</p>
                <p className="font-medium text-zinc-700">03 Jul 2026</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">Lingkungan</p>
                <p className="font-medium text-zinc-700 capitalize">{ENV_LABEL[connectedDb.env]}</p>
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
            <h2 className="text-base font-semibold text-zinc-800">Database Accurate</h2>
          </div>
          <p className="text-sm text-zinc-500">
            Database yang terkoneksi akan menerima semua data push dari tool ini. Klik{" "}
            <span className="font-medium text-zinc-700">Detail</span> untuk kelola Master COA,
            Master Vendor, dan Pemetaan Rekening Bank database tersebut.
          </p>

          <div className="space-y-2">
            {ACCURATE_DATABASES.map((db) => (
              <div
                key={db.id}
                className={`rounded-xl border transition-colors duration-150 overflow-hidden ${
                  activeDb === db.id ? "border-blue-900" : "border-zinc-200"
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!db.connected) return;
                    setActiveDb(db.id);
                    toast.success(`Database "${db.name}" dipilih.`);
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && db.connected) {
                      setActiveDb(db.id);
                    }
                  }}
                  className={`w-full text-left flex items-center justify-between px-5 py-4 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    activeDb === db.id ? "bg-zinc-50" : "bg-white hover:bg-zinc-50"
                  } ${db.connected ? "cursor-pointer" : "cursor-default"}`}
                  aria-pressed={activeDb === db.id}
                  aria-label={`Database ${db.name}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                      activeDb === db.id ? "border-blue-900 bg-blue-900" : "border-zinc-300"
                    }`} aria-hidden="true">
                      {activeDb === db.id && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-[3px]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{db.name}</p>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{db.dbCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {db.connected && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Terkoneksi
                      </span>
                    )}
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
                    {db.connected ? (
                      <Link
                        href={`/settings/database/${db.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-0.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 px-2 py-1 rounded-lg hover:bg-zinc-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Detail database ${db.name}`}
                        title="Lihat detail database"
                      >
                        Detail
                        <ChevronRight size={13} aria-hidden="true" />
                      </Link>
                    ) : (
                      <span
                        className="flex items-center gap-0.5 text-xs font-medium text-zinc-300 px-2 py-1 cursor-not-allowed"
                        title="Database ini belum terhubung"
                        aria-disabled="true"
                      >
                        Detail
                        <ChevronRight size={13} aria-hidden="true" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <Separator />

        {/* ── SECTION 3: Preferensi Push ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
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
                    ? "border-blue-900 bg-zinc-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
                aria-pressed={pushMode === mode.value}
                aria-label={`Pilih mode push: ${mode.label}`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                  pushMode === mode.value ? "border-blue-900 bg-blue-900" : "border-zinc-300"
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
          transition={{ delay: 0.25, duration: 0.3 }}
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
    </AppShell>
  );
}
