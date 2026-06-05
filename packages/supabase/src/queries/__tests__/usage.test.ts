import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getSpeciesUsageDetail, getSpeciesUsage } from "../usage";
import type { TypedClient } from "../../client";

// =============================================================================
// Mock Supabase client factory
// =============================================================================

type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  limit: jest.Mock<() => MockQueryBuilder | Promise<{ data: unknown; error: unknown }>>;
  maybeSingle: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
};

const createMockQueryBuilder = (): MockQueryBuilder => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
});

const createMockClient = (builder: MockQueryBuilder) =>
  ({
    from: jest.fn().mockReturnValue(builder),
  }) as unknown as TypedClient;

// =============================================================================
// Test data factories
// =============================================================================

const makeMetaRow = (overrides?: Record<string, unknown>) => ({
  period_start: "2025-01-01",
  period_end: "2025-01-07",
  pokemon_usage_stats: [
    {
      usage_pct: 42.5,
      rank: 1,
      usage_change_7d: 2.1,
      usage_change_30d: -1.5,
      sample_size: 1000,
    },
  ],
  pokemon_detail_stats: [
    {
      moves: [
        { value: "Collision Course", count: 800, pct: 80 },
        { value: "Protect", count: 750, pct: 75 },
      ],
      tera_types: [{ value: "Fire", count: 600, pct: 60 }],
      items: [{ value: "Clear Amulet", count: 500, pct: 50 }],
      abilities: [{ value: "Orichalcum Pulse", count: 900, pct: 90 }],
    },
  ],
  ...overrides,
});

const makeUsageRow = (overrides?: Record<string, unknown>) => ({
  species: "Koraidon",
  usage_pct: 42.5,
  rank: 1,
  usage_change_7d: 2.1,
  ...overrides,
});

// =============================================================================
// getSpeciesUsageDetail
// =============================================================================

