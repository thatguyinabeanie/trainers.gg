/**
 * Cached data-fetching function for tournament player stats.
 *
 * ## Why `createServiceRoleClient()` inside `'use cache'` (§0.2 rationale)
 *
 * `reviewing-caching` forbids authenticated/cookie clients inside a `'use cache'`
 * scope because per-user cookies vary and would poison the shared cache entry.
 * **Service-role does not vary per user** — it is a single constant identity that
 * bypasses RLS entirely. Using it inside `'use cache'` is therefore safe for
 * S-bucket public data, which is "the same for all viewers" by definition.
 *
 * After Phase 2 Task 9 Step 4 revokes `SELECT … FROM anon, authenticated` on the
 * `tournament_player_stats` and `alts` base tables, `createStaticClient()` (anon
 * key) would silently return zero rows. `createServiceRoleClient()` bypasses the
 * grant check, so the read keeps working and the cache remains correct and shared.
 *
 * The cache key (function arguments = tournamentId) is unchanged by the client
 * swap. The `'use cache'` wrapper, `cacheTag()`, and `cacheLife()` are kept
 * exactly as-is — swapping the key does not affect the cache identity.
 *
 * Tournament player-stats rows are public S-bucket data (standings, match records,
 * alt usernames) — no PII is cached.
 *
 * Consumers: `manage/tournament-standings.tsx`, `manage/tournament-overview.tsx`,
 * `create-tournament-client.tsx` — all auth-gated, served via
 * `GET /api/v1/tournaments/[id]/player-stats`.
 */

import { cacheTag, cacheLife } from "next/cache";

import { getPublicTournamentPlayerStats } from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

/**
 * A single player-stats row with its joined alt — the shape
 * `getPublicTournamentPlayerStats` returns (public-allowlist variant, omitting
 * `standings_need_recalc`, `opponent_history`, and `last_tiebreaker_update`).
 */
export type TournamentPlayerStatsRow = Awaited<
  ReturnType<typeof getPublicTournamentPlayerStats>
>[number];

/**
 * Options mirroring `getTournamentPlayerStats` options.
 */
export interface CachedPlayerStatsOptions {
  /** When true, dropped players are included. Default: false. */
  includeDropped?: boolean;
}

/**
 * Cached fetch of all player stats for one tournament.
 *
 * Uses `createServiceRoleClient()` inside `'use cache'` — see file-level JSDoc
 * for the §0.2 safety rationale. The service-role key bypasses the RLS/GRANT
 * denial that would occur after Phase 2 Step 4 revokes anon SELECT on the
 * `tournament_player_stats` and `alts` base tables.
 *
 * @param tournamentId - Numeric tournament id (validated by the caller —
 *   a `NaN` must produce a 404 at the route boundary, never reach this cache).
 * @param options - Optional filter flags forwarded to the query.
 */
export async function getCachedTournamentPlayerStats(
  tournamentId: number,
  options: CachedPlayerStatsOptions = {}
): Promise<TournamentPlayerStatsRow[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  // Service-role: bypasses anon/authenticated GRANT revoke while keeping cache
  // shared and correct (service-role is a constant, not per-user). See §0.2.
  // Public-allowlist variant: omits standings_need_recalc, opponent_history,
  // last_tiebreaker_update — internal recalculation state not needed for display.
  const supabase = createServiceRoleClient();
  return getPublicTournamentPlayerStats(supabase, tournamentId, options);
}
