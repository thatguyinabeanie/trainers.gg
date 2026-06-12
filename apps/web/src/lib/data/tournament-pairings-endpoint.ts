/**
 * Cached data-fetching function for tournament pairings.
 *
 * This fetcher bundles the four queries that `public-pairings.tsx` makes
 * today via `useSupabaseQuery` into a single server-side cached read.
 *
 * ## Why `createServiceRoleClient()` inside `'use cache'`
 *
 * The `reviewing-caching` skill forbids **authenticated/cookie** clients inside a
 * `'use cache'` scope because cookies vary per user and would poison the shared
 * cache entry. **Service-role does not vary per user** — it is a single constant
 * identity. Using it inside `'use cache'` is therefore safe *for S-bucket public
 * data*, which is "the same for all viewers" by definition (that is what makes it
 * S-bucket). Pairings, phases, and rounds are public tournament data — no PII is
 * cached (player usernames are already public on the tournament page). After the
 * Phase 2 Task 9 revoke, the `anon` key loses SELECT on `tournament_phases`,
 * `tournament_rounds`, `tournament_matches`, `tournament_player_stats`, and `alts`,
 * so `createStaticClient()` would return 0 rows. The service-role key bypasses the
 * grant entirely, keeping the read correct after the revoke without changing the
 * cache key (function argument = tournamentId). See §0.2 of
 * `docs/decisions/architecture-phase2-task9-revoke-plan.md` for the authoritative
 * rationale.
 *
 * ## Cache tags
 *
 * `CacheTags.tournament(tournamentId)` is the EXISTING tournament tag, so pairings
 * bust together with standings and every other tournament cache entry when
 * `invalidateTournamentCaches(id)` / `revalidateTag(CacheTags.tournament(id), 'max')`
 * fires on a round/match change. No new tag is needed.
 *
 * ## Shape returned
 *
 * The response bundles the data currently fetched in four separate
 * `useSupabaseQuery` calls inside `public-pairings.tsx`:
 *
 *   - `phases`                 — ordered tournament phases
 *   - `allPhaseRounds`         — per-phase array of rounds+matches (bracket data)
 *   - `roundsWithStats`        — first-phase rounds with match-count stats
 *   - `unpairedPlayers`        — late-arrival alts not paired this round (may be [])
 *
 * The manage components (`tournament-pairings.tsx`, `tournament-pairings-judge.tsx`,
 * `match-report-dialog.tsx`) will later repoint onto this route (T3n). Their needs
 * are a superset of the public view, so this shape covers both.
 */

import { cacheTag, cacheLife } from "next/cache";

import {
  getTournamentPhases,
  getPhaseRoundsWithMatches,
  getPhaseRoundsWithStats,
  getUnpairedCheckedInPlayers,
} from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

/** Type for a single phase returned by `getTournamentPhases`. */
export type TournamentPhaseRow = Awaited<
  ReturnType<typeof getTournamentPhases>
>[number];

/** Type for a single per-phase rounds+matches array entry. */
export type PhaseRoundsWithMatchesRow = Awaited<
  ReturnType<typeof getPhaseRoundsWithMatches>
>[number];

/** Type for a single round-with-stats entry. */
export type PhaseRoundWithStatsRow = Awaited<
  ReturnType<typeof getPhaseRoundsWithStats>
>[number];

/** Type for a single unpaired player entry. */
export type UnpairedPlayerRow = Awaited<
  ReturnType<typeof getUnpairedCheckedInPlayers>
>[number];

/** Full shape returned by `getCachedTournamentPairings`. */
export interface TournamentPairingsData {
  /** All phases for the tournament, ordered by `phase_order`. */
  phases: TournamentPhaseRow[];
  /**
   * Per-phase rounds+matches arrays, index-aligned to `phases`.
   * Each entry is the full round-with-matches shape used by bracket visualisation.
   */
  allPhaseRounds: PhaseRoundsWithMatchesRow[][];
  /**
   * First-phase rounds enriched with match-count stats (total/completed/active/pending).
   * Empty array if there are no phases or no rounds yet.
   * Used to determine the "latest round" for the unpaired-players query.
   */
  roundsWithStats: PhaseRoundWithStatsRow[];
  /**
   * Alts that checked in but were not paired in the latest round (late arrivals).
   * Empty array when no latest round exists or all players are paired.
   */
  unpairedPlayers: UnpairedPlayerRow[];
}

/**
 * Cached fetch of the full pairings data set for one tournament.
 *
 * Bundles phases, rounds+matches (all phases), round stats (first phase), and
 * unpaired players into a single cached read keyed on `tournamentId`.
 *
 * The client that calls this function — `createServiceRoleClient()` — bypasses RLS
 * and grant restrictions. See the file-level JSDoc for the rationale; verify that
 * every field in the returned shape is genuinely public S-bucket data before using
 * this fetcher for a new entity type.
 *
 * @param tournamentId - Numeric tournament id (validated by the caller before
 *   reaching this function — a `NaN` should produce a 404 at the route boundary,
 *   never reach the cache).
 */
export async function getCachedTournamentPairings(
  tournamentId: number
): Promise<TournamentPairingsData> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  // Service-role client: bypasses anon/authenticated grant restrictions.
  // Safe inside 'use cache' because the key is constant (not per-user).
  const supabase = createServiceRoleClient();

  // 1. Fetch all phases in order.
  const phases = await getTournamentPhases(supabase, tournamentId);

  if (phases.length === 0) {
    return { phases: [], allPhaseRounds: [], roundsWithStats: [], unpairedPlayers: [] };
  }

  // 2. Fetch rounds+matches for ALL phases in parallel.
  const allPhaseRounds = await Promise.all(
    phases.map((phase) =>
      getPhaseRoundsWithMatches(supabase, phase.id, tournamentId)
    )
  );

  // 3. Fetch rounds-with-stats for the first phase only (used to find latest round).
  const firstPhaseId = phases[0]!.id;
  const roundsWithStats = await getPhaseRoundsWithStats(supabase, firstPhaseId);

  // 4. Find the latest round (active first, then last in list) to query unpaired players.
  const latestRound =
    roundsWithStats.find((r) => r.status === "active") ??
    (roundsWithStats.length > 0
      ? roundsWithStats[roundsWithStats.length - 1]!
      : null);

  const unpairedPlayers = latestRound
    ? await getUnpairedCheckedInPlayers(supabase, tournamentId, latestRound.id)
    : [];

  return { phases, allPhaseRounds, roundsWithStats, unpairedPlayers };
}
