import { getFormatById } from "@trainers/pokemon";
import { type PipelineSpeciesData } from "@trainers/supabase";

// =============================================================================
// Defaults
// =============================================================================

export const DEFAULT_FORMAT = "gen9championsvgc2026regma";
export const DEFAULT_SOURCE = "all";
export const DEFAULT_PERIOD_TYPE = "week";
export const DEFAULT_THRESHOLD = 2;

// =============================================================================
// Allowed value sets
// =============================================================================

export const VALID_SOURCES = [
  "all",
  "rk9",
  "limitless",
  "trainers.gg",
] as const;

export const VALID_PERIOD_TYPES = ["day", "week", "month"] as const;

// =============================================================================
// Shared filter types (moved here from usage-controls.tsx)
// =============================================================================

export type PeriodType = (typeof VALID_PERIOD_TYPES)[number];
export type UsageSource = (typeof VALID_SOURCES)[number];

/** Shape carried in URL state and passed to DataSidebar. */
export interface UsageFilters {
  format: string;
  source: UsageSource;
  periodType: PeriodType;
}

// =============================================================================
// Preset helpers
// =============================================================================

export type DataPreset = "top10" | "top20" | "top50" | "all";

const PRESET_LIMITS: Record<DataPreset, number> = {
  top10: 10,
  top20: 20,
  top50: 50,
  all: Infinity,
};

/**
 * Returns the species names from `data` that correspond to the given preset.
 * Data is assumed to be sorted by usage descending (rank ascending).
 */
export function applyPreset(
  data: PipelineSpeciesData[],
  preset: DataPreset
): string[] {
  return data.slice(0, PRESET_LIMITS[preset]).map((s) => s.species);
}

/**
 * Returns the active preset name if `selected` exactly matches one of the
 * preset sets derived from `data`, otherwise returns null.
 * Order-insensitive: checks set membership, not array order.
 *
 * Presets are evaluated in this priority order: top10 → top20 → all → top50.
 * "all" is placed before "top50" so that selecting an entire dataset that is
 * smaller than 50 items is labelled "all" rather than "top50". "top10" and
 * "top20" come first because when the dataset is smaller than their limits,
 * the tightest numbered preset takes priority over "all".
 */
export function getActivePreset(
  data: PipelineSpeciesData[],
  selected: string[]
): DataPreset | null {
  if (selected.length === 0) return null;
  const selectedSet = new Set(selected);

  for (const preset of ["top10", "top20", "all", "top50"] as DataPreset[]) {
    const expected = applyPreset(data, preset);
    if (
      expected.length === selectedSet.size &&
      expected.every((s) => selectedSet.has(s))
    ) {
      return preset;
    }
  }
  return null;
}

// =============================================================================
// Validators
// =============================================================================

/**
 * Returns true if `id` resolves to a known format via `getFormatById`.
 *
 * Callers can use this to gate queries on user-supplied format strings
 * before forwarding them to the database.
 */
export function isValidFormat(id: string): boolean {
  return getFormatById(id) !== undefined;
}

// =============================================================================
// Coercers — return a valid value or the default (never throw)
// =============================================================================

/**
 * Coerces a raw string to a known format ID.
 *
 * Returns `DEFAULT_FORMAT` when `raw` is undefined, empty, or resolves to
 * an unknown format.
 */
export function coerceFormat(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return DEFAULT_FORMAT;
  const trimmed = raw.trim();
  return isValidFormat(trimmed) ? trimmed : DEFAULT_FORMAT;
}

/**
 * Translates a UI source value to the DB-stored identifier.
 * The UI uses "trainers.gg" for first-party data; the DB stores "first_party".
 */
export function toDBSource(source: string): string {
  return source === "trainers.gg" ? "first_party" : source;
}

/**
 * Coerces a raw string to a valid `UsageSource`.
 *
 * Returns `DEFAULT_SOURCE` when `raw` is not one of the allowed values.
 */
export function coerceSource(
  raw: string | undefined | null
): (typeof VALID_SOURCES)[number] {
  if (raw && (VALID_SOURCES as readonly string[]).includes(raw)) {
    return raw as (typeof VALID_SOURCES)[number];
  }
  return DEFAULT_SOURCE;
}

