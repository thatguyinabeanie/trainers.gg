/**
 * Nature bump calculator
 *
 * Identifies EV breakpoints where a positive nature (+10%) causes the stat
 * to round up to an extra point compared to a neutral nature.
 *
 * Used to render tick marks on the EV editor slider, showing players exactly
 * where investing EVs gives them a free extra stat point from their nature.
 */

import { calculateStat } from "./stats-calculator";

/**
 * For a given base stat, IV, level, and nature multiplier, returns an array
 * of EV values (0–252) where the +nature boost causes the stat to round up
 * to an extra point — specifically, the EV breakpoints where the gap between
 * the nature-boosted stat and the neutral stat increases by 1.
 *
 * These breakpoints are used as tick marks on the EV slider, showing players
 * exactly where investing EVs gives them a "free" extra stat point from their
 * nature. Only meaningful when natureMultiplier is 1.1 (positive nature).
 */
export function calculateNatureBumps(
  baseStat: number,
  iv: number,
  level: number,
  natureMultiplier: number
): number[] {
  const bumps: number[] = [];

  // Compute the baseline gap at EV=0 so we only report breakpoints where
  // investing EVs causes the nature gap to increase beyond the baseline.
  const baselineNeutral = calculateStat(baseStat, iv, 0, level, 1.0);
  const baselineNature = calculateStat(
    baseStat,
    iv,
    0,
    level,
    natureMultiplier
  );
  let prevGap = baselineNature - baselineNeutral;

  // Stats only change at multiples of 4 EVs (due to floor(ev/4) in the
  // stat formula), so we step by 4 for efficiency. Start at 4 since EV=0
  // is the baseline, not a breakpoint.
  for (let ev = 4; ev <= 252; ev += 4) {
    const statNeutral = calculateStat(baseStat, iv, ev, level, 1.0);
    const statWithNature = calculateStat(
      baseStat,
      iv,
      ev,
      level,
      natureMultiplier
    );
    const gap = statWithNature - statNeutral;

    if (gap > prevGap) {
      bumps.push(ev);
    }

    prevGap = gap;
  }

  return bumps;
}