describe("getSpeciesUsageDetail", () => {
  let builder: MockQueryBuilder;
  let supabase: TypedClient;

  beforeEach(() => {
    jest.clearAllMocks();
    builder = createMockQueryBuilder();
    supabase = createMockClient(builder);
    // Default: limit resolves with the data
    builder.limit.mockResolvedValue({ data: [], error: null });
  });

  it("returns an empty array when no data exists", async () => {
    builder.limit.mockResolvedValue({ data: [], error: null });

    const result = await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    expect(result).toEqual([]);
  });

  it("maps tera_types to the tera field", async () => {
    const row = makeMetaRow();
    builder.limit.mockResolvedValue({ data: [row], error: null });

    const [period] = await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    expect(period?.tera).toEqual([{ value: "Fire", count: 600, pct: 60 }]);
  });

  it("maps moves and items correctly", async () => {
    const row = makeMetaRow();
    builder.limit.mockResolvedValue({ data: [row], error: null });

    const [period] = await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    expect(period?.moves).toHaveLength(2);
    expect(period?.moves[0]).toMatchObject({ value: "Collision Course" });
    expect(period?.items).toEqual([
      { value: "Clear Amulet", count: 500, pct: 50 },
    ]);
  });

  it("maps abilities correctly from the abilities column", async () => {
    const row = makeMetaRow();
    builder.limit.mockResolvedValue({ data: [row], error: null });

    const [period] = await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    expect(period?.abilities).toEqual([
      { value: "Orichalcum Pulse", count: 900, pct: 90 },
    ]);
  });

  it("maps usage stats fields correctly", async () => {
    const row = makeMetaRow();
    builder.limit.mockResolvedValue({ data: [row], error: null });

    const [period] = await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    expect(period).toMatchObject({
      periodStart: "2025-01-01",
      periodEnd: "2025-01-07",
      usagePct: 42.5,
      rank: 1,
      sampleSize: 1000,
      usageChange7d: 2.1,
      usageChange30d: -1.5,
    });
  });

  it("reverses rows to oldest→newest order", async () => {
    const rows = [
      makeMetaRow({ period_start: "2025-01-15", period_end: "2025-01-21" }),
      makeMetaRow({ period_start: "2025-01-08", period_end: "2025-01-14" }),
      makeMetaRow({ period_start: "2025-01-01", period_end: "2025-01-07" }),
    ];
    builder.limit.mockResolvedValue({ data: rows, error: null });

    const result = await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    // After reversal, oldest period should be first
    expect(result[0]?.periodStart).toBe("2025-01-01");
    expect(result[2]?.periodStart).toBe("2025-01-15");
  });

  it("defaults empty arrays when detail row is missing", async () => {
    const row = makeMetaRow({ pokemon_detail_stats: [] });
    builder.limit.mockResolvedValue({ data: [row], error: null });

    const [period] = await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    expect(period?.moves).toEqual([]);
    expect(period?.tera).toEqual([]);
    expect(period?.items).toEqual([]);
    expect(period?.abilities).toEqual([]);
  });

  it("defaults empty arrays when detail row is null", async () => {
    const row = makeMetaRow({ pokemon_detail_stats: null });
    builder.limit.mockResolvedValue({ data: [row], error: null });

    const [period] = await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    expect(period?.moves).toEqual([]);
    expect(period?.tera).toEqual([]);
    expect(period?.items).toEqual([]);
    expect(period?.abilities).toEqual([]);
  });

  it("throws a descriptive error when Supabase returns an error", async () => {
    builder.limit.mockResolvedValue({
      data: null,
      error: { message: "connection refused" },
    });

    await expect(
      getSpeciesUsageDetail(supabase, {
        format: "gen9vgc2025regg",
        species: "Koraidon",
      })
    ).rejects.toThrow(
      "Failed to fetch species usage detail for Koraidon in gen9vgc2025regg"
    );
  });

  it("filters by format, source, period_type, and species", async () => {
    builder.limit.mockResolvedValue({ data: [], error: null });

    await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
      source: "rk9",
      periodType: "month",
    });

    expect(builder.eq).toHaveBeenCalledWith("format", "gen9vgc2025regg");
    expect(builder.eq).toHaveBeenCalledWith("source", "rk9");
    expect(builder.eq).toHaveBeenCalledWith("period_type", "month");
    expect(builder.eq).toHaveBeenCalledWith(
      "pokemon_usage_stats.species",
      "Koraidon"
    );
    expect(builder.eq).toHaveBeenCalledWith(
      "pokemon_detail_stats.species",
      "Koraidon"
    );
  });

  it("uses default source=all and periodType=week when not specified", async () => {
    builder.limit.mockResolvedValue({ data: [], error: null });

    await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    expect(builder.eq).toHaveBeenCalledWith("source", "all");
    expect(builder.eq).toHaveBeenCalledWith("period_type", "week");
  });

  it("applies the limit parameter", async () => {
    builder.limit.mockResolvedValue({ data: [], error: null });

    await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
      limit: 6,
    });

    expect(builder.limit).toHaveBeenCalledWith(6);
  });

  it("orders by period_start descending before reversing", async () => {
    builder.limit.mockResolvedValue({ data: [], error: null });

    await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    expect(builder.order).toHaveBeenCalledWith("period_start", {
      ascending: false,
    });
  });

  it("uses !inner join in the select shape and includes abilities", async () => {
    builder.limit.mockResolvedValue({ data: [], error: null });

    await getSpeciesUsageDetail(supabase, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });

    const selectArg = (builder.select.mock.calls[0] as string[])[0];
    expect(selectArg).toContain("pokemon_usage_stats!inner");
    expect(selectArg).toContain("pokemon_detail_stats");
    expect(selectArg).toContain("abilities");
  });
});

// =============================================================================
// getSpeciesUsage
// =============================================================================

