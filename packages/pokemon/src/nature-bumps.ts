/**
 * Stat breakpoint calculator
 *
 * Identifies EV/SP values where the displayed final stat ticks up by 1
 * compared to the previous investment step.
 *
 * Used to render tick marks on the stat-investment slider so players can land
 * precisely on a +1-stat boundary.
 */

import {
  calculateHP,
  calculateStat,
  calculateChampionsHP,
  calculateChampionsStat,
} from "./stats-calculator";

export interface FindStatBreakpointsArgs {
  statKey:
    | "hp"
    | "attack"
    | "defense"
    | "specialAttack"
    | "specialDefense"
    | "speed";
  base: number;
  /** Ignored in Champions (Champions formula has IVs baked in). VGC default 31. */
  iv: number;
  /** Ignored in Champions (Champions is fixed level 50). */
  level: number;
  /**
   * Stat-specific nature multiplier: 1.1 (boosted), 1.0 (neutral), 0.9 (reduced).
   * HP ignores this internally — pass 1.0 for HP.
   */
  natureMultiplier: number;
  /** Per-stat investment cap (e.g. 252 for VGC EV, 32 for Champions SP). */
  perStatMax: number;
  /** Investment increment (e.g. 4 for VGC EV, 1 for Champions SP). */
  step: number;
  /** Switches between calculateChampions* and calculateHP/calculateStat helpers. */
  isChampions: boolean;
}

function computeStatAt(ev: number, args: FindStatBreakpointsArgs): number {
  const { statKey, base, iv, level, natureMultiplier, isChampions } = args;
  if (isChampions) {
    if (statKey === "hp") return calculateChampionsHP(base, ev);
    return calculateChampionsStat(base, ev, natureMultiplier);
  }
  if (statKey === "hp") return calculateHP(base, iv, ev, level);
  return calculateStat(base, iv, ev, level, natureMultiplier);
}

/**
 * Returns the EV/SP values where the displayed final stat would tick up by 1
 * compared to the previous step. Used to render breakpoint ticks on the
 * stat-investment slider so players can land precisely on a +1-stat boundary.
 *
 * Iterates from `step` to `perStatMax` in `step` increments. O(perStatMax / step).
 * Cheap: ≤ 63 iterations for VGC, ≤ 32 for Champions.
 */
export function findStatBreakpoints(args: FindStatBreakpointsArgs): number[] {
  const out: number[] = [];
  let prev = computeStatAt(0, args);
  for (let ev = args.step; ev <= args.perStatMax; ev += args.step) {
    const cur = computeStatAt(ev, args);
    if (cur > prev) {
      out.push(ev);
      prev = cur;
    }
  }
  return out;
}
