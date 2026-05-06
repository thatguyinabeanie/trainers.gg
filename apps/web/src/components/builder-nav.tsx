"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TopNavAuthSection } from "@/components/topnav-auth-section";
import { NAV_LINKS } from "@/components/nav-links";

/**
 * Full-width top navigation for the /builder route.
 * Far left: "trainers.gg / Builder" breadcrumb with dropdown.
 * Center: workspace toolbar controls (passed as children).
 * Far right: Auth section (notifications, theme, user avatar).
 */

interface BuilderNavProps {
  children?: ReactNode;
}

export function BuilderNav({ children }: BuilderNavProps) {
  return (
    <header className="border-border/40 bg-background/95 supports-backdrop-filter:bg-background/60 relative z-50 w-full shrink-0 border-b pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="relative flex h-12 items-center px-4 md:px-6">
        {/* Far left: trainers.gg / Builder */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/" className="flex items-center">
            <span className="text-primary text-lg font-bold">trainers.gg</span>
          </Link>

          <span className="text-muted-foreground/50 text-sm">/</span>

          <DropdownMenu>
            <DropdownMenuTrigger className="text-foreground hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none">
              Builder
              <ChevronDown className="text-muted-foreground size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              className="min-w-40"
            >
              {NAV_LINKS.map((link) => (
                <DropdownMenuItem
                  key={link.href}
                  render={<Link href={link.href} className="w-full" />}
                >
                  {link.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center + Right: toolbar controls (uses internal absolute centering for name) */}
        <div className="flex min-w-0 flex-1 items-center">{children}</div>

        {/* Far right: Auth & Theme */}
        <div className="flex shrink-0 items-center">
          <TopNavAuthSection />
        </div>
      </div>
    </header>
  );
}
