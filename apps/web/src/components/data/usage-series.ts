import {
  type FormatUsageTimeseriesPoint,
  type SourceUsageRow,
  type SpeciesUsagePeriod,
} from "@trainers/supabase";

import { type SourceComparisonRow } from "./data-shared";

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

// =============================================================================
// Rank series (bump chart)
// =============================================================================

/** One species' aligned rank trajectory across the period axis. */
export interface RankSeries {
  species: string;
  /** Rank per period bucket (1 = most-used). null when absent that bucket. */
  ranks: (number | null)[];
  /** Stable display color via assignColor(). */
  color: string;
}

/** Result of buildRankSeries. */
export interface RankSeriesResult {
  /** One entry per species that reached top topN in the latest bucket. */
  series: RankSeries[];
  /** Aligned period labels (periodStart strings), one per bucket. */
  periods: string[];
}

/**
 * Build per-species rank arrays for a bump chart.
 *
 * - For each period bucket, species are ranked 1..N by usage descending.
 * - Only species that rank within the top `topN` in the **latest** bucket
 *   are retained — the bump chart shows who is relevant now.
 * - Species absent in a bucket get `null` (gap) rather than a rank.
 * - Colors are assigned via `assignColor(species)` — stable per name.
 *
 * Returns `{ series: [], periods: [] }` when `points` is empty.
 */
export function buildRankSeries(
  points: FormatUsageTimeseriesPoint[],
  topN: number
): RankSeriesResult {
  if (points.length === 0) return { series: [], periods: [] };

  const periods = points.map((p) => p.periodStart);

  // Build a rank map per bucket: Map<periodStart, Map<species, rank>>
  const bucketRanks: Map<string, Map<string, number>> = new Map();

  for (const point of points) {
    const sorted = Object.entries(point.usage).sort(([, a], [, b]) => b - a);
    const rankMap = new Map<string, number>();
    sorted.forEach(([species], i) => {
      rankMap.set(species, i + 1);
    });
    bucketRanks.set(point.periodStart, rankMap);
  }

  // Determine which species to include: those in top topN of the latest bucket.
  const latestPoint = points[points.length - 1]!;
  const latestRankMap = bucketRanks.get(latestPoint.periodStart)!;
  const qualifyingSpecies = new Set<string>();
  for (const [species, rank] of latestRankMap) {
    if (rank <= topN) qualifyingSpecies.add(species);
  }

  // Build aligned rank arrays for qualifying species.
  const series: RankSeries[] = [];
  for (const species of qualifyingSpecies) {
    const ranks: (number | null)[] = points.map((point) => {
      const rankMap = bucketRanks.get(point.periodStart);
      return rankMap?.get(species) ?? null;
    });
    series.push({ species, ranks, color: assignColor(species) });
  }

  // Sort by rank in the latest bucket (ascending = top rank first).
  series.sort((a, b) => {
    const aRank = a.ranks[a.ranks.length - 1] ?? Infinity;
    const bRank = b.ranks[b.ranks.length - 1] ?? Infinity;
    return aRank - bRank || a.species.localeCompare(b.species);
  });

  return { series, periods };
}

// =============================================================================
// Source grouping (dumbbell chart)
// =============================================================================

/**
 * Group flat `SourceUsageRow[]` into per-species rows for the dumbbell chart.
 *
 * - Fills `bySource[source] = { usagePct, players }` for each source present.
 * - `overallPeak` = max usagePct across all sources for this species.
 * - Result is sorted by `overallPeak` descending.
 */
export function groupBySource(rows: SourceUsageRow[]): SourceComparisonRow[] {
  const speciesMap = new Map<string, SourceComparisonRow>();

  for (const row of rows) {
    const source = row.source as "rk9" | "limitless" | "trainers.gg";
    let entry = speciesMap.get(row.species);
    if (!entry) {
      entry = { species: row.species, bySource: {}, overallPeak: 0 };
      speciesMap.set(row.species, entry);
    }
    entry.bySource[source] = { usagePct: row.usagePct, players: row.players };
    if (row.usagePct > entry.overallPeak) {
      entry.overallPeak = row.usagePct;
    }
  }

  return Array.from(speciesMap.values()).sort(
    (a, b) =>
      b.overallPeak - a.overallPeak || a.species.localeCompare(b.species)
  );
}

// =============================================================================
// Statistical helpers (scatter chart)
// =============================================================================

