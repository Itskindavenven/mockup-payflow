"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
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
  Zap,
  LogOut,
  ShieldCheck,
  UserCog,
  FileBarChart2,
} from "lucide-react";
import { toast } from "sonner";
import { clearConnection } from "@/lib/connection";
import type { AccurateConnection } from "@/lib/connection";
import { useSession } from "@/components/session-provider";
import type { Permission } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  connection: AccurateConnection;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: Permission | "admin";
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard",  label: "Beranda",      icon: LayoutDashboard },
      { href: "/transaksi",  label: "Transaksi AP", icon: ArrowLeftRight,  permission: "transaksi" },
      { href: "/report",     label: "Report",       icon: FileBarChart2 },
    ],
  },
  {
    label: "Master Data",
    items: [
      { href: "/coa",    label: "Master COA",    icon: BookOpen, permission: "master-data" },
      { href: "/vendor", label: "Master Vendor", icon: Users,    permission: "master-data" },
    ],
  },
  {
    label: "Konfigurasi",
    items: [
      { href: "/keyword-mapping", label: "Keyword Mapping", icon: Tag,           permission: "keyword-mapping" },
      { href: "/audit-log",       label: "Audit Log",       icon: ClipboardList, permission: "audit-log" },
      { href: "/settings",        label: "Pengaturan",      icon: Settings2,     permission: "admin" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/users", label: "Manajemen Pengguna", icon: UserCog, permission: "admin" },
    ],
  },
];

export function AppSidebar({ connection }: AppSidebarProps) {
  const pathname = usePathname();
  const session  = useSession();

  function canAccess(item: NavItem): boolean {
    if (!session) return false;
    if (session.role === "admin") return true;
    if (!item.permission) return true;
    if (item.permission === "admin") return false;
    return session.permissions.includes(item.permission as Permission);
  }

  async function handleLogout() {
    try {
      await fetch("/api/app-auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    clearConnection();
    // Hard navigation so the root layout re-reads the (now-cleared) session cookie.
    window.location.href = "/login";
  }

  async function handleDisconnect() {
    try {
      await fetch("/api/app-auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    clearConnection();
    toast.info("Koneksi Accurate diputus.");
    window.location.href = "/login";
  }

  const initials = session?.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() ?? "??";

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white">
            <Zap size={15} className="text-sidebar" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold tracking-tight block text-white">
              AP Validation
            </span>
            <span className="text-[10px] font-mono text-sidebar-foreground/60">
              BNI → Accurate Online
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(canAccess);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label ?? "main"}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "group relative flex items-center gap-2.5 pl-2.5 pr-3 py-2.5 rounded-lg text-sm font-medium border-l-[3px] transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 outline-none",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground border-l-sidebar-ring"
                          : "border-l-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon
                        size={15}
                        className={cn(
                          "flex-shrink-0 transition-colors duration-100",
                          active ? "text-sidebar" : "text-sidebar-foreground/60 group-hover:text-white"
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex-1">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 space-y-2 border-t border-sidebar-border">
        {/* Accurate connection */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[10px] truncate text-sidebar-foreground/55">
              {connection.companyName}
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            title="Putuskan koneksi Accurate"
            className="p-1 rounded transition-colors focus-visible:ring-1 focus-visible:ring-red-400 outline-none flex-shrink-0 text-sidebar-foreground/40 hover:text-red-300"
            aria-label="Putuskan koneksi Accurate"
          >
            <Unplug size={11} />
          </button>
        </div>

        {/* User info */}
        {session && (
          <div className="rounded-xl px-3 py-2.5 space-y-2 bg-sidebar-accent">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold bg-white/15 text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate text-white">
                  {session.name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {session.role === "admin" ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-300">
                      <ShieldCheck size={10} />
                      Admin
                    </span>
                  ) : (
                    <span className="text-[10px] text-sidebar-foreground/55">Karyawan</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors focus-visible:ring-1 focus-visible:ring-red-400 outline-none text-sidebar-foreground/70 hover:bg-red-500/15 hover:text-red-200"
              aria-label="Keluar dari aplikasi"
            >
              <LogOut size={12} aria-hidden="true" />
              Keluar
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
