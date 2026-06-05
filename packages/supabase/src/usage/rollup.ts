/**
 * Pure time-bucketing and rollup helpers for Pokemon usage statistics.
 *
 * WHY pure functions: These time-bucketing and aggregation computations must
 * be unit-testable without any DB or framework dependencies. The DB
 * orchestration layer (mutations/usage.ts → computeUsageRollups) calls these
 * helpers and owns all Supabase interaction.
 *
 * DIVISION-AGNOSTIC: Rollups intentionally sum across all divisions within a
 * source. The event_usage table tracks per-division rows (for RK9), but the
 * rollup layer treats the tournament as one unit — the denominator
 * (sampleSize / totalTeams) is the count of teams across all divisions in
 * that event, not per-division.
 *
 * DISTINCT-KEY COUNTING: totalTeams counts distinct (source, eventKey,
 * division) tuples — each event-division pair contributes its own sampleSize
 * once. This prevents double-counting when the 'all' source combines rows
 * from multiple concrete sources that cover the same event.
 */

// =============================================================================
// Period bucketing
// =============================================================================

/** Time granularity for rollup buckets. */
export type PeriodType = "day" | "week" | "month";

/**
 * Return the start of the period bucket that contains `date` for the given
 * period type. All arithmetic is UTC.
 *
 * - 'day'   → the same date (ISO YYYY-MM-DD)
 * - 'week'  → the Monday on or before the date (ISO 8601 week starts Monday)
 * - 'month' → the 1st of the month
 *
 * @param date ISO date string 'YYYY-MM-DD'.
 * @param period The period granularity.
 * @returns ISO date string 'YYYY-MM-DD' for the period start.
 */
export function bucketStart(date: string, period: PeriodType): string {
  const d = new Date(`${date}T00:00:00Z`);
  switch (period) {
    case "day":
      return toIsoDate(d);
    case "week": {
      // getUTCDay() returns 0=Sun, 1=Mon, ..., 6=Sat
      // We want Monday as day 0 of the week.
      const dow = d.getUTCDay(); // 0–6
      const offsetToMonday = dow === 0 ? 6 : dow - 1;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - offsetToMonday);
      return toIsoDate(monday);
    }
    case "month": {
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1; // 1-based
      return `${String(year)}-${String(month).padStart(2, "0")}-01`;
    }
  }
}

/**
 * Return the last day (inclusive) of the bucket that starts at `periodStart`
 * for the given period type. All arithmetic is UTC.
 *
 * - 'day'   → same as periodStart
 * - 'week'  → 6 days after periodStart (Sunday)
 * - 'month' → last day of the month
 *
 * @param periodStart ISO date string 'YYYY-MM-DD' — must be a valid period start.
 * @param period The period granularity.
 * @returns ISO date string 'YYYY-MM-DD' for the period end (inclusive).
 */
export function bucketEnd(periodStart: string, period: PeriodType): string {
  const d = new Date(`${periodStart}T00:00:00Z`);
  switch (period) {
    case "day":
      return toIsoDate(d);
    case "week": {
      const sunday = new Date(d);
      sunday.setUTCDate(d.getUTCDate() + 6);
      return toIsoDate(sunday);
    }
    case "month": {
      // First day of next month minus one day
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth(); // 0-based
      const lastDay = new Date(Date.UTC(year, month + 1, 0)); // day 0 of next month = last day of this month
      return toIsoDate(lastDay);
    }
  }
}

