"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { label: "Admin",    email: "admin@ega.co.id", pass: "admin123", role: "Super Admin" },
  { label: "Karyawan", email: "budi@ega.co.id",  pass: "budi123",  role: "Transaksi AP" },
  { label: "Karyawan", email: "sari@ega.co.id",  pass: "sari123",  role: "Transaksi + Keyword" },
];

function LoginForm() {
  const params = useSearchParams();
  const from = params.get("from") ?? "/transaksi";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/app-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Login gagal.");
        return;
      }
      // Hard navigation: root layout reads the session cookie server-side,
      // and a client-side router.replace would keep serving the stale
      // (logged-out) layout since it's shared across soft navigations.
      // `from` must be an internal app page — reject /login (redirect loop)
      // and /api/* (e.g. a stale Accurate OAuth callback URL left in the
      // address bar), which aren't pages a logged-in user should land on.
      const isSafeTarget = from.startsWith("/") && !from.startsWith("/login") && !from.startsWith("/api/");
      const target = isSafeTarget ? from : "/transaksi";

      if (data.accurateStatus === "error") {
        // The proactive refresh attempted during login (see
        // /api/app-auth/login) already failed — refresh_token itself is
        // dead, not just the access_token, so no automatic retry can fix
        // this. Send the user straight into Accurate's OAuth login instead
        // of dropping them into the app with a broken Accurate connection;
        // `from` round-trips through the OAuth `state` param so they land
        // back on `target` once reconnected (see /api/auth/callback).
        toast.warning("Sesi Accurate perlu disambungkan ulang — mengarahkan ke login Accurate…", {
          description: data.accurateError,
          duration: 5000,
        });
        window.location.href = `/api/auth/login?from=${encodeURIComponent(target)}`;
        return;
      }

      window.location.href = target;
    } catch {
      toast.error("Koneksi ke server gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
      <div className="w-full max-w-sm px-4">
        <div
          className="bg-white rounded-2xl shadow-sm px-8 py-10 space-y-7"
          style={{ border: "1px solid #E2E8F0" }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
            >
              <Zap size={18} className="text-blue-600" />
            </div>
            <div className="text-center">
              <h1 className="text-base font-semibold text-zinc-900">AP Validation</h1>
              <p className="text-xs text-slate-400 mt-0.5">PT Ega Accurate Indonesia</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-sm font-medium text-zinc-700">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="nama@ega.co.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
                style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password" className="text-sm font-medium text-zinc-700">
                Password
              </Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
                style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10 bg-blue-900 hover:bg-blue-800 text-white"
              disabled={loading}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Masuk"}
            </Button>
          </form>

          {/* Demo accounts */}
          <div
            className="rounded-xl px-4 py-3 space-y-2"
            style={{ background: "#F1F5F9", border: "1px solid #EFF6FF" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#94A3B8" }}>
              Akun Demo
            </p>
            <div className="space-y-0.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className="w-full text-left rounded-lg px-3 py-2 transition-colors flex items-center justify-between gap-2"
                  style={{ color: "#334155" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#EFF6FF")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "")}
                  onClick={() => { setEmail(acc.email); setPassword(acc.pass); }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium shrink-0">{acc.label}</span>
                    <span className="text-[10px] font-mono truncate" style={{ color: "#64748B" }}>
                      {acc.email}
                    </span>
                  </div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                    style={{ background: "#EFF6FF", color: "#0B3D91" }}
                  >
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
