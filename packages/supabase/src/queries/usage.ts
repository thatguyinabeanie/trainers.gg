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
}

/** Result shape returned by `getPipelineData`. */
export interface PipelineDataResult {
  data: PipelineSpeciesData[];
  /** ISO date string for the period start of the resolved bucket. */
  periodStart: string;
  /** ISO date string for the period end of the resolved bucket. */
  periodEnd: string;
}

/** Parameters for `getPipelineData`. */
export interface GetPipelineDataParams {
  format: string;
  source: string;
  periodType: "day" | "week" | "month";
  /** If provided, resolves the latest period whose start is >= this date. */
  periodStart?: string;
  /** If provided, restricts to periods whose end is <= this date. */
  periodEnd?: string;
}

/** One distinct event for annotation pins on the usage timeline. */
export interface FormatEvent {
  /** Unique event key, e.g. "rk9:00123" or "limitless:abc". */
  eventKey: string;
  /** ISO date string (YYYY-MM-DD). */
  eventDate: string;
  /** Data source: "rk9" | "limitless" | "first_party". */
  source: string;
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Fetch trailing N periods for one species in a given format.
 *
 * Results are ordered oldest→newest so the series reads left→right for
 * sparklines. Each period includes moves, tera types, and items breakdowns
 * from pokemon_detail_stats. If no detail row exists for a period the
 * breakdown arrays default to [].
 *
 * Used by: builder usage % column, species detail sparklines.
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
  } = params;

  const { data, error } = await supabase
    .from("format_meta_stats")
    .select(
      `
      period_start,
      period_end,
      pokemon_usage_stats!inner(
        usage_pct,
        rank,
        usage_change_7d,
        usage_change_30d,
        sample_size
      ),
      pokemon_detail_stats(
        moves,
        tera_types,
        items,
        abilities,
        natures,
        ability_items
      )
    `
    )
    .eq("format", format)
    .eq("source", source)
    .eq("period_type", periodType)
    .eq("pokemon_usage_stats.species", species)
    .eq("pokemon_detail_stats.species", species)
    .order("period_start", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(
      `Failed to fetch species usage detail for ${species} in ${format}: ${error.message}`
    );
  }

  // Reverse to oldest→newest so the sparkline series reads left→right.
  const rows = (data ?? []).reverse();

  return rows.map((row) => {
    // PostgREST returns embedded arrays for 1:many; for !inner the matched row
    // is an array with exactly one element.
    const usageRow = Array.isArray(row.pokemon_usage_stats)
      ? row.pokemon_usage_stats[0]
      : row.pokemon_usage_stats;

    const detailRow = Array.isArray(row.pokemon_detail_stats)
      ? row.pokemon_detail_stats[0]
      : row.pokemon_detail_stats;

    return {
      periodStart: row.period_start,
      periodEnd: row.period_end,
      usagePct: usageRow?.usage_pct ?? 0,
      rank: usageRow?.rank ?? 0,
      sampleSize: usageRow?.sample_size ?? 0,
      usageChange7d: usageRow?.usage_change_7d ?? null,
      usageChange30d: usageRow?.usage_change_30d ?? null,
      moves: (detailRow?.moves as UsageDetailEntry[] | null) ?? [],
      tera: (detailRow?.tera_types as UsageDetailEntry[] | null) ?? [],
      items: (detailRow?.items as UsageDetailEntry[] | null) ?? [],
      abilities: (detailRow?.abilities as UsageDetailEntry[] | null) ?? [],
      natures: (detailRow?.natures as UsageDetailEntry[] | null) ?? [],
      abilityItems:
        (detailRow?.ability_items as UsageDetailEntry[] | null) ?? [],
    };
  });
}

/**
 * Fetch the latest-period species ranking for a format.
 *
 * Finds the most-recent period_start for the given (format, source,
 * period_type) combination and returns all species usage rows ordered by
 * rank ascending. Returns [] if no meta row exists yet.
 *
 * Used by: species picker usage % column, format overview.
 */
