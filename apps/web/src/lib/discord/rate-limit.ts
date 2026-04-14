/**
 * In-memory LRU rate limiter for incoming Discord slash commands.
 *
 * Limits:
 * - Per user:  10 commands per minute
 * - Per guild: 60 commands per minute
 *
 * This runs on every interaction before any processing.
 *
 * Note: Vercel function instances are ephemeral — this provides per-instance
 * rate limiting only. For distributed rate limiting across all instances,
 * consider upgrading to Vercel Runtime Cache (KV-backed) in a future iteration.
 *
 * TODO: upgrade to Vercel Runtime Cache for distributed rate limiting
 */

// =============================================================================
// Types
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  scope?: "user" | "guild";
  /** Seconds until the rate limit window resets. */
  retryAfter?: number;
}

interface BucketEntry {
  count: number;
  windowStart: number;
}

// =============================================================================
// Config
// =============================================================================

const USER_LIMIT = 10;
const GUILD_LIMIT = 60;
const WINDOW_MS = 60_000; // 1 minute

// =============================================================================
// Buckets (in-memory, per instance)
// =============================================================================

const userBuckets = new Map<string, BucketEntry>();
const guildBuckets = new Map<string, BucketEntry>();

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Check and increment a rate limit bucket.
 *
 * @returns `{ allowed: true }` when under limit, or `{ allowed: false, retryAfter }` when over
 */
function checkBucket(
  buckets: Map<string, BucketEntry>,
  key: string,
  limit: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // Start a fresh window
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    const windowEnd = entry.windowStart + WINDOW_MS;
    const retryAfter = Math.ceil((windowEnd - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Check whether a Discord interaction is within rate limits and record it.
 *
 * User limits are checked before guild limits. When both would trigger, the
 * user scope is reported so the error message is more targeted.
 *
 * @param userId - Discord user ID from the interaction payload
 * @param guildId - Discord guild ID from the interaction payload
 */
export function checkRateLimit(
  userId: string,
  guildId: string
): RateLimitResult {
  const userResult = checkBucket(userBuckets, userId, USER_LIMIT);
  if (!userResult.allowed) {
    return { allowed: false, scope: "user", retryAfter: userResult.retryAfter };
  }

  const guildResult = checkBucket(guildBuckets, guildId, GUILD_LIMIT);
  if (!guildResult.allowed) {
    // Roll back the user increment to avoid charging the user for a guild block
    const userEntry = userBuckets.get(userId);
    if (userEntry && userEntry.count > 0) {
      userEntry.count--;
    }
    return {
      allowed: false,
      scope: "guild",
      retryAfter: guildResult.retryAfter,
    };
  }

  return { allowed: true };
}

/**
 * Reset all rate limit state. Exposed for testing only — not for production use.
 * @internal
 */
export function _resetRateLimitState(): void {
  userBuckets.clear();
  guildBuckets.clear();
}
