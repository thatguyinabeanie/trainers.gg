/**
 * GET /api/v1/players/[username]
 *
 * Phase 2 Task 7 — public player profile S-bucket read endpoint.
 *
 * Returns the public profile for a player identified by username (or alt
 * username). Reads the `public_user_profiles` view (Phase 0 fix — never the
 * locked `users` base table) via `getPlayerProfileByHandle`.
 *
 * Returns:
 *   - 200 + profile object when found
 *   - 200 + `{ type: "private-alt" }` when the handle resolves to a private alt
 *   - 404 when the handle does not match any user or alt
 *
 * AUTH: required (no anonymous open Data API). Bearer → cookie → 401.
 * RATE LIMIT: 120 req / userId / min → 429.
 *
 * CACHE-CONTROL: long s-maxage with SWR; tag-invalidated by
 *   `invalidatePlayerProfileCaches(username)` on profile changes and
 *   `invalidatePlayerDirectoryCaches(username)` on username changes.
 */

import { NextResponse, type NextRequest } from "next/server";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { getCachedPlayerProfile } from "@/lib/data/players-endpoints";

/** Cache-Control for tag-invalidated public player profile data. */
const CACHE_CONTROL =
  "public, s-maxage=31536000, stale-while-revalidate=86400";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  // Auth — required even for public data.
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit.
  const identifier = auth.userId ?? extractRequestIp(request);
  const rl = await enforceRateLimit({
    identifier,
    limit: DEFAULT_API_LIMIT,
    windowMs: DEFAULT_WINDOW_MS,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": rl.resetAt.toUTCString() },
      }
    );
  }

  // Validate the username route param.
  const { username } = await params;
  if (!username || username.trim().length === 0) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const profile = await getCachedPlayerProfile(username);

  if (!profile) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json(profile, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
