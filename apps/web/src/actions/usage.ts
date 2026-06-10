"use server";

import { unstable_cache } from "next/cache";

import { getErrorMessage } from "@trainers/utils";
import { z, type ActionResult } from "@trainers/validators";
import {
  compileSourceTeamSlots,
  getSpeciesUsage,
  getSpeciesUsageDetail,
  getFormatUsageTimeseries,
  getPipelineData,
  getFormatEvents,
  type FormatUsageRow,
  type FormatUsageTimeseriesPoint,
  type SpeciesUsagePeriod,
  type SpeciesUsageDetailParams,
  type PipelineDataResult,
  type FormatEvent,
} from "@trainers/supabase";
import {
  createStaticClient,
  createServiceRoleClient,
  getUserId,
} from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import { CacheTags } from "@/lib/cache";
import { invalidateUsageStatsCaches } from "@/lib/cache-invalidation";

// ---------------------------------------------------------------------------
// Source-scoped usage computation
// ---------------------------------------------------------------------------

// Runtime validation for the source parameter — TypeScript union types are
// erased at runtime, so a forged request could pass any string.
const usageSourceSchema = z.enum(["rk9", "limitless"]);

/**
 * Compiles team_slots facts for a specific data source's new/unprocessed
 * events, then invalidates caches for formats that were touched.
 *
 * Admin-gated (requires site admin). Uses the service-role client to bypass
 * RLS for writing team_slots rows.
 *
 * After a successful compile the per-format and global usage caches are
 * invalidated so the team builder reflects the new data immediately.
 *
 * @param source - The data source to process ("rk9" or "limitless").
 */
export async function calculateSourceUsage(
  source: "rk9" | "limitless"
): Promise<
  ActionResult<{
    eventsComputed: number;
    formatsProcessed: number;
    bucketsWritten: number;
  }>
> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Not authenticated" };

    const isAdmin = await isSiteAdmin();
    if (!isAdmin) return { success: false, error: "Requires site admin" };

    const parsedSource = usageSourceSchema.safeParse(source);
    if (!parsedSource.success) {
      return { success: false, error: "Invalid source" };
    }
    const validatedSource = parsedSource.data;

    const supabase = createServiceRoleClient();

    // Compile team_slots facts for new events belonging to this source only.
    const { eventsCompiled, formats } = await compileSourceTeamSlots(
      supabase,
      validatedSource
    );

    // Nothing new — return early.
    if (formats.length === 0) {
      return {
        success: true,
        data: {
          eventsComputed: eventsCompiled,
          formatsProcessed: 0,
          bucketsWritten: 0,
        },
      };
    }

    // Bust caches for every touched format plus the global usage tag so the
    // builder's species usage columns reflect the freshly compiled facts.
    invalidateUsageStatsCaches(formats);

    return {
      success: true,
      data: {
        eventsComputed: eventsCompiled,
        formatsProcessed: formats.length,
        bucketsWritten: 0,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Usage calculation failed"),
    };
  }
}

// ---------------------------------------------------------------------------
// Cross-source usage computation
// ---------------------------------------------------------------------------

/**
 * Calculate usage across ALL sources (cross-source). Calls
 * `calculateSourceUsage` sequentially for each known source and sums the
 * totals. Returns a merged result even when some sources had no new events
 * (those contribute zeros). Fails fast on any source error.
 *
 * Admin-gated.
 */
export async function calculateAllSourceUsage(): Promise<
  ActionResult<{
    eventsComputed: number;
    formatsProcessed: number;
    bucketsWritten: number;
  }>
