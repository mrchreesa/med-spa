"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Activity,
  BarChart3,
  Brain,
  Search,
  AlertTriangle,
  Server,
  ArrowLeft,
  Cpu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Health",
    items: [
      { name: "Overview", href: "/dev/overview", icon: Activity },
      { name: "System", href: "/dev/system", icon: Server },
    ],
  },
  {
    label: "AI Performance",
    items: [
      { name: "LLM", href: "/dev/llm", icon: Cpu },
      { name: "Agent", href: "/dev/agent", icon: Brain },
      { name: "RAG", href: "/dev/rag", icon: Search },
      { name: "Escalations", href: "/dev/escalations", icon: AlertTriangle },
    ],
  },
];

export function DevSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex w-64 flex-col shrink-0 h-full overflow-clip transition-colors duration-200"
      style={{ backgroundColor: "var(--sidebar)", color: "var(--sidebar-text)" }}
    >
      {/* Branding */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--sidebar-active-bg)" }}
          >
            <BarChart3 className="h-4.5 w-4.5" style={{ color: "var(--sidebar-active)" }} />
          </div>
          <div>
            <h1
              className="text-sm font-semibold tracking-wide"
              style={{ fontFamily: "var(--font-display), Georgia, serif", color: "var(--sidebar-text)" }}
            >
              DEV DASHBOARD
            </h1>
            <p
              className="text-[10px] tracking-[0.15em] uppercase"
              style={{ color: "var(--sidebar-muted)" }}
            >
              Agent Health
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-clip px-3 py-2 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p
              className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--sidebar-muted)" }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "sidebar-nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      isActive && "sidebar-nav-active border-l-2 -ml-[2px]"
                    )}
                    style={{
                      color: isActive ? "var(--sidebar-active)" : "var(--sidebar-text)",
                      backgroundColor: isActive ? "var(--sidebar-active-bg)" : undefined,
                      borderColor: isActive ? "var(--sidebar-active)" : undefined,
                      opacity: isActive ? 1 : 0.9,
                    }}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{ color: isActive ? "var(--sidebar-active)" : undefined }}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Back to Dashboard */}
      <div className="px-3 pb-2">
        <Link
          href="/analytics"
          className="sidebar-nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150"
          style={{ color: "var(--sidebar-text)", opacity: 0.9 }}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div
        className="flex items-center justify-end px-5 py-4"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <ThemeToggle />
      </div>
    </aside>
  );
}
