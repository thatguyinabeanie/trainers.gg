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
