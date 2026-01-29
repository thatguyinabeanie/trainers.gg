"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Users,
  Settings,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TODashboardNavProps {
  orgSlug: string;
  isOwner: boolean;
}

export function TODashboardNav({ orgSlug, isOwner }: TODashboardNavProps) {
  const pathname = usePathname();

  const basePath = `/to-dashboard/${orgSlug}`;

  const tabs = [
    {
      href: basePath,
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: `${basePath}/tournaments`,
      label: "Tournaments",
      icon: Trophy,
    },
    {
      href: `${basePath}/staff`,
      label: "Staff",
      icon: Users,
    },
    {
      href: `${basePath}/settings`,
      label: "Settings",
      icon: Settings,
      ownerOnly: true,
    },
  ];

  // Filter out owner-only tabs if user is not owner
  const visibleTabs = tabs.filter((tab) => !tab.ownerOnly || isOwner);

  return (
    <nav className="flex items-center justify-between border-b bg-transparent p-0">
      {/* Scrollable tabs container */}
      <div className="relative min-w-0 flex-1">
        <div className="scrollbar-hide overflow-x-auto">
          <div className="flex min-w-max gap-0">
            {visibleTabs.map((tab) => {
              const isActive = tab.exact
                ? pathname === tab.href
                : pathname.startsWith(tab.href);
              const Icon = tab.icon;

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
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        {/* Fade indicator for more content */}
        <div className="from-background pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l to-transparent sm:hidden" />
      </div>

      <Link
        href={`/organizations/${orgSlug}`}
        target="_blank"
        className="shrink-0"
      >
        <Button variant="ghost" size="sm" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">View Public Page</span>
        </Button>
      </Link>
    </nav>
  );
}
