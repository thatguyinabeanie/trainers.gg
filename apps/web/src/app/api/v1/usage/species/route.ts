/**
 * GET /api/v1/usage/species
 *
 * Returns the latest-period species ranking (FormatUsageRow[]) for a format.
 * Backed by the 'use cache' fetcher in usage-cache.ts — cache is tagged with
 * CacheTags.USAGE_STATS and CacheTags.usageStats(format), busted by
 * invalidateUsageStatsCaches(formats) after an import.
 *
 * Query params (all required):
 *   - format      Format ID (e.g. "gen9vgc2025regg")
 *   - source      "all" | "rk9" | "limitless" | "trainers.gg"
 *   - periodType  "day" | "week" | "month"
 *
 * AUTH: Bearer (mobile) or cookie (web) — anonymous → 401.
 *
 * CACHE-CONTROL: `private, no-store`
 *   This route is auth-gated. A `public` CDN cache could serve an authed 200
 *   response to an anonymous caller, undermining the no-anonymous-Data-API
 *   policy. Server-side `'use cache'` on the underlying fetcher (usage-cache.ts)
 *   is the real cache layer; this header keeps CDN/proxies from storing the
 *   response at all.
 */

import { NextResponse, type NextRequest } from "next/server";

import { z } from "@trainers/validators";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { getCachedFormatUsage } from "@/lib/data/usage-cache";

/** Allowed data source values. */
const sourceSchema = z.enum(["all", "rk9", "limitless", "trainers.gg"]);

/**
 * Cache-Control for auth-gated routes: `private, no-store` to prevent CDN/
 * proxy nodes from storing an authed 200 and serving it to anonymous callers.
 * Server-side `'use cache'` on the underlying fetcher (usage-cache.ts) is the
 * real cache layer.
 */
const CACHE_CONTROL = "private, no-store";

export async function GET(request: NextRequest) {
  // Auth required — no anonymous open Data API.
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate-limit per authenticated user.
  const limit = await enforceRateLimit({
    identifier: auth.userId,
    limit: DEFAULT_API_LIMIT,
    windowMs: DEFAULT_WINDOW_MS,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": limit.resetAt.toUTCString() },
      }
    );
  }

  // Validate query params.
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const source = searchParams.get("source") ?? "all";
  const periodType = searchParams.get("periodType") ?? "week";

  if (!format) {
    return NextResponse.json(
      { error: "Missing required param: format" },
      { status: 400 }
    );
  }

  if (!["day", "week", "month"].includes(periodType)) {
    return NextResponse.json(
      { error: "Invalid periodType — must be day, week, or month" },
      { status: 400 }
    );
  }

  const sourceResult = sourceSchema.safeParse(source);
  if (!sourceResult.success) {
    return NextResponse.json(
      {
        error:
          "Invalid source — must be one of: all, rk9, limitless, trainers.gg",
      },
      { status: 400 }
    );
  }

  const rows = await getCachedFormatUsage({
    format,
    source: sourceResult.data,
    periodType: periodType as "day" | "week" | "month",
    minPlayers: 0,
  });

  return NextResponse.json(rows, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
