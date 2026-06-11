"use client";

import { cn } from "@/lib/utils";
import { type DisplayStatus, type StatusCounts } from "@trainers/supabase/queries";

const CHIPS: { value: DisplayStatus; label: string }[] = [
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
  { value: "complete", label: "Complete" },
];

interface StatusChipsProps {
  counts: StatusCounts;
  active: DisplayStatus;
  onChange: (next: DisplayStatus) => void;
}

/** Count chips that double as the single filter for the event list below. */
export function StatusChips({ counts, active, onChange }: StatusChipsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter events by status"
      className="flex flex-wrap items-center gap-2"
    >
      {CHIPS.map((chip) => {
        const isActive = chip.value === active;
        return (
          <button
            key={chip.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(chip.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {chip.label}
            <span
              className={cn(
                "rounded-md px-1.5 text-xs font-medium",
                isActive ? "bg-primary-foreground/20" : "bg-background/60"
              )}
            >
              {counts[chip.value].toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
