/**
 * Cache utilities for Edge Functions using Upstash Redis
 *
 * Three-layer caching strategy:
 * 1. Client cache (Next.js ISR 60s + TanStack Query 30s)
 * 2. CDN cache (Supabase CDN via Cache-Control headers)
 * 3. Edge Function cache (Upstash Redis - THIS LAYER)
 *
 * Setup instructions:
 * 1. Create Upstash account at https://upstash.com
 * 2. Create new Redis database (select region closest to Supabase)
 * 3. Set secrets:
 *    pnpm supabase secrets set UPSTASH_REDIS_REST_URL="https://[your-redis].upstash.io"
 *    pnpm supabase secrets set UPSTASH_REDIS_REST_TOKEN="[your-token]"
 */

import { Redis } from "https://deno.land/x/upstash_redis@v1.34.3/mod.ts";

// Initialize Redis client (lazy - only created when first used)
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  if (!url || !token) {
    console.warn(
      "UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set - cache disabled"
    );
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

/**
 * Wrap a function with Redis caching.
 *
 * @param key - Cache key (e.g., "tournament:123", "tournaments:list:user-456")
 * @param fn - Function to cache (must return JSON-serializable data)
 * @param ttl - Time to live in seconds (default: 60)
 * @returns Cached result or fresh result if cache miss
 *
 * @example
 * const tournament = await withCache(
 *   `tournament:${id}`,
 *   () => getTournamentById(supabase, id),
 *   60
 * );
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  const redis = getRedisClient();

  // If Redis not configured, execute function directly (no cache)
  if (!redis) {
    return await fn();
  }

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      console.log(`[cache] HIT: ${key}`);
      return cached;
    }

    console.log(`[cache] MISS: ${key}`);

    // Cache miss - execute function
    const result = await fn();

    // Store in cache with TTL
    await redis.setex(key, ttl, result);

    return result;
  } catch (error) {
    // If cache fails, log and execute function (fail gracefully)
    console.error(`[cache] ERROR: ${key}`, error);
    return await fn();
  }
}

/**
 * Invalidate cache by key or pattern.
 *
 * @param pattern - Cache key or pattern (e.g., "tournament:123", "tournaments:list:*")
 *
 * @example
 * // Invalidate single key
 * await invalidateCache("tournament:123");
 *
 * // Invalidate all tournament lists
 * await invalidateCache("tournaments:list:*");
 *
 * // Invalidate all tournaments
 * await invalidateCache("tournament:*");
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    if (pattern.endsWith("*")) {
      // Pattern-based invalidation using SCAN
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[cache] INVALIDATE: ${pattern} (${keys.length} keys)`);
      }
    } else {
      // Single key invalidation
      await redis.del(pattern);
      console.log(`[cache] INVALIDATE: ${pattern}`);
    }
  } catch (error) {
    console.error(`[cache] INVALIDATE ERROR: ${pattern}`, error);
  }
}

/**
 * Get HTTP caching headers for GET responses.
 *
 * @param maxAge - Cache duration in seconds (default: 60)
 * @param staleWhileRevalidate - Stale-while-revalidate duration (default: 30)
 * @returns Headers object with Cache-Control and Vary
 *
 * @example
 * return Response.json(data, {
 *   headers: {
 *     ...cors,
 *     ...getCacheHeaders(60, 30),
 *   }
 * });
 */
export function getCacheHeaders(
  maxAge: number = 60,
  staleWhileRevalidate: number = 30
): Record<string, string> {
  return {
    "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    Vary: "Authorization", // Cache separately per user (due to auth header)
  };
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
