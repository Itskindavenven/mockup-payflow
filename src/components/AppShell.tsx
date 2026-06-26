"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { getConnection, AccurateConnection } from "@/lib/connection";
import { Loader2 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [conn, setConn] = useState<AccurateConnection | null | "loading">("loading");

  useEffect(() => {
    const c = getConnection();
    if (!c) {
      router.replace("/connect");
    } else {
      setConn(c);
    }
  }, [router]);

  if (conn === "loading" || conn === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F3EC" }}>
        <Loader2 size={20} className="animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#FAF7F2" }}>
      <AppSidebar connection={conn} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
