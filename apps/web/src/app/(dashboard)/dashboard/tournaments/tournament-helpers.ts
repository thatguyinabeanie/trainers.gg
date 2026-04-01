/**
 * Pure helper functions for the tournaments page.
 * Extracted for testability.
 */

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

export function formatWinRate(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "—";
  return `${((wins / total) * 100).toFixed(1)}%`;
}

interface PlacementEntry {
  placement: number | null;
}

export function calcAvgPlace(entries: PlacementEntry[]): string {
  const placed = entries.filter((e) => e.placement !== null && e.placement > 0);
  if (placed.length === 0) return "—";
  const avg =
    placed.reduce((sum, e) => sum + (e.placement ?? 0), 0) / placed.length;
  return avg.toFixed(1);
}

export function computeSummaryStats(
  entries: { wins: number; losses: number; placement: number | null }[]
) {
  const played = entries.length;
  const totalWins = entries.reduce((s, e) => s + e.wins, 0);
  const totalLosses = entries.reduce((s, e) => s + e.losses, 0);
  const bestPlacement = entries
    .map((e) => e.placement)
    .filter((p): p is number => p !== null && p > 0)
    .sort((a, b) => a - b)[0];

  return {
    played,
    totalWins,
    totalLosses,
    bestPlacement: bestPlacement ?? null,
    winRate: formatWinRate(totalWins, totalLosses),
    avgPlace: calcAvgPlace(entries),
  };
}
