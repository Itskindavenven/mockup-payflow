"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Database, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveConnection, getConnection } from "@/lib/connection";

const STEPS = [
  { label: "Menghubungkan ke server Accurate Online...", duration: 1100 },
  { label: "Mengautentikasi kredensial OAuth 2.0...", duration: 1300 },
  { label: "Mengambil data master vendor & COA...", duration: 1500 },
  { label: "Menyinkronkan daftar invoice outstanding...", duration: 900 },
];

type Phase = "idle" | "connecting" | "done";

export default function ConnectPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (getConnection()) router.replace("/dashboard");
  }, [router]);

  async function startConnect() {
    setPhase("connecting");
    setCurrentStep(0);
    setCompletedSteps([]);

    for (let i = 0; i < STEPS.length; i++) {
      setCurrentStep(i);
      await wait(STEPS[i].duration);
      setCompletedSteps((prev) => [...prev, i]);
    }

    saveConnection({
      companyName: "PT Ega Accurate Indonesia",
      userEmail: "finance@ega-accurate.id",
      connectedAt: new Date().toISOString(),
      accessToken: "mock_token_" + Math.random().toString(36).slice(2),
    });

    setPhase("done");
    await wait(700);
    router.push("/dashboard");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#F1F5F9" }}
    >
      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
          >
            <Zap size={20} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#0F172A" }}>
            AP Validation
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "#475569" }}>
            e-Statement BNI → Accurate Online
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          <div className="p-6">
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "#EFF6FF", border: "1px solid #DBEAFE" }}
                    >
                      <Database size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm" style={{ color: "#0F172A" }}>
                        Hubungkan ke Accurate Online
                      </h2>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: "#475569" }}>
                        Autentikasi via OAuth 2.0. Sistem akan membaca data master
                        vendor, COA, dan invoice outstanding dari akun Accurate Anda.
                      </p>
                    </div>
                  </div>

                  <div
                    className="rounded-xl divide-y overflow-hidden"
                    style={{ border: "1px solid #EFF6FF" }}
                  >
                    {[
                      { label: "Data vendor & supplier",   desc: "Untuk pencocokan nama di description" },
                      { label: "Chart of Account (COA)",   desc: "Untuk mapping biaya operasional"       },
                      { label: "Invoice outstanding",       desc: "Untuk cek status sebelum push"         },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="px-4 py-3 flex gap-3 items-start"
                        style={{ borderBottom: "1px solid #EFF6FF" }}
                      >
                        <CheckCircle2 size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium" style={{ color: "#0F172A" }}>{item.label}</span>
                          <span className="text-xs block mt-0.5" style={{ color: "#64748B" }}>{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="rounded-lg px-4 py-3 text-xs"
                    style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E" }}
                  >
                    <span className="font-semibold">Demo mode.</span>{" "}
                    Tidak ada koneksi API nyata — semua data adalah mock/simulasi.
                  </div>

                  <Button
                    className="w-full h-11 text-sm font-semibold gap-2 rounded-xl"
                    style={{ background: "#0B3D91", color: "#FFFFFF" }}
                    onClick={startConnect}
                    aria-label="Mulai proses koneksi ke Accurate Online"
                  >
                    Hubungkan ke Accurate
                    <ArrowRight size={15} aria-hidden="true" />
                  </Button>
                </motion.div>
              )}

              {(phase === "connecting" || phase === "done") && (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center pb-2">
                    <p className="text-sm font-medium" style={{ color: "#334155" }}>
                      {phase === "done" ? "Berhasil terhubung!" : "Menghubungkan ke Accurate..."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {STEPS.map((step, i) => {
                      const isDone = completedSteps.includes(i);
                      const isActive = currentStep === i && !isDone;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08, duration: 0.25, ease: "easeOut" }}
                          className="flex items-center gap-3 py-1.5"
                        >
                          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {isDone ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle2 size={14} className="text-blue-500" />
                              </motion.div>
                            ) : isActive ? (
                              <Loader2 size={14} className="animate-spin" style={{ color: "#475569" }} />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#CBD5E1" }} />
                            )}
                          </div>
                          <span
                            className="text-sm transition-colors duration-200"
                            style={{
                              color: isDone ? "#64748B" : isActive ? "#0F172A" : "#94A3B8",
                            }}
                          >
                            {step.label}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  {phase === "done" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pt-2 text-center flex items-center justify-center gap-1.5"
                    >
                      <Loader2 size={12} className="animate-spin text-blue-500" />
                      <span className="text-xs" style={{ color: "#475569" }}>
                        Menyiapkan dashboard...
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs mt-6"
          style={{ color: "#94A3B8" }}
        >
          Fase 1 · Mockup interaktif · Belum ada koneksi API production
        </motion.p>
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
