/**
 * Shared helpers for the dashboard alt list rendering — used by both the
 * desktop `AltsTable` and mobile `AltsCards` layouts.
 */

export function isHighWinRate(wins: number, losses: number): boolean {
  const total = wins + losses;
  if (total === 0) return false;
  return wins / total >= 0.55;
}
