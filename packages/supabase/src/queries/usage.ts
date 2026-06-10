import type { TypedClient } from "../client";

// =============================================================================
// Types
// =============================================================================

/** One entry in a moves/items/tera_types/abilities breakdown array. */
export type UsageDetailEntry = { value: string; count: number; pct: number };

/** One time-bucket of a species' rollup — drives sparklines and usage % column. */
export interface SpeciesUsagePeriod {
  periodStart: string;
  periodEnd: string;
  usagePct: number;
  rank: number;
  sampleSize: number;
  usageChange7d: number | null;
  usageChange30d: number | null;
  moves: UsageDetailEntry[];
  tera: UsageDetailEntry[];
  items: UsageDetailEntry[];
  abilities: UsageDetailEntry[];
  natures: UsageDetailEntry[];
  /** Ability+item combo entries. Values encoded as "${ability} + ${item}". */
  abilityItems: UsageDetailEntry[];
}

/** Parameters for fetching trailing periods for one species. */
export interface SpeciesUsageDetailParams {
  /** Format ID (e.g. "gen9vgc2025regg"). */
  format: string;
  /** Species name (e.g. "Koraidon"). */
  species: string;
  /** Rollup source. Defaults to "all". */
  source?: string;
  /** Period granularity. Defaults to "week". */
  periodType?: "day" | "week" | "month";
  /** Number of trailing periods to return. Defaults to 12. */
  limit?: number;
  /**
   * Minimum total_players per event-division row.
   * Events with fewer players are excluded. Defaults to 0 (no filter).
   */
  minPlayers?: number;
}

/** One row in the latest-period species ranking for a format. */
export interface FormatUsageRow {
  species: string;
  usagePct: number;
  rank: number;
  usageChange7d: number | null;
}

/** One period bucket with every species' usage % for a format. */
export interface FormatUsageTimeseriesPoint {
  periodStart: string;
  periodEnd: string;
  /** species name -> usage_pct for this period */
  usage: Record<string, number>;
}

/** One species' pipeline data — usage % plus marginal histograms. */
export interface PipelineSpeciesData {
  species: string;
  usagePct: number;
  rank: number;
  abilities: UsageDetailEntry[];
  items: UsageDetailEntry[];
  natures: UsageDetailEntry[];
  moves: UsageDetailEntry[];
  tera: UsageDetailEntry[];
}

/** Result shape returned by `getPipelineData`. */
export interface PipelineDataResult {
  data: PipelineSpeciesData[];
  /** ISO date string for the period start of the resolved bucket. */
  periodStart: string;
  /** ISO date string for the period end of the resolved bucket. */
  periodEnd: string;
}

/** Parameters for `getSpeciesUsage`. */
export interface GetSpeciesUsageParams {
  /** Format ID (e.g. "gen9vgc2025regg"). */
  format: string;
  /** Data source filter. Defaults to "all". */
  source?: string;
  /** Period granularity. Defaults to "week". */
  periodType?: "day" | "week" | "month";
  /**
   * Minimum total_players per event-division row.
   * Events with fewer players are excluded. Defaults to 0 (no filter).
   */
  minPlayers?: number;
}

/** Parameters for `getFormatUsageTimeseries`. */
export interface GetFormatUsageTimeseriesParams {
  /** Format ID (e.g. "gen9vgc2025regg"). */
  format: string;
  /** Data source filter. Defaults to "all". */
  source?: string;
  /** Period granularity. Defaults to "week". */
  periodType?: "day" | "week" | "month";
  /** If provided, restrict to periods >= this date. */
  periodStart?: string;
  /** If provided, restrict to periods <= this date. */
  periodEnd?: string;
  /**
   * Minimum total_players per event-division row.
   * Events with fewer players are excluded. Defaults to 0 (no filter).
   */
  minPlayers?: number;
}

/** Parameters for `getPipelineData`. */
export interface GetPipelineDataParams {
  format: string;
  /** Data source filter. Pass "all" or omit to include all sources. */
  source?: string;
  /** If provided, restricts to periods whose start is >= this date. */
  periodStart?: string;
  /** If provided, restricts to periods whose end is <= this date. */
  periodEnd?: string;
  /**
   * Minimum total_players per event-division row.
   * Events with fewer players are excluded. Defaults to 0 (no filter).
   */
  minPlayers?: number;
}

/** One per-source usage row from get_usage_by_source. */
export interface SourceUsageRow {
  species: string;
  source: string; // 'rk9' | 'limitless' | 'trainers.gg'
  players: number;
  usagePct: number;
}

/** Parameters for getUsageBySource. */
export interface GetUsageBySourceParams {
  format: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
}

