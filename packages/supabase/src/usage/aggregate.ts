/**
 * Pure aggregation helpers for computing per-event Pokemon usage statistics.
 *
 * WHY pure functions: The math must be unit-testable without any DB or
 * framework dependencies. The DB I/O layer (mutations/usage.ts) calls
 * aggregateEventUsage() and owns all Supabase interaction.
 *
 * Species Clause: at most one instance of a species per team is enforced by
 * deduplicating on (teamKey, species) before counting.
 */

// =============================================================================
// Input / output types
// =============================================================================

/** One Pokemon slot on one team, normalized from any source. */
export interface TeamMonInput {
  /** Unique identifier for the team within the event (standing id or registration id, as string). */
  teamKey: string;
  /** Age division from RK9; null for Limitless and first-party events. */
  division: string | null;
  /** Normalized species slug (e.g. 'calyrex-ice-rider'). */
  species: string;
  /** Ability name; null if unknown or absent. */
  ability: string | null;
  /** Held item slug; null if unknown or absent. */
  heldItem: string | null;
  /** Nature (stat alignment); null if unknown, absent, or not captured by source. */
  nature: string | null;
  /** Tera type; null if not applicable (e.g. pre-Scarlet/Violet formats). */
  teraType: string | null;
  /** 0–4 move slugs, already filtered of null/empty values. */
  moves: string[];
}

/** Histogram entry: one value and how many times it appears. */
export interface HistogramEntry {
  /** The value (move name, tera type, or item name). */
  v: string;
  /** Count of occurrences. */
  n: number;
}

/**
 * Histogram sorted by n desc, then v asc.
 * Using a type alias here instead of `HistogramEntry[]` so callers can read
 * the alias name and understand the shape contract at a glance.
 */
export type UsageHistogram = HistogramEntry[];

/** The details breakdown for a species at one event+division. */
export interface UsageDetails {
  moves: UsageHistogram;
  tera: UsageHistogram;
  item: UsageHistogram;
  ability: UsageHistogram;
  nature: UsageHistogram;
}

/** One row to be written to the event_usage table. */
export interface EventUsageRow {
  /** Age division ('masters'|'senior'|'junior') or null. */
  division: string | null;
  /** Normalized species slug. */
  species: string;
  /** Distinct teams (in this division) running this species. */
  teamCount: number;
  /**
   * Distinct teams in this division (denominator for usage %).
   * Same value for every species row in a given division.
   */
  sampleSize: number;
  /** Per-species histogram breakdowns. */
  details: UsageDetails;
}

// =============================================================================
// Private helpers
// =============================================================================

/**
 * Build a sorted histogram from an array of values.
 * null/empty values are skipped. Sorted by count desc, then value asc.
 */
function buildHistogram(values: (string | null | undefined)[]): UsageHistogram {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (v == null || v === "") continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([v, n]) => ({ v, n }))
    .sort((a, b) => b.n - a.n || a.v.localeCompare(b.v));
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Aggregate a flat list of team-mon inputs into event_usage rows.
 *
 * Rules:
 * - Groups by division first, then species within division.
 * - sampleSize = distinct teamKey values within a division (denominator).
 *   All species rows in the same division share the same sampleSize.
 * - teamCount = distinct teamKey values within a division that have this species.
 * - Species Clause: deduplicates on (teamKey, species) so at most one
 *   occurrence of a species per team is counted (matches game rules).
 * - Histogram values are aggregated across all instances of the species.
 *   null/empty heldItem and teraType values are omitted from histograms.
 *
 * @param mons - Flat list of Pokemon slots from all teams in one event.
 * @returns One EventUsageRow per (division, species) pair, or [] on empty input.
 */
export function aggregateEventUsage(mons: TeamMonInput[]): EventUsageRow[] {
  if (mons.length === 0) return [];

  // Normalize division: null is a valid division (Limitless / first-party).
  // We group with the string key "null" and convert back when building rows.
  const NULL_DIV = "\0null\0"; // sentinel that cannot appear in real division values

  function divKey(d: string | null): string {
    return d ?? NULL_DIV;
  }

  // Step 1: Collect all unique teamKeys per division (for sampleSize).
  // Map<divisionKey, Set<teamKey>>
  const teamsByDiv = new Map<string, Set<string>>();

  for (const mon of mons) {
    const dk = divKey(mon.division);
    if (!teamsByDiv.has(dk)) teamsByDiv.set(dk, new Set());
    teamsByDiv.get(dk)!.add(mon.teamKey);
  }

  // Step 2: Deduplicate on (teamKey, division, species) to enforce Species Clause.
  // Map<divisionKey, Map<species, deduped mon instances>>
  const seenTeamSpecies = new Set<string>(); // "divKey|teamKey|species"
  const dedupedByDivSpecies = new Map<string, Map<string, TeamMonInput[]>>();

  for (const mon of mons) {
    const dk = divKey(mon.division);
    const dedupKey = `${dk}|${mon.teamKey}|${mon.species}`;

    if (seenTeamSpecies.has(dedupKey)) continue;
    seenTeamSpecies.add(dedupKey);

    if (!dedupedByDivSpecies.has(dk)) dedupedByDivSpecies.set(dk, new Map());
    const bySpecies = dedupedByDivSpecies.get(dk)!;
    if (!bySpecies.has(mon.species)) bySpecies.set(mon.species, []);
    bySpecies.get(mon.species)!.push(mon);
  }

  // Step 3: Build EventUsageRow for each (division, species) pair.
  const rows: EventUsageRow[] = [];

  for (const [dk, bySpecies] of dedupedByDivSpecies) {
    const division = dk === NULL_DIV ? null : dk;
    const sampleSize = teamsByDiv.get(dk)!.size;

    for (const [species, instances] of bySpecies) {
      // Collect the distinct teamKeys that have this species (for teamCount).
      const teamsWithSpecies = new Set(instances.map((m) => m.teamKey));

      // Flatten arrays for histogram building.
      const allMoves = instances.flatMap((m) => m.moves);
      const allTera = instances.map((m) => m.teraType);
      const allItems = instances.map((m) => m.heldItem);
      const allAbilities = instances.map((m) => m.ability);
      const allNatures = instances.map((m) => m.nature);

      rows.push({
        division,
        species,
        teamCount: teamsWithSpecies.size,
        sampleSize,
        details: {
          moves: buildHistogram(allMoves),
          tera: buildHistogram(allTera),
          item: buildHistogram(allItems),
          ability: buildHistogram(allAbilities),
          nature: buildHistogram(allNatures),
        },
      });
    }
  }

  return rows;
}
