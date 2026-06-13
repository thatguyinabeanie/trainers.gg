/**
 * Cached data-fetching functions for tournament pairings.
 *
 * Two fetchers are exported:
 *
 *  - `getCachedTournamentPairings`       — full shape (all match columns).
 *    Used by the auth-gated `/api/v1/tournaments/[id]/pairings` route that
 *    serves the authenticated staff manage views (`tournament-pairings.tsx`,
 *    `tournament-pairings-judge.tsx`, `match-report-dialog.tsx`). Those views
 *    need `staff_requested`, `player1_match_confirmed`, etc.
 *
 *  - `getCachedPublicTournamentPairings` — public-allowlist shape (sensitive
 *    match columns omitted). Used by the SSR public page chain:
 *    `public-pairings.tsx` (server component) →
 *    `PublicPairingsView` (`"use client"` component that receives serialised
 *    props). Omitting sensitive columns prevents them from ever being
 *    serialised into a shared cache entry or sent to the browser.
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
 */

import { cacheTag, cacheLife } from "next/cache";

import {
  getTournamentPhases,
  getPhaseRoundsWithMatches,
  getPublicPhaseRoundsWithMatches,
  getPhaseRoundsWithStats,
  getUnpairedCheckedInPlayers,
} from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

// =============================================================================
// Shared row types
// =============================================================================

/** Type for a single phase returned by `getTournamentPhases`. */
export type TournamentPhaseRow = Awaited<
  ReturnType<typeof getTournamentPhases>
>[number];

/**
 * Type for a single per-phase rounds+matches array entry — FULL shape.
 * Used by `TournamentPairingsData` (the staff/API path).
 */
export type PhaseRoundsWithMatchesRow = Awaited<
  ReturnType<typeof getPhaseRoundsWithMatches>
>[number];

/**
 * Type for a single per-phase rounds+matches array entry — PUBLIC shape.
 * Sensitive match columns (staff_notes, ELO pre-match ratings, confirmation
 * flags) are omitted. Used by `PublicTournamentPairingsData` (the SSR/client path).
 */
export type PublicPhaseRoundsWithMatchesRow = Awaited<
  ReturnType<typeof getPublicPhaseRoundsWithMatches>
>[number];

/** Type for a single round-with-stats entry. */
export type PhaseRoundWithStatsRow = Awaited<
  ReturnType<typeof getPhaseRoundsWithStats>
>[number];

/** Type for a single unpaired player entry. */
export type UnpairedPlayerRow = Awaited<
  ReturnType<typeof getUnpairedCheckedInPlayers>
>[number];

// =============================================================================
// Full shape — for the auth-gated staff API route
// =============================================================================

/**
 * Full pairings shape returned by `getCachedTournamentPairings`.
 *
 * Includes all match columns (staff_notes, ELO pre-match ratings, confirmation
 * flags). Consumed by the auth-gated `/api/v1/tournaments/[id]/pairings` route
 * which serves the staff manage views.
 */
