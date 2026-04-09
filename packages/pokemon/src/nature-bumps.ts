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
 * of EV values (0–252) where the nature boost causes the stat to round up to
 * an extra point compared to a neutral nature (1.0).
 *
 * Only meaningful when natureMultiplier is 1.1 (positive nature). When the
 * multiplier is 1.0 or 0.9 the returned array will always be empty.
 */
export function calculateNatureBumps(
  baseStat: number,
  iv: number,
  level: number,
  natureMultiplier: number
): number[] {
  const bumps: number[] = [];

  // Step by 4 since EV values below a multiple of 4 have no additional effect
  // on the floor(ev / 4) term in the stat formula. We still check every value
  // because the caller may pass arbitrary EVs and the array is small (0–252).
  for (let ev = 0; ev <= 252; ev++) {
    const statNeutral = calculateStat(baseStat, iv, ev, level, 1.0);
    const statWithNature = calculateStat(
      baseStat,
      iv,
      ev,
      level,
      natureMultiplier
    );

    if (statWithNature > statNeutral) {
      bumps.push(ev);
    }
  }

  return bumps;
}
