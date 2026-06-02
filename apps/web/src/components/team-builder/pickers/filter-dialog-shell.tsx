"use client";

import { type ReactNode, useState } from "react";
import { PanelLeftClose, Search } from "lucide-react";

import { cn } from "@/lib/utils";

interface FilterDialogShellProps {
  /** Optional search input rendered at the left of the header bar. */
  search?: {
    value: string;
    onChange: (next: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    placeholder?: string;
    "data-testid"?: string;
  };
  /** Optional center header slot (e.g. active-filter clear badge). */
  headerCenter?: ReactNode;
  /** Optional right header slot (e.g. "N of M" count). */
  headerCount?: ReactNode;
  /** Optional trailing header buttons (e.g. collapse-to-sidepane, close). */
  headerActions?: ReactNode;
  /** Expanded rail body (scrolls). */
  rail: ReactNode;
  /** Optional pinned rail footer (e.g. "Clear all filters"). */
  railFooter?: ReactNode;
  /** Collapsed-state icon strip; receives an expand callback. */
  collapsedStrip?: (onExpand: () => void) => ReactNode;
  /** Tailwind width class for the expanded rail. Defaults to 340px. */
  railWidthClass?: string;
  /** Main content (right region). */
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

/**
 * Reusable two-pane dialog body: a header bar + a collapsible left filter rail
 * + a main content region. Extracted from the species picker so the speed
 * tiers dialog (and future pickers) share the exact layout + collapse behavior.
 * The consumer owns all rail/main content; the shell owns layout + collapse.
 */
export function FilterDialogShell({
  search,
  headerCenter,
  headerCount,
  headerActions,
  rail,
  railFooter,
  collapsedStrip,
  railWidthClass = "w-[340px]",
  children,
  className,
  "data-testid": testId,
}: FilterDialogShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      className={cn(
        "bg-popover text-popover-foreground flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl",
        className
      )}
      data-testid={testId}
    >
      {/* Header bar */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        {search && (
          <>
            <Search className="text-muted-foreground size-4 shrink-0" />
            <input
              type="text"
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              onKeyDown={search.onKeyDown}
              aria-label={search.placeholder ?? "Search"}
              data-testid={search["data-testid"]}
              className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
            />
          </>
        )}
        {!search && <div className="flex-1" />}
        {headerCenter}
        {headerCount}
        {headerActions}
      </div>

      {/* Two-pane body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "border-border flex flex-shrink-0 flex-col border-r transition-[width] duration-200 ease-in-out",
            sidebarOpen ? railWidthClass : "w-12"
          )}
        >
          {sidebarOpen ? (
            <>
              <div className="border-border flex shrink-0 items-center justify-between border-b px-3 py-1.5">
                <span className="text-muted-foreground text-[9px] font-bold tracking-widest uppercase">
                  Filters
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Collapse filter sidebar"
                  className="text-muted-foreground hover:text-foreground -mr-1 rounded p-0.5 transition-colors"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {rail}
              </div>
              {railFooter && (
                <div className="border-border shrink-0 border-t px-3 py-2">
                  {railFooter}
                </div>
              )}
            </>
          ) : (
            collapsedStrip?.(() => setSidebarOpen(true))
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
