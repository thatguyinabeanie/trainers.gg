"use client";

import { type StatBoosts } from "../use-calc-state";
import { cn } from "@/lib/utils";

// =============================================================================
// Constants
// =============================================================================

/** The 5 stat keys that carry boosts (no HP). */
const BOOST_STATS: { key: keyof StatBoosts; label: string }[] = [
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "spa", label: "SPA" },
  { key: "spd", label: "SPD" },
  { key: "spe", label: "SPE" },
];

/** Stage range clamped to −6…+6. */
const MIN_STAGE = -6;
const MAX_STAGE = 6;

// =============================================================================
// Helpers
// =============================================================================

/** Format a stage value for display: `+2`, `0`, `−1` (proper minus glyph). */
function formatStage(v: number): string {
  if (v > 0) return `+${v}`;
  if (v < 0) return `−${Math.abs(v)}`; // U+2212 MINUS SIGN
  return "0";
}

// =============================================================================
// Types
// =============================================================================

export interface StatBoostsRowProps {
  boosts: StatBoosts;
  onChange: (stat: keyof StatBoosts, value: number) => void;
  className?: string;
}

// =============================================================================
// StatBoostsRow
// =============================================================================

/**
 * Compact row of 5 stat-stage steppers (ATK/DEF/SPA/SPD/SPE), each −6…+6.
 *
 * Reuses the stage-value color convention from StageDropdown:
 * - positive → teal (primary)
 * - negative → rose (destructive)
 * - zero     → muted
 *
 * Designed to fit inside a stats card; wraps gracefully at 360 px.
 * Tap targets on +/− buttons are ≥40 px (min-w-10 min-h-10).
 */
export function StatBoostsRow({
  boosts,
  onChange,
  className,
}: StatBoostsRowProps) {
  return (
    <div className={cn("flex flex-wrap gap-x-2 gap-y-1.5", className)}>
      {BOOST_STATS.map(({ key, label }) => {
        const value = boosts[key] ?? 0;
        const atMin = value <= MIN_STAGE;
        const atMax = value >= MAX_STAGE;

        return (
          <div key={key} className="flex min-w-0 flex-col items-center gap-0.5">
            {/* Stat label */}
            <span className="text-muted-foreground font-mono text-xs leading-none font-semibold tracking-[0.06em] uppercase">
              {label}
            </span>

            {/* − value + stepper */}
            <div className="flex items-center">
              {/* Decrement button */}
              <button
                type="button"
                onClick={() => onChange(key, Math.max(MIN_STAGE, value - 1))}
                disabled={atMin}
                aria-label={`Decrease ${label} stage`}
                className={cn(
                  // ≥40px tap target on mobile
                  "flex min-h-10 min-w-10 items-center justify-center rounded-l border font-mono text-sm leading-none",
                  "border-border bg-card transition-colors",
                  "hover:enabled:bg-muted active:enabled:bg-muted/80",
                  "disabled:cursor-not-allowed disabled:opacity-30",
                  // Shrink on sm+ where more space is available
                  "sm:min-h-7 sm:min-w-7"
                )}
              >
                {/* Proper minus glyph */}
                &#x2212;
              </button>

              {/* Value display */}
              <span
                className={cn(
                  "border-border bg-card w-9 border-y py-0 text-center font-mono text-xs leading-none font-semibold tabular-nums",
                  // min-h matching the button tap target
                  "flex min-h-10 items-center justify-center",
                  "sm:min-h-7",
                  value > 0 && "text-primary border-primary/30 bg-primary/5",
                  value < 0 &&
                    "border-rose-300/50 bg-rose-50 text-rose-600 dark:border-rose-800/50 dark:bg-rose-950/20 dark:text-rose-400",
                  value === 0 && "text-muted-foreground"
                )}
                aria-live="polite"
                aria-label={`${label} stage ${formatStage(value)}`}
              >
                {formatStage(value)}
              </span>

              {/* Increment button */}
              <button
                type="button"
                onClick={() => onChange(key, Math.min(MAX_STAGE, value + 1))}
                disabled={atMax}
                aria-label={`Increase ${label} stage`}
                className={cn(
                  "flex min-h-10 min-w-10 items-center justify-center rounded-r border font-mono text-sm leading-none",
                  "border-border bg-card transition-colors",
                  "hover:enabled:bg-muted active:enabled:bg-muted/80",
                  "disabled:cursor-not-allowed disabled:opacity-30",
                  "sm:min-h-7 sm:min-w-7"
                )}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
