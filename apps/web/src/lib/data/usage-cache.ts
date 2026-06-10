/**
 * Cached data-fetching functions for usage stats.
 *
 * Each function uses the 'use cache' directive (Cache Components API) so
 * Next.js keys the cache on function arguments automatically — no manual
 * cache-key arrays needed. All callers must resolve defaults BEFORE calling
 * so the params object is fully populated and the runtime can key correctly.
 *
 * All functions use createStaticClient() (anonymous, cookie-less) — required
 * inside cache scopes to avoid per-user cookie variance. Output is public
 * aggregate data; no PII is cached.
 *
 * Invalidation: invalidateUsageStatsCaches(formats) via @/lib/cache-invalidation.
 */

import { cacheTag, cacheLife } from "next/cache";

import {
  getSpeciesUsageDetail,
  getSpeciesUsage,
  getFormatUsageTimeseries,
  getPipelineData,
  getFormatEvents,
  getUsageBySource,
  getUsageConversion,
  getSpeciesMoveCombos,
  getSpeciesTeammates,
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
import { createStaticClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

// =============================================================================
// Species usage detail
// =============================================================================

/**
 * Cached fetch of trailing usage periods for a single species in a format.
 *
 * All params that distinguish the cache entry (format, species, source,
 * periodType, limit, minPlayers) are required here — callers resolve defaults
 * before calling so the runtime can key the cache correctly.
 */
export async function getCachedSpeciesUsageDetail(
  params: Required<SpeciesUsageDetailParams>
): Promise<SpeciesUsagePeriod[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");

  const supabase = createStaticClient();
  return getSpeciesUsageDetail(supabase, params);
}

// =============================================================================
// Format-wide species ranking
// =============================================================================

/** Fully-resolved parameters for getCachedFormatUsage. */
export interface FormatUsageParams {
  format: string;
  source: string;
  periodType: "day" | "week" | "month";
  minPlayers: number;
}

/**
 * Cached fetch of the latest-period species ranking for a format.
 *
 * Returns every FormatUsageRow for the most-recent rollup bucket so the
 * species picker can display a USG % column for every species at once.
 */
export async function getCachedFormatUsage(
  params: FormatUsageParams
): Promise<FormatUsageRow[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");

  const supabase = createStaticClient();
  return getSpeciesUsage(supabase, params);
}

// =============================================================================
// Format-wide usage time-series
// =============================================================================

/** Fully-resolved parameters for getCachedFormatUsageTimeseries. */
export interface FormatUsageTimeseriesParams {
  format: string;
  source: string;
  periodType: "day" | "week" | "month";
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
}

/**
 * Cached fetch of all-species × all-periods usage data for a format.
 *
 * Returns FormatUsageTimeseriesPoint[] ordered oldest→newest for rendering
 * the streamgraph on the /data Meta Explorer page.
 */
export async function getCachedFormatUsageTimeseries(
  params: FormatUsageTimeseriesParams
): Promise<FormatUsageTimeseriesPoint[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");

  const supabase = createStaticClient();
  return getFormatUsageTimeseries(supabase, params);
}

// =============================================================================
// Pipeline data (Sankey)
// =============================================================================

/** Fully-resolved parameters for getCachedPipelineData. */
export interface PipelineDataParams {
  format: string;
  source: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
}

/**
 * Cached fetch of species + histogram data for the Meta Pipeline Sankey.
 *
 * Returns null when no data matches the filters.
 */
export async function getCachedPipelineData(
  params: PipelineDataParams
): Promise<PipelineDataResult | null> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");

  const supabase = createStaticClient();
  return getPipelineData(supabase, params);
}

// =============================================================================
// Format events (timeline annotation pins)
// =============================================================================

/**
 * Cached fetch of distinct event dates for a format.
 *
 * Returns FormatEvent[] for rendering annotation pins on the usage
 * timeline's X-axis.
 */
export async function getCachedFormatEvents(
  format: string
): Promise<FormatEvent[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(format));
  cacheLife("hours");

  const supabase = createStaticClient();
  return getFormatEvents(supabase, format);
}

// =============================================================================
// Per-source usage breakdown
// =============================================================================

/** Fully-resolved parameters for getCachedUsageBySource. */
export interface UsageBySourceParams {
  format: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
}

/**
 * Cached fetch of per-source species usage breakdown for a format.
 *
 * Returns SourceUsageRow[] showing usage split by data source (rk9,
 * limitless, trainers.gg) for the Meta Explorer's source comparison view.
 */
export async function getCachedUsageBySource(
  params: UsageBySourceParams
): Promise<SourceUsageRow[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");

  const supabase = createStaticClient();
  return getUsageBySource(supabase, params);
}

// =============================================================================
// Usage conversion (top-percentile penetration)
// =============================================================================

/** Fully-resolved parameters for getCachedUsageConversion. */
export interface UsageConversionParams {
  format: string;
  source: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
  topPct: number; // keys the cache; maps to p_top_percentile
}

/**
 * Cached fetch of species usage-to-top-percentile conversion rates for a format.
 *
 * Returns ConversionRow[] comparing overall usage % vs. usage within the
 * top-percentile finishers to surface over/underperforming species.
 */
export async function getCachedUsageConversion(
  params: UsageConversionParams
): Promise<ConversionRow[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");

  const supabase = createStaticClient();
  return getUsageConversion(supabase, params);
}

// =============================================================================
// Species move combos (Phase 3 — Feature 2)
// =============================================================================

/** Fully-resolved parameters for getCachedSpeciesMoveCombos. */
export interface SpeciesMoveCombosParams {
  format: string;
  species: string;
  source: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
  limit: number;
}

/**
 * Cached fetch of true 4-move combo distribution for one species.
 *
 * All params are fully resolved by the caller so the runtime keys the cache
 * correctly. Species is part of the params object, so combos for different
 * species occupy separate cache entries automatically.
 *
 * Invalidation: invalidateUsageStatsCaches(formats) covers these entries
 * via the existing USAGE_STATS + usageStats(format) tags — no new tag needed.
 */
export async function getCachedSpeciesMoveCombos(
  params: SpeciesMoveCombosParams
): Promise<MoveComboRow[]> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");

  const supabase = createStaticClient();
  return getSpeciesMoveCombos(supabase, params);
}

// =============================================================================
// Species teammates (Phase 3 — Features 3 + 4)
// =============================================================================

/** Fully-resolved parameters for getCachedSpeciesTeammates. */
export interface SpeciesTeammatesParams {
  format: string;
  species: string;
  source: string;
  periodStart: string | undefined;
  periodEnd: string | undefined;
  minPlayers: number;
  topN: number;
}

/**
 * Cached fetch of teammate pair rates + co-occurrence matrix for one species.
 *
 * Returns a SpeciesTeammatesResult with focalPlayers, a teammate list, and a
 * top-N co-occurrence matrix — all in one RPC call. Powers both the teammate
 * constellation (Feature 3) and the core heatmap (Feature 4).
 *
 * Invalidation: covered by the existing USAGE_STATS + usageStats(format) tags.
 */
export async function getCachedSpeciesTeammates(
  params: SpeciesTeammatesParams
): Promise<SpeciesTeammatesResult> {
  "use cache";
  cacheTag(CacheTags.USAGE_STATS, CacheTags.usageStats(params.format));
  cacheLife("hours");

  const supabase = createStaticClient();
  return getSpeciesTeammates(supabase, params);
}
