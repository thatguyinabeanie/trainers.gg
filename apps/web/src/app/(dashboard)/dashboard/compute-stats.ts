import { type AltStats, type PlayerRating } from "@trainers/supabase";

// =============================================================================
// Types
// =============================================================================

export interface ComputedStats {
  winRate: string;
  winRateSub: string;
  rating: string;
  ratingSub: string;
  record: string;
  recordSub: string;
  tournaments: string;
  tournamentsSub: string;
  tournamentsSubAccent: boolean;
}

// =============================================================================
// computeStats
// =============================================================================

/**
 * Compute aggregated display strings from bulk stats and ratings.
 * Pure function — no side effects, easy to test.
 */
export function computeStats(
  bulkStats: Record<number, AltStats> | undefined,
  bulkRatings: Record<number, PlayerRating> | undefined,
  altCount: number
): ComputedStats {
  const aggregateWins = bulkStats
    ? Object.values(bulkStats).reduce((sum, s) => sum + s.matchWins, 0)
    : 0;
  const aggregateLosses = bulkStats
    ? Object.values(bulkStats).reduce((sum, s) => sum + s.matchLosses, 0)
    : 0;
  const aggregateTotal = aggregateWins + aggregateLosses;
  const aggregateWinRate =
    aggregateTotal > 0 ? (aggregateWins / aggregateTotal) * 100 : 0;

  const bestRating = bulkRatings
    ? Math.max(...Object.values(bulkRatings).map((r) => r.rating ?? 0), 0)
    : 0;

  const aggregateTournaments = bulkStats
    ? Object.values(bulkStats).reduce((sum, s) => sum + s.tournamentCount, 0)
    : 0;

  return {
    winRate: aggregateTotal > 0 ? `${aggregateWinRate.toFixed(1)}%` : "0.0%",
    winRateSub:
      aggregateTotal > 0 ? `${aggregateTotal} games` : "across all alts",
    rating: bestRating > 0 ? bestRating.toLocaleString() : "\u2014",
    ratingSub: bestRating > 0 ? "best across alts" : "across all alts",
    record: aggregateTotal > 0 ? `${aggregateWins}-${aggregateLosses}` : "0-0",
    recordSub: "across all alts",
    tournaments: `${aggregateTournaments}`,
    tournamentsSub: `${altCount} alt${altCount !== 1 ? "s" : ""}`,
    tournamentsSubAccent: false,
  };
}
