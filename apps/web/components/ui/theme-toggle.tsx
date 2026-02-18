"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`sidebar-nav-item flex items-center justify-center rounded-lg p-2 transition-colors ${className ?? ""}`}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-[var(--sidebar-text)]" />
      ) : (
        <Sun className="h-5 w-5 text-[var(--sidebar-text)]" />
      )}
    </button>
  );
}
