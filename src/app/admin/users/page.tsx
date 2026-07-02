"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ShieldCheck,
  User,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { PERMISSION_LABELS, ALL_PERMISSIONS } from "@/lib/auth-types";
import type { Permission } from "@/lib/auth-types";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  permissions: Permission[];
}

const EMPTY_FORM = { name: "", email: "", password: "", permissions: ["transaksi"] as Permission[] };

export default function AdminUsersPage() {
  const [users, setUsers]         = useState<UserRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [savingId, setSavingId]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users);
    } catch {
      toast.error("Gagal memuat daftar pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function togglePermission(user: UserRecord, perm: Permission) {
    const current = user.permissions;
    const next = current.includes(perm)
      ? current.filter((p) => p !== perm)
      : [...current, perm];

    setSavingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: next }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Gagal menyimpan.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, permissions: next } : u))
      );
    } catch {
      toast.error("Koneksi gagal.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(user: UserRecord) {
    if (!confirm(`Hapus akun "${user.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Gagal menghapus.");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success(`Akun "${user.name}" dihapus.`);
    } catch {
      toast.error("Koneksi gagal.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddUser(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Semua field wajib diisi.");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menambahkan.");
        return;
      }
      toast.success(`Karyawan "${form.name}" berhasil ditambahkan.`);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await fetchUsers();
    } catch {
      toast.error("Koneksi gagal.");
    } finally {
      setFormLoading(false);
    }
  }

  function toggleFormPermission(perm: Permission) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  }

  const employees = users.filter((u) => u.role === "employee");
  const admins    = users.filter((u) => u.role === "admin");

  return (
    <AppShell>
      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Manajemen Pengguna</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Kelola akses karyawan ke fitur-fitur aplikasi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-zinc-500"
              onClick={fetchUsers}
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-blue-900 hover:bg-blue-800 text-white"
              onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}
            >
              <Plus size={13} />
              Tambah Karyawan
            </Button>
          </div>
        </motion.div>

        <Separator />

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-zinc-300" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* Admin accounts */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Administrator
              </p>
              <div className="space-y-2">
                {admins.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-zinc-200 rounded-xl px-5 py-4 flex items-center gap-4"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: "#EFF6FF", color: "#0B3D91" }}
                    >
                      {user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800">{user.name}</p>
                      <p className="text-xs text-zinc-400 font-mono">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                      <ShieldCheck size={11} />
                      Super Admin · Semua Akses
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Employee accounts */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Karyawan ({employees.length})
              </p>
              {employees.length === 0 ? (
                <div className="py-10 text-center text-sm text-zinc-400">
                  Belum ada karyawan. Klik <strong className="text-zinc-600">Tambah Karyawan</strong> untuk mulai.
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {employees.map((user, i) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        layout
                        className="bg-white border border-zinc-200 rounded-xl px-5 py-4 space-y-3"
                      >
                        {/* User info row */}
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{ background: "#F1F5F9", color: "#475569" }}
                          >
                            {user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-800">{user.name}</p>
                            <p className="text-xs text-zinc-400 font-mono">{user.email}</p>
                          </div>
                          {savingId === user.id && (
                            <Loader2 size={13} className="animate-spin text-zinc-400 flex-shrink-0" />
                          )}
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="p-2 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-red-400 outline-none flex-shrink-0"
                            aria-label={`Hapus akun ${user.name}`}
                          >
                            {deletingId === user.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />}
                          </button>
                        </div>

                        {/* Permission toggles */}
                        <div className="flex flex-wrap gap-2">
                          {ALL_PERMISSIONS.map((perm) => {
                            const active = user.permissions.includes(perm);
                            return (
                              <button
                                key={perm}
                                onClick={() => togglePermission(user, perm)}
                                disabled={savingId === user.id}
                                className="text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
                                style={
                                  active
                                    ? { background: "#EFF6FF", color: "#0B3D91", borderColor: "#BFDBFE" }
                                    : { background: "#F8FAFC", color: "#64748B", borderColor: "#E2E8F0" }
                                }
                                aria-pressed={active}
                              >
                                {active ? "✓ " : ""}{PERMISSION_LABELS[perm]}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add user dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <User size={15} className="text-zinc-400" />
              Tambah Karyawan Baru
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-name" className="text-sm font-medium">Nama Lengkap</Label>
              <Input
                id="new-name"
                placeholder="contoh: Andi Pratama"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-10"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-email" className="text-sm font-medium">Email</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="andi@ega.co.id"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm font-medium">Password</Label>
              <Input
                id="new-password"
                type="text"
                placeholder="password untuk login"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="h-10 font-mono"
                required
              />
              <p className="text-xs text-zinc-400">Password disimpan sebagai teks biasa (mockup).</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Akses Fitur</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_PERMISSIONS.map((perm) => {
                  const active = form.permissions.includes(perm);
                  return (
                    <button
                      key={perm}
                      type="button"
                      onClick={() => toggleFormPermission(perm)}
                      className="text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
                      style={
                        active
                          ? { background: "#EFF6FF", color: "#0B3D91", borderColor: "#BFDBFE" }
                          : { background: "#F8FAFC", color: "#64748B", borderColor: "#E2E8F0" }
                      }
                      aria-pressed={active}
                    >
                      {active ? "✓ " : ""}{PERMISSION_LABELS[perm]}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => { setDialogOpen(false); setForm(EMPTY_FORM); }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="h-10 bg-blue-900 hover:bg-blue-800 text-white"
                disabled={formLoading}
              >
                {formLoading ? <Loader2 size={14} className="animate-spin" /> : "Tambahkan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
