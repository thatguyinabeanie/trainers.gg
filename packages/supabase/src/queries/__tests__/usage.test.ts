import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getFormatUsageTimeseries,
  _fetchUsageRowsInChunks,
} from "../usage";
import type { TypedClient } from "../../client";

// =============================================================================
// Mock client helpers
// =============================================================================

/**
 * A query builder mock where every chaining method returns itself and the
 * builder can be resolved by awaiting it (via `then`) or via terminal methods
 * like `.limit()` resolving to the configured result.
 *
 * Both `.limit()` (for the meta query) and direct-await (for the usage query)
 * are handled: callers in production code do `await supabase.from(...).select()
 * .eq()...limit(n)` for the meta rows, and `await supabase.from(...).select()
 * .in(...)` for the usage rows.
 */
type MockResult = { data: unknown; error: unknown };

function makeQueryBuilder(result: MockResult) {
  const builder: Record<string, unknown> = {};
  const returnSelf = jest.fn().mockReturnValue(builder);
  builder["select"] = returnSelf;
  builder["eq"] = returnSelf;
  builder["order"] = returnSelf;
  builder["in"] = returnSelf;
  // `.limit()` is the terminal for the meta query — resolves to result.
  builder["limit"] = jest.fn().mockResolvedValue(result);
  // Direct await is the terminal for the usage query — `.then` makes it thenable.
  builder["then"] = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

/**
 * Build a TypedClient that returns different builders (and thus different
 * results) for each sequential call to `.from()`. This mirrors the two-query
 * structure of `getFormatUsageTimeseries`.
 */
function makeSequentialClient(results: MockResult[]) {
  let callIndex = 0;
  const client = {
    from: jest.fn(() => {
      const result = results[callIndex++] ?? { data: null, error: null };
      return makeQueryBuilder(result);
    }),
  };
  return client as unknown as TypedClient;
}

// =============================================================================
// Test data factories
// =============================================================================

const makeMetaRow = (overrides?: Partial<{ id: number; period_start: string; period_end: string }>) => ({
  id: 1,
  period_start: "2025-01-01",
  period_end: "2025-01-07",
  ...overrides,
});

const makeUsageRow = (overrides?: Partial<{ meta_id: number; species: string; usage_pct: number }>) => ({
  meta_id: 1,
  species: "Koraidon",
  usage_pct: 42.5,
  ...overrides,
});

// =============================================================================
// getFormatUsageTimeseries — basic cases
// =============================================================================

describe("getFormatUsageTimeseries — empty / no data", () => {
  it("returns [] when the meta query returns no rows", async () => {
    const client = makeSequentialClient([
      { data: [], error: null }, // meta query
    ]);

    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });

    expect(result).toEqual([]);
    // Should NOT make a second query for usage rows when no meta rows
    expect((client.from as jest.Mock).mock.calls).toHaveLength(1);
  });

  it("returns [] when the meta query returns null", async () => {
    const client = makeSequentialClient([
      { data: null, error: null }, // meta query returns null
    ]);

    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });

    expect(result).toEqual([]);
  });
});

// =============================================================================
// getFormatUsageTimeseries — error handling
// =============================================================================

describe("getFormatUsageTimeseries — error handling", () => {
  it("throws a descriptive error when the meta query fails", async () => {
    const client = makeSequentialClient([
      { data: null, error: { message: "connection refused" } },
    ]);

    await expect(
      getFormatUsageTimeseries(client, { format: "gen9vgc2025regg" })
    ).rejects.toThrow("Failed to fetch format meta stats for gen9vgc2025regg");
  });

  it("throws a descriptive error when the usage stats query fails", async () => {
    const client = makeSequentialClient([
      { data: [makeMetaRow()], error: null }, // meta OK
      { data: null, error: { message: "timeout" } }, // usage query fails
    ]);

    await expect(
      getFormatUsageTimeseries(client, { format: "gen9vgc2025regg" })
    ).rejects.toThrow("Failed to fetch pokemon usage stats for meta IDs");
  });
});

// =============================================================================
// getFormatUsageTimeseries — pivot logic
// =============================================================================

