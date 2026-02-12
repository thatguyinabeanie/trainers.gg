"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const allTabs = [
  { href: "/dashboard/overview", label: "Overview" },
  { href: "/dashboard/alts", label: "Alts" },
  { href: "/dashboard/stats", label: "Stats", requiresFlag: true },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({ showStats = false }: { showStats?: boolean }) {
  const pathname = usePathname();

  const tabs = allTabs.filter((tab) => !tab.requiresFlag || showStats);

  return (
    <nav className="mb-6 border-b bg-transparent p-0">
      <div className="flex gap-0">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
