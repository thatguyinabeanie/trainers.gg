import { type FormatUsageTimeseriesPoint } from "@trainers/supabase";

// =============================================================================
// Types
// =============================================================================

/** A single species' aligned trajectory across the period axis. */
export interface UsageSeries {
  species: string;
  /**
   * usage_pct per period, aligned to the shared period axis.
   * Periods where the species had no data are filled with 0.
   */
  values: number[];
  /** Max value across the series — used for threshold filtering and ordering. */
  peak: number;
  /** Stable display color expressed as an OKLCH CSS string. */
  color: string;
}

// =============================================================================
// Color assignment
// =============================================================================

/**
 * Deterministic OKLCH color for a species.
 *
 * Hashes the species name to a hue angle in [0, 360) by summing char codes
 * modulo 360. Returns `oklch(0.66 0.12 <hue>)`.
 *
 * Color is keyed off the species name — NOT position — so toggling the
 * threshold never shifts existing series colors.
 */
export function assignColor(species: string): string {
  let sum = 0;
  for (let i = 0; i < species.length; i++) {
    sum += species.charCodeAt(i);
  }
  const hue = sum % 360;
  return `oklch(0.66 0.12 ${hue})`;
}

// =============================================================================
// Series construction
// =============================================================================

/**
 * Pivot period buckets into one aligned series per species.
 *
 * - Collects the union of all species names across every point.
 * - For each species, `values[i] = points[i].usage[species] ?? 0`.
 * - `peak` is the maximum value in `values`.
 * - `color` is assigned via `assignColor(species)` — stable per name.
 *
 * Returns series sorted by `peak` descending (stable, deterministic).
 * Returns `[]` when `points` is empty.
 */
export function buildUsageSeries(
  points: FormatUsageTimeseriesPoint[]
): UsageSeries[] {
  if (points.length === 0) return [];

  // Collect the union of all species across every period bucket.
  const speciesSet = new Set<string>();
  for (const point of points) {
    for (const species of Object.keys(point.usage)) {
      speciesSet.add(species);
    }
  }

  const series: UsageSeries[] = [];

  for (const species of speciesSet) {
    const values = points.map((p) => p.usage[species] ?? 0);
    const peak = Math.max(...values);
    series.push({
      species,
      values,
      peak,
      color: assignColor(species),
    });
  }

  // Sort by peak descending; use species name as tiebreaker for stability.
  series.sort((a, b) => b.peak - a.peak || a.species.localeCompare(b.species));

  return series;
}

// =============================================================================
// Filtering
// =============================================================================

/**
 * Drop series whose `peak` is below `threshold` (percentage points).
 *
 * Retains series whose peak is exactly equal to the threshold.
 * `threshold` defaults to 1.
 */
export function filterByThreshold(
  series: UsageSeries[],
  threshold = 1
): UsageSeries[] {
  return series.filter((s) => s.peak >= threshold);
}

// =============================================================================
// Ordering
// =============================================================================

/**
 * Inside-out (streamgraph) ordering.
 *
 * Sorts by `peak` descending, then alternately places each series into a
 * left or right bucket. Returns `left.reverse().concat(right)` so the
 * highest-peak series ends up in the centre of the stack — the visual
 * "inside-out" effect that gives streamgraphs their wave shape.
 *
 * Re-sorts defensively so callers needn't pre-sort — passing an already
 * peak-desc sorted array is safe and produces the same result.
 *
 * Does NOT mutate the input array. Returns a new array of the same length.
 */
export function insideOutOrder(series: UsageSeries[]): UsageSeries[] {
  // Sort by peak desc, name asc for ties — must not mutate input.
  const sorted = [...series].sort(
    (a, b) => b.peak - a.peak || a.species.localeCompare(b.species)
  );

  const left: UsageSeries[] = [];
  const right: UsageSeries[] = [];

  sorted.forEach((s, i) => {
    if (i % 2 === 0) {
      right.push(s);
    } else {
      left.push(s);
    }
  });

  return left.reverse().concat(right);
}
