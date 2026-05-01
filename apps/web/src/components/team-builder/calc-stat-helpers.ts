import {
  calculateHP,
  calculateStat,
  calculateChampionsHP,
  calculateChampionsStat,
  getNatureMultiplier,
} from "@trainers/pokemon";

import { type StatValues } from "./stat-types";

// =============================================================================
// computeStat
// =============================================================================

interface ComputeStatOptions {
  statKey: string;
  base: number;
  iv: number;
  ev: number;
  nature: string;
  level: number;
  isChampions: boolean;
}

/**
 * Compute the final stat value for a single stat, handling both Showdown EV
 * and Champions SP systems.
 *
 * Used by both `stats-lane.tsx` (attacker spread) and
 * `calc-defender-stats.tsx` (defender spread).
 */
export function computeStat({
  statKey,
  base,
  iv,
  ev,
  nature,
  level,
  isChampions,
}: ComputeStatOptions): number {
  if (isChampions) {
    if (statKey === "hp") return calculateChampionsHP(base, ev);
    const mult = getNatureMultiplier(
      nature,
      statKey as keyof Omit<StatValues, "hp">
    );
    return calculateChampionsStat(base, ev, mult);
  }

  if (statKey === "hp") return calculateHP(base, iv, ev, level);
  const mult = getNatureMultiplier(
    nature,
    statKey as keyof Omit<StatValues, "hp">
  );
  return calculateStat(base, iv, ev, level, mult);
}

// =============================================================================
// buildInputDisplay
// =============================================================================

/**
 * Build the display string for the EV/SP number input from the current value
 * plus the nature affinity on that stat.
 *
 * Examples:
 *   ev=0, neutral  → ""
 *   ev=0, boosted  → "+"
 *   ev=0, reduced  → "−"
 *   ev=100, neutral → "100"
 *   ev=100, boosted → "100+"
 *   ev=100, reduced → "100−"
 *
 * Used by both `stats-lane.tsx` (attacker spread) and
 * `calc-defender-stats.tsx` (defender spread).
 */
export function buildInputDisplay(
  ev: number,
  isNatureBoosted: boolean,
  isNatureReduced: boolean
): string {
  const suffix = isNatureBoosted ? "+" : isNatureReduced ? "−" : "";
  if (ev === 0) return suffix;
  return `${ev}${suffix}`;
}

// =============================================================================
// computeVizBarWidths
// =============================================================================

/**
 * Compute the two layer widths (percentage, 0–100) for the stat viz bar.
 *
 * The bar maps 0 → 250 final-stat space to 0 → 100%.
 * - `baseLayerWidth`: solid layer up to the no-EV stat.
 * - `investLayerLeft`: where the striped invest layer starts (= baseLayerWidth).
 * - `investLayerWidth`: width of the striped invest layer (delta from base to
 *   current stat, clamped so both layers stay within [0, 100]).
 *
 * Used by both `stats-lane.tsx` (attacker spread) and
 * `calc-defender-stats.tsx` (defender spread).
 */
export function computeVizBarWidths(
  finalStat: number,
  noEvFinalStat: number
): { baseLayerWidth: number; investLayerLeft: number; investLayerWidth: number } {
  const baseLayerWidth = Math.min(100, (noEvFinalStat / 250) * 100);
  const investLayerLeft = baseLayerWidth;
  const investLayerWidth = Math.max(
    0,
    Math.min(100, (finalStat / 250) * 100) - baseLayerWidth
  );
  return { baseLayerWidth, investLayerLeft, investLayerWidth };
}

// =============================================================================
// computeInvestBudget
// =============================================================================

/**
 * Compute the effective EV/SP budget available for a single stat, given the
 * total already invested and the per-format caps.
 *
 * Used by both `stats-lane.tsx` (attacker spread) and
 * `calc-defender-stats.tsx` (defender spread).
 *
 * @param totalEv      - Sum of all stat investments.
 * @param ev           - Investment on this stat (subtracted from totalEv to get others).
 * @param totalMax     - Total budget cap (508 for VGC EV, 66 for Champions SP, 510 for defender).
 * @param perStatMax   - Per-stat cap (252 for VGC, 32 for Champions).
 */
export function computeInvestBudget(
  totalEv: number,
  ev: number,
  totalMax: number,
  perStatMax: number
): number {
  const otherEvs = totalEv - ev;
  const remaining = Math.max(0, totalMax - otherEvs);
  return Math.min(perStatMax, remaining);
}
