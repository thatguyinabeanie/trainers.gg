/**
 * Nature-bonus breakpoint calculator
 *
 * Identifies EV/SP values where the +nature multiplier confers an additional
 * effective stat point relative to a neutral nature — the "free bonus"
 * breakpoints players use to invest precisely without waste.
 *
 * Used to render tick marks on the stat-investment slider for the +nature stat.
 * For neutral or −nature inputs, returns []. For +nature, returns the EV/SP
 * positions where (statWithNature − statNeutral) increases.
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
 * Returns the EV/SP values where the +nature multiplier confers an additional
 * effective stat point relative to a neutral nature — i.e. the EV/SP positions
 * where (statWithNature − statNeutral) increases.
 *
 * Returns [] for HP, neutral nature (1.0), and −nature (0.9). Only +nature
 * (1.1) produces non-empty results.
 *
 * Iterates from `step` to `perStatMax` in `step` increments. O(perStatMax / step).
 * Cheap: ≤ 63 iterations for VGC, ≤ 32 for Champions.
 */
export function findStatBreakpoints(args: FindStatBreakpointsArgs): number[] {
  if (args.statKey === "hp") return [];
  if (args.natureMultiplier <= 1.0) return [];

  const neutralArgs: FindStatBreakpointsArgs = {
    ...args,
    natureMultiplier: 1.0,
  };

  const baselineGap = computeStatAt(0, args) - computeStatAt(0, neutralArgs);
  let prevGap = baselineGap;

  const out: number[] = [];
  for (let ev = args.step; ev <= args.perStatMax; ev += args.step) {
    const gap = computeStatAt(ev, args) - computeStatAt(ev, neutralArgs);
    if (gap > prevGap) out.push(ev);
    prevGap = gap;
  }
  return out;
}
