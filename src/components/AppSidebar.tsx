"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BookOpen,
  Users,
  Tag,
  ClipboardList,
  Settings2,
  Unplug,
  CheckCircle2,
  ChevronRight,
  Zap,
} from "lucide-react";
import { clearConnection } from "@/lib/connection";
import type { AccurateConnection } from "@/lib/connection";

interface AppSidebarProps {
  connection: AccurateConnection;
}

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Beranda",       icon: LayoutDashboard },
      { href: "/transaksi", label: "Transaksi AP",  icon: ArrowLeftRight  },
    ],
  },
  {
    label: "Master Data",
    items: [
      { href: "/coa",    label: "Master COA",    icon: BookOpen },
      { href: "/vendor", label: "Master Vendor", icon: Users    },
    ],
  },
  {
    label: "Konfigurasi",
    items: [
      { href: "/keyword-mapping", label: "Keyword Mapping", icon: Tag           },
      { href: "/audit-log",       label: "Audit Log",        icon: ClipboardList },
      { href: "/settings",        label: "Pengaturan",       icon: Settings2     },
    ],
  },
];

export function AppSidebar({ connection }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  function handleDisconnect() {
    clearConnection();
    router.push("/connect");
  }

  return (
    <aside
      className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col"
      style={{
        background: "#F7F3EC",
        borderRight: "1px solid #E8E0D0",
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: "1px solid #E8E0D0" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#E8F5F3", border: "1px solid #B2DED9" }}
          >
            <Zap size={13} className="text-teal-600" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight block" style={{ color: "#1C1917" }}>
              AP Validation
            </span>
            <span className="text-[10px] font-mono" style={{ color: "#A8A097" }}>
              BNI → Accurate Online
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label ?? "main"}>
            {group.label && (
              <p
                className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "#B0A89A" }}
              >
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 outline-none"
                    style={{
                      color: active ? "#1C1917" : "#78716C",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "#EDE8DF";
                        (e.currentTarget as HTMLElement).style.color = "#1C1917";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "";
                        (e.currentTarget as HTMLElement).style.color = "#78716C";
                      }
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg"
                        style={{ background: "#EDE8DF" }}
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    <Icon
                      size={15}
                      className="relative z-10 flex-shrink-0 transition-colors duration-100"
                      style={{ color: active ? "#0F766E" : "#A8A097" }}
                      aria-hidden="true"
                    />
                    <span className="relative z-10 flex-1">{label}</span>
                    {active && (
                      <ChevronRight
                        size={12}
                        className="relative z-10"
                        style={{ color: "#B0A89A" }}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Connection status */}
      <div className="px-3 py-4 space-y-3" style={{ borderTop: "1px solid #E8E0D0" }}>
        <div className="flex items-start gap-2.5">
          <CheckCircle2 size={14} className="text-teal-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "#44403C" }}>
              {connection.companyName}
            </p>
            <p className="text-[10px] truncate mt-0.5" style={{ color: "#A8A097" }}>
              {connection.userEmail}
            </p>
          </div>
        </div>

        <button
          onClick={handleDisconnect}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 outline-none"
          style={{ color: "#A8A097" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#DC2626";
            (e.currentTarget as HTMLElement).style.background = "#FEF2F2";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#A8A097";
            (e.currentTarget as HTMLElement).style.background = "";
          }}
          aria-label="Putuskan koneksi dari Accurate Online"
        >
          <Unplug size={12} aria-hidden="true" />
          Putuskan koneksi
        </button>
      </div>
    </aside>
  );
}