/** Format a Date as 'YYYY-MM-DD' in UTC. */
function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${String(y)}-${m}-${day}`;
}

// =============================================================================
// Rollup types
// =============================================================================

/**
 * One event_usage row subset needed for rollup math.
 * Mapped from DB rows by the orchestration layer before calling rollupBucket.
 */
export interface FactRow {
  /** Concrete source: 'rk9' | 'limitless' | 'first_party'. */
  source: string;
  /** Composite event key, e.g. 'rk9:EVENT001'. */
  eventKey: string;
  /** Age division ('masters' | 'senior' | 'junior') or null for division-agnostic sources. */
  division: string | null;
  /** Normalized species slug. */
  species: string;
  /**
   * Number of teams carrying this species in this (source, eventKey, division) group.
   * Populated from event_usage.team_count.
   */
  teamCount: number;
  /**
   * Total teams in this (source, eventKey, division) group — the per-event denominator.
   * Populated from event_usage.sample_size.
   */
  sampleSize: number;
  /** Histogram breakdowns for the species at this event. */
  details: {
    moves: { v: string; n: number }[];
    tera: { v: string; n: number }[];
    item: { v: string; n: number }[];
    ability: { v: string; n: number }[];
    nature: { v: string; n: number }[];
  };
}

/** One entry in a detail histogram after rollup. */
export interface DetailEntry {
  /** The value (move name, tera type, or item name). */
  value: string;
  /** Absolute count (number of teams using this value). */
  count: number;
  /** Usage percentage = round(100 * count / speciesTeamCount, 2). */
  pct: number;
}

/** Per-species rollup output within one time bucket. */
export interface SpeciesRollup {
  species: string;
  /** Total teams running this species across all facts in the bucket. */
  teamCount: number;
  /** Usage percentage = round(100 * teamCount / totalTeams, 2). */
  usagePct: number;
  /** Dense rank by usagePct desc, tie-break species asc (1-indexed). */
  rank: number;
  moves: DetailEntry[];
  tera: DetailEntry[];
  item: DetailEntry[];
  ability: DetailEntry[];
  nature: DetailEntry[];
}

/** Aggregated rollup for one time bucket, ready for DB insertion. */
export interface BucketRollup {
  /**
   * Sum of sampleSize over distinct (source, eventKey, division) keys.
   * Each event-division denominator is counted exactly once.
   */
  totalTeams: number;
  /** Count of distinct (source, eventKey) pairs in the bucket. */
  totalTournaments: number;
  /** Per-species rollup rows, sorted by rank asc then species asc. */
  species: SpeciesRollup[];
}

// =============================================================================
// Histogram merging
// =============================================================================

/**
 * Merge multiple histograms by summing counts for equal values.
 * Returns entries sorted by n desc, then v asc (consistent with aggregate.ts).
 *
 * @param hists Array of histogram arrays from individual FactRows.
 * @returns Merged histogram.
 */
export function mergeHistogram(
  hists: { v: string; n: number }[][]
): { v: string; n: number }[] {
  const totals = new Map<string, number>();
  for (const hist of hists) {
    for (const { v, n } of hist) {
      totals.set(v, (totals.get(v) ?? 0) + n);
    }
  }
  return Array.from(totals.entries())
    .map(([v, n]) => ({ v, n }))
    .sort((a, b) => b.n - a.n || a.v.localeCompare(b.v));
}

// =============================================================================
// Bucket rollup
// =============================================================================

/**
 * Aggregate all FactRow entries that fall in ONE time bucket into a BucketRollup.
 *
 * Counting rules:
 * - totalTeams = SUM of sampleSize over DISTINCT (source, eventKey, division) keys.
 *   Each event-division denominator is counted once regardless of how many species
 *   rows come from that group. For 'all'-scope callers, source is part of the key,
 *   so the same event on two sources (rk9 + limitless) counts separately.
 * - totalTournaments = count of DISTINCT (source, eventKey) pairs.
 * - Per species: teamCount = SUM(teamCount) across all facts for that species.
 *   usagePct = round(100 * teamCount / totalTeams, 2).
 *   rank = dense rank by usagePct desc, tie-break species asc (1-indexed).
 * - Per species details: merge move/tera/item histograms via mergeHistogram,
 *   then compute pct = round(100 * count / speciesTeamCount, 2) (denominator =
 *   teams running the species), sorted by count desc, tie-break value asc.
 *
 * @param facts All FactRow entries for one (format, source, periodType, bucketStart).
 * @returns Aggregated BucketRollup.
 */
export function rollupBucket(facts: FactRow[]): BucketRollup {
  if (facts.length === 0) {
    return { totalTeams: 0, totalTournaments: 0, species: [] };
  }

  // ─── Step 1: compute denominators ─────────────────────────────────────────
  // totalTeams: SUM(sampleSize) over DISTINCT (source, eventKey, division)
  const seenEventDiv = new Map<string, number>(); // key → sampleSize
  for (const f of facts) {
    const key = `${f.source}|${f.eventKey}|${f.division ?? ""}`;
    if (!seenEventDiv.has(key)) {
      seenEventDiv.set(key, f.sampleSize);
    }
  }
  const totalTeams = Array.from(seenEventDiv.values()).reduce(
    (sum, s) => sum + s,
    0
  );

  // totalTournaments: DISTINCT (source, eventKey)
  const seenEvents = new Set<string>();
  for (const f of facts) {
    seenEvents.add(`${f.source}|${f.eventKey}`);
  }
  const totalTournaments = seenEvents.size;

  // ─── Step 2: per-species aggregation ─────────────────────────────────────
  // Map<species, FactRow[]>
  const bySpecies = new Map<string, FactRow[]>();
  for (const f of facts) {
    if (!bySpecies.has(f.species)) bySpecies.set(f.species, []);
    bySpecies.get(f.species)!.push(f);
  }

  const speciesRows: SpeciesRollup[] = [];

  for (const [species, speciesFacts] of bySpecies) {
    const teamCount = speciesFacts.reduce((sum, f) => sum + f.teamCount, 0);
    const usagePct =
      totalTeams > 0 ? Math.round((100 * teamCount * 100) / totalTeams) / 100 : 0;

    // Merge histograms across all facts for this species
    const mergedMoves = mergeHistogram(speciesFacts.map((f) => f.details.moves));
    const mergedTera = mergeHistogram(speciesFacts.map((f) => f.details.tera));
    const mergedItem = mergeHistogram(speciesFacts.map((f) => f.details.item));
    const mergedAbility = mergeHistogram(speciesFacts.map((f) => f.details.ability));
    const mergedNature = mergeHistogram(speciesFacts.map((f) => f.details.nature));

    // Convert to DetailEntry with pct (denominator = teams running the species)
    function toDetailEntries(
      hist: { v: string; n: number }[]
    ): DetailEntry[] {
      return hist.map(({ v, n }) => ({
        value: v,
        count: n,
        pct: teamCount > 0 ? Math.round((100 * n * 100) / teamCount) / 100 : 0,
      }));
    }

    speciesRows.push({
      species,
      teamCount,
      usagePct,
      rank: 0, // filled in below
      moves: toDetailEntries(mergedMoves),
      tera: toDetailEntries(mergedTera),
      item: toDetailEntries(mergedItem),
      ability: toDetailEntries(mergedAbility),
      nature: toDetailEntries(mergedNature),
    });
  }

  // ─── Step 3: assign dense ranks ─────────────────────────────────────────
  // Sort by usagePct desc, species asc for stable rank assignment
  speciesRows.sort(
    (a, b) => b.usagePct - a.usagePct || a.species.localeCompare(b.species)
  );

  let currentRank = 1;
  for (let i = 0; i < speciesRows.length; i++) {
    const row = speciesRows[i];
    const prev = speciesRows[i - 1];
    if (i > 0 && prev !== undefined && row !== undefined && row.usagePct === prev.usagePct) {
      // Same pct → same rank (dense rank: no gaps)
      row.rank = prev.rank;
    } else if (row !== undefined) {
      row.rank = currentRank;
    }
    currentRank = (row?.rank ?? currentRank) + 1;
  }

  return { totalTeams, totalTournaments, species: speciesRows };
}

// =============================================================================
// Delta computation
// =============================================================================

/**
 * Compute the signed percentage-point change between a current and prior usage
 * percentage.
 *
 * @param currentPct The current period's usage percentage.
 * @param priorPct The prior period's usage percentage, or null if unavailable.
 * @returns currentPct - priorPct rounded to 2 decimal places, or null when
 *   priorPct is null.
 */
export function computeDelta(
  currentPct: number,
  priorPct: number | null
): number | null {
  if (priorPct === null) return null;
  return Math.round((currentPct - priorPct) * 100) / 100;
}