/**
 * Coerces a raw string to a valid period type.
 *
 * Returns `DEFAULT_PERIOD_TYPE` when `raw` is not one of the allowed values.
 */
export function coercePeriodType(
  raw: string | undefined | null
): (typeof VALID_PERIOD_TYPES)[number] {
  if (raw && (VALID_PERIOD_TYPES as readonly string[]).includes(raw)) {
    return raw as (typeof VALID_PERIOD_TYPES)[number];
  }
  return DEFAULT_PERIOD_TYPE;
}

/**
 * Coerces a raw string to a threshold number, clamped to [1, 20].
 *
 * Returns `DEFAULT_THRESHOLD` when `raw` is undefined, non-numeric, or NaN.
 * The [1, 20] range matches the Min-usage slider (spec: "≥1%–20%, default 2%").
 */
export function coerceThreshold(raw: string | undefined | null): number {
  if (raw === undefined || raw === null) return DEFAULT_THRESHOLD;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return DEFAULT_THRESHOLD;
  return Math.min(20, Math.max(1, parsed));
}

// =============================================================================
// Species selection + time range coercers
// =============================================================================

/**
 * Coerces a comma-separated raw string to an array of species names.
 *
 * Returns `[]` when `raw` is null, empty, or contains only whitespace/commas.
 * Each name is trimmed; empty strings after trimming are discarded.
 */
export function coerceSelectedSpecies(
  raw: string | undefined | null
): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Coerces a raw string to a strict ISO date string (YYYY-MM-DD).
 *
 * Returns `null` when `raw` is absent/empty. A non-empty value that is not a
 * valid `YYYY-MM-DD` date is rejected (returns null) and logged — the only
 * legitimate source of this URL param is the chart brush, which always emits
 * `YYYY-MM-DD`, so a non-ISO value means a malformed/tampered query string.
 */
export function coerceRangeStart(
  raw: string | undefined | null
): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    console.warn(`coerceRangeStart: rejected non-ISO date param "${trimmed}"`);
    return null;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    console.warn(`coerceRangeStart: rejected invalid date param "${trimmed}"`);
    return null;
  }
  return trimmed;
}

/**
 * Coerces a raw string to a valid ISO date string (YYYY-MM-DD).
 *
 * Identical behaviour to `coerceRangeStart` — both coercers validate the same
 * way; separate functions keep call-sites self-documenting.
 */
export function coerceRangeEnd(raw: string | undefined | null): string | null {
  return coerceRangeStart(raw);
}

// =============================================================================
// Pipeline column configuration
// =============================================================================

export type PipelineColumn = "ability" | "item" | "nature" | "move";

export const ALL_PIPELINE_COLUMNS: PipelineColumn[] = [
  "ability",
  "item",
  "nature",
  "move",
];

export const DEFAULT_PIPELINE_COLUMNS: PipelineColumn[] = [
  ...ALL_PIPELINE_COLUMNS,
];

export function coerceColumns(raw: string | undefined): PipelineColumn[] {
  if (!raw) return DEFAULT_PIPELINE_COLUMNS;
  const valid = new Set<string>(ALL_PIPELINE_COLUMNS);
  const parsed = raw
    .split(",")
    .map((c) => c.trim())
    .filter((c) => valid.has(c)) as PipelineColumn[];
  // Deduplicate while preserving order
  const seen = new Set<string>();
  const deduped = parsed.filter((c) => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
  return deduped.length > 0 ? deduped : DEFAULT_PIPELINE_COLUMNS;
}

// =============================================================================
// Min-players filter
// =============================================================================

/** Default minimum tournament size for the /data pipeline filter. */
export const DEFAULT_MIN_PLAYERS = 64;

/**
 * Parse and validate the "minPlayers" URL param.
 * Must be a non-negative integer. Defaults to DEFAULT_MIN_PLAYERS.
 */
export function coerceMinPlayers(raw: string | null | undefined): number {
  if (!raw) return DEFAULT_MIN_PLAYERS;
  // Number (not parseInt) so "12.5"/"1e2" aren't silently truncated to a wrong
  // value; reject non-integers. Mirrors the sidebar input handler.
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_MIN_PLAYERS;
}
