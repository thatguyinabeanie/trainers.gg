/**
 * Database-backed sliding window rate limiter for Convex mutations.
 *
 * This provides protection against spam and abuse for sensitive operations
 * like tournament registration, check-in, and match reporting.
 */

import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Rate limit action types with their default configurations.
 * Using string literals for type safety while avoiding verbose union types.
 */
export const RATE_LIMIT_ACTIONS = {
  tournament_registration: {
    maxRequests: 5,
    windowMs: 60_000, // 1 minute
    description: "Tournament registration attempts",
  },
  tournament_checkin: {
    maxRequests: 10,
    windowMs: 60_000, // 1 minute
    description: "Tournament check-in attempts",
  },
  match_reporting: {
    maxRequests: 20,
    windowMs: 60_000, // 1 minute
    description: "Match result reporting attempts",
  },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMIT_ACTIONS;

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current count of requests in the window */
  currentCount: number;
  /** Maximum allowed requests in the window */
  maxRequests: number;
  /** Time in milliseconds until the window resets */
  resetInMs: number;
  /** Human-readable message for rate limit errors */
  message: string;
}

/**
 * Rate limit error class for consistent error handling.
 */
export class RateLimitExceededError extends Error {
  public readonly currentCount: number;
  public readonly maxRequests: number;
  public readonly resetInMs: number;

  constructor(result: RateLimitResult) {
    super(result.message);
    this.name = "RateLimitExceededError";
    this.currentCount = result.currentCount;
    this.maxRequests = result.maxRequests;
    this.resetInMs = result.resetInMs;
  }
}

/**
 * Creates a unique identifier for rate limiting.
 *
 * @param profileId - The profile performing the action
 * @param action - The action being rate limited
 * @returns A composite key for the rate limit record
 */
function createRateLimitIdentifier(
  profileId: Id<"profiles">,
  action: RateLimitAction,
): string {
  return `${profileId}:${action}`;
}

/**
 * Check and update rate limit for an action.
 *
 * This implements a true sliding window algorithm using database records.
 * Each check is atomic within Convex's transaction guarantees.
 *
 * **Algorithm**: On each request, we filter the requestTimestamps array to only
 * include timestamps within the last `windowMs` milliseconds, count the filtered
 * timestamps, and if within limit, add the current timestamp to the array.
 *
 * **Race Condition Safety**: Convex mutations are serialized at the document level
 * using Optimistic Concurrency Control (OCC). When multiple concurrent requests
 * try to modify the same rate limit record (identified by profile + action),
 * Convex automatically serializes them, ensuring the second request sees the
 * updated timestamps from the first request. This prevents bypass of rate limits.
 *
 * @param ctx - Convex mutation context
 * @param profileId - The profile performing the action
 * @param action - The action being rate limited
 * @returns Rate limit result indicating if the action is allowed
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit(ctx, profileId, "tournament_registration");
 * if (!result.allowed) {
 *   throw new RateLimitExceededError(result);
 * }
 * ```
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
  action: RateLimitAction,
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_ACTIONS[action];
  const identifier = createRateLimitIdentifier(profileId, action);
  const now = Date.now();

  // Find existing rate limit record
  const existingRecord = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
    .first();

  // Calculate sliding window start
  const windowStart = now - config.windowMs;
  const expiresAt = now + config.windowMs;

  // No existing record - create new one and allow
  if (!existingRecord) {
    await ctx.db.insert("rateLimits", {
      identifier,
      requestTimestamps: [now],
      windowStart,
      expiresAt,
    });

    return {
      allowed: true,
      currentCount: 1,
      maxRequests: config.maxRequests,
      resetInMs: config.windowMs,
      message: `Request allowed (1/${config.maxRequests})`,
    };
  }

  // Filter to requests within the sliding window
  const recentRequests = (existingRecord.requestTimestamps || []).filter(
    (timestamp) => timestamp > windowStart,
  );

  // Current count is requests in the sliding window
  const currentCount = recentRequests.length;

  // Check if limit exceeded
  if (currentCount >= config.maxRequests) {
    // Calculate reset time based on oldest request in the window
    const oldestRequestTime = recentRequests[0] ?? now;
    const resetInMs = oldestRequestTime + config.windowMs - now;

    return {
      allowed: false,
      currentCount,
      maxRequests: config.maxRequests,
      resetInMs: Math.max(0, resetInMs),
      message: `Rate limit exceeded for ${config.description}. Maximum ${config.maxRequests} requests per minute. Try again in ${Math.ceil(Math.max(0, resetInMs) / 1000)} seconds.`,
    };
  }

  // Add current request timestamp and update record
  const newTimestamps = [...recentRequests, now];
  await ctx.db.patch(existingRecord._id, {
    requestTimestamps: newTimestamps,
    windowStart,
    expiresAt,
  });

  return {
    allowed: true,
    currentCount: currentCount + 1,
    maxRequests: config.maxRequests,
    resetInMs: config.windowMs,
    message: `Request allowed (${currentCount + 1}/${config.maxRequests})`,
  };
}

/**
 * Convenience function that checks rate limit and throws if exceeded.
 *
 * Use this for cleaner code when you always want to throw on rate limit.
 *
 * @param ctx - Convex mutation context
 * @param profileId - The profile performing the action
 * @param action - The action being rate limited
 * @throws {RateLimitExceededError} If rate limit is exceeded
 *
 * @example
 * ```typescript
 * // At the start of your mutation handler:
 * await enforceRateLimit(ctx, profileId, "tournament_registration");
 * // ... rest of mutation logic
 * ```
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
  action: RateLimitAction,
): Promise<void> {
  const result = await checkRateLimit(ctx, profileId, action);
  if (!result.allowed) {
    throw new RateLimitExceededError(result);
  }
}

/**
 * Clean up expired rate limit records.
 *
 * This can be called periodically via a scheduled function to prevent
 * unbounded growth of the rateLimits table. Records are considered expired
 * when their expiresAt timestamp is older than the current time.
 *
 * @param ctx - Convex mutation context
 * @param maxRecordsToDelete - Maximum records to delete in one call (default 100)
 * @returns Number of records deleted
 */
export async function cleanupExpiredRateLimits(
  ctx: MutationCtx,
  maxRecordsToDelete = 100,
): Promise<number> {
  const now = Date.now();

  const expiredRecords = await ctx.db
    .query("rateLimits")
    .withIndex("by_expires", (q) => q.lt("expiresAt", now))
    .take(maxRecordsToDelete);

  for (const record of expiredRecords) {
    await ctx.db.delete(record._id);
  }

  return expiredRecords.length;
}
