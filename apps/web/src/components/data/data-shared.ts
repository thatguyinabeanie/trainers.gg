import { type SourceUsageRow } from "@trainers/supabase";

// =============================================================================
// Source colors — one teal-family OKLCH hue per data source
// (mirrors COLUMN_COLORS style in usage-pipeline.ts)
// =============================================================================

/**
 * Distinguishable teal-family OKLCH colors keyed by data source.
 * Hue values are spaced to be perceptually distinct while staying within
 * the same teal/cyan family as the rest of the palette.
 */
export const SOURCE_COLORS: Record<
  "rk9" | "limitless" | "trainers.gg",
  string
> = {
  rk9: "oklch(0.66 0.12 180)",
  limitless: "oklch(0.66 0.12 210)",
  "trainers.gg": "oklch(0.66 0.12 240)",
};

// =============================================================================
// Source labels — human-readable names for each data source
// =============================================================================

export const SOURCE_LABELS: Record<
  "rk9" | "limitless" | "trainers.gg",
  string
> = {
  rk9: "RK9",
  limitless: "Limitless",
  "trainers.gg": "trainers.gg",
};

// =============================================================================
// SourceComparisonRow — per-species row grouping usage by source
// =============================================================================

/**
 * One species row for the source-comparison dumbbell chart.
 *
 * `bySource` contains the usage data for each source that has data for
 * this species; absent sources are omitted (Partial).
 *
 * `overallPeak` is the max `usagePct` across all sources — used for
 * row ordering and top-N capping.
 */
export interface SourceComparisonRow {
  species: string;
  bySource: Partial<
    Record<
      "rk9" | "limitless" | "trainers.gg",
      { usagePct: number; players: number }
    >
  >;
  /** Max usagePct across all sources — drives row ordering and top-N cap. */
  overallPeak: number;
}

// Re-export SourceUsageRow so chart siblings can import from one place
// without creating cross-sibling imports.
export type { SourceUsageRow };
