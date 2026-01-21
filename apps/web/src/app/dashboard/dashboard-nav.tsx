"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

const tabs = [
  { href: "/dashboard/overview", label: "Overview" },
  {
    href: "/dashboard/invitations",
    label: "Invitations",
    icon: Mail,
    showCount: true,
  },
  { href: "/dashboard/history", label: "History" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/profiles", label: "Profiles" },
  { href: "/dashboard/organizations", label: "Organizations" },
];

export function DashboardNav() {
  const pathname = usePathname();

  // Fetch invitation count for badge
  const invitations = useQuery(
    api.tournaments.invitations.getTournamentInvitationsReceived,
    {}
  );

  const pendingCount =
    invitations?.filter(
      (inv) => inv.status === "pending" && !inv.isExpired
    ).length ?? 0;

  return (
    <nav className="mb-6 border-b bg-transparent p-0">
      <div className="flex gap-0">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const count = tab.showCount ? pendingCount : undefined;

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
              {tab.icon && <tab.icon className="h-4 w-4" />}
              {tab.label}
              {count !== undefined && count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