export interface TournamentPairingsData {
  /** All phases for the tournament, ordered by `phase_order`. */
  phases: TournamentPhaseRow[];
  /**
   * Per-phase rounds+matches arrays, index-aligned to `phases`.
   * Each entry is the FULL round-with-matches shape (all columns).
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

// =============================================================================
// Public shape — for the SSR / "use client" boundary
// =============================================================================

/**
 * Public pairings shape returned by `getCachedPublicTournamentPairings`.
 *
 * Mirrors `TournamentPairingsData` but uses the narrow `allPhaseRounds` type
 * that omits sensitive match columns. This is the shape that is serialised
 * across the server→client boundary to `PublicPairingsView`.
 *
 * Omitted from `tournament_matches`:
 *   staff_notes, staff_requested, staff_requested_at, staff_resolved_by,
 *   alt1_rating_before, alt1_overall_rating_before, alt1_games_before,
 *   alt2_rating_before, alt2_overall_rating_before, alt2_games_before,
 *   alt1_overall_games_before, alt2_overall_games_before,
 *   elo_applied, player1_match_confirmed, player2_match_confirmed,
 *   match_confirmed_at.
 */
export interface PublicTournamentPairingsData {
  /** All phases for the tournament, ordered by `phase_order`. */
  phases: TournamentPhaseRow[];
  /**
   * Per-phase rounds+matches arrays, index-aligned to `phases`.
   * Each entry uses the PUBLIC-allowlist round-with-matches shape.
   */
  allPhaseRounds: PublicPhaseRoundsWithMatchesRow[][];
  /** First-phase rounds with match-count stats. */
  roundsWithStats: PhaseRoundWithStatsRow[];
  /** Late-arrival alts not yet paired in the latest round. */
  unpairedPlayers: UnpairedPlayerRow[];
}

// =============================================================================
// Fetchers
// =============================================================================

/**
 * Cached fetch of the FULL pairings data set for one tournament.
 *
 * Bundles phases, rounds+matches (all columns — all phases), round stats
 * (first phase), and unpaired players into a single cached read keyed on
 * `tournamentId`.
 *
 * Consumed by the auth-gated `/api/v1/tournaments/[id]/pairings` route which
 * serves the staff manage views. Staff views need `staff_requested`,
 * `player1_match_confirmed`, `player2_match_confirmed`, etc.
 *
 * The service-role client bypasses RLS and grant restrictions — safe inside
 * `'use cache'` because the key is constant (not per-user).
 *
 * @param tournamentId - Numeric tournament id (validated by the caller —
 *   a `NaN` should produce a 404 at the route boundary, never reach the cache).
 */
export async function getCachedTournamentPairings(
  tournamentId: number
): Promise<TournamentPairingsData> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();

  const phases = await getTournamentPhases(supabase, tournamentId);

  if (phases.length === 0) {
    return { phases: [], allPhaseRounds: [], roundsWithStats: [], unpairedPlayers: [] };
  }

  const allPhaseRounds = await Promise.all(
    phases.map((phase) =>
      getPhaseRoundsWithMatches(supabase, phase.id, tournamentId)
    )
  );

  const firstPhaseId = phases[0]!.id;
  const roundsWithStats = await getPhaseRoundsWithStats(supabase, firstPhaseId);

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

/**
 * Cached fetch of the PUBLIC-ALLOWLIST pairings data set for one tournament.
 *
 * Mirrors `getCachedTournamentPairings` but uses `getPublicPhaseRoundsWithMatches`
 * so that sensitive match columns are never included in the cache entry or
 * serialised across the server→client boundary to `PublicPairingsView`.
 *
 * Use this fetcher exclusively for the SSR public page chain:
 *   `public-pairings.tsx` (server component) →
 *   `PublicPairingsView` (`"use client"` component).
 *
 * Sensitive columns omitted from `tournament_matches`:
 *   staff_notes, staff_requested, staff_requested_at, staff_resolved_by,
 *   alt*_rating_before, alt*_overall_rating_before, alt*_games_before,
 *   alt*_overall_games_before, elo_applied, player1/2_match_confirmed,
 *   match_confirmed_at.
 *
 * @param tournamentId - Numeric tournament id (validated by the caller before
 *   reaching this function — a `NaN` should produce a 404 at the route boundary,
 *   never reach the cache).
 */
export async function getCachedPublicTournamentPairings(
  tournamentId: number
): Promise<PublicTournamentPairingsData> {
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

  // 2. Fetch rounds+matches for ALL phases in parallel — use the public
  //    allowlist variant so no sensitive match columns (staff_notes, ELO
  //    pre-match ratings, confirmation flags) are serialised into the shared
  //    cache entry that is handed to the "use client" PublicPairingsView.
  const allPhaseRounds = await Promise.all(
    phases.map((phase) =>
      getPublicPhaseRoundsWithMatches(supabase, phase.id, tournamentId)
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
