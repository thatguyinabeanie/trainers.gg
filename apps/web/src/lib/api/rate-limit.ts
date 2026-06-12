/**
 * Rate-limit helper for API routes.
 *
 * Implements a sliding-window rate limit backed by the `rate_limits` Postgres
 * table. All reads/writes use `createServiceRoleClient()` because the table's
 * RLS policy denies every non-service-role client (`USING (false)`).
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
 * Algorithm:
 * 1. Fetch the existing row for `identifier` (may not exist yet).
 * 2. Prune timestamps older than `windowMs` from `request_timestamps`.
 * 3. Count the remaining (in-window) timestamps.
 * 4. If count < limit → append `now`, upsert, return `allowed: true`.
 *    If count >= limit → upsert pruned state, return `allowed: false`.
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
  const windowStart = new Date(now.getTime() - windowMs);
  // expires_at gives the DB enough information to GC stale rows automatically.
  const expiresAt = new Date(now.getTime() + windowMs);

  // Fetch the existing row for this identifier.
  const { data: existing, error: fetchError } = await supabase
    .from("rate_limits")
    .select("request_timestamps")
    .eq("identifier", identifier)
    .maybeSingle();

  if (fetchError) {
    // On read failure, fail open (allow) to avoid blocking legitimate traffic.
    // Log the error but do not surface it to the caller.
    console.error("[rate-limit] fetch error:", fetchError.message);
    return { allowed: true, remaining: limit - 1, resetAt: expiresAt };
  }

  // Prune timestamps outside the current window.
  const rawTimestamps: string[] = existing?.request_timestamps ?? [];
  const inWindow = rawTimestamps.filter(
    (ts) => new Date(ts).getTime() > windowStart.getTime()
  );

  const count = inWindow.length;
  const allowed = count < limit;

  // Append the current timestamp only when the request is allowed.
  const updatedTimestamps = allowed ? [...inWindow, now.toISOString()] : inWindow;

  // Determine whether the row actually changed:
  //   - allowed path: a new timestamp was appended (always changed).
  //   - denied path: only write if stale timestamps were pruned; skip the
  //     upsert when nothing changed to avoid an unnecessary DB write on every
  //     rejected request.
  //
  // TODO(rate-limit): this read-then-write sequence has a known race condition
  // under concurrent requests for the same identifier. The correct fix is an
  // atomic RPC (SELECT FOR UPDATE inside a transaction) so that concurrent
  // callers serialize rather than clobber each other's timestamp arrays.
  // Tracked for a future refactor — this guard is a best-effort improvement
  // that does not make the race worse.
  const rowChanged = allowed || inWindow.length < rawTimestamps.length;

  if (rowChanged) {
    const { error: upsertError } = await supabase.from("rate_limits").upsert(
      {
        identifier,
        request_timestamps: updatedTimestamps,
        window_start: windowStart.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "identifier" }
    );

    if (upsertError) {
      // On write failure, fail open. The rate limit state is still usable from
      // the in-memory calculation done above.
      console.error("[rate-limit] upsert error:", upsertError.message);
    }
  }

  // resetAt: the moment the oldest in-window timestamp leaves the window.
  // If there are no in-window timestamps the reset is effectively now.
  const oldestTimestamp =
    inWindow.length > 0 ? new Date(inWindow[0]!) : now;
  const resetAt = new Date(oldestTimestamp.getTime() + windowMs);

  return {
    allowed,
    remaining: allowed ? limit - updatedTimestamps.length : 0,
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
