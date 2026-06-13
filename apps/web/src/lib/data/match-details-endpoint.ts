/**
 * Cached data-fetching function for a single match's details.
 *
 * Backs `GET /api/v1/matches/[matchId]`, consumed by the match-report dialog
 * (`components/tournament/match-report-dialog.tsx`) after Phase 2 Task 9 (T3o)
 * repoints it off the browser anon client (`useSupabaseQuery(getMatchDetails)`).
 *
 * ## Why `createServiceRoleClient()` inside `'use cache'` (§0.2 rationale)
 *
 * `reviewing-caching` forbids authenticated/cookie clients inside a `'use cache'`
 * scope because per-user cookies vary and would poison the shared cache entry.
 * **Service-role does not vary per user** — it is a single constant identity that
 * bypasses RLS entirely. The match-detail shape is public S-bucket data: the same
 * players, scores, round name, and tournament name already render on the public
 * bracket. No PII is cached.
 *
 * `getMatchDetails` joins `alts`, `tournament_phases`, and `tournaments` — all in
 * the Step-4 revoke set. After the revoke, `createStaticClient()` (anon key) would
 * silently return zero rows. `createServiceRoleClient()` bypasses the grant, so the
 * read keeps working and the cache stays correct and shared.
 *
 * ## Cache tag
 *
 * Match details bust together with the rest of the tournament cache via
 * `CacheTags.tournament(tournamentId)` — the SAME tag that
 * `invalidateTournamentCaches(id)` / `revalidateTag(CacheTags.tournament(id), 'max')`
 * fire on any match/round change (e.g. when a result is reported). The tournament
 * id is read from the resolved match (a match always belongs to a tournament), so
 * no extra round-trip is needed to know which tag to attach.
 */

import { cacheTag, cacheLife } from "next/cache";

import { getMatchDetails, type MatchDetails } from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

/**
 * Cached fetch of a single match's full detail shape.
 *
 * Uses `createServiceRoleClient()` inside `'use cache'` — see the file-level
 * JSDoc for the §0.2 safety rationale. Returns `null` when the match does not
 * exist (the caller maps that to a 404).
 *
 * @param matchId - Numeric match id (validated by the caller — a `NaN` must
 *   produce a 404 at the route boundary, never reach this cache).
 */
export async function getCachedMatchDetails(
  matchId: number
): Promise<MatchDetails | null> {
  "use cache";
  cacheLife("max");

  // Service-role: bypasses the anon/authenticated GRANT revoke on the joined
  // `alts` / `tournament_phases` / `tournaments` tables while keeping the cache
  // shared and correct (constant identity, not per-user). See §0.2.
  const supabase = createServiceRoleClient();
  const details = await getMatchDetails(supabase, matchId);
  if (!details) return null;

  // Tag on the owning tournament so reporting a result (which busts
  // `CacheTags.tournament(id)` via `invalidateTournamentCaches`) refreshes this
  // match entry too. A match always belongs to a tournament, so this is the
  // correct invalidation handle — no dedicated per-match tag is needed.
  if (details.tournament?.id != null) {
    cacheTag(CacheTags.tournament(details.tournament.id));
  }

  return details;
}
