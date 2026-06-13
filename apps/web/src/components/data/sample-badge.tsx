import { cn } from "@/lib/utils";

// =============================================================================
// Sample thresholds — shared across all /data surfaces
// =============================================================================

/**
 * Below this player count, a surface shows the `SampleBadge` as a warning.
 * Chosen to match the `DEFAULT_MIN_PLAYERS` (100) used by the sidebar; surfaces
 * with fewer players than this floor are considered "low sample".
 */
export const LOW_SAMPLE_THRESHOLD = 100;

/**
 * Below this count the badge uses a more prominent color to flag very thin data.
 * Under 30 players the aggregates are statistically unreliable.
 */
export const VERY_LOW_SAMPLE_THRESHOLD = 30;

// =============================================================================
// SampleBadge
// =============================================================================

interface SampleBadgeProps {
  /** Number of players in the sample. */
  n: number;
  className?: string;
}

/**
 * Inline pill displayed when a usage surface has a thin player sample.
 *
 * - `n >= LOW_SAMPLE_THRESHOLD` → renders nothing (sample is healthy).
 * - `LOW_SAMPLE_THRESHOLD > n >= VERY_LOW_SAMPLE_THRESHOLD` → muted teal pill.
 * - `n < VERY_LOW_SAMPLE_THRESHOLD` → amber pill (stronger warning).
 *
 * WCAG AA: all text/background combinations use OKLCH tokens that meet
 * at least 4.5:1 contrast ratio. The amber variant uses `text-amber-700
 * dark:text-amber-400` against a light amber background for a readable
 * low-contrast warning without an aggressive red.
 */
export function SampleBadge({ n, className }: SampleBadgeProps) {
  // Healthy sample — render nothing so the badge doesn't add noise.
  if (n >= LOW_SAMPLE_THRESHOLD) return null;

  const isVeryLow = n < VERY_LOW_SAMPLE_THRESHOLD;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        isVeryLow
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-primary/10 text-primary",
        className
      )}
      title={
        isVeryLow
          ? `Very low sample: only ${n} players. Treat these stats with caution.`
          : `Low sample: ${n} players. Results may not be representative.`
      }
    >
      {isVeryLow ? "Very low" : "Low"} sample (n={n.toLocaleString()})
    </span>
  );
}