/**
 * Compute the median of a numeric array.
 *
 * - Sorts a copy (does not mutate the input).
 * - Returns the middle value for odd-length arrays.
 * - Returns the average of the two middle values for even-length arrays.
 * - Returns 0 for an empty array.
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// =============================================================================
// Single-species timeline adapter (Task 8 / Feature 5)
// =============================================================================

/**
 * Convert a species' detail-period buckets into the single-series
 * `FormatUsageTimeseriesPoint[]` shape that `UsageLineChart` consumes.
 *
 * Each element maps to one period bucket:
 * `{ periodStart, periodEnd, usage: { [species]: bucket.usagePct } }`
 *
 * Passing the result with `selectedSpecies={[species]}` renders exactly
 * one line scoped to that species. Pure — no framework dependencies.
 *
 * @param detail - Trailing period buckets from `getSpeciesUsageDetail`,
 *   ordered oldest → newest.
 * @param species - The species slug (used as the key in the usage map).
 */
export function detailBucketsToTimeseriesPoints(
  detail: SpeciesUsagePeriod[],
  species: string
): FormatUsageTimeseriesPoint[] {
  return detail.map((bucket) => ({
    periodStart: bucket.periodStart,
    periodEnd: bucket.periodEnd,
    usage: { [species]: bucket.usagePct },
  }));
}

// =============================================================================
// Radial ring layout (Task 7 / Feature 3)
// =============================================================================

/** A single bubble's position in the ring, expressed as percentages (0–100). */
export interface RingPosition {
  /** Horizontal center of the bubble, as a percentage of the container width. */
  x: number;
  /** Vertical center of the bubble, as a percentage of the container height. */
  y: number;
  /** Angle in degrees (0° = 12 o'clock, clockwise). */
  angle: number;
}

/**
 * Compute deterministic radial ring positions for N bubbles around a center.
 *
 * Angles are evenly spaced starting at 12 o'clock (−90° in unit-circle terms),
 * rotating clockwise. The returned `x`/`y` values are percentages relative to
 * a square container (0–100), so the component sets `left: x%`, `top: y%`.
 *
 * With `rings` > 1 (or when count > 12), bubbles are split across an inner
 * and outer ring: inner ≤ 8, outer = remainder. This keeps bubbles readable
 * while showing the full set.
 *
 * Pure trig — no external dependencies. Deterministic: same input → same output.
 *
 * @param count - Number of bubbles to place.
 * @param opts.rings - Force two-ring layout when `count` > 12. Default: auto
 *   (one ring for ≤12, two rings for >12).
 */
export function computeRingLayout(
  count: number,
  opts: { rings?: number } = {}
): RingPosition[] {
  if (count === 0) return [];

  const forceRings = opts.rings;
  const useDoubleRing =
    forceRings === 2 || (forceRings === undefined && count > 12);

  if (!useDoubleRing) {
    // Single ring — evenly spaced, starting at 12 o'clock.
    return Array.from({ length: count }, (_, i) => {
      const angleDeg = i * (360 / count) - 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      // Radius = 35% of the container so bubbles don't clip the edges.
      const radius = 35;
      const cx = 50;
      const cy = 50;
      return {
        x: cx + radius * Math.cos(angleRad),
        y: cy + radius * Math.sin(angleRad),
        angle: angleDeg + 90,
      };
    });
  }

  // Double ring — inner holds up to 8, outer holds the rest.
  const innerCount = Math.min(8, count);
  const outerCount = count - innerCount;

  const innerRadius = 25;
  const outerRadius = 40;

  const positions: RingPosition[] = [];

  for (let i = 0; i < innerCount; i++) {
    const angleDeg = i * (360 / innerCount) - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    positions.push({
      x: 50 + innerRadius * Math.cos(angleRad),
      y: 50 + innerRadius * Math.sin(angleRad),
      angle: angleDeg + 90,
    });
  }

  for (let i = 0; i < outerCount; i++) {
    const angleDeg = i * (360 / outerCount) - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    positions.push({
      x: 50 + outerRadius * Math.cos(angleRad),
      y: 50 + outerRadius * Math.sin(angleRad),
      angle: angleDeg + 90,
    });
  }

  return positions;
}

export type Quadrant = "proven" | "overrated" | "sleeper" | "fringe";

/**
 * Classify a species into a scatter-chart quadrant.
 *
 * Reference lines are the median usage and conversion of the full field:
 * - proven:    high usage + high conversion (both >= their median)
 * - overrated: high usage + low conversion
 * - sleeper:   low usage + high conversion
 * - fringe:    low usage + low conversion
 *
 * Values exactly equal to the median count as "high" (>= comparison).
 */
export function classifyQuadrant(
  usagePct: number,
  conversionPct: number,
  usageMedian: number,
  conversionMedian: number
): Quadrant {
  const highUsage = usagePct >= usageMedian;
  const highConversion = conversionPct >= conversionMedian;

  if (highUsage && highConversion) return "proven";
  if (highUsage && !highConversion) return "overrated";
  if (!highUsage && highConversion) return "sleeper";
  return "fringe";
}