export async function getSpeciesUsage(
  supabase: TypedClient,
  params: {
    format: string;
    source?: string;
    periodType?: "day" | "week" | "month";
  }
): Promise<FormatUsageRow[]> {
  const { format, source = "all", periodType = "week" } = params;

  // Find the latest period bucket.
  const { data: latestMeta, error: metaError } = await supabase
    .from("format_meta_stats")
    .select("id")
    .eq("format", format)
    .eq("source", source)
    .eq("period_type", periodType)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (metaError) {
    throw new Error(
      `Failed to fetch latest meta bucket for ${format}: ${metaError.message}`
    );
  }

  // No data yet for this format/source/periodType combination.
  if (!latestMeta) return [];

  const { data: usageRows, error: usageError } = await supabase
    .from("pokemon_usage_stats")
    .select("species, usage_pct, rank, usage_change_7d")
    .eq("meta_id", latestMeta.id)
    .order("rank", { ascending: true });

  if (usageError) {
    throw new Error(
      `Failed to fetch species usage for meta ${latestMeta.id}: ${usageError.message}`
    );
  }

  return (usageRows ?? []).map((row) => ({
    species: row.species,
    usagePct: row.usage_pct,
    rank: row.rank,
    usageChange7d: row.usage_change_7d ?? null,
  }));
}

/**
 * Fetch trailing N periods for every species in a given format.
 *
 * Returns one `FormatUsageTimeseriesPoint` per period bucket, ordered
 * oldest→newest (left→right), each containing a `usage` map of
 * `species → usage_pct`.  This is the all-species × all-periods variant
 * used to render format-wide streamgraphs on the public /data page.
 *
 * Unlike `getSpeciesUsageDetail` (single-species) or `getSpeciesUsage`
 * (latest period only), this query returns the full cross-product needed
 * to build a time-series visualisation for every tracked species at once.
 *
 * Two separate queries are used instead of a single embedded-row query to
 * avoid PostgREST's embedded-row cap. A single embedded query for
 * 16 periods × ~200 species silently truncates the later periods, producing
 * an incomplete timeseries without surfacing an error. Splitting into a
 * meta query + a chunked usage-stats query avoids this problem entirely.
 *
 * @param supabase - Typed Supabase client (use `createStaticClient()` for
 *   public ISR caching — this data is the same for all viewers).
 * @param params.format - Format ID (e.g. "gen9vgc2025regg").
 * @param params.source - Rollup source. Defaults to "all".
 * @param params.periodType - Period granularity. Defaults to "week".
 * @param params.limit - Trailing periods to return. Defaults to 16.
 */
export async function getFormatUsageTimeseries(
  supabase: TypedClient,
  params: {
    format: string;
    source?: string;
    periodType?: "day" | "week" | "month";
    limit?: number;
  }
): Promise<FormatUsageTimeseriesPoint[]> {
  const { format, source = "all", periodType = "week", limit = 16 } = params;

  // ── Query 1: fetch the trailing N meta rows ────────────────────────────────
  // Order desc so the DB returns newest-first; we reverse below to get the
  // oldest→newest order required by the chart.
  const { data: metaRows, error: metaError } = await supabase
    .from("format_meta_stats")
    .select("id, period_start, period_end")
    .eq("format", format)
    .eq("source", source)
    .eq("period_type", periodType)
    .order("period_start", { ascending: false })
    .limit(limit);

  if (metaError) {
    throw new Error(
      `Failed to fetch format meta stats for ${format}: ${metaError.message}`
    );
  }

  // No periods exist yet for this format/source/periodType combination.
  if (!metaRows || metaRows.length === 0) return [];

  // Reverse to oldest→newest so the streamgraph series reads left→right.
  const orderedMeta = [...metaRows].reverse();
  const metaIds = orderedMeta.map((r) => r.id);

  // ── Query 2: fetch all usage rows for these meta IDs (chunked) ─────────────
  // Chunking prevents PostgREST "URI too long" errors when the id list is large.
  // The chunk helper throws on any chunk error so partial results are impossible.
  const usageRows = await _fetchUsageRowsInChunks(supabase, metaIds);

  // Group usage rows by meta_id for fast lookup when building the timeseries.
  const usageByMetaId = new Map<
    number,
    Array<{ species: string; usage_pct: number }>
  >();
  for (const row of usageRows) {
    let bucket = usageByMetaId.get(row.meta_id);
    if (!bucket) {
      bucket = [];
      usageByMetaId.set(row.meta_id, bucket);
    }
    bucket.push({ species: row.species, usage_pct: row.usage_pct });
  }

  // Build one `FormatUsageTimeseriesPoint` per meta row.
  return orderedMeta.map((meta) => {
    const entries = usageByMetaId.get(meta.id) ?? [];
    const usage: Record<string, number> = {};
    for (const entry of entries) {
      usage[entry.species] = entry.usage_pct;
    }
    return {
      periodStart: meta.period_start,
      periodEnd: meta.period_end,
      usage,
    };
  });
}

