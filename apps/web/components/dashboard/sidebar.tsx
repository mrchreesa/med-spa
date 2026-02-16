"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Leads", href: "/leads" },
  { name: "Conversations", href: "/conversations" },
  { name: "Escalations", href: "/escalations" },
  { name: "Analytics", href: "/analytics" },
  { name: "Knowledge Base", href: "/knowledge-base" },
  { name: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r bg-gray-50">
      <div className="border-b p-4">
        <h1 className="text-xl font-bold">Med Spa AI</h1>
        <div className="mt-2">
          <OrganizationSwitcher />
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm font-medium",
              pathname === item.href
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="border-t p-4">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </aside>
  );
}
