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
        natures
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