/**
 * Fetch all species + histogram data for a single period in a given format.
 *
 * Resolves the latest `format_meta_stats` row matching the given
 * (format, source, period_type) — optionally restricted to a date range.
 * Returns the full Species → Ability / Nature / Move histograms needed to
 * render the Meta Pipeline Sankey. Returns `null` if no matching period exists.
 *
 * Three queries are used:
 *   1. Resolve the latest matching meta bucket (maybeSingle).
 *   2. Fetch all pokemon_usage_stats for that bucket.
 *   3. Fetch all pokemon_detail_stats for that bucket.
 *
 * @param supabase - Use `createStaticClient()` for public ISR caching.
 */
export async function getPipelineData(
  supabase: TypedClient,
  params: GetPipelineDataParams
): Promise<PipelineDataResult | null> {
  const { format, source, periodType, periodStart, periodEnd } = params;

  // ── Query 1: resolve latest matching meta bucket ──────────────────────────
  let metaQuery = supabase
    .from("format_meta_stats")
    .select("id, period_start, period_end")
    .eq("format", format)
    .eq("source", source)
    .eq("period_type", periodType)
    .order("period_start", { ascending: false });

  if (periodStart) {
    metaQuery = metaQuery.gte("period_start", periodStart);
  }
  if (periodEnd) {
    metaQuery = metaQuery.lte("period_end", periodEnd);
  }

  const { data: metaRow, error: metaError } = await metaQuery
    .limit(1)
    .maybeSingle();

  if (metaError) {
    throw new Error(
      `Failed to fetch meta bucket for pipeline data (${format}): ${metaError.message}`
    );
  }

  if (!metaRow) return null;

  // ── Queries 2 + 3: fetch usage and detail rows in parallel ───────────────
  const [
    { data: usageRows, error: usageError },
    { data: detailRows, error: detailError },
  ] = await Promise.all([
    supabase
      .from("pokemon_usage_stats")
      .select("species, usage_pct, rank")
      .eq("meta_id", metaRow.id)
      .order("rank", { ascending: true }),
    supabase
      .from("pokemon_detail_stats")
      .select("species, abilities, items, natures, moves")
      .eq("meta_id", metaRow.id),
  ]);

  if (usageError) {
    throw new Error(
      `Failed to fetch usage stats for meta ${metaRow.id}: ${usageError.message}`
    );
  }

  if (detailError) {
    throw new Error(
      `Failed to fetch detail stats for meta ${metaRow.id}: ${detailError.message}`
    );
  }

  // Index detail rows by species for O(1) lookup.
  const detailBySpecies = new Map(
    (detailRows ?? []).map((d) => [d.species, d])
  );

  const data: PipelineSpeciesData[] = (usageRows ?? []).map((row) => {
    const detail = detailBySpecies.get(row.species);
    return {
      species: row.species,
      usagePct: row.usage_pct,
      rank: row.rank,
      abilities: (detail?.abilities as UsageDetailEntry[] | null) ?? [],
      items: (detail?.items as UsageDetailEntry[] | null) ?? [],
      natures: (detail?.natures as UsageDetailEntry[] | null) ?? [],
      moves: (detail?.moves as UsageDetailEntry[] | null) ?? [],
    };
  });

  return {
    data,
    periodStart: metaRow.period_start,
    periodEnd: metaRow.period_end,
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

// =============================================================================
// Internal helpers
// =============================================================================

/** Max ids per PostgREST `.in()` filter to avoid "URI too long" errors. */
const IN_QUERY_CHUNK_SIZE = 100;

/** Split `items` into fixed-size chunks (the last chunk may be smaller). */
function _chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fetch `pokemon_usage_stats` rows for the given meta IDs, chunked to stay
 * within PostgREST's URI length limit. Throws on the first chunk error so
 * partial results are impossible.
 *
 * Exported only for unit-testing — callers outside this module should use
 * `getFormatUsageTimeseries` directly.
 */
export async function _fetchUsageRowsInChunks(
  supabase: TypedClient,
  metaIds: number[]
): Promise<Array<{ meta_id: number; species: string; usage_pct: number }>> {
  const rows: Array<{ meta_id: number; species: string; usage_pct: number }> =
    [];

  for (const idChunk of _chunk(metaIds, IN_QUERY_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from("pokemon_usage_stats")
      .select("meta_id, species, usage_pct")
      .in("meta_id", idChunk);

    if (error) {
      throw new Error(
        `Failed to fetch pokemon usage stats for meta IDs [${idChunk.join(", ")}]: ${error.message}`
      );
    }

    if (data) rows.push(...data);
  }

  return rows;
}
