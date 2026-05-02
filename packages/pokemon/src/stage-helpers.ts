/**
 * Stat stage multiplier helpers for battle-time stat adjustments.
 *
 * Implements the standard VGC/Showdown stage formula:
 *   Positive stages: ×(2+n)/2   |   Negative stages: ×2/(2+|n|)
 */

/**
 * Apply stat stage multiplier to a final base stat value.
 * Positive stages: ×(2+n)/2   |   Negative stages: ×2/(2+|n|)
 */
export function applyStage(base: number, stage: number): number {
  if (stage === 0) return base;
  if (stage > 0) return Math.floor((base * (2 + stage)) / 2);
  return Math.floor((base * 2) / (2 + Math.abs(stage)));
}
