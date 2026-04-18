/**
 * Stat-tier helpers for the team builder UI.
 *
 * Pure data — no framework imports. Buckets a Pokemon base stat
 * into one of four tiers used by the stats table to color the
 * "Base" stat number. The corresponding color tokens live in
 * `@trainers/theme` (`statLow` / `statMid` / `statGood` / `statGreat`)
 * and are exposed to Tailwind as `text-stat-low`, `text-stat-mid`,
 * `text-stat-good`, `text-stat-great`.
 */

/** Visual tier bucket for a Pokemon base stat value. */
export type StatTier = "low" | "mid" | "good" | "great";

/**
 * Bucket a base stat value into one of four tiers used by the team builder UI.
 *
 * Boundaries:
 *   - `low`   → base ≤ 60
 *   - `mid`   → 60 < base ≤ 90
 *   - `good`  → 90 < base ≤ 120
 *   - `great` → base > 120
 *
 * Negative or non-finite values are coerced to the `low` tier so callers
 * never have to special-case bad data — base stats are always positive
 * integers in practice (canonical range 1–255).
 */
export function getStatTier(base: number): StatTier {
  if (!Number.isFinite(base) || base <= 60) return "low";
  if (base <= 90) return "mid";
  if (base <= 120) return "good";
  return "great";
}