describe("getFormatUsageTimeseries — data pivoting", () => {
  it("returns one point per meta row with the correct periodStart/periodEnd", async () => {
    const metaRows = [
      makeMetaRow({ id: 2, period_start: "2025-01-08", period_end: "2025-01-14" }),
      makeMetaRow({ id: 1, period_start: "2025-01-01", period_end: "2025-01-07" }),
    ];

    const client = makeSequentialClient([
      { data: metaRows, error: null },   // meta query (newest-first from DB)
      { data: [], error: null },          // usage query (no species)
    ]);

    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });

    // Should be reversed to oldest→newest
    expect(result).toHaveLength(2);
    expect(result[0]?.periodStart).toBe("2025-01-01");
    expect(result[0]?.periodEnd).toBe("2025-01-07");
    expect(result[1]?.periodStart).toBe("2025-01-08");
    expect(result[1]?.periodEnd).toBe("2025-01-14");
  });

  it("populates the usage map with species→usage_pct from the usage rows", async () => {
    const metaRows = [makeMetaRow({ id: 10 })];
    const usageRows = [
      makeUsageRow({ meta_id: 10, species: "Koraidon", usage_pct: 50 }),
      makeUsageRow({ meta_id: 10, species: "Miraidon", usage_pct: 35 }),
    ];

    const client = makeSequentialClient([
      { data: metaRows, error: null },
      { data: usageRows, error: null },
    ]);

    const [point] = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });

    expect(point?.usage).toEqual({ Koraidon: 50, Miraidon: 35 });
  });

  it("produces an empty usage map for periods with no usage rows", async () => {
    // DB returns newest-first; after .reverse() id=5 (Jan 1) is first, id=6 (Jan 8) second.
    const metaRows = [
      makeMetaRow({ id: 6, period_start: "2025-01-08", period_end: "2025-01-14" }),
      makeMetaRow({ id: 5, period_start: "2025-01-01", period_end: "2025-01-07" }),
    ];
    // Only period id=6 has usage rows
    const usageRows = [
      makeUsageRow({ meta_id: 6, species: "Koraidon", usage_pct: 42 }),
    ];

    const client = makeSequentialClient([
      { data: metaRows, error: null },
      { data: usageRows, error: null },
    ]);

    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });

    // After reverse: [id=5 (Jan 1), id=6 (Jan 8)]
    expect(result[0]?.periodStart).toBe("2025-01-01");
    expect(result[0]?.usage).toEqual({});
    expect(result[1]?.periodStart).toBe("2025-01-08");
    expect(result[1]?.usage).toEqual({ Koraidon: 42 });
  });

  it("correctly assigns usage rows to the right period by meta_id", async () => {
    const metaRows = [
      makeMetaRow({ id: 100, period_start: "2025-02-01" }),
      makeMetaRow({ id: 101, period_start: "2025-01-01" }),
    ];
    const usageRows = [
      makeUsageRow({ meta_id: 100, species: "Pikachu", usage_pct: 10 }),
      makeUsageRow({ meta_id: 101, species: "Incineroar", usage_pct: 30 }),
    ];

    const client = makeSequentialClient([
      { data: metaRows, error: null },
      { data: usageRows, error: null },
    ]);

    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });

    // Reversed: id=101 (Jan) first, id=100 (Feb) second
    expect(result[0]?.usage).toEqual({ Incineroar: 30 });
    expect(result[1]?.usage).toEqual({ Pikachu: 10 });
  });

  it("orders points oldest→newest (reverses DB newest-first order)", async () => {
    const metaRows = [
      makeMetaRow({ id: 3, period_start: "2025-03-01" }),
      makeMetaRow({ id: 2, period_start: "2025-02-01" }),
      makeMetaRow({ id: 1, period_start: "2025-01-01" }),
    ];

    const client = makeSequentialClient([
      { data: metaRows, error: null },
      { data: [], error: null },
    ]);

    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });

    expect(result.map((p) => p.periodStart)).toEqual([
      "2025-01-01",
      "2025-02-01",
      "2025-03-01",
    ]);
  });
});

// =============================================================================
// getFormatUsageTimeseries — chunking
// =============================================================================

