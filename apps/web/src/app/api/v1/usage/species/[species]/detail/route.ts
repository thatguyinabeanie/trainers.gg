/**
 * GET /api/v1/usage/species/[species]/detail
 *
 * Returns trailing-period detail for a single species (SpeciesUsagePeriod[]).
 * Backed by getCachedSpeciesUsageDetail from usage-cache.ts — tagged with
 * CacheTags.USAGE_STATS and CacheTags.usageStats(format), busted by
 * invalidateUsageStatsCaches(formats) after an import.
 *
 * Route param:
 *   - species   Species name (e.g. "Koraidon") — URL-encoded
 *
 * Query params:
 *   - format      Format ID (required)
 *   - source      "all" | "rk9" | "limitless" | "trainers.gg" (default: "all")
 *   - periodType  "day" | "week" | "month" (default: "week")
 *   - limit       Number of trailing periods (default: 1)
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
import { getCachedSpeciesUsageDetail } from "@/lib/data/usage-cache";

/** Allowed data source values. */
const sourceSchema = z.enum(["all", "rk9", "limitless", "trainers.gg"]);

/** Positive integer with a sensible upper bound for trailing-period queries. */
const limitSchema = z.coerce.number().int().positive().max(52);

/**
 * Cache-Control for auth-gated routes: `private, no-store` to prevent CDN/
 * proxy nodes from storing an authed 200 and serving it to anonymous callers.
 * Server-side `'use cache'` on the underlying fetcher (usage-cache.ts) is the
 * real cache layer.
 */
const CACHE_CONTROL = "private, no-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ species: string }> }
) {
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

  // Decode the species route segment (may be URL-encoded, e.g. "Ting-Lu").
  const { species: rawSpecies } = await params;
  const species = decodeURIComponent(rawSpecies);
  if (!species) {
    return NextResponse.json({ error: "Missing species" }, { status: 404 });
  }

  // Validate query params.
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const source = searchParams.get("source") ?? "all";
  const periodType = searchParams.get("periodType") ?? "week";
  const limitParam = searchParams.get("limit") ?? "1";

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

  const limitResult = limitSchema.safeParse(limitParam);
  if (!limitResult.success) {
    return NextResponse.json(
      { error: "Invalid limit — must be a positive integer (max 52)" },
      { status: 400 }
    );
  }

  const periods = await getCachedSpeciesUsageDetail({
    format,
    species,
    source: sourceResult.data,
    periodType: periodType as "day" | "week" | "month",
    limit: limitResult.data,
    minPlayers: 0,
  });

  return NextResponse.json(periods, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
