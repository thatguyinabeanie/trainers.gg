/**
 * Cached data-fetching function for tournament standings.
 *
 * This is the Phase 2 caching-spike fetcher (the GATE pattern every later
 * S-bucket read endpoint copies). It mirrors `apps/web/src/lib/data/usage-cache.ts`:
 *
 * - `'use cache'` keys the cache on the function arguments automatically — the
 *   tournamentId is the sole distinguishing value, so it must be a parameter.
 * - `cacheTag(CacheTags.tournament(id))` reuses the EXISTING tournament tag, so
 *   standings bust together with every other tournament cache when
 *   `invalidateTournamentListCaches(id)` / `revalidateTag(CacheTags.tournament(id), 'max')`
 *   fires on a registration/round/standings change. No new tag is needed.
 * - `cacheLife("max")` because standings are a tag-invalidated entity — they
 *   never need time-based revalidation; an explicit tag bust is the only thing
 *   that should refresh them.
 * - `createServiceRoleClient()` is used INSIDE the cache scope (Phase 2 Task 9
 *   mechanical swap — see `docs/decisions/architecture-phase2-task9-revoke-plan.md`
 *   §0.2). Standings are public S-bucket data — identical for every viewer — so
 *   this is safe: service-role is a constant identity (not per-user), so it does
 *   not vary the cache key. Using it here makes the fetch survive the upcoming
 *   `REVOKE SELECT ... FROM anon, authenticated` on S-bucket base tables.
 *   The authenticated check (cookie or Bearer) happens OUTSIDE this scope, in
 *   the route handler. Do NOT revert this to `createStaticClient()` — that would
 *   silently return zero rows once the grant revoke lands.
 *
 * Standings rows are public (rank, record, joined alt) — no PII is cached.
 */

import { cacheTag, cacheLife } from "next/cache";

import { getTournamentStandings } from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

/** A single standings row with its joined alt — the shape `getTournamentStandings` returns. */
export type TournamentStandingRow = Awaited<
  ReturnType<typeof getTournamentStandings>
>[number];

/**
 * Cached fetch of the full ranked standings for one tournament.
 *
 * @param tournamentId - Numeric tournament id (validated by the caller before
 *   reaching this function — a `NaN` should produce a 404 at the route boundary,
 *   never reach the cache).
 */
export async function getCachedTournamentStandings(
  tournamentId: number
): Promise<TournamentStandingRow[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getTournamentStandings(supabase, tournamentId);
}