describe("getFormatUsageTimeseries — chunked usage query", () => {
  it("makes two usage queries when there are more than 100 meta IDs", async () => {
    // 101 meta rows → chunk size 100 → 2 usage queries
    const metaRows = Array.from({ length: 101 }, (_, i) =>
      makeMetaRow({ id: i + 1, period_start: `2025-01-${String(i + 1).padStart(2, "0")}` })
    );

    // For the sequential client we need: 1 meta call + 2 usage calls
    const client = makeSequentialClient([
      { data: metaRows, error: null }, // meta
      { data: [], error: null },         // first usage chunk (ids 1-100)
      { data: [], error: null },         // second usage chunk (id 101)
    ]);

    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });

    // 101 meta rows → 101 timeseries points (all empty)
    expect(result).toHaveLength(101);
    // Total `.from()` calls: 1 (meta) + 2 (chunked usage) = 3
    expect((client.from as jest.Mock).mock.calls).toHaveLength(3);
  });

  it("merges usage rows from multiple chunks into the correct points", async () => {
    // 102 meta rows; DB returns newest-first (id=102 to id=1).
    // After .reverse() result is oldest-first: result[0]=id=1, result[101]=id=102.
    const metaRows = Array.from({ length: 102 }, (_, i) =>
      makeMetaRow({ id: 102 - i, period_start: `2025-01-01` })
    );

    // id=1 is in chunk 1 (ids 1-100); id=101 is in chunk 2 (ids 101-102)
    const chunk1Usage = [makeUsageRow({ meta_id: 1, species: "Koraidon", usage_pct: 50 })];
    const chunk2Usage = [makeUsageRow({ meta_id: 101, species: "Miraidon", usage_pct: 30 })];

    const client = makeSequentialClient([
      { data: metaRows, error: null },
      { data: chunk1Usage, error: null },  // chunk 1 (ids 1-100)
      { data: chunk2Usage, error: null },  // chunk 2 (ids 101-102)
    ]);

    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });

    // After reverse: result[0] = id=1, result[100] = id=101
    expect(result[0]?.usage["Koraidon"]).toBe(50);
    expect(result[100]?.usage["Miraidon"]).toBe(30);
  });

  it("throws when a usage chunk query fails", async () => {
    const metaRows = [makeMetaRow({ id: 1 })];

    const client = makeSequentialClient([
      { data: metaRows, error: null },
      { data: null, error: { message: "chunk failed" } },
    ]);

    await expect(
      getFormatUsageTimeseries(client, { format: "gen9vgc2025regg" })
    ).rejects.toThrow("Failed to fetch pokemon usage stats for meta IDs");
  });
});

// =============================================================================
// _fetchUsageRowsInChunks — unit tests
// =============================================================================

describe("_fetchUsageRowsInChunks", () => {
  it("returns [] for an empty ids array (no queries issued)", async () => {
    const client = makeSequentialClient([]);

    const result = await _fetchUsageRowsInChunks(client, []);

    expect(result).toEqual([]);
    expect((client.from as jest.Mock).mock.calls).toHaveLength(0);
  });

  it("merges rows from multiple chunks", async () => {
    // 101 IDs → 2 chunks: 100 + 1
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    const chunk1Rows = [{ meta_id: 1, species: "Koraidon", usage_pct: 50 }];
    const chunk2Rows = [{ meta_id: 101, species: "Pikachu", usage_pct: 5 }];

    const client = makeSequentialClient([
      { data: chunk1Rows, error: null },
      { data: chunk2Rows, error: null },
    ]);

    const result = await _fetchUsageRowsInChunks(client, ids);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ meta_id: 1, species: "Koraidon" });
    expect(result[1]).toMatchObject({ meta_id: 101, species: "Pikachu" });
  });

  it("throws on the first chunk error", async () => {
    const ids = [1, 2, 3];

    const client = makeSequentialClient([
      { data: null, error: { message: "permission denied" } },
    ]);

    await expect(_fetchUsageRowsInChunks(client, ids)).rejects.toThrow(
      "Failed to fetch pokemon usage stats for meta IDs [1, 2, 3]: permission denied"
    );
  });

  it("handles null data in a successful chunk (treats as empty)", async () => {
    const ids = [42];

    const client = makeSequentialClient([
      { data: null, error: null }, // null data but no error
    ]);

    const result = await _fetchUsageRowsInChunks(client, ids);

    expect(result).toEqual([]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });
});
