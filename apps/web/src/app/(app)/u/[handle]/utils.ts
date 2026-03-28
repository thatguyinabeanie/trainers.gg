/**
 * Shared helpers for player profile tab components.
 */

/**
 * Format a placement number with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
 */
export function formatPlacement(rank: number): string {
  const r100 = rank % 100;
  if (r100 >= 11 && r100 <= 13) return `${rank}th`;
  const suffixes = ["th", "st", "nd", "rd"];
  return `${rank}${suffixes[rank % 10] ?? "th"}`;
}

/**
 * Format an ISO date string to a human-readable date (e.g., "Mar 25, 2026").
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
