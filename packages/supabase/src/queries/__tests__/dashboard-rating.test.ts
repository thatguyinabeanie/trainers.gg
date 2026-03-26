import { getMyDashboardData } from "../tournaments";
import type { TypedClient } from "../../client";

// ============================================================================
// Test helpers (same pattern as players.test.ts)
// ============================================================================

function makeResolvableChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  const proxy = new Proxy(chain, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(resolveValue);
      }
      if (typeof prop === "string") {
        return jest.fn().mockReturnValue(proxy);
      }
      return undefined;
    },
  });
  return proxy;
}

function mockSupabaseSequential(
  results: Array<{ data: unknown; count?: number | null; error?: unknown }>
) {
  let callIndex = 0;
  const supabase = {
    from: jest.fn(() => {
      const result = results[callIndex] ?? { data: null };
      callIndex++;
      return makeResolvableChain(result);
    }),
  };
  return supabase as unknown as TypedClient;
}

// getMyDashboardData makes these from() calls in order:
//   1. tournament_registrations
//   2. tournament_player_stats
//   3. tournament_matches (recent activity)
//   4. player_ratings (maybeSingle — fetch the rating row)
//   5. player_ratings (count — global rank, only when row exists)

describe("getMyDashboardData — rating section", () => {
  it("returns currentRating=0 and ratingRank=0 when no rating row exists", async () => {
    const supabase = mockSupabaseSequential([
      { data: [] }, // tournament_registrations
      { data: [] }, // tournament_player_stats
      { data: [] }, // tournament_matches
      { data: null, error: null }, // player_ratings (no row)
    ]);

    const result = await getMyDashboardData(supabase, 1);

    expect(result.stats.currentRating).toBe(0);
    expect(result.stats.ratingRank).toBe(0);
  });

  it("returns rounded currentRating and computed globalRank when a rating row exists", async () => {
    const supabase = mockSupabaseSequential([
      { data: [] }, // tournament_registrations
      { data: [] }, // tournament_player_stats
      { data: [] }, // tournament_matches
      { data: { rating: "1432.78", games_played: 12 }, error: null }, // player_ratings row
      { data: null, count: 4, error: null }, // player_ratings count (4 higher-rated players)
    ]);

    const result = await getMyDashboardData(supabase, 1);

    expect(result.stats.currentRating).toBe(1433); // Math.round(1432.78)
    expect(result.stats.ratingRank).toBe(5); // 4 higher + 1
  });

  it("assigns rank 1 when no other player has a higher rating", async () => {
    const supabase = mockSupabaseSequential([
      { data: [] }, // tournament_registrations
      { data: [] }, // tournament_player_stats
      { data: [] }, // tournament_matches
      { data: { rating: "1800.00", games_played: 20 }, error: null }, // player_ratings row
      { data: null, count: 0, error: null }, // no one rated higher
    ]);

    const result = await getMyDashboardData(supabase, 1);

    expect(result.stats.currentRating).toBe(1800);
    expect(result.stats.ratingRank).toBe(1);
  });

  it("handles null count gracefully and falls back to rank 1", async () => {
    const supabase = mockSupabaseSequential([
      { data: [] }, // tournament_registrations
      { data: [] }, // tournament_player_stats
      { data: [] }, // tournament_matches
      { data: { rating: "1200.00", games_played: 5 }, error: null }, // player_ratings row
      { data: null, count: null, error: null }, // count query returns null
    ]);

    const result = await getMyDashboardData(supabase, 1);

    expect(result.stats.currentRating).toBe(1200);
    expect(result.stats.ratingRank).toBe(1); // (null ?? 0) + 1 = 1
  });
});
