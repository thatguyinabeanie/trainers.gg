/**
 * Cache Invalidation Helpers
 *
 * Entity-scoped helpers that bundle all `updateTag()` calls for a given domain.
 * Using these instead of raw `updateTag()` calls in server actions ensures that
 * adding a new cache surface only requires updating one helper, not every action.
 *
 * Rules:
 * - Sync helpers for cases where all IDs/slugs are already known
 * - Async helpers when a DB lookup is needed to resolve an entity
 */

import { updateTag } from "next/cache";

import { CacheTags } from "@/lib/cache";
import { type createClient } from "@/lib/supabase/server";

// =============================================================================
// Community Cache Helpers
// =============================================================================

/**
 * Invalidate all caches that display community data.
 * Call after any community metadata change: name, description, logo, social
 * links, or staff roster.
 *
 * Pass whichever identifiers you have — both slug and id are optional but
 * providing both gives the most complete invalidation.
 */
export function invalidateCommunityPageCaches(
  slug?: string,
  id?: number
): void {
  updateTag(CacheTags.COMMUNITIES_LIST);
  if (slug) updateTag(CacheTags.community(slug));
  if (id !== undefined) updateTag(CacheTags.community(id));
}

// =============================================================================
// Tournament Cache Helpers
// =============================================================================

/**
 * Invalidate the individual tournament detail cache.
 * Call after any internal change: rounds, matches, registrations, check-ins.
 */
export function invalidateTournamentCaches(tournamentId: number): void {
  updateTag(CacheTags.tournament(tournamentId));
}

/**
 * Invalidate the tournament list + individual tournament caches.
 * Call when a tournament's visibility changes (publish, start, complete,
 * archive) but you already have no community context to update.
 */
export function invalidateTournamentListCaches(tournamentId: number): void {
  updateTag(CacheTags.TOURNAMENTS_LIST);
  updateTag(CacheTags.tournament(tournamentId));
}

/**
 * Invalidate the tournament list, individual tournament, and owning community
 * caches. Call when a tournament's status changes so the community detail
 * page's tournament groupings stay in sync.
 *
 * Requires a DB lookup to resolve the community slug — call this inside an
 * existing try/catch so failures surface to the user normally.
 */
export async function invalidateTournamentAndCommunityCaches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: number
): Promise<void> {
  updateTag(CacheTags.TOURNAMENTS_LIST);
  updateTag(CacheTags.tournament(tournamentId));

  const { data } = await supabase
    .from("tournaments")
    .select("communities!tournaments_community_id_fkey(slug, id)")
    .eq("id", tournamentId)
    .single();

  if (data?.communities && "slug" in data.communities) {
    const community = data.communities as { slug: string; id: number };
    updateTag(CacheTags.community(community.slug));
    updateTag(CacheTags.community(community.id));
  }
}

// =============================================================================
// Player Cache Helpers
// =============================================================================

/**
 * Invalidate a player's profile cache.
 * Call after any profile data change that only affects the profile page
 * (bio, country, birth date).
 */
export function invalidatePlayerProfileCaches(username: string): void {
  updateTag(CacheTags.player(username));
}

/**
 * Invalidate a player's profile and all directory/sidebar caches.
 * Call when a player joins or changes their username — these events change
 * how the player appears in lists across the site.
 */
export function invalidatePlayerDirectoryCaches(username: string): void {
  updateTag(CacheTags.player(username));
  updateTag(CacheTags.PLAYERS_DIRECTORY);
  updateTag(CacheTags.PLAYERS_NEW);
  updateTag(CacheTags.PLAYERS_LEADERBOARD);
  updateTag(CacheTags.PLAYERS_RECENT);
}
