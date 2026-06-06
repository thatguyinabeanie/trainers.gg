import { getFormatById } from "@trainers/pokemon";

// =============================================================================
// Defaults
// =============================================================================

export const DEFAULT_FORMAT = "gen9championsvgc2026regma";
export const DEFAULT_SOURCE = "all";
export const DEFAULT_PERIOD_TYPE = "week";
export const DEFAULT_THRESHOLD = 1;

// =============================================================================
// Allowed value sets
// =============================================================================

export const VALID_SOURCES = [
  "all",
  "rk9",
  "limitless",
  "first_party",
] as const;

export const VALID_PERIOD_TYPES = ["day", "week", "month"] as const;

export const VALID_MODES = ["stream", "stacked", "lines"] as const;

/** The chart display mode. */
export type ChartMode = (typeof VALID_MODES)[number];

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
 * Coerces a raw string to a valid `ChartMode`.
 *
 * Returns `"stream"` when `raw` is not one of the allowed values.
 */
export function coerceMode(raw: string | undefined | null): ChartMode {
  if (raw && (VALID_MODES as readonly string[]).includes(raw)) {
    return raw as ChartMode;
  }
  return "stream";
}

/**
 * Coerces a raw string to a threshold number, clamped to [0, 10].
 *
 * Returns `DEFAULT_THRESHOLD` when `raw` is undefined, non-numeric, or NaN.
 * Clamps the parsed value to [0, 10] inclusive.
 */
export function coerceThreshold(raw: string | undefined | null): number {
  if (raw === undefined || raw === null) return DEFAULT_THRESHOLD;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return DEFAULT_THRESHOLD;
  return Math.min(10, Math.max(0, parsed));
}
