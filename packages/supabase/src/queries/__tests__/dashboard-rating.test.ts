import { describe, it, expect, jest } from "@jest/globals";
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
  results: Array<{ data: unknown; count?: number | null; error?: unknown }>,
  rpcResult?: { data: unknown; error: unknown }
) {
  let callIndex = 0;
  const supabase = {
    from: jest.fn(() => {
      const result = results[callIndex] ?? { data: null };
      callIndex++;
      return makeResolvableChain(result);
    }),
    rpc: jest.fn().mockResolvedValue(rpcResult ?? { data: [], error: null }),
  };
  return supabase as unknown as TypedClient;
}

// getMyDashboardData makes these from() calls in order:
//   1. tournament_registrations
//   2. tournament_player_stats
//   3. tournament_matches (recent activity)
// Then calls getPlayerRating → getPlayerRatingsBulk which uses supabase.rpc()

describe("getMyDashboardData — rating section", () => {
  it("returns currentRating=0 and ratingRank=0 when no rating row exists", async () => {
    const supabase = mockSupabaseSequential(
      [
        { data: [] }, // tournament_registrations
        { data: [] }, // tournament_player_stats
        { data: [] }, // tournament_matches
      ],
      { data: [], error: null } // RPC returns no rows
    );

    const result = await getMyDashboardData(supabase, 1);

    expect(result.stats.currentRating).toBe(0);
    expect(result.stats.ratingRank).toBe(0);
  });

  it("returns rounded currentRating and computed globalRank when a rating row exists", async () => {
    const supabase = mockSupabaseSequential(
      [
        { data: [] }, // tournament_registrations
        { data: [] }, // tournament_player_stats
        { data: [] }, // tournament_matches
      ],
      {
        data: [
          {
            alt_id: 1,
            format: "overall",
            rating: "1432.78",
            peak_rating: "1500.00",
            games_played: 12,
            skill_bracket: "intermediate",
            global_rank: 5,
          },
        ],
        error: null,
      }
    );

    const result = await getMyDashboardData(supabase, 1);

    expect(result.stats.currentRating).toBe(1433); // Math.round(1432.78)
    expect(result.stats.ratingRank).toBe(5);
  });

  it("assigns rank 1 when no other player has a higher rating", async () => {
    const supabase = mockSupabaseSequential(
      [
        { data: [] }, // tournament_registrations
        { data: [] }, // tournament_player_stats
        { data: [] }, // tournament_matches
      ],
      {
        data: [
          {
            alt_id: 1,
            format: "overall",
            rating: "1800.00",
            peak_rating: "1800.00",
            games_played: 20,
            skill_bracket: "expert",
            global_rank: 1,
          },
        ],
        error: null,
      }
    );

    const result = await getMyDashboardData(supabase, 1);

    expect(result.stats.currentRating).toBe(1800);
    expect(result.stats.ratingRank).toBe(1);
  });

  it("handles RPC returning empty data gracefully", async () => {
    const supabase = mockSupabaseSequential(
      [
        { data: [] }, // tournament_registrations
        { data: [] }, // tournament_player_stats
        { data: [] }, // tournament_matches
      ],
      { data: null, error: null } // RPC returns null data
    );

    const result = await getMyDashboardData(supabase, 1);

    expect(result.stats.currentRating).toBe(0);
    expect(result.stats.ratingRank).toBe(0);
  });
});
