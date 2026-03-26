import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getPlayerRating } from "../ratings";
import type { TypedClient } from "../../client";

// Build a chainable mock query builder that resolves to a given value
function buildChain(resolvedValue: {
  data: unknown;
  error: unknown;
  count?: number | null;
}) {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    "select",
    "eq",
    "gt",
    "neq",
    "order",
    "limit",
    "range",
    "is",
    "in",
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnThis();
  }
  chain["maybeSingle"] = jest
    .fn()
    .mockResolvedValue(resolvedValue) as jest.Mock;
  // Head query (count) resolves via awaiting the builder itself
  chain["then"] = jest.fn((resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolvedValue).then(resolve)
  ) as jest.Mock;
  return chain;
}

function createMockClient(
  ratingRow: { data: unknown; error: unknown } | null,
  countResult: { data: null; error: null; count: number | null }
) {
  let callCount = 0;
  return {
    from: jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        // First call: fetch the rating row
        return buildChain(ratingRow ?? { data: null, error: null });
      }
      // Second call: count query for rank
      return buildChain(countResult);
    }),
  } as unknown as TypedClient;
}

const RATING_ROW = {
  alt_id: 1,
  format: "overall",
  rating: "1350.50",
  peak_rating: "1400.00",
  games_played: 10,
  skill_bracket: "intermediate",
};

describe("getPlayerRating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when no rating row exists", async () => {
    const client = createMockClient(
      { data: null, error: null },
      { data: null, error: null, count: null }
    );
    const result = await getPlayerRating(client, 1);
    expect(result).toBeNull();
  });

  it("returns null on a query error", async () => {
    const client = createMockClient(
      { data: null, error: { message: "network error" } },
      { data: null, error: null, count: null }
    );
    const result = await getPlayerRating(client, 1);
    expect(result).toBeNull();
  });

  it("returns null when the count query fails", async () => {
    const client = createMockClient(
      { data: RATING_ROW, error: null },
      { data: null, error: { message: "count query failed" }, count: null }
    );
    const result = await getPlayerRating(client, 1);
    expect(result).toBeNull();
  });

  it("returns a shaped PlayerRating with rank when a row exists", async () => {
    const client = createMockClient(
      { data: RATING_ROW, error: null },
      { data: null, error: null, count: 4 }
    );
    const result = await getPlayerRating(client, 1);

    expect(result).toEqual({
      altId: 1,
      format: "overall",
      rating: 1350.5,
      peakRating: 1400,
      gamesPlayed: 10,
      skillBracket: "intermediate",
      globalRank: 5, // 4 players above + 1
    });
  });

  it("ranks #1 when no players have a higher rating", async () => {
    const client = createMockClient(
      { data: RATING_ROW, error: null },
      { data: null, error: null, count: 0 }
    );
    const result = await getPlayerRating(client, 1);
    expect(result?.globalRank).toBe(1);
  });

  it("defaults to the 'overall' format", async () => {
    const client = createMockClient(
      { data: { ...RATING_ROW, format: "overall" }, error: null },
      { data: null, error: null, count: 0 }
    );
    await getPlayerRating(client, 1);
    // from() should be called with "player_ratings" for both calls
    expect(client.from).toHaveBeenCalledWith("player_ratings");
  });

  it("accepts a specific format", async () => {
    const vgcRow = { ...RATING_ROW, format: "VGC" };
    const client = createMockClient(
      { data: vgcRow, error: null },
      { data: null, error: null, count: 2 }
    );
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
    "preserves skill_bracket '%s' from the database row",
    async (bracket, rating) => {
      const row = {
        ...RATING_ROW,
        rating: String(rating),
        skill_bracket: bracket,
      };
      const client = createMockClient(
        { data: row, error: null },
        { data: null, error: null, count: 0 }
      );
      const result = await getPlayerRating(client, 1);
      expect(result?.skillBracket).toBe(bracket);
    }
  );
});
