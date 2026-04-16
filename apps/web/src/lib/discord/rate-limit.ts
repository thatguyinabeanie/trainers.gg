/**
 * In-memory sliding-window rate limiter for incoming Discord slash commands.
 *
 * Limits:
 * - Per user:  10 commands per minute
 * - Per guild: 60 commands per minute
 *
 * Each function instance maintains its own counter maps, so limits may be
 * exceeded under multi-instance load. Fine for v1 per spec.
 *
 * Note: Vercel function instances are ephemeral — this provides per-instance
 * rate limiting only. For distributed rate limiting across all instances,
 * consider upgrading to Vercel Runtime Cache (KV-backed) in a future iteration.
 *
 * TODO: upgrade to Vercel Runtime Cache for distributed rate limiting
 */

// =============================================================================
// Constants
// =============================================================================

/** Maximum commands a single Discord user may issue per 60-second window. */
export const PER_USER_LIMIT = 10;

/** Maximum commands a single Discord guild may issue per 60-second window. */
export const PER_GUILD_LIMIT = 60;

const WINDOW_MS = 60_000; // 1 minute sliding window

/** Maximum number of keys per map before LRU eviction kicks in. */
const MAX_MAP_SIZE = 10_000;

// =============================================================================
// Types
// =============================================================================

export interface RateLimitResult {
  /** Whether the interaction is allowed through. */
  allowed: boolean;
  /** Which scope triggered the limit, or undefined when allowed. */
  scope?: "user" | "guild";
  /** Seconds until the rate limit window resets (when blocked). */
  retryAfter?: number;
}

// =============================================================================
// Sliding-window maps (in-memory, per function instance)
// =============================================================================

/**
 * Each value is a sorted array of timestamps (ms) for interactions within the
 * current window. Oldest entries are pruned on every access.
 */
const userTimestamps = new Map<string, number[]>();
const guildTimestamps = new Map<string, number[]>();

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Evict the oldest entry from a map when it exceeds MAX_MAP_SIZE.
 * Map.prototype iteration follows insertion order, so the first key is oldest.
 */
function evictOldestIfFull(map: Map<string, number[]>): void {
  if (map.size >= MAX_MAP_SIZE) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) {
      map.delete(oldestKey);
    }
  }
}

/**
 * Sliding-window check: prune stale timestamps, then compare length to limit.
 *
 * If under the limit, records the current timestamp and returns allowed.
 * If at or over the limit, returns the time until the oldest entry expires.
 *
 * @param map - The timestamp map to check against
 * @param key - Bucket key (user ID or guild ID)
 * @param limit - Maximum allowed calls in the window
 * @returns `{ allowed: true }` or `{ allowed: false, retryAfter }` in seconds
 */
function checkWindow(
  map: Map<string, number[]>,
  key: string,
  limit: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let timestamps = map.get(key);

  if (!timestamps) {
    // New key — evict if at capacity before inserting
    evictOldestIfFull(map);
    map.set(key, [now]);
    return { allowed: true };
  }

  // Prune entries outside the sliding window
  let startIdx = 0;
  while (startIdx < timestamps.length && timestamps[startIdx]! <= cutoff) {
    startIdx++;
  }
  if (startIdx > 0) {
    timestamps = timestamps.slice(startIdx);
  }

  if (timestamps.length >= limit) {
    // Oldest timestamp in the pruned array tells us when this window clears
    const retryAfter = Math.ceil((timestamps[0]! + WINDOW_MS - now) / 1000);
    // Write back the pruned array (don't record the blocked call)
    map.set(key, timestamps);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  // Record this call
  timestamps.push(now);
  map.set(key, timestamps);
  return { allowed: true };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Check whether a Discord interaction is within rate limits and record it.
 *
 * Per-user limit takes precedence (more restrictive). If both user and guild
 * exceed their limit in the same call, the user-scope result is returned.
 *
 * Approximate: each function instance has its own counter maps, so limits
 * may be exceeded under multi-instance load. Fine for v1 per spec.
 *
 * @param userId - Discord user ID from the interaction payload
 * @param guildId - Discord guild ID, or null for DM/unscoped interactions
 */
export function checkRateLimit(
  userId: string,
  guildId: string | null
): RateLimitResult {
  const userResult = checkWindow(userTimestamps, userId, PER_USER_LIMIT);
  if (!userResult.allowed) {
    return { allowed: false, scope: "user", retryAfter: userResult.retryAfter };
  }

  if (guildId !== null) {
    const guildResult = checkWindow(guildTimestamps, guildId, PER_GUILD_LIMIT);
    if (!guildResult.allowed) {
      // Roll back the user increment to avoid charging the user for a guild block
      const userTs = userTimestamps.get(userId);
      if (userTs && userTs.length > 0) {
        userTs.pop();
      }
      return {
        allowed: false,
        scope: "guild",
        retryAfter: guildResult.retryAfter,
      };
    }
  }

  return { allowed: true };
}

/**
 * Reset all rate limit state. Test utility only — not for production use.
 * @internal
 */
export function _resetRateLimit(): void {
  userTimestamps.clear();
  guildTimestamps.clear();
}
