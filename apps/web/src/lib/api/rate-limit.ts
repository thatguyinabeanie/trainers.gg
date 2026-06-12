/**
 * Rate-limit helper for API routes.
 *
 * Implements a sliding-window rate limit backed by the `rate_limits` Postgres
 * table. The read-prune-decide-write cycle runs inside the atomic
 * `check_rate_limit` RPC (SECURITY DEFINER, row-locking) so concurrent requests
 * for the same identifier serialize instead of racing. We call it through
 * `createServiceRoleClient()` because the table's RLS denies every
 * non-service-role client (`USING (false)`).
 *
 * ## IP extraction caveat
 * When `identifier` is derived from the `x-forwarded-for` header (i.e. the
 * request is unauthenticated), only the **first** hop is used:
 *
 *   x-forwarded-for: <client-ip>, <proxy1>, <proxy2>
 *                     ^^^^^^^^^^^ first hop — used as identifier
 *
 * This first hop is set by the **outermost proxy** (e.g. Vercel's CDN), not
 * the client, so it cannot be spoofed by the browser. However, clients behind
 * NAT or a shared egress IP will share a rate-limit bucket. For most API
 * endpoints this is an acceptable trade-off; switch to per-user limiting once
 * the caller can supply an authenticated userId.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

// =============================================================================
// Constants
// =============================================================================

/** Default public-API limit: 120 requests per minute per identifier. */
export const DEFAULT_API_LIMIT = 120;

/** Default window size in milliseconds (1 minute). */
export const DEFAULT_WINDOW_MS = 60_000;

// =============================================================================
// Types
// =============================================================================

export interface RateLimitOptions {
  /** Opaque string that scopes the counter (userId when authed, else request IP). */
  identifier: string;
  /** Maximum number of requests allowed within `windowMs`. Defaults to DEFAULT_API_LIMIT (120). */
  limit?: number;
  /** Sliding-window size in milliseconds. Defaults to DEFAULT_WINDOW_MS (60s). */
  windowMs?: number;
}

export interface RateLimitResult {
  /** `true` when the request is within quota; `false` when the limit is exceeded. */
  allowed: boolean;
  /** How many more requests are allowed before the next refusal. 0 when denied. */
  remaining: number;
  /** When the oldest in-window timestamp will drop out, resetting capacity. */
  resetAt: Date;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Enforce a sliding-window rate limit for a given `identifier`.
 *
 * Delegates the entire read-prune-decide-write cycle to the atomic
 * `check_rate_limit` Postgres RPC, which row-locks the identifier's row so
 * concurrent requests serialize rather than clobbering each other's timestamp
 * arrays. Time is server-authoritative (the RPC uses `now()` internally).
 *
 * The RPC returns a single row of `{ allowed, reset_at }`. `remaining` is not
 * returned by the RPC (it would require an extra in-window count round-trip);
 * we report a coarse `remaining` derived from `allowed` instead — sufficient
 * for the `Retry-After` use case.
 *
 * On RPC failure we fail open (allow) to avoid blocking legitimate traffic.
 *
 * Callers should map `allowed: false` to an HTTP 429 with a
 * `Retry-After: <resetAt.toUTCString()>` header.
 */
export async function enforceRateLimit({
  identifier,
  limit = DEFAULT_API_LIMIT,
  windowMs = DEFAULT_WINDOW_MS,
}: RateLimitOptions): Promise<RateLimitResult> {
  const supabase = createServiceRoleClient();
  const now = new Date();

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_identifier: identifier,
    p_limit: limit,
    p_window_ms: windowMs,
  });

  if (error) {
    // On RPC failure, fail open (allow) to avoid blocking legitimate traffic.
    // Log the error but do not surface it to the caller.
    console.error("[rate-limit] rpc error:", error.message);
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }

  // The RPC returns a TABLE, so `data` is an array with a single decision row.
  const decision = Array.isArray(data) ? data[0] : data;

  if (!decision) {
    // No row returned is unexpected; fail open rather than block traffic.
    console.error("[rate-limit] rpc returned no decision row");
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }

  const allowed = decision.allowed;
  const resetAt = new Date(decision.reset_at);

  return {
    // `remaining` is coarse: 0 when denied, otherwise at least one slot was
    // free at decision time. The RPC does not return the exact in-window count.
    allowed,
    remaining: allowed ? limit - 1 : 0,
    resetAt,
  };
}

// =============================================================================
// Request IP extraction
// =============================================================================

/**
 * Extract the best-effort client IP from a Request object.
 *
 * Uses the first hop of `x-forwarded-for` (set by Vercel's CDN, not spoofable
 * by the browser). Falls back to `"unknown"` when no header is present — this
 * should not occur on Vercel-hosted routes but is safe to handle.
 *
 * See file-level JSDoc for the shared-NAT caveat.
 */
export function extractRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstHop = forwarded.split(",")[0]?.trim();
    if (firstHop) return firstHop;
  }
  return "unknown";
}
