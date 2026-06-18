"use client";

import { cn } from "@/lib/utils";

import { type StatKey, STAT_COLOR_CLASS } from "../stat-types";
import { type StatBoosts } from "../use-calc-state";

// =============================================================================
// Constants
// =============================================================================

/** The 5 stat keys that carry boosts (no HP). statKey maps to the per-stat
 *  color class shared with the hexagon spoke labels. */
const BOOST_STATS: {
  key: keyof StatBoosts;
  statKey: StatKey;
  label: string;
}[] = [
  { key: "atk", statKey: "attack", label: "ATK" },
  { key: "def", statKey: "defense", label: "DEF" },
  { key: "spa", statKey: "specialAttack", label: "SPA" },
  { key: "spd", statKey: "specialDefense", label: "SPD" },
  { key: "spe", statKey: "speed", label: "SPE" },
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
 * Single non-wrapping row: a fixed 5-column grid (one stepper per column),
 * centered. Steppers are compact (size-6 buttons) so all five fit one line
 * inside the stats card.
 */
export function StatBoostsRow({
  boosts,
  onChange,
  className,
}: StatBoostsRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-5 items-center justify-items-center gap-1",
        className
      )}
    >
      {BOOST_STATS.map(({ key, statKey, label }) => {
        const value = boosts[key] ?? 0;
        const atMin = value <= MIN_STAGE;
        const atMax = value >= MAX_STAGE;

        return (
          <div key={key} className="flex flex-col items-center gap-0.5">
            {/* Stat label — same per-stat color as the hexagon spoke labels */}
            <span
              className={cn(
                "font-mono text-xs leading-none font-semibold tracking-[0.06em] uppercase",
                STAT_COLOR_CLASS[statKey]
              )}
            >
              {label}
            </span>

            {/* − value + stepper — compact so 5 fit one line */}
            <div className="flex items-center">
              {/* Decrement button */}
              <button
                type="button"
                onClick={() => onChange(key, Math.max(MIN_STAGE, value - 1))}
                disabled={atMin}
                aria-label={`Decrease ${label} stage`}
                className={cn(
                  "flex size-6 items-center justify-center rounded-l border font-mono text-sm leading-none",
                  "border-border bg-card transition-colors",
                  "hover:enabled:bg-muted active:enabled:bg-muted/80",
                  "disabled:cursor-not-allowed disabled:opacity-30"
                )}
              >
                {/* Proper minus glyph */}
                &#x2212;
              </button>

              {/* Value display */}
              <span
                className={cn(
                  "border-border bg-card flex size-6 items-center justify-center border-y text-center font-mono text-xs leading-none font-semibold tabular-nums",
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
                  "flex size-6 items-center justify-center rounded-r border font-mono text-sm leading-none",
                  "border-border bg-card transition-colors",
                  "hover:enabled:bg-muted active:enabled:bg-muted/80",
                  "disabled:cursor-not-allowed disabled:opacity-30"
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
