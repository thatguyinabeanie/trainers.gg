"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface StageDropdownProps {
  /** Stat stage value in the range -6..+6. */
  value: number;
  onChange: (v: number) => void;
  /** Stat key short label (e.g. "atk", "def") — used for accessible label. */
  statKey: string;
}

// =============================================================================
// Constants
// =============================================================================

const STAGES = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;

// =============================================================================
// Helpers
// =============================================================================

function formatStage(v: number): string {
  if (v === 0) return "−";
  if (v > 0) return `+${v}`;
  return `${v}`;
}

// =============================================================================
// StageDropdown
// =============================================================================

/**
 * Champions-style compact stage dropdown.
 *
 * Trigger is a small pill button: `+2▾` (green), `−1▾` (red), `−▾` (neutral).
 * Clicking opens a popover with all 13 stages (−6 to +6).
 * The current value is highlighted with a checkmark.
 */
export function StageDropdown({
  value,
  onChange,
  statKey,
}: StageDropdownProps) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex w-full cursor-pointer items-center justify-center gap-0.5 rounded border px-1 py-0.5 font-mono text-xs font-semibold",
          value > 0 &&
            "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
          value < 0 &&
            "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
          value === 0 && "bg-card border-border text-muted-foreground"
        )}
        aria-label={`${statKey.toUpperCase()} stat stage`}
      >
        <span>{formatStage(value)}</span>
        <span className="text-xs opacity-70">▾</span>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-15 p-1">
        <div className="flex flex-col gap-px">
          {STAGES.map((s) => {
            const isCurrent = s === value;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded px-2 py-1 font-mono text-xs",
                  isCurrent
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span>{formatStage(s)}</span>
                {isCurrent && <span className="text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
