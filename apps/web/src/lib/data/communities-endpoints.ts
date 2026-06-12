/**
 * Cached data-fetching functions for community S-bucket endpoints.
 *
 * Follows the Phase 2 route-handler pattern established in `standings-endpoint.ts`:
 *
 *   route handler (auth + validation)  →  `'use cache'` fetcher  →  query wrapper
 *
 * CACHING STRATEGY:
 * - `cacheTag(CacheTags.community(slug), CacheTags.community(id))` ties cached
 *   entries to both the slug and numeric-ID tags so either form can bust the cache.
 * - `cacheTag(CacheTags.COMMUNITIES_LIST)` is added on the list endpoint so that
 *   any community mutation (new community, status change) busts the list.
 * - `cacheLife("max")` — community data is tag-invalidated; no time-based TTL.
 * - `createStaticClient()` (cookie-less, anonymous) inside cache scope — community
 *   pages are public S-bucket data, identical for every viewer. Auth check happens
 *   OUTSIDE in the route handler (no cookie must pollute the cache key).
 *
 * Cache invalidation is handled by the existing `invalidateCommunityPageCaches`
 * helper in `@/lib/cache-invalidation` — no new tags are needed.
 */

import { cacheTag, cacheLife } from "next/cache";

import {
  getCommunityBySlug,
  listCommunityStaffWithRoles,
  listCommunityTournaments,
} from "@trainers/supabase";

import { createStaticClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

// =============================================================================
// Type exports (derived from query return shapes)
// =============================================================================

/** Full community detail returned by `getCommunityBySlug`. */
export type CommunityDetail = Awaited<ReturnType<typeof getCommunityBySlug>>;

/** Staff member with role info returned by `listCommunityStaffWithRoles`. */
export type CommunityStaffMember = Awaited<
  ReturnType<typeof listCommunityStaffWithRoles>
>[number];

/** Paginated tournament list returned by `listCommunityTournaments`. */
export type CommunityTournamentsResult = Awaited<
  ReturnType<typeof listCommunityTournaments>
>;

// =============================================================================
// getCachedCommunityBySlug
// =============================================================================

/**
 * Cached fetch of a single community by its URL slug.
 *
 * Returns `null` when the community does not exist (no 404 — caller decides).
 *
 * @param slug - Community URL slug (validated by the route handler).
 */
export async function getCachedCommunityBySlug(
  slug: string
): Promise<CommunityDetail> {
  "use cache";
  cacheTag(CacheTags.COMMUNITIES_LIST, CacheTags.community(slug));
  cacheLife("max");

  const supabase = createStaticClient();
  return getCommunityBySlug(supabase, slug);
}

// =============================================================================
// getCachedCommunityStaff
// =============================================================================

/**
 * Cached fetch of community staff with their group/role assignments.
 *
 * @param communityId - Numeric community ID.
 * @param communitySlug - Community slug (added to cache tags so slug-based
 *   cache invalidation also busts this entry).
 */
export async function getCachedCommunityStaff(
  communityId: number,
  communitySlug: string
): Promise<CommunityStaffMember[]> {
  "use cache";
  cacheTag(
    CacheTags.community(communityId),
    CacheTags.community(communitySlug)
  );
  cacheLife("max");

  const supabase = createStaticClient();
  return listCommunityStaffWithRoles(supabase, communityId);
}

// =============================================================================
// getCachedCommunityTournaments
// =============================================================================

/**
 * Valid tournament status values for the community tournaments endpoint.
 * `"all"` is not a DB value — it means "no status filter".
 */
export type CommunityTournamentStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled";

/**
 * Cached fetch of a community's tournament list with optional status filter.
 *
 * @param communityId - Numeric community ID.
 * @param communitySlug - Community slug (for cache tag coverage).
 * @param status - Optional status filter; omit for all tournaments.
 * @param limit - Max results to return (default: 50).
 * @param offset - Pagination offset (default: 0).
 */
export async function getCachedCommunityTournaments(
  communityId: number,
  communitySlug: string,
  status: CommunityTournamentStatus | undefined,
  limit: number,
  offset: number
): Promise<CommunityTournamentsResult> {
  "use cache";
  // Tag both the community and its tournaments so either community or tournament
  // mutations can bust this list entry.
  cacheTag(
    CacheTags.community(communityId),
    CacheTags.community(communitySlug),
    CacheTags.TOURNAMENTS_LIST
  );
  cacheLife("max");

  const supabase = createStaticClient();
  return listCommunityTournaments(supabase, communityId, {
    status,
    limit,
    offset,
  });
}