describe("getSpeciesUsage", () => {
  let builder: MockQueryBuilder;
  let supabase: TypedClient;

  beforeEach(() => {
    jest.clearAllMocks();
    builder = createMockQueryBuilder();
    supabase = createMockClient(builder);
  });

  it("returns empty array when no meta row exists", async () => {
    // maybeSingle returns null (no meta row)
    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getSpeciesUsage(supabase, {
      format: "gen9vgc2025regg",
    });

    expect(result).toEqual([]);
  });

  it("returns mapped FormatUsageRow array for the latest period", async () => {
    const metaId = 99;
    // First call: find latest meta
    builder.maybeSingle.mockResolvedValue({
      data: { id: metaId },
      error: null,
    });
    // Second call: fetch usage rows
    const usageRows = [
      makeUsageRow({ species: "Koraidon", rank: 1 }),
      makeUsageRow({ species: "Calyrex-Ice", usage_pct: 38, rank: 2, usage_change_7d: null }),
    ];
    // After maybeSingle resolves, the second from("pokemon_usage_stats") call
    // uses a different builder. We need to accommodate two `from` calls.
    const usageBuilder = createMockQueryBuilder();
    usageBuilder.order.mockResolvedValue({ data: usageRows, error: null });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(builder)   // first call: format_meta_stats
      .mockReturnValueOnce(usageBuilder); // second call: pokemon_usage_stats

    const result = await getSpeciesUsage(supabase, {
      format: "gen9vgc2025regg",
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      species: "Koraidon",
      usagePct: 42.5,
      rank: 1,
      usageChange7d: 2.1,
    });
    expect(result[1]).toMatchObject({
      species: "Calyrex-Ice",
      usagePct: 38,
      rank: 2,
      usageChange7d: null,
    });
  });

  it("returns empty array when usage rows are null", async () => {
    builder.maybeSingle.mockResolvedValue({ data: { id: 1 }, error: null });

    const usageBuilder = createMockQueryBuilder();
    usageBuilder.order.mockResolvedValue({ data: null, error: null });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(builder)
      .mockReturnValueOnce(usageBuilder);

    const result = await getSpeciesUsage(supabase, {
      format: "gen9vgc2025regg",
    });

    expect(result).toEqual([]);
  });

  it("throws a descriptive error when meta query fails", async () => {
    builder.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(
      getSpeciesUsage(supabase, { format: "gen9vgc2025regg" })
    ).rejects.toThrow("Failed to fetch latest meta bucket for gen9vgc2025regg");
  });

  it("throws a descriptive error when usage query fails", async () => {
    builder.maybeSingle.mockResolvedValue({ data: { id: 1 }, error: null });

    const usageBuilder = createMockQueryBuilder();
    usageBuilder.order.mockResolvedValue({
      data: null,
      error: { message: "timeout" },
    });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(builder)
      .mockReturnValueOnce(usageBuilder);

    await expect(
      getSpeciesUsage(supabase, { format: "gen9vgc2025regg" })
    ).rejects.toThrow("Failed to fetch species usage for meta 1");
  });

  it("filters meta query by format, source, and period_type", async () => {
    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getSpeciesUsage(supabase, {
      format: "gen9vgc2025regg",
      source: "limitless",
      periodType: "month",
    });

    expect(builder.eq).toHaveBeenCalledWith("format", "gen9vgc2025regg");
    expect(builder.eq).toHaveBeenCalledWith("source", "limitless");
    expect(builder.eq).toHaveBeenCalledWith("period_type", "month");
  });

  it("defaults source=all and periodType=week", async () => {
    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getSpeciesUsage(supabase, { format: "gen9vgc2025regg" });

    expect(builder.eq).toHaveBeenCalledWith("source", "all");
    expect(builder.eq).toHaveBeenCalledWith("period_type", "week");
  });

  it("orders meta query by period_start descending", async () => {
    builder.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getSpeciesUsage(supabase, { format: "gen9vgc2025regg" });

    expect(builder.order).toHaveBeenCalledWith("period_start", {
      ascending: false,
    });
  });

  it("orders usage rows by rank ascending", async () => {
    builder.maybeSingle.mockResolvedValue({ data: { id: 1 }, error: null });

    const usageBuilder = createMockQueryBuilder();
    usageBuilder.order.mockResolvedValue({ data: [], error: null });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(builder)
      .mockReturnValueOnce(usageBuilder);

    await getSpeciesUsage(supabase, { format: "gen9vgc2025regg" });

    expect(usageBuilder.order).toHaveBeenCalledWith("rank", {
      ascending: true,
    });
  });

  it("queries pokemon_usage_stats with the meta_id from the latest bucket", async () => {
    const metaId = 42;
    builder.maybeSingle.mockResolvedValue({ data: { id: metaId }, error: null });

    const usageBuilder = createMockQueryBuilder();
    usageBuilder.order.mockResolvedValue({ data: [], error: null });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(builder)
      .mockReturnValueOnce(usageBuilder);

    await getSpeciesUsage(supabase, { format: "gen9vgc2025regg" });

    expect(usageBuilder.eq).toHaveBeenCalledWith("meta_id", metaId);
  });
});
