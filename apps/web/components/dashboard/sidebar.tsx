"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/lib/theme-context";
import {
  BarChart3,
  Users,
  MessageSquare,
  AlertTriangle,
  BookOpen,
  Settings,
  Sparkles,
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
    label: "Overview",
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    items: [
      { name: "Leads", href: "/leads", icon: Users },
      { name: "Conversations", href: "/conversations", icon: MessageSquare },
      { name: "Escalations", href: "/escalations", icon: AlertTriangle },
    ],
  },
  {
    label: "Content",
    items: [
      { name: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
    ],
  },
];

function useClerkAppearance() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return {
    baseTheme: isDark ? dark : undefined,
    elements: {
      // Org switcher trigger — explicit text color for sidebar contrast
      organizationSwitcherTrigger:
        isDark
          ? "rounded-lg text-sm text-[#E8E2DB]"
          : "rounded-lg text-sm text-[#2D2926]",
      organizationSwitcherTriggerIcon:
        isDark ? "text-[#A39E9A]" : "text-[#5C5855]",
      // Popover / dropdown (rendered via portal at body level — match page theme)
      organizationSwitcherPopoverCard:
        isDark
          ? "bg-[#2D2926] border-[#3A3533] text-[#F3EDE7]"
          : "",
      // User button
      userButtonAvatarBox: "w-8 h-8",
      userButtonTrigger: "hover:opacity-80",
      userButtonOuterIdentifier:
        isDark ? "text-[#E8E2DB]" : "text-[#2D2926]",
      // User button popover
      userButtonPopoverCard:
        isDark ? "bg-[#2D2926] border-[#3A3533]" : "",
      userButtonPopoverActionButton:
        isDark ? "text-[#F3EDE7] hover:bg-[#3A3533]" : "",
      userButtonPopoverActionButtonText:
        isDark ? "text-[#F3EDE7]" : "",
      userButtonPopoverActionButtonIcon:
        isDark ? "text-[#A39E9A]" : "",
      userButtonPopoverFooter:
        isDark ? "hidden" : "",
    },
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const clerkAppearance = useClerkAppearance();

  return (
    <aside
      className="flex w-64 flex-col shrink-0 h-full overflow-clip transition-colors duration-200"
      style={{ backgroundColor: "var(--sidebar)", color: "var(--sidebar-text)" }}
    >
      {/* Branding */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--sidebar-active-bg)" }}
          >
            <Sparkles className="h-4.5 w-4.5" style={{ color: "var(--sidebar-active)" }} />
          </div>
          <div>
            <h1
              className="text-sm font-semibold tracking-wide"
              style={{ fontFamily: "var(--font-display), Georgia, serif", color: "var(--sidebar-text)" }}
            >
              MED SPA
            </h1>
            <p
              className="text-[10px] tracking-[0.15em] uppercase"
              style={{ color: "var(--sidebar-muted)" }}
            >
              Concierge
            </p>
          </div>
        </div>
        <OrganizationSwitcher appearance={clerkAppearance} />
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

      {/* Settings link + Footer */}
      <div className="px-3 pb-2">
        <Link
          href="/settings"
          className={cn(
            "sidebar-nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
            pathname === "/settings" && "sidebar-nav-active border-l-2 -ml-[2px]"
          )}
          style={{
            color: pathname === "/settings" ? "var(--sidebar-active)" : "var(--sidebar-text)",
            backgroundColor: pathname === "/settings" ? "var(--sidebar-active-bg)" : undefined,
            borderColor: pathname === "/settings" ? "var(--sidebar-active)" : undefined,
            opacity: pathname === "/settings" ? 1 : 0.9,
          }}
        >
          <Settings
            className="h-4 w-4 shrink-0"
            style={{ color: pathname === "/settings" ? "var(--sidebar-active)" : undefined }}
          />
          <span>Settings</span>
        </Link>
      </div>

      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <UserButton
          afterSignOutUrl="/sign-in"
          showName
          appearance={clerkAppearance}
        />
        <ThemeToggle />
      </div>
    </aside>
  );
}
