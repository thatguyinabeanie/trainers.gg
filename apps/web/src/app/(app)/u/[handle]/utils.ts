/**
 * Shared helpers for player profile tab components.
 */

export { formatDate } from "@trainers/utils";

/**
 * Format a placement number with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
 */
export function formatPlacement(rank: number): string {
  const r100 = rank % 100;
  if (r100 >= 11 && r100 <= 13) return `${rank}th`;
  const suffixes = ["th", "st", "nd", "rd"];
  return `${rank}${suffixes[rank % 10] ?? "th"}`;
}
