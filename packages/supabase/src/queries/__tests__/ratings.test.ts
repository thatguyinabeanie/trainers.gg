import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getPlayerRating, getPlayerRatingsBulk } from "../ratings";
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

  it("throws on a query error", async () => {
    const client = createMockClient(
      { data: null, error: { message: "network error" } },
      { data: null, error: null, count: null }
    );
    await expect(getPlayerRating(client, 1)).rejects.toThrow(
      "Failed to fetch rating: network error"
    );
  });

  it("throws when the count query fails", async () => {
    const client = createMockClient(
      { data: RATING_ROW, error: null },
      { data: null, error: { message: "count query failed" }, count: null }
    );
    await expect(getPlayerRating(client, 1)).rejects.toThrow(
      "Failed to fetch rating rank: count query failed"
    );
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

// ============================================================================
// getPlayerRatingsBulk
// ============================================================================

/**
 * Build a chainable mock for `getPlayerRatingsBulk`, which makes two sequential
 * `.from("player_ratings")` calls:
 *   1. The "targeted" query filtered by `altIds` — returns `ratingRows`
 *   2. The "all ratings" query for rank computation — returns `allRatingRows`
 */
function buildBulkClient(
  ratingRows: { data: unknown; error: unknown },
  allRatingRows: { data: unknown; error: unknown }
): TypedClient {
  let callCount = 0;

  const makeChain = (resolved: { data: unknown; error: unknown }) => {
    const chain: Record<string, jest.Mock> = {};
    const methods = ["select", "eq", "in", "gt", "order", "limit"];
    for (const m of methods) {
      chain[m] = jest.fn().mockReturnThis();
    }
    // Terminal: awaiting the builder resolves the promise
    chain["then"] = jest.fn((resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolved).then(resolve)
    ) as jest.Mock;
    return chain;
  };

  return {
    from: jest.fn(() => {
      callCount++;
      return callCount === 1 ? makeChain(ratingRows) : makeChain(allRatingRows);
    }),
  } as unknown as TypedClient;
}

const BULK_ROW_1 = {
  alt_id: 10,
  format: "overall",
  rating: "1400.00",
  peak_rating: "1450.00",
  games_played: 20,
  skill_bracket: "advanced",
};

const BULK_ROW_2 = {
  alt_id: 11,
  format: "overall",
  rating: "1200.00",
  peak_rating: "1250.00",
  games_played: 5,
  skill_bracket: "beginner",
};

describe("getPlayerRatingsBulk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty object when altIds is empty", async () => {
    // from() should never be called — no queries needed
    const client = {
      from: jest.fn(),
    } as unknown as TypedClient;

    const result = await getPlayerRatingsBulk(client, []);
    expect(result).toEqual({});
    expect(client.from).not.toHaveBeenCalled();
  });

  it("returns shaped PlayerRating entries for multiple alts", async () => {
    // Two target rows, two all-ratings rows (same data)
    const allRatings = [{ rating: "1400.00" }, { rating: "1200.00" }];
    const client = buildBulkClient(
      { data: [BULK_ROW_1, BULK_ROW_2], error: null },
      { data: allRatings, error: null }
    );

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

  it("computes global rank correctly from all-ratings query", async () => {
    // alt 10 has rating 1400 — 0 players above → rank 1
    // alt 11 has rating 1200 — 1 player above (1400) → rank 2
    const allRatings = [{ rating: "1400.00" }, { rating: "1200.00" }];
    const client = buildBulkClient(
      { data: [BULK_ROW_1, BULK_ROW_2], error: null },
      { data: allRatings, error: null }
    );

    const result = await getPlayerRatingsBulk(client, [10, 11]);

    expect(result[10]?.globalRank).toBe(1);
    expect(result[11]?.globalRank).toBe(2);
  });

  it("omits alts that have no rating record", async () => {
    // Only alt 10 comes back from DB; alt 99 has no row
    const client = buildBulkClient(
      { data: [BULK_ROW_1], error: null },
      { data: [{ rating: "1400.00" }], error: null }
    );

    const result = await getPlayerRatingsBulk(client, [10, 99]);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result[10]).toBeDefined();
    expect(result[99]).toBeUndefined();
  });

  it("returns empty object when no rows come back from DB", async () => {
    const client = buildBulkClient(
      { data: [], error: null },
      { data: [], error: null }
    );

    const result = await getPlayerRatingsBulk(client, [10, 11]);
    expect(result).toEqual({});
  });

  it("throws on rating query error", async () => {
    const client = buildBulkClient(
      { data: null, error: { message: "db error" } },
      { data: [], error: null }
    );

    await expect(getPlayerRatingsBulk(client, [10])).rejects.toThrow(
      "Failed to fetch bulk ratings: db error"
    );
  });

  it("throws on all-ratings query error", async () => {
    const client = buildBulkClient(
      { data: [BULK_ROW_1], error: null },
      { data: null, error: { message: "rank query failed" } }
    );

    await expect(getPlayerRatingsBulk(client, [10])).rejects.toThrow(
      "Failed to fetch rating ranks: rank query failed"
    );
  });

  it.each([
    ["VGC", "VGC"],
    ["singles", "singles"],
    ["overall", "overall"],
  ] as const)(
    "passes format '%s' through to the returned record",
    async (format) => {
      const row = { ...BULK_ROW_1, format };
      const client = buildBulkClient(
        { data: [row], error: null },
        { data: [{ rating: "1400.00" }], error: null }
      );

      const result = await getPlayerRatingsBulk(client, [10], format);
      expect(result[10]?.format).toBe(format);
    }
  );
});
