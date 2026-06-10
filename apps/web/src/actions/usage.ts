"use server";

import { getErrorMessage } from "@trainers/utils";
import { z, type ActionResult } from "@trainers/validators";
import {
  compileSourceTeamSlots,
  type FormatUsageRow,
  type FormatUsageTimeseriesPoint,
  type SpeciesUsagePeriod,
  type SpeciesUsageDetailParams,
  type PipelineDataResult,
  type FormatEvent,
  type SourceUsageRow,
  type ConversionRow,
  type MoveComboRow,
  type SpeciesTeammatesResult,
} from "@trainers/supabase";
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import { invalidateUsageStatsCaches } from "@/lib/cache-invalidation";
import {
  getCachedSpeciesUsageDetail,
  getCachedFormatUsage,
  getCachedFormatUsageTimeseries,
  getCachedPipelineData,
  getCachedFormatEvents,
  getCachedUsageBySource,
  getCachedUsageConversion,
  getCachedSpeciesMoveCombos,
  getCachedSpeciesTeammates,
} from "@/lib/data/usage-cache";

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
  }>
> {
  try {
    const sources = ["rk9", "limitless"] as const;
    let eventsComputed = 0,
      formatsProcessed = 0;
    for (const s of sources) {
      const r = await calculateSourceUsage(s);
      if (!r.success) throw new Error(r.error);
      eventsComputed += r.data.eventsComputed;
      formatsProcessed += r.data.formatsProcessed;
    }
    return {
      success: true,
      data: { eventsComputed, formatsProcessed },
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
 * species. Delegates to getCachedSpeciesUsageDetail in lib/data/usage-cache
 * for 'use cache' caching with USAGE_STATS + per-format tags.
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

    const data = await getCachedSpeciesUsageDetail({
      format,
      species,
      source,
      periodType,
      limit,
      minPlayers,
    });
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
 * for a format. Delegates to getCachedFormatUsage in lib/data/usage-cache.
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

    const data = await getCachedFormatUsage({
      format,
      source,
      periodType,
      minPlayers,
    });
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
 * data for a format. Delegates to getCachedFormatUsageTimeseries.
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

    const data = await getCachedFormatUsageTimeseries({
      format,
      source,
      periodType,
      periodStart,
      periodEnd,
      minPlayers,
    });
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
 * Sankey. Delegates to getCachedPipelineData.
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

    const data = await getCachedPipelineData({
      format,
      source,
      periodStart,
      periodEnd,
      minPlayers,
    });
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
 * Delegates to getCachedFormatEvents.
 */
export async function fetchFormatEvents(
  format: string
): Promise<ActionResult<FormatEvent[]>> {
  try {
    const data = await getCachedFormatEvents(format);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch format events"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: per-source usage breakdown
// ---------------------------------------------------------------------------

/** Parameters for fetchUsageBySource. */
export interface FetchUsageBySourceParams {
  /** Format ID (e.g. "gen9vgc2025regg"). */
  format: string;
  /** If provided, restrict to periods >= this ISO date. */
  periodStart?: string;
  /** If provided, restrict to periods <= this ISO date. */
  periodEnd?: string;
  /** Minimum players per event-division. Defaults to 0 (no filter). */
  minPlayers?: number;
}

/**
 * Public (non-admin) server action to fetch per-source species usage
 * breakdown for a format. Delegates to getCachedUsageBySource.
 *
 * Defaults are resolved before calling the cache fn so the runtime can
 * key the cache correctly on fully-populated params.
 */
export async function fetchUsageBySource(
  params: FetchUsageBySourceParams
): Promise<ActionResult<SourceUsageRow[]>> {
  try {
    const { format, periodStart, periodEnd, minPlayers = 0 } = params;

    const data = await getCachedUsageBySource({
      format,
      periodStart,
      periodEnd,
      minPlayers,
    });
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch usage by source"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: usage conversion (top-percentile penetration)
// ---------------------------------------------------------------------------

/** Parameters for fetchUsageConversion. */
export interface FetchUsageConversionParams {
  /** Format ID (e.g. "gen9vgc2025regg"). */
  format: string;
  /** Rollup source. Defaults to "all". */
  source?: string;
  /** If provided, restrict to periods >= this ISO date. */
  periodStart?: string;
  /** If provided, restrict to periods <= this ISO date. */
  periodEnd?: string;
  /** Minimum players per event-division. Defaults to 0 (no filter). */
  minPlayers?: number;
  /** Top percentile cutoff (0–1). Defaults to 0.10 (top 10%). */
  topPct?: number;
}

/**
 * Public (non-admin) server action to fetch species usage-to-top-percentile
 * conversion rates for a format. Delegates to getCachedUsageConversion.
 *
 * Defaults are resolved before calling the cache fn so the runtime can
 * key the cache correctly on fully-populated params.
 */
export async function fetchUsageConversion(
  params: FetchUsageConversionParams
): Promise<ActionResult<ConversionRow[]>> {
  try {
    const {
      format,
      source = "all",
      periodStart,
      periodEnd,
      minPlayers = 0,
      topPct = 0.1,
    } = params;

    const data = await getCachedUsageConversion({
      format,
      source,
      periodStart,
      periodEnd,
      minPlayers,
      topPct,
    });
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch usage conversion"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: species move combos (Phase 3 — Feature 2)
// ---------------------------------------------------------------------------

/** Parameters for fetchSpeciesMoveCombos. */
export interface FetchSpeciesMoveCombosParams {
  /** Format ID (e.g. "gen9championsvgc2026regma"). */
  format: string;
  /** Species slug (e.g. "koraidon"). */
  species: string;
  /** Rollup source. Defaults to "all". */
  source?: string;
  /** If provided, restrict to periods >= this ISO date. */
  periodStart?: string;
  /** If provided, restrict to periods <= this ISO date. */
  periodEnd?: string;
  /** Minimum players per event-division. Defaults to 0 (no filter). */
  minPlayers?: number;
  /** Max combos returned server-side. Defaults to 25. */
  limit?: number;
}

/**
 * Public (non-admin) server action to fetch true 4-move combo distribution
 * for one species. Delegates to getCachedSpeciesMoveCombos.
 *
 * Defaults are resolved before calling the cache fn so the runtime can
 * key the cache correctly on fully-populated params.
 */
export async function fetchSpeciesMoveCombos(
  params: FetchSpeciesMoveCombosParams
): Promise<ActionResult<MoveComboRow[]>> {
  try {
    const {
      format,
      species,
      source = "all",
      periodStart,
      periodEnd,
      minPlayers = 0,
      limit = 25,
    } = params;

    const data = await getCachedSpeciesMoveCombos({
      format,
      species,
      source,
      periodStart,
      periodEnd,
      minPlayers,
      limit,
    });
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch species move combos"),
    };
  }
}

// ---------------------------------------------------------------------------
// Public read: species teammates (Phase 3 — Features 3 + 4)
// ---------------------------------------------------------------------------

/** Parameters for fetchSpeciesTeammates. */
export interface FetchSpeciesTeammatesParams {
  /** Format ID (e.g. "gen9championsvgc2026regma"). */
  format: string;
  /** Species slug (e.g. "koraidon"). */
  species: string;
  /** Rollup source. Defaults to "all". */
  source?: string;
  /** If provided, restrict to periods >= this ISO date. */
  periodStart?: string;
  /** If provided, restrict to periods <= this ISO date. */
  periodEnd?: string;
  /** Minimum players per event-division. Defaults to 0 (no filter). */
  minPlayers?: number;
  /** Teammates returned; matrix uses min(topN, 8). Defaults to 12. */
  topN?: number;
}

/**
 * Public (non-admin) server action to fetch teammate pair rates + co-occurrence
 * matrix for one species. Delegates to getCachedSpeciesTeammates.
 *
 * Defaults are resolved before calling the cache fn so the runtime can
 * key the cache correctly on fully-populated params.
 */
export async function fetchSpeciesTeammates(
  params: FetchSpeciesTeammatesParams
): Promise<ActionResult<SpeciesTeammatesResult>> {
  try {
    const {
      format,
      species,
      source = "all",
      periodStart,
      periodEnd,
      minPlayers = 0,
      topN = 12,
    } = params;

    const data = await getCachedSpeciesTeammates({
      format,
      species,
      source,
      periodStart,
      periodEnd,
      minPlayers,
      topN,
    });
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: getErrorMessage(e, "Failed to fetch species teammates"),
    };
  }
}