> {
  try {
    const sources = ["rk9", "limitless"] as const;
    let eventsComputed = 0,
      formatsProcessed = 0,
      bucketsWritten = 0;
    for (const s of sources) {
      const r = await calculateSourceUsage(s);
      if (!r.success) throw new Error(r.error);
      eventsComputed += r.data.eventsComputed;
      formatsProcessed += r.data.formatsProcessed;
      bucketsWritten += r.data.bucketsWritten;
    }
    return {
      success: true,
      data: { eventsComputed, formatsProcessed, bucketsWritten },
    };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to calculate usage"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: species usage detail
// ---------------------------------------------------------------------------

/**
 * Public (non-admin) server action to fetch trailing usage periods for a
 * species.  Data is public — all tournament usage stats are visible to
 * everyone — so this uses `createStaticClient()` wrapped in `unstable_cache`
 * for ISR caching.
 *
 * Cache revalidation: 3600s (1 hour).  The USAGE_STATS and per-format
 * tags can be used for on-demand invalidation after a compile completes.
 */
export async function fetchSpeciesUsageDetail(
  params: SpeciesUsageDetailParams
): Promise<ActionResult<SpeciesUsagePeriod[]>> {
  try {
    const {
      format,
      species,
      source = "all",
      periodType = "week",
      limit = 12,
      minPlayers = 0,
    } = params;

    const cacheKey = `usage-detail:${format}:${source}:${species}:${periodType}:${limit}:${minPlayers}`;

    const getCached = unstable_cache(
      async () => {
        // createStaticClient() — anonymous, no cookies — required inside
        // unstable_cache so the cached value is shared across all users.
        const supabase = createStaticClient();
        return getSpeciesUsageDetail(supabase, {
          format,
          species,
          source,
          periodType,
          limit,
          minPlayers,
        });
      },
      [cacheKey],
      {
        revalidate: 3600, // 1 hour
        tags: [CacheTags.USAGE_STATS, CacheTags.usageStats(format)],
      }
    );

    const data = await getCached();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch species usage detail"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: format-wide species ranking
// ---------------------------------------------------------------------------

/** Parameters for fetchFormatUsage. */
export interface FetchFormatUsageParams {
  /** Format ID (e.g. "gen9vgc2025regg"). */
  format: string;
  /** Rollup source. Defaults to "all". */
  source?: string;
  /** Period granularity. Defaults to "week". */
  periodType?: "day" | "week" | "month";
  /** Minimum players per event-division. Defaults to 0 (no filter). */
  minPlayers?: number;
}

/**
 * Public (non-admin) server action to fetch the latest-period species ranking
 * for a format.
 *
 * Returns every `FormatUsageRow` for the most-recent rollup bucket so the
 * species picker can show a `USG %` column for every species at once.
 *
 * Data is public — all tournament usage stats are visible to everyone — so
 * this uses `createStaticClient()` wrapped in `unstable_cache` for ISR
 * caching. Cache revalidation: 3600s (1 hour).
 */
export async function fetchFormatUsage(
  params: FetchFormatUsageParams
): Promise<ActionResult<FormatUsageRow[]>> {
  try {
    const {
      format,
      source = "all",
      periodType = "week",
      minPlayers = 0,
    } = params;

    const cacheKey = `usage-format:${format}:${source}:${periodType}:${minPlayers}`;

    const getCached = unstable_cache(
      async () => {
        const supabase = createStaticClient();
        return getSpeciesUsage(supabase, {
          format,
          source,
          periodType,
          minPlayers,
        });
      },
      [cacheKey],
      {
        revalidate: 3600, // 1 hour
        tags: [CacheTags.USAGE_STATS, CacheTags.usageStats(format)],
      }
    );

    const data = await getCached();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch format usage"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: format-wide usage time-series (all species × all periods)
// ---------------------------------------------------------------------------

/** Parameters for fetchFormatUsageTimeseries. */
export interface FetchFormatUsageTimeseriesParams {
  /** Format ID (e.g. "gen9vgc2025regg"). */
  format: string;
  /** Rollup source. Defaults to "all". */
  source?: string;
  /** Period granularity. Defaults to "week". */
  periodType?: "day" | "week" | "month";
  /** If provided, restrict to periods >= this ISO date. */
  periodStart?: string;
  /** If provided, restrict to periods <= this ISO date. */
  periodEnd?: string;
  /** Minimum players per event-division. Defaults to 0 (no filter). */
  minPlayers?: number;
}

/**
 * Public (non-admin) server action to fetch all-species × all-periods usage
 * data for a format.
 *
 * Returns a `FormatUsageTimeseriesPoint[]` ordered oldest→newest.  Each point
 * carries a `usage` map (`species → usage_pct`) covering every tracked species
 * in that period.  This is the data shape needed to render a streamgraph on the
 * public /data page.
 *
 * Data is public — all tournament usage stats are visible to everyone — so this
 * uses `createStaticClient()` wrapped in `unstable_cache` for ISR caching.
 * Cache revalidation: 3600s (1 hour).
 */
export async function fetchFormatUsageTimeseries(
  params: FetchFormatUsageTimeseriesParams
): Promise<ActionResult<FormatUsageTimeseriesPoint[]>> {
  try {
    const {
      format,
      source = "all",
      periodType = "week",
      periodStart,
      periodEnd,
      minPlayers = 0,
    } = params;

    const cacheKey = `usage-timeseries:${format}:${source}:${periodType}:${periodStart ?? ""}:${periodEnd ?? ""}:${minPlayers}`;

    const getCached = unstable_cache(
      async () => {
        const supabase = createStaticClient();
        return getFormatUsageTimeseries(supabase, {
          format,
          source,
          periodType,
          periodStart,
          periodEnd,
          minPlayers,
        });
      },
      [cacheKey],
      {
        revalidate: 3600, // 1 hour — matches fetchFormatUsage / fetchSpeciesUsageDetail
        tags: [CacheTags.USAGE_STATS, CacheTags.usageStats(format)],
      }
    );

    const data = await getCached();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch format usage timeseries"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: pipeline data for Sankey (all species × histograms)
// ---------------------------------------------------------------------------

/** Parameters for fetchPipelineData. */
export interface FetchPipelineDataParams {
  format: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  /** Minimum total_players per event-division row. Defaults to 0 (no filter). */
  minPlayers?: number;
}

/**
 * Public server action to fetch species + histogram data for the Meta Pipeline
 * Sankey. Returns null when no data matches the filters.
 *
 * Delegates to `getPipelineData()` which reads the team_slots fact table
 * directly — the minPlayers filter is applied in SQL, not client-side.
 *
 * Uses `createStaticClient()` + `unstable_cache` for 1h ISR caching.
 */
export async function fetchPipelineData(
  params: FetchPipelineDataParams
): Promise<ActionResult<PipelineDataResult | null>> {
  try {
    const {
      format,
      source = "all",
      periodStart,
      periodEnd,
      minPlayers = 0,
    } = params;

    const cacheKey = `pipeline-data:${format}:${source}:${periodStart ?? ""}:${periodEnd ?? ""}:${minPlayers}`;

    const getCached = unstable_cache(
      async () => {
        const supabase = createStaticClient();
        return getPipelineData(supabase, {
          format,
          source,
          periodStart,
          periodEnd,
          minPlayers,
        });
      },
      [cacheKey],
      {
        revalidate: 3600,
        tags: [CacheTags.USAGE_STATS, CacheTags.usageStats(format)],
      }
    );

    const data = await getCached();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch pipeline data"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: format events for timeline annotation pins
// ---------------------------------------------------------------------------

/**
 * Public server action to fetch distinct event dates for a format.
 *
 * Returns `FormatEvent[]` for rendering annotation pins on the usage
 * timeline's X-axis. Uses `createStaticClient()` + `unstable_cache` for 1h ISR.
 */
export async function fetchFormatEvents(
  format: string
): Promise<ActionResult<FormatEvent[]>> {
  try {
    const cacheKey = `format-events:${format}`;

    const getCached = unstable_cache(
      async () => {
        const supabase = createStaticClient();
        return getFormatEvents(supabase, format);
      },
      [cacheKey],
      {
        revalidate: 3600,
        tags: [CacheTags.USAGE_STATS, CacheTags.usageStats(format)],
      }
    );

    const data = await getCached();
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch format events"),
    };
  }
}