/** One per-species conversion row from get_usage_conversion. */
export interface ConversionRow {
  species: string;
  players: number;
  usagePct: number;
  topPlayers: number;
  topField: number;
  topSharePct: number;
  /** NULL when the species has no placement-bearing events. */
  conversionPct: number | null;
  rankedPlayers: number;
}

/** Parameters for getUsageConversion. */
export interface GetUsageConversionParams {
  format: string;
  source?: string;
  periodStart?: string;
  periodEnd?: string;
  minPlayers?: number;
  /** Top percentile in [0,1], e.g. 0.10 for "Top 10%". Maps to p_top_percentile. */
  topPct?: number;
}

/** One distinct event for annotation pins on the usage timeline. */
export interface FormatEvent {
  /** Unique event key, e.g. "rk9:00123" or "limitless:abc". */
  eventKey: string;
  /** ISO date string (YYYY-MM-DD). */
  eventDate: string;
  /** Data source: "rk9" | "limitless" | "trainers.gg". */
  source: string;
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch trailing N periods for one species in a given format.
 *
 * Delegates to the `get_species_usage_detail` RPC, which aggregates usage
 * from the team_slots fact table in SQL. Results are ordered oldest→newest
 * so the series reads left→right for sparklines. Each period includes moves,
 * tera types, items, abilities, natures, and ability+item combos.
 *
 * Used by: builder usage % column, species detail sparklines.
 *
 * @param supabase - Use `createStaticClient()` for public ISR caching.
 * @param params.format - Format ID (e.g. "gen9vgc2025regg").
 * @param params.species - Species name (e.g. "Koraidon").
 * @param params.source - Data source filter. Defaults to "all".
 * @param params.periodType - Period granularity. Defaults to "week".
 * @param params.limit - Trailing periods to return. Defaults to 12.
 * @param params.minPlayers - Minimum players per event-division. Defaults to 0.
 */
export async function getSpeciesUsageDetail(
  supabase: TypedClient,
  params: SpeciesUsageDetailParams
): Promise<SpeciesUsagePeriod[]> {
  const {
    format,
    species,
    source = "all",
    periodType = "week",
    limit = 12,
    minPlayers = 0,
  } = params;

  const { data, error } = await supabase.rpc("get_species_usage_detail", {
    p_format: format,
    p_species: species,
    p_source: source,
    p_period_type: periodType,
    p_limit: limit,
    p_min_players: minPlayers,
  });

  if (error) {
    throw new Error(
      `Failed to fetch species usage detail for ${species} in ${format}: ${error.message}`
    );
  }

  // The RPC returns rows ordered newest→oldest; reverse to oldest→newest so
  // sparkline series reads left→right.
  const rows = (data ?? []).slice().reverse();

  return rows.map((row) => ({
    periodStart: row.period_start,
    periodEnd: row.period_end,
    usagePct: row.usage_pct,
    rank: row.rank,
    sampleSize: row.sample_size,
    usageChange7d: row.usage_change_7d ?? null,
    usageChange30d: row.usage_change_30d ?? null,
    moves: (row.moves as unknown as UsageDetailEntry[]) ?? [],
    tera: (row.tera_types as unknown as UsageDetailEntry[]) ?? [],
    items: (row.items as unknown as UsageDetailEntry[]) ?? [],
    abilities: (row.abilities as unknown as UsageDetailEntry[]) ?? [],
    natures: (row.natures as unknown as UsageDetailEntry[]) ?? [],
    abilityItems: (row.ability_items as unknown as UsageDetailEntry[]) ?? [],
  }));
}

/**
 * Fetch the latest-period species ranking for a format.
 *
 * Delegates to the `get_species_usage` RPC, which reads from the team_slots
 * fact table and returns all species ordered by rank ascending for the most
 * recent period. Returns [] if no data exists yet.
 *
 * Used by: species picker usage % column, format overview.
 *
 * @param supabase - Use `createStaticClient()` for public ISR caching.
 * @param params.format - Format ID (e.g. "gen9vgc2025regg").
 * @param params.source - Data source filter. Defaults to "all".
 * @param params.periodType - Period granularity. Defaults to "week".
 * @param params.minPlayers - Minimum players per event-division. Defaults to 0.
 */
export async function getSpeciesUsage(
  supabase: TypedClient,
  params: GetSpeciesUsageParams
): Promise<FormatUsageRow[]> {
  const {
    format,
    source = "all",
    periodType = "week",
    minPlayers = 0,
  } = params;

  const { data, error } = await supabase.rpc("get_species_usage", {
    p_format: format,
    p_source: source,
    p_period_type: periodType,
    p_min_players: minPlayers,
  });

  if (error) {
    throw new Error(
      `Failed to fetch species usage for ${format}: ${error.message}`
    );
  }

  return (data ?? []).map((row) => ({
    species: row.species,
    usagePct: row.usage_pct,
    rank: row.rank,
    usageChange7d: row.usage_change_7d ?? null,
  }));
}

/**
 * Fetch trailing N periods for every species in a given format.
 *
 * Delegates to the `get_usage_timeseries` RPC, which aggregates usage from
 * the team_slots fact table in SQL and returns one row per (species, period).
 * This function groups rows into `FormatUsageTimeseriesPoint` objects ordered
 * oldest→newest — the all-species × all-periods shape required to render
 * format-wide streamgraphs on the public /data page.
 *
 * Unlike the previous rollup-table approach, aggregation now happens entirely
 * in SQL, eliminating multi-query chunking and PostgREST URI-length issues.
 *
 * @param supabase - Use `createStaticClient()` for public ISR caching.
 * @param params.format - Format ID (e.g. "gen9vgc2025regg").
 * @param params.source - Data source filter. Defaults to "all".
 * @param params.periodType - Period granularity. Defaults to "week".
 * @param params.periodStart - If provided, restrict to periods >= this date.
 * @param params.periodEnd - If provided, restrict to periods <= this date.
 * @param params.minPlayers - Minimum players per event-division. Defaults to 0.
 */
export async function getFormatUsageTimeseries(
  supabase: TypedClient,
  params: GetFormatUsageTimeseriesParams
): Promise<FormatUsageTimeseriesPoint[]> {
  const {
    format,
    source = "all",
    periodType = "week",
    periodStart,
    periodEnd,
    minPlayers = 0,
  } = params;

  const { data, error } = await supabase.rpc("get_usage_timeseries", {
    p_format: format,
    p_source: source,
    p_period_type: periodType,
    p_start: periodStart,
    p_end: periodEnd,
    p_min_players: minPlayers,
  });

  if (error) {
    throw new Error(
      `Failed to fetch usage timeseries for ${format}: ${error.message}`
    );
  }

  if (!data || data.length === 0) return [];

  // Group flat (species, period) rows into one point per period.
  // The RPC returns rows ordered by period_start; we build the map in order
  // and produce an oldest→newest array at the end.
  const pointMap = new Map<
    string,
    { periodStart: string; periodEnd: string; usage: Record<string, number> }
  >();

  for (const row of data) {
    let point = pointMap.get(row.period_start);
    if (!point) {
      point = {
        periodStart: row.period_start,
        periodEnd: row.period_end,
        usage: {},
      };
      pointMap.set(row.period_start, point);
    }
    point.usage[row.species] = row.usage_pct;
  }

  // Convert to array; Map preserves insertion order so ordering matches RPC output.
  return Array.from(pointMap.values());
}

/**
 * Fetch all species + histogram data for a single period in a given format.
 *
 * Delegates to the `get_usage_pipeline` RPC, which reads the team_slots fact
 * table and returns the full Species → Ability / Nature / Move histograms
 * needed to render the Meta Pipeline Sankey. Aggregation (including
 * minPlayers filtering) happens in SQL — no multi-query fan-out needed.
 *
 * Returns `null` when zero rows match the given filters (no data yet).
 *
 * @param supabase - Use `createStaticClient()` for public ISR caching.
 * @param params.format - Format ID (e.g. "gen9vgc2025regg").
 * @param params.source - Data source filter. Defaults to "all".
 * @param params.periodStart - If provided, restrict to periods >= this date.
 * @param params.periodEnd - If provided, restrict to periods <= this date.
 * @param params.minPlayers - Minimum players per event-division. Defaults to 0.
 */
export async function getPipelineData(
  supabase: TypedClient,
  params: GetPipelineDataParams
): Promise<PipelineDataResult | null> {
  const {
    format,
    source = "all",
    periodStart,
    periodEnd,
    minPlayers = 0,
  } = params;

  const { data, error } = await supabase.rpc("get_usage_pipeline", {
    p_format: format,
    p_source: source,
    p_start: periodStart,
    p_end: periodEnd,
    p_min_players: minPlayers,
  });

  if (error) {
    throw new Error(
      `Failed to fetch pipeline data for ${format}: ${error.message}`
    );
  }

  if (!data || data.length === 0) return null;

  // Extract period bounds from the first row — all rows in one RPC call share
  // the same resolved period (the RPC resolves a single period internally).
  const periodStartOut = data[0]!.period_start;
  const periodEndOut = data[0]!.period_end;

  const species: PipelineSpeciesData[] = data.map((row) => ({
    species: row.species,
    usagePct: row.usage_pct,
    rank: row.rank,
    abilities: (row.abilities as unknown as UsageDetailEntry[]) ?? [],
    items: (row.items as unknown as UsageDetailEntry[]) ?? [],
    natures: (row.natures as unknown as UsageDetailEntry[]) ?? [],
    moves: (row.moves as unknown as UsageDetailEntry[]) ?? [],
    tera: (row.tera_types as unknown as UsageDetailEntry[]) ?? [],
  }));

  return {
    data: species,
    periodStart: periodStartOut,
    periodEnd: periodEndOut,
  };
}

/**
 * Fetch distinct events for a format, used to render annotation pins on the
 * usage timeline. Delegates to the `get_format_events` RPC, which returns one
 * row per distinct (event_key, event_date, source) ordered by event_date — see
 * the migration for why a DISTINCT RPC is used instead of a raw table select.
 *
 * @param supabase - Use `createStaticClient()` for public ISR caching.
 * @param format - Format ID (e.g. "gen9vgc2025regg").
 */
export async function getFormatEvents(
  supabase: TypedClient,
  format: string
): Promise<FormatEvent[]> {
  const { data, error } = await supabase.rpc("get_format_events", {
    p_format: format,
  });

  if (error) {
    throw new Error(
      `Failed to fetch events for format ${format}: ${error.message}`
    );
  }

  return (data ?? []).map((row) => ({
    eventKey: row.event_key,
    eventDate: row.event_date,
    source: row.source,
  }));
}

/**
 * Fetch per-source usage breakdown for each species in a given format.
 *
 * Delegates to the `get_usage_by_source` RPC, which returns one row per
 * (species, source) so callers can compare RK9, Limitless, and trainers.gg
 * usage side-by-side without a separate aggregation step.
 *
 * @param supabase - Use `createStaticClient()` for public ISR caching.
 * @param params.format - Format ID (e.g. "gen9vgc2025regg").
 * @param params.periodStart - If provided, restrict to periods >= this date.
 * @param params.periodEnd - If provided, restrict to periods <= this date.
 * @param params.minPlayers - Minimum players per event-division. Defaults to 0.
 */
export async function getUsageBySource(
  supabase: TypedClient,
  params: GetUsageBySourceParams
): Promise<SourceUsageRow[]> {
  const { format, periodStart, periodEnd, minPlayers = 0 } = params;

  const { data, error } = await supabase.rpc("get_usage_by_source", {
    p_format: format,
    p_start: periodStart,
    p_end: periodEnd,
    p_min_players: minPlayers,
  });

  if (error) {
    throw new Error(
      `Failed to fetch usage by source for ${format}: ${error.message}`
    );
  }

  return (data ?? []).map((row) => ({
    species: row.species,
    source: row.source,
    players: Number(row.players),
    usagePct: Number(row.usage_pct),
  }));
}

/**
 * Fetch per-species conversion rates (usage → top placement) for a format.
 *
 * Delegates to the `get_usage_conversion` RPC, which returns one row per
 * species with both usage statistics and top-placement conversion metrics.
 * `conversionPct` is null when the species has no placement-bearing events —
 * callers must handle this case and never coalesce it to 0.
 *
 * @param supabase - Use `createStaticClient()` for public ISR caching.
 * @param params.format - Format ID (e.g. "gen9vgc2025regg").
 * @param params.source - Data source filter. Defaults to "all".
 * @param params.periodStart - If provided, restrict to periods >= this date.
 * @param params.periodEnd - If provided, restrict to periods <= this date.
 * @param params.minPlayers - Minimum players per event-division. Defaults to 0.
 * @param params.topPct - Top percentile threshold in [0,1], e.g. 0.10 for "Top 10%". Defaults to 0.10.
 */
export async function getUsageConversion(
  supabase: TypedClient,
  params: GetUsageConversionParams
): Promise<ConversionRow[]> {
  const {
    format,
    source = "all",
    periodStart,
    periodEnd,
    minPlayers = 0,
    topPct = 0.1,
  } = params;

  const { data, error } = await supabase.rpc("get_usage_conversion", {
    p_format: format,
    p_source: source,
    p_start: periodStart,
    p_end: periodEnd,
    p_min_players: minPlayers,
    p_top_percentile: topPct,
  });

  if (error) {
    throw new Error(
      `Failed to fetch usage conversion for ${format}: ${error.message}`
    );
  }

  return (data ?? []).map((row) => ({
    species: row.species,
    players: Number(row.players),
    usagePct: Number(row.usage_pct),
    topPlayers: Number(row.top_players),
    topField: Number(row.top_field),
    topSharePct: Number(row.top_share_pct),
    conversionPct:
      row.conversion_pct === null ? null : Number(row.conversion_pct),
    rankedPlayers: Number(row.ranked_players),
  }));
}
