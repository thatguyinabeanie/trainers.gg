"use client";

import { cn } from "@/lib/utils";

export interface StatusTab {
  /** Filter value written to the active-status state ("all" = no filter). */
  value: string;
  label: string;
  count: number;
  /** "skipped" renders slate (inert), not teal/red. */
  tone?: "default" | "skipped";
}

interface StatusTabsProps {
  tabs: StatusTab[];
  active: string;
  onChange: (value: string) => void;
}

/**
 * Horizontal status tab row for the import console. Replaces the status
 * dropdown — each tab shows a live count and the active tab is highlighted.
 * Scrolls horizontally on small screens (mobile-responsiveness rule).
 */
export function StatusTabs({ tabs, active, onChange }: StatusTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter by status"
      className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        const isSkipped = tab.tone === "skipped";
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors sm:h-8",
              isActive
                ? isSkipped
                  ? "bg-slate-500/15 text-slate-700 dark:text-slate-300"
                  : "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {isSkipped && <span aria-hidden>⊘</span>}
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums",
                isActive
                  ? isSkipped
                    ? "bg-slate-500/20 text-slate-700 dark:text-slate-300"
                    : "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
