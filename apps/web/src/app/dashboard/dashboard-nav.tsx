"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const allTabs = [
  { href: "/dashboard/overview", label: "Overview" },
  { href: "/dashboard/alts", label: "Alts" },
  { href: "/dashboard/invitations", label: "Invitations" },
  { href: "/dashboard/stats", label: "Stats", requiresFlag: true },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({
  showStats = false,
  pendingInvitationsCount = 0,
}: {
  showStats?: boolean;
  pendingInvitationsCount?: number;
}) {
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
              {tab.href === "/dashboard/invitations" &&
                pendingInvitationsCount > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs leading-none">
                    {pendingInvitationsCount}
                  </span>
                )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
