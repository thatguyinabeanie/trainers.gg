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
 * - `createServiceRoleClient()` inside cache scope (Phase 2 Task 9 mechanical swap
 *   — see `docs/decisions/architecture-phase2-task9-revoke-plan.md` §0.2).
 *   Community pages are public S-bucket data — identical for every viewer — so
 *   service-role is safe here: it is a constant identity (not per-user) and does
 *   not vary the cache key. Using service-role makes these fetches survive the
 *   upcoming `REVOKE SELECT ... FROM anon, authenticated` on S-bucket base tables.
 *   Auth happens OUTSIDE in the route handler. Do NOT revert to `createStaticClient()`
 *   — that would silently return zero rows once the grant revoke lands.
 *
 * Cache invalidation is handled by the existing `invalidateCommunityPageCaches`
 * helper in `@/lib/cache-invalidation` — no new tags are needed.
 */

import { cacheTag, cacheLife } from "next/cache";

import {
  getCommunityBySlug,
  listCommunityStaffWithRoles,
  listCommunityTournaments,
  type TypedSupabaseClient,
} from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
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
 * Uses `createServiceRoleClient()` inside the `'use cache'` scope so reads of
 * S-bucket base tables (`communities`, `community_staff`, etc.) survive the
 * Phase 2 Task 9 `REVOKE SELECT ... FROM anon, authenticated`. Service-role is
 * a constant identity — it does not vary the cache key. Data is public S-bucket.
 *
 * @param slug - Community URL slug (validated by the route handler).
 */
export async function getCachedCommunityBySlug(
  slug: string
): Promise<CommunityDetail> {
  "use cache";
  cacheTag(CacheTags.COMMUNITIES_LIST, CacheTags.community(slug));
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getCommunityBySlug(supabase, slug);
}

// =============================================================================
// getCommunityStaff (REQUEST-SCOPED — NOT cached)
// =============================================================================

/**
 * Request-scoped fetch of community staff with their group/role assignments.
 *
 * SECURITY: this is the one community fetcher that is **deliberately NOT cached**.
 * The staff roster embeds `user.email` (PII), so it must never become a shared,
 * auth-unscoped cache entry — a CodeRabbit + security review flagged the previous
 * `'use cache'` + `createServiceRoleClient()` version as a PII-leak: any viewer's
 * response (with emails) could be replayed to every other caller.
 *
 * Instead, all non-PII reads use the **request-scoped, RLS-bound client** (the
 * `auth.supabase` from `resolveApiAuth`). PII enrichment (`get_users_pii` RPC,
 * auth.admin email lookup) uses a separate service-role client because both
 * operations require service_role EXECUTE. The route handler has already
 * authenticated (401), rate-limited (429), and permission-checked (403) the
 * caller before reaching here.
 *
 * Do NOT re-add `'use cache'`, `cacheTag`, or `cacheLife` here.
 *
 * @param supabase - Request-scoped client bound to the authenticated caller.
 * @param communityId - Numeric community ID.
 */
export async function getCommunityStaff(
  supabase: TypedSupabaseClient,
  communityId: number
): Promise<CommunityStaffMember[]> {
  // Service-role is required for PII enrichment (get_users_pii + auth.admin).
  const serviceSupabase = createServiceRoleClient();
  return listCommunityStaffWithRoles(supabase, communityId, serviceSupabase);
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
 * Uses `createServiceRoleClient()` inside the `'use cache'` scope so reads of
 * S-bucket base tables (`tournaments`, `communities`, `alts`, etc.) survive the
 * Phase 2 Task 9 `REVOKE SELECT ... FROM anon, authenticated`. Service-role is
 * a constant identity — it does not vary the cache key. Data is public S-bucket.
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

  const supabase = createServiceRoleClient();
  return listCommunityTournaments(supabase, communityId, {
    status,
    limit,
    offset,
  });
}
