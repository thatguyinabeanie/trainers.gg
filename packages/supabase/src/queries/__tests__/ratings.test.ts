import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getPlayerRating, getPlayerRatingsBulk } from "../ratings";
import type { TypedClient } from "../../client";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a mock client for the RPC-based `getPlayerRatingsBulk`.
 * The function calls `supabase.rpc("get_player_ratings_with_rank", ...)`.
 */
function buildRpcClient(rpcResult: {
  data: unknown;
  error: unknown;
}): TypedClient {
  return {
    rpc: jest.fn().mockResolvedValue(rpcResult),
  } as unknown as TypedClient;
}

// Rows returned by the RPC match the DB shape with an added global_rank column
const RPC_ROW_1 = {
  alt_id: 10,
  format: "overall",
  rating: "1400.00",
  peak_rating: "1450.00",
  games_played: 20,
  skill_bracket: "advanced",
  global_rank: 1,
};

const RPC_ROW_2 = {
  alt_id: 11,
  format: "overall",
  rating: "1200.00",
  peak_rating: "1250.00",
  games_played: 5,
  skill_bracket: "beginner",
  global_rank: 3,
};

// ============================================================================
// getPlayerRatingsBulk
// ============================================================================

describe("getPlayerRatingsBulk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty object when altIds is empty", async () => {
    // rpc() should never be called — no queries needed
    const client = {
      rpc: jest.fn(),
    } as unknown as TypedClient;

    const result = await getPlayerRatingsBulk(client, []);
    expect(result).toEqual({});
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("returns shaped PlayerRating entries for multiple alts", async () => {
    const client = buildRpcClient({
      data: [RPC_ROW_1, RPC_ROW_2],
      error: null,
    });

    const result = await getPlayerRatingsBulk(client, [10, 11]);

    expect(result[10]).toMatchObject({
      altId: 10,
      format: "overall",
      rating: 1400,
      peakRating: 1450,
      gamesPlayed: 20,
      skillBracket: "advanced",
    });
    expect(result[11]).toMatchObject({
      altId: 11,
      format: "overall",
      rating: 1200,
      peakRating: 1250,
      gamesPlayed: 5,
      skillBracket: "beginner",
    });
  });

  it("computes distinct global ranks from RPC result", async () => {
    // RPC returns rank via window function — each row has a distinct rank
    const client = buildRpcClient({
      data: [RPC_ROW_1, RPC_ROW_2],
      error: null,
    });

    const result = await getPlayerRatingsBulk(client, [10, 11]);

    expect(result[10]?.globalRank).toBe(1);
    expect(result[11]?.globalRank).toBe(3);
  });

  it("omits alts that have no rating record", async () => {
    // Only alt 10 comes back from RPC; alt 99 has no row
    const client = buildRpcClient({
      data: [RPC_ROW_1],
      error: null,
    });

    const result = await getPlayerRatingsBulk(client, [10, 99]);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result[10]).toBeDefined();
    expect(result[99]).toBeUndefined();
  });

  it("returns empty object when no rows come back from RPC", async () => {
    const client = buildRpcClient({ data: [], error: null });

    const result = await getPlayerRatingsBulk(client, [10, 11]);
    expect(result).toEqual({});
  });

  it("throws on RPC error", async () => {
    const client = buildRpcClient({
      data: null,
      error: { message: "db error" },
    });

    await expect(getPlayerRatingsBulk(client, [10])).rejects.toThrow(
      "Failed to fetch bulk ratings: db error"
    );
  });

  it("passes format and altIds to the RPC call", async () => {
    const client = buildRpcClient({ data: [], error: null });

    await getPlayerRatingsBulk(client, [10, 11], "VGC");

    expect(client.rpc).toHaveBeenCalledWith("get_player_ratings_with_rank", {
      p_alt_ids: [10, 11],
      p_format: "VGC",
    });
  });

  it.each([
    ["VGC", "VGC"],
    ["singles", "singles"],
    ["overall", "overall"],
  ] as const)(
    "passes format '%s' through to the returned record",
    async (format) => {
      const row = { ...RPC_ROW_1, format };
      const client = buildRpcClient({ data: [row], error: null });

      const result = await getPlayerRatingsBulk(client, [10], format);
      expect(result[10]?.format).toBe(format);
    }
  );
});

// ============================================================================
// getPlayerRating (delegates to getPlayerRatingsBulk)
// ============================================================================

describe("getPlayerRating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when no rating row exists", async () => {
    const client = buildRpcClient({ data: [], error: null });
    const result = await getPlayerRating(client, 1);
    expect(result).toBeNull();
  });

  it("throws on RPC error", async () => {
    const client = buildRpcClient({
      data: null,
      error: { message: "network error" },
    });
    await expect(getPlayerRating(client, 1)).rejects.toThrow(
      "Failed to fetch bulk ratings: network error"
    );
  });

  it("returns a shaped PlayerRating with rank when a row exists", async () => {
    const row = {
      alt_id: 1,
      format: "overall",
      rating: "1350.50",
      peak_rating: "1400.00",
      games_played: 10,
      skill_bracket: "intermediate",
      global_rank: 5,
    };
    const client = buildRpcClient({ data: [row], error: null });
    const result = await getPlayerRating(client, 1);

    expect(result).toEqual({
      altId: 1,
      format: "overall",
      rating: 1350.5,
      peakRating: 1400,
      gamesPlayed: 10,
      skillBracket: "intermediate",
      globalRank: 5,
    });
  });

  it("ranks #1 when global_rank is 1", async () => {
    const row = { ...RPC_ROW_1, alt_id: 1, global_rank: 1 };
    const client = buildRpcClient({ data: [row], error: null });
    const result = await getPlayerRating(client, 1);
    expect(result?.globalRank).toBe(1);
  });

  it("defaults to the 'overall' format", async () => {
    const client = buildRpcClient({ data: [], error: null });
    await getPlayerRating(client, 1);
    expect(client.rpc).toHaveBeenCalledWith("get_player_ratings_with_rank", {
      p_alt_ids: [1],
      p_format: "overall",
    });
  });

  it("accepts a specific format", async () => {
    const row = {
      alt_id: 1,
      format: "VGC",
      rating: "1350.50",
      peak_rating: "1400.00",
      games_played: 10,
      skill_bracket: "intermediate",
      global_rank: 3,
    };
    const client = buildRpcClient({ data: [row], error: null });
    const result = await getPlayerRating(client, 1, "VGC");
    expect(result?.format).toBe("VGC");
    expect(result?.globalRank).toBe(3);
  });

  it.each([
    ["beginner", 900],
    ["intermediate", 1300],
    ["advanced", 1600],
    ["expert", 1850],
  ] as const)(
    "preserves skill_bracket '%s' from the RPC result",
    async (bracket, rating) => {
      const row = {
        alt_id: 1,
        format: "overall",
        rating: String(rating),
        peak_rating: String(rating),
        games_played: 10,
        skill_bracket: bracket,
        global_rank: 1,
      };
      const client = buildRpcClient({ data: [row], error: null });
      const result = await getPlayerRating(client, 1);
      expect(result?.skillBracket).toBe(bracket);
    }
  );
});
