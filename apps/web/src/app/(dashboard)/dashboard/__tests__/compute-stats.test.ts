import type { AltStats, PlayerRating } from "@trainers/supabase";

import { computeStats } from "../compute-stats";

// =============================================================================
// Helpers
// =============================================================================

function makeAltStats(
  overrides: Partial<AltStats> & { altId: number }
): AltStats {
  return {
    matchWins: 0,
    matchLosses: 0,
    tournamentCount: 0,
    ...overrides,
  };
}

function makePlayerRating(
  overrides: Partial<PlayerRating> & { altId: number }
): PlayerRating {
  return {
    format: "overall",
    rating: 0,
    peakRating: 0,
    gamesPlayed: 0,
    skillBracket: "beginner",
    globalRank: 0,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("computeStats", () => {
  // ---------------------------------------------------------------------------
  // Empty / undefined inputs
  // ---------------------------------------------------------------------------

  describe("empty inputs", () => {
    it("returns zero defaults when stats and ratings are undefined", () => {
      const result = computeStats(undefined, undefined, 0);

      expect(result.winRate).toBe("0.0%");
      expect(result.winRateSub).toBe("across all alts");
      expect(result.rating).toBe("\u2014");
      expect(result.ratingSub).toBe("across all alts");
      expect(result.record).toBe("0-0");
      expect(result.recordSub).toBe("across all alts");
      expect(result.tournaments).toBe("0");
      expect(result.tournamentsSub).toBe("0 alts");
      expect(result.tournamentsSubAccent).toBe(false);
    });

    it("returns zero defaults when stats and ratings are empty objects", () => {
      const result = computeStats({}, {}, 1);

      expect(result.winRate).toBe("0.0%");
      expect(result.rating).toBe("\u2014");
      expect(result.record).toBe("0-0");
      expect(result.tournaments).toBe("0");
      expect(result.tournamentsSub).toBe("1 alt");
    });
  });

  // ---------------------------------------------------------------------------
  // Single alt
  // ---------------------------------------------------------------------------

  describe("single alt with stats", () => {
    const stats: Record<number, AltStats> = {
      1: makeAltStats({
        altId: 1,
        matchWins: 7,
        matchLosses: 3,
        tournamentCount: 2,
      }),
    };

    it("computes correct win rate", () => {
      const result = computeStats(stats, undefined, 1);
      // 7/10 = 70.0%
      expect(result.winRate).toBe("70.0%");
    });

    it("shows total games in win rate sub", () => {
      const result = computeStats(stats, undefined, 1);
      expect(result.winRateSub).toBe("10 games");
    });

    it("computes correct record", () => {
      const result = computeStats(stats, undefined, 1);
      expect(result.record).toBe("7-3");
    });

    it("shows tournament count", () => {
      const result = computeStats(stats, undefined, 1);
      expect(result.tournaments).toBe("2");
    });

    it("shows singular alt label for 1 alt", () => {
      const result = computeStats(stats, undefined, 1);
      expect(result.tournamentsSub).toBe("1 alt");
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple alts — aggregation
  // ---------------------------------------------------------------------------

  describe("multiple alts aggregation", () => {
    const stats: Record<number, AltStats> = {
      1: makeAltStats({
        altId: 1,
        matchWins: 5,
        matchLosses: 2,
        tournamentCount: 1,
      }),
      2: makeAltStats({
        altId: 2,
        matchWins: 3,
        matchLosses: 4,
        tournamentCount: 3,
      }),
    };

    it("sums wins and losses across alts", () => {
      const result = computeStats(stats, undefined, 2);
      // 8 wins, 6 losses = 8-6
      expect(result.record).toBe("8-6");
    });

    it("computes aggregate win rate across alts", () => {
      const result = computeStats(stats, undefined, 2);
      // 8/14 = 57.1%
      expect(result.winRate).toBe("57.1%");
      expect(result.winRateSub).toBe("14 games");
    });

    it("sums tournament counts across alts", () => {
      const result = computeStats(stats, undefined, 2);
      expect(result.tournaments).toBe("4");
    });

    it("shows plural alts label", () => {
      const result = computeStats(stats, undefined, 2);
      expect(result.tournamentsSub).toBe("2 alts");
    });
  });

  // ---------------------------------------------------------------------------
  // Ratings
  // ---------------------------------------------------------------------------

  describe("ratings", () => {
    it("returns em dash when ratings are undefined", () => {
      const result = computeStats(undefined, undefined, 1);
      expect(result.rating).toBe("\u2014");
      expect(result.ratingSub).toBe("across all alts");
    });

    it("returns em dash when all ratings are zero", () => {
      const ratings: Record<number, PlayerRating> = {
        1: makePlayerRating({ altId: 1, rating: 0 }),
      };
      const result = computeStats(undefined, ratings, 1);
      expect(result.rating).toBe("\u2014");
      expect(result.ratingSub).toBe("across all alts");
    });

    it("returns the rating when a single alt has a rating", () => {
      const ratings: Record<number, PlayerRating> = {
        1: makePlayerRating({ altId: 1, rating: 1500 }),
      };
      const result = computeStats(undefined, ratings, 1);
      expect(result.rating).toBe("1,500");
      expect(result.ratingSub).toBe("best across alts");
    });

    it("returns the highest rating across multiple alts", () => {
      const ratings: Record<number, PlayerRating> = {
        1: makePlayerRating({ altId: 1, rating: 1200 }),
        2: makePlayerRating({ altId: 2, rating: 1800 }),
        3: makePlayerRating({ altId: 3, rating: 1500 }),
      };
      const result = computeStats(undefined, ratings, 3);
      expect(result.rating).toBe("1,800");
      expect(result.ratingSub).toBe("best across alts");
    });
  });

  // ---------------------------------------------------------------------------
  // Combined stats + ratings
  // ---------------------------------------------------------------------------

  describe("combined stats and ratings", () => {
    it("returns both stats and ratings correctly", () => {
      const stats: Record<number, AltStats> = {
        1: makeAltStats({
          altId: 1,
          matchWins: 10,
          matchLosses: 5,
          tournamentCount: 3,
        }),
      };
      const ratings: Record<number, PlayerRating> = {
        1: makePlayerRating({ altId: 1, rating: 1650 }),
      };

      const result = computeStats(stats, ratings, 1);

      expect(result.winRate).toBe("66.7%");
      expect(result.record).toBe("10-5");
      expect(result.tournaments).toBe("3");
      expect(result.rating).toBe("1,650");
    });
  });
});
