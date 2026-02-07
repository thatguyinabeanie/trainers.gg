/**
 * HTTP Cache utilities for Edge Functions
 *
 * Two-layer caching strategy:
 * 1. Client cache (Next.js ISR 60s + TanStack Query 30s)
 * 2. CDN cache (Supabase CDN via Cache-Control headers)
 */

/**
 * Get HTTP caching headers for GET responses.
 *
 * @param maxAge - Cache duration in seconds (default: 60)
 * @param staleWhileRevalidate - Stale-while-revalidate duration (default: 30)
 * @param isPublic - Whether data is public (same for all users) or user-specific (default: false)
 * @returns Headers object with Cache-Control and Vary
 *
 * @example
 * // Public data (tournament list - same for all users)
 * return Response.json(data, {
 *   headers: {
 *     ...cors,
 *     ...getCacheHeaders(60, 30, true),
 *   }
 * });
 *
 * @example
 * // User-specific data (user's notifications)
 * return Response.json(data, {
 *   headers: {
 *     ...cors,
 *     ...getCacheHeaders(60, 30, false),
 *   }
 * });
 */
export function getCacheHeaders(
  maxAge: number = 60,
  staleWhileRevalidate: number = 30,
  isPublic: boolean = false
): Record<string, string> {
  if (isPublic) {
    // Public data: same for all users, can be cached by CDN
    return {
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    };
  } else {
    // User-specific data: must not be shared between users
    return {
      "Cache-Control": `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
      Vary: "Authorization", // Defense in depth
    };
  }
}

/**
 * Cache TTL presets for different data types.
 * Use these for consistency across the platform.
 */
export const CACHE_TTL = {
  /** Tournament list, detail (60s) - changes frequently during registration */
  TOURNAMENT: 60,
  /** Match detail (30s) - real-time game reporting */
  MATCH: 30,
  /** Standings (30s) - updates after each game result */
  STANDINGS: 30,
  /** User alts (5min) - rarely changes */
  ALT: 300,
  /** Organization list (5min) - static most of the time */
  ORGANIZATION: 300,
  /** Notifications (10s) - should be near real-time */
  NOTIFICATION: 10,
  /** Static data (15min) - very rarely changes */
  STATIC: 900,
} as const;
