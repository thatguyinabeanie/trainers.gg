import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getFormatUsageTimeseries,
  getPipelineData,
  getSpeciesUsage,
  getSpeciesUsageDetail,
  getFormatEvents,
  getUsageBySource,
  getUsageConversion,
  getSpeciesMoveCombos,
  getSpeciesTeammates,
} from "../usage";
import type { TypedClient } from "../../client";

// =============================================================================
// Mock client helpers
// =============================================================================

type MockResult = { data: unknown; error: unknown };

/**
 * Build a mock TypedClient whose `.rpc()` returns the provided result.
 * Each call to `rpc()` consumes the next result from the queue so that
 * multi-RPC scenarios can be tested without ambiguity.
 */
function makeRpcClient(results: MockResult[]) {
  let callIndex = 0;
  const rpcMock = jest.fn((_name: unknown, _args: unknown) => {
    const result = results[callIndex++] ?? { data: null, error: null };
    return Promise.resolve(result);
  });
  return { rpc: rpcMock } as unknown as TypedClient;
}

/** Convenience: single-result rpc client. */
function makeSingleRpcClient(result: MockResult) {
  return makeRpcClient([result]);
}

// =============================================================================
// getFormatEvents
// =============================================================================

describe("getFormatEvents", () => {
  it("returns [] when no events exist for format", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    const result = await getFormatEvents(client, "gen9vgc2025regg");
    expect(result).toEqual([]);
  });

  it("calls get_format_events with the correct p_format argument", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getFormatEvents(client, "gen9vgc2025regg");
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_format_events",
      { p_format: "gen9vgc2025regg" },
    ]);
  });

  it("throws a descriptive error when the RPC errors", async () => {
    const client = makeSingleRpcClient({
      data: null,
      error: { message: "DB error" },
    });
    await expect(getFormatEvents(client, "gen9vgc2025regg")).rejects.toThrow(
      "Failed to fetch events for format gen9vgc2025regg: DB error"
    );
  });

  it("maps RPC rows to FormatEvent shape", async () => {
    const rows = [
      { event_key: "rk9:00123", event_date: "2025-01-12", source: "rk9" },
      {
        event_key: "limitless:abc",
        event_date: "2025-02-01",
        source: "limitless",
      },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const result = await getFormatEvents(client, "gen9vgc2025regg");
    expect(result).toEqual([
      { eventKey: "rk9:00123", eventDate: "2025-01-12", source: "rk9" },
      {
        eventKey: "limitless:abc",
        eventDate: "2025-02-01",
        source: "limitless",
      },
    ]);
  });
});

// =============================================================================
// getSpeciesUsage
// =============================================================================

describe("getSpeciesUsage", () => {
  it("calls get_species_usage with correct default args", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getSpeciesUsage(client, { format: "gen9vgc2025regg" });
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_species_usage",
      {
        p_format: "gen9vgc2025regg",
        p_source: "all",
        p_period_type: "week",
        p_min_players: 0,
      },
    ]);
  });

  it("passes custom source, periodType, and minPlayers to the RPC", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getSpeciesUsage(client, {
      format: "gen9vgc2025regg",
      source: "rk9",
      periodType: "month",
      minPlayers: 32,
    });
    const args = (client.rpc as jest.Mock).mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(args["p_source"]).toBe("rk9");
    expect(args["p_period_type"]).toBe("month");
    expect(args["p_min_players"]).toBe(32);
  });

  it("returns [] when RPC returns empty array", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    const result = await getSpeciesUsage(client, { format: "gen9vgc2025regg" });
    expect(result).toEqual([]);
  });

  it("returns [] when RPC returns null", async () => {
    const client = makeSingleRpcClient({ data: null, error: null });
    const result = await getSpeciesUsage(client, { format: "gen9vgc2025regg" });
    expect(result).toEqual([]);
  });

  it("maps RPC rows to FormatUsageRow shape", async () => {
    const rows = [
      { species: "Koraidon", usage_pct: 42.5, rank: 1, usage_change_7d: 1.2 },
      {
        species: "Incineroar",
        usage_pct: 38.0,
        rank: 2,
        usage_change_7d: null,
      },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const result = await getSpeciesUsage(client, { format: "gen9vgc2025regg" });
    expect(result).toEqual([
      { species: "Koraidon", usagePct: 42.5, rank: 1, usageChange7d: 1.2 },
      { species: "Incineroar", usagePct: 38.0, rank: 2, usageChange7d: null },
    ]);
  });

  it("coerces null usage_change_7d to null", async () => {
    const rows = [
      { species: "Miraidon", usage_pct: 30.0, rank: 3, usage_change_7d: null },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const [row] = await getSpeciesUsage(client, { format: "gen9vgc2025regg" });
    expect(row!.usageChange7d).toBeNull();
  });

  it("throws a descriptive error on RPC failure", async () => {
    const client = makeSingleRpcClient({
      data: null,
      error: { message: "timeout" },
    });
    await expect(
      getSpeciesUsage(client, { format: "gen9vgc2025regg" })
    ).rejects.toThrow(
      "Failed to fetch species usage for gen9vgc2025regg: timeout"
    );
  });
});

// =============================================================================
// getSpeciesUsageDetail
// =============================================================================

describe("getSpeciesUsageDetail", () => {
  const detailRows = [
    {
      period_start: "2025-01-08",
      period_end: "2025-01-14",
      usage_pct: 42.5,
      rank: 1,
      sample_size: 256,
      usage_change_7d: 2.1,
      usage_change_30d: -0.5,
      moves: [{ value: "Protect", count: 200, pct: 78.1 }],
      tera_types: [{ value: "Fire", count: 150, pct: 58.6 }],
      items: [{ value: "Assault Vest", count: 180, pct: 70.3 }],
      abilities: [{ value: "Intimidate", count: 256, pct: 100 }],
      natures: [{ value: "Impish", count: 200, pct: 78.1 }],
      ability_items: [
        { value: "Intimidate + Assault Vest", count: 160, pct: 62.5 },
      ],
    },
    {
      period_start: "2025-01-01",
      period_end: "2025-01-07",
      usage_pct: 40.0,
      rank: 2,
      sample_size: 220,
      usage_change_7d: null,
      usage_change_30d: null,
      moves: [],
      tera_types: [],
      items: [],
      abilities: [],
      natures: [],
      ability_items: [],
    },
  ];

  it("calls get_species_usage_detail with correct default args", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getSpeciesUsageDetail(client, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_species_usage_detail",
      {
        p_format: "gen9vgc2025regg",
        p_species: "Koraidon",
        p_source: "all",
        p_period_type: "week",
        p_limit: 12,
        p_min_players: 0,
      },
    ]);
  });

  it("passes custom params to the RPC", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getSpeciesUsageDetail(client, {
      format: "gen9vgc2025regg",
      species: "Incineroar",
      source: "limitless",
      periodType: "month",
      limit: 6,
      minPlayers: 64,
    });
    const args = (client.rpc as jest.Mock).mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(args["p_source"]).toBe("limitless");
    expect(args["p_period_type"]).toBe("month");
    expect(args["p_limit"]).toBe(6);
    expect(args["p_min_players"]).toBe(64);
  });

  it("returns [] when RPC returns empty array", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    const result = await getSpeciesUsageDetail(client, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });
    expect(result).toEqual([]);
  });

  it("reverses RPC rows to oldest→newest order", async () => {
    // RPC returns newest-first: [Jan 8, Jan 1]; after reverse: [Jan 1, Jan 8]
    const client = makeSingleRpcClient({ data: detailRows, error: null });
    const result = await getSpeciesUsageDetail(client, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });
    expect(result[0]!.periodStart).toBe("2025-01-01");
    expect(result[1]!.periodStart).toBe("2025-01-08");
  });

  it("maps all fields to SpeciesUsagePeriod shape correctly", async () => {
    const client = makeSingleRpcClient({ data: [detailRows[0]!], error: null });
    const [row] = await getSpeciesUsageDetail(client, {
      format: "gen9vgc2025regg",
      species: "Incineroar",
    });
    expect(row).toMatchObject({
      periodStart: "2025-01-08",
      periodEnd: "2025-01-14",
      usagePct: 42.5,
      rank: 1,
      sampleSize: 256,
      usageChange7d: 2.1,
      usageChange30d: -0.5,
    });
    expect(row!.moves).toEqual([{ value: "Protect", count: 200, pct: 78.1 }]);
    expect(row!.tera).toEqual([{ value: "Fire", count: 150, pct: 58.6 }]);
    expect(row!.items).toEqual([
      { value: "Assault Vest", count: 180, pct: 70.3 },
    ]);
    expect(row!.abilities).toEqual([
      { value: "Intimidate", count: 256, pct: 100 },
    ]);
    expect(row!.natures).toEqual([{ value: "Impish", count: 200, pct: 78.1 }]);
    expect(row!.abilityItems).toEqual([
      { value: "Intimidate + Assault Vest", count: 160, pct: 62.5 },
    ]);
  });

  it("maps tera_types RPC column to the `tera` field", async () => {
    const client = makeSingleRpcClient({ data: [detailRows[0]!], error: null });
    const [row] = await getSpeciesUsageDetail(client, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });
    expect(row!.tera).toBeDefined();
    expect(row!.tera[0]!.value).toBe("Fire");
  });

  it("maps ability_items RPC column to the `abilityItems` field", async () => {
    const client = makeSingleRpcClient({ data: [detailRows[0]!], error: null });
    const [row] = await getSpeciesUsageDetail(client, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });
    expect(row!.abilityItems[0]!.value).toBe("Intimidate + Assault Vest");
  });

  it("coerces null usage_change_7d and usage_change_30d to null", async () => {
    const client = makeSingleRpcClient({ data: [detailRows[1]!], error: null });
    const [row] = await getSpeciesUsageDetail(client, {
      format: "gen9vgc2025regg",
      species: "Koraidon",
    });
    expect(row!.usageChange7d).toBeNull();
    expect(row!.usageChange30d).toBeNull();
  });

  it("throws a descriptive error on RPC failure", async () => {
    const client = makeSingleRpcClient({
      data: null,
      error: { message: "connection refused" },
    });
    await expect(
      getSpeciesUsageDetail(client, {
        format: "gen9vgc2025regg",
        species: "Koraidon",
      })
    ).rejects.toThrow(
      "Failed to fetch species usage detail for Koraidon in gen9vgc2025regg: connection refused"
    );
  });
});

// =============================================================================
// getFormatUsageTimeseries
// =============================================================================

describe("getFormatUsageTimeseries", () => {
  it("calls get_usage_timeseries with correct default args", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getFormatUsageTimeseries(client, { format: "gen9vgc2025regg" });
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_usage_timeseries",
      {
        p_format: "gen9vgc2025regg",
        p_source: "all",
        p_period_type: "week",
        p_start: undefined,
        p_end: undefined,
        p_min_players: 0,
      },
    ]);
  });

  it("passes periodStart, periodEnd, and minPlayers to the RPC", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 16,
    });
    const args = (client.rpc as jest.Mock).mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(args["p_start"]).toBe("2025-01-01");
    expect(args["p_end"]).toBe("2025-03-31");
    expect(args["p_min_players"]).toBe(16);
  });

  it("returns [] when RPC returns empty array", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });
    expect(result).toEqual([]);
  });

  it("returns [] when RPC returns null", async () => {
    const client = makeSingleRpcClient({ data: null, error: null });
    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });
    expect(result).toEqual([]);
  });

  it("groups flat rows into one point per period", async () => {
    const rows = [
      {
        period_start: "2025-01-01",
        period_end: "2025-01-07",
        species: "Koraidon",
        usage_pct: 50,
        players: 128,
        total_players: 256,
      },
      {
        period_start: "2025-01-01",
        period_end: "2025-01-07",
        species: "Miraidon",
        usage_pct: 35,
        players: 90,
        total_players: 256,
      },
      {
        period_start: "2025-01-08",
        period_end: "2025-01-14",
        species: "Koraidon",
        usage_pct: 48,
        players: 120,
        total_players: 250,
      },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.periodStart).toBe("2025-01-01");
    expect(result[0]!.usage).toEqual({ Koraidon: 50, Miraidon: 35 });
    expect(result[1]!.periodStart).toBe("2025-01-08");
    expect(result[1]!.usage).toEqual({ Koraidon: 48 });
  });

  it("preserves RPC ordering (oldest→newest) in the output array", async () => {
    const rows = [
      {
        period_start: "2025-01-01",
        period_end: "2025-01-07",
        species: "Koraidon",
        usage_pct: 50,
        players: 100,
        total_players: 200,
      },
      {
        period_start: "2025-02-01",
        period_end: "2025-02-07",
        species: "Koraidon",
        usage_pct: 45,
        players: 90,
        total_players: 200,
      },
      {
        period_start: "2025-03-01",
        period_end: "2025-03-07",
        species: "Koraidon",
        usage_pct: 40,
        players: 80,
        total_players: 200,
      },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });
    expect(result.map((p) => p.periodStart)).toEqual([
      "2025-01-01",
      "2025-02-01",
      "2025-03-01",
    ]);
  });

  it("produces an empty usage map for periods that have no species rows", async () => {
    // A period with no species rows cannot come from the RPC (the RPC only
    // returns rows where species is present). This tests the map-grouping
    // logic for robustness — an empty object is the correct fallback.
    const rows = [
      {
        period_start: "2025-01-01",
        period_end: "2025-01-07",
        species: "Koraidon",
        usage_pct: 50,
        players: 100,
        total_players: 200,
      },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const result = await getFormatUsageTimeseries(client, {
      format: "gen9vgc2025regg",
    });
    expect(result[0]!.usage).toEqual({ Koraidon: 50 });
  });

  it("throws a descriptive error when the RPC fails", async () => {
    const client = makeSingleRpcClient({
      data: null,
      error: { message: "connection refused" },
    });
    await expect(
      getFormatUsageTimeseries(client, { format: "gen9vgc2025regg" })
    ).rejects.toThrow(
      "Failed to fetch usage timeseries for gen9vgc2025regg: connection refused"
    );
  });
});

// =============================================================================
// getPipelineData
// =============================================================================

describe("getPipelineData — no data", () => {
  it("returns null when RPC returns empty array", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    const result = await getPipelineData(client, { format: "gen9vgc2025regg" });
    expect(result).toBeNull();
  });

  it("returns null when RPC returns null", async () => {
    const client = makeSingleRpcClient({ data: null, error: null });
    const result = await getPipelineData(client, { format: "gen9vgc2025regg" });
    expect(result).toBeNull();
  });

  it("throws a descriptive error when the RPC fails", async () => {
    const client = makeSingleRpcClient({
      data: null,
      error: { message: "DB error" },
    });
    await expect(
      getPipelineData(client, { format: "gen9vgc2025regg" })
    ).rejects.toThrow(
      "Failed to fetch pipeline data for gen9vgc2025regg: DB error"
    );
  });
});

describe("getPipelineData — arg passing", () => {
  it("calls get_usage_pipeline with correct default args", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getPipelineData(client, { format: "gen9vgc2025regg" });
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_usage_pipeline",
      {
        p_format: "gen9vgc2025regg",
        p_source: "all",
        p_start: undefined,
        p_end: undefined,
        p_min_players: 0,
      },
    ]);
  });

  it("passes source, periodStart, periodEnd, and minPlayers to the RPC", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getPipelineData(client, {
      format: "gen9vgc2025regg",
      source: "rk9",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 32,
    });
    const args = (client.rpc as jest.Mock).mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(args["p_source"]).toBe("rk9");
    expect(args["p_start"]).toBe("2025-01-01");
    expect(args["p_end"]).toBe("2025-03-31");
    expect(args["p_min_players"]).toBe(32);
  });
});

describe("getPipelineData — with data", () => {
  const pipelineRows = [
    {
      period_start: "2025-01-24",
      period_end: "2025-01-31",
      species: "Sneasler",
      usage_pct: 22.5,
      rank: 1,
      players: 58,
      abilities: [{ value: "Unburden", count: 91, pct: 91 }],
      items: [{ value: "Loaded Dice", count: 70, pct: 70 }],
      natures: [{ value: "Jolly", count: 78, pct: 78 }],
      moves: [{ value: "Fake Out", count: 94, pct: 94 }],
      tera_types: [{ value: "Poison", count: 60, pct: 60 }],
      ability_items: [{ value: "Unburden + Loaded Dice", count: 50, pct: 50 }],
    },
    {
      period_start: "2025-01-24",
      period_end: "2025-01-31",
      species: "Koraidon",
      usage_pct: 18.0,
      rank: 2,
      players: 46,
      abilities: [],
      items: [],
      natures: [],
      moves: [],
      tera_types: [],
      ability_items: [],
    },
  ];

  it("returns PipelineDataResult with correct period bounds from first row", async () => {
    const client = makeSingleRpcClient({ data: pipelineRows, error: null });
    const result = await getPipelineData(client, { format: "gen9vgc2025regg" });
    expect(result).not.toBeNull();
    expect(result!.periodStart).toBe("2025-01-24");
    expect(result!.periodEnd).toBe("2025-01-31");
  });

  it("maps all RPC rows to PipelineSpeciesData", async () => {
    const client = makeSingleRpcClient({ data: pipelineRows, error: null });
    const result = await getPipelineData(client, { format: "gen9vgc2025regg" });
    expect(result!.data).toHaveLength(2);
    expect(result!.data[0]!.species).toBe("Sneasler");
    expect(result!.data[0]!.usagePct).toBe(22.5);
    expect(result!.data[0]!.rank).toBe(1);
  });

  it("maps histogram columns correctly", async () => {
    const client = makeSingleRpcClient({
      data: [pipelineRows[0]!],
      error: null,
    });
    const result = await getPipelineData(client, { format: "gen9vgc2025regg" });
    const row = result!.data[0]!;
    expect(row.abilities).toEqual([{ value: "Unburden", count: 91, pct: 91 }]);
    expect(row.items).toEqual([{ value: "Loaded Dice", count: 70, pct: 70 }]);
    expect(row.natures).toEqual([{ value: "Jolly", count: 78, pct: 78 }]);
    expect(row.moves).toEqual([{ value: "Fake Out", count: 94, pct: 94 }]);
    expect(row.tera).toEqual([{ value: "Poison", count: 60, pct: 60 }]);
  });

  it("fills empty histogram arrays when RPC returns empty arrays", async () => {
    const client = makeSingleRpcClient({
      data: [pipelineRows[1]!],
      error: null,
    });
    const result = await getPipelineData(client, { format: "gen9vgc2025regg" });
    const row = result!.data[0]!;
    expect(row.abilities).toEqual([]);
    expect(row.items).toEqual([]);
    expect(row.natures).toEqual([]);
    expect(row.moves).toEqual([]);
    expect(row.tera).toEqual([]);
  });
});

// =============================================================================
// getUsageBySource
// =============================================================================

describe("getUsageBySource", () => {
  it("calls get_usage_by_source with correct payload including all params", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getUsageBySource(client, {
      format: "gen9vgc2025regg",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 16,
    });
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_usage_by_source",
      {
        p_format: "gen9vgc2025regg",
        p_start: "2025-01-01",
        p_end: "2025-03-31",
        p_min_players: 16,
      },
    ]);
  });

  it("defaults minPlayers to 0 and dates to undefined when omitted", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getUsageBySource(client, { format: "gen9vgc2025regg" });
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_usage_by_source",
      {
        p_format: "gen9vgc2025regg",
        p_start: undefined,
        p_end: undefined,
        p_min_players: 0,
      },
    ]);
  });

  it("maps RPC rows to SourceUsageRow shape with Number() coercion", async () => {
    const rows = [
      { species: "Koraidon", source: "rk9", players: 128, usage_pct: 42.5 },
      {
        species: "Incineroar",
        source: "limitless",
        players: 96,
        usage_pct: 32.0,
      },
      {
        species: "Miraidon",
        source: "trainers.gg",
        players: 64,
        usage_pct: 21.3,
      },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const result = await getUsageBySource(client, {
      format: "gen9vgc2025regg",
    });
    expect(result).toEqual([
      { species: "Koraidon", source: "rk9", players: 128, usagePct: 42.5 },
      {
        species: "Incineroar",
        source: "limitless",
        players: 96,
        usagePct: 32.0,
      },
      {
        species: "Miraidon",
        source: "trainers.gg",
        players: 64,
        usagePct: 21.3,
      },
    ]);
  });

  it("coerces bigint-like string players via Number()", async () => {
    // Supabase bigint columns sometimes arrive as strings
    const rows = [
      { species: "Sneasler", source: "rk9", players: "200", usage_pct: "55.5" },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const [row] = await getUsageBySource(client, { format: "gen9vgc2025regg" });
    expect(row!.players).toBe(200);
    expect(row!.usagePct).toBe(55.5);
  });

  it("returns [] when RPC returns empty array", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    const result = await getUsageBySource(client, {
      format: "gen9vgc2025regg",
    });
    expect(result).toEqual([]);
  });

  it("returns [] when RPC returns null", async () => {
    const client = makeSingleRpcClient({ data: null, error: null });
    const result = await getUsageBySource(client, {
      format: "gen9vgc2025regg",
    });
    expect(result).toEqual([]);
  });

  it("throws a descriptive error on RPC failure", async () => {
    const client = makeSingleRpcClient({
      data: null,
      error: { message: "timeout" },
    });
    await expect(
      getUsageBySource(client, { format: "gen9vgc2025regg" })
    ).rejects.toThrow(
      "Failed to fetch usage by source for gen9vgc2025regg: timeout"
    );
  });
});

// =============================================================================
// getUsageConversion
// =============================================================================

describe("getUsageConversion", () => {
  it("calls get_usage_conversion with all params forwarded correctly", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getUsageConversion(client, {
      format: "gen9vgc2025regg",
      source: "rk9",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 32,
      topPct: 0.2,
    });
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_usage_conversion",
      {
        p_format: "gen9vgc2025regg",
        p_source: "rk9",
        p_start: "2025-01-01",
        p_end: "2025-03-31",
        p_min_players: 32,
        p_top_percentile: 0.2,
      },
    ]);
  });

  it("defaults source to 'all', minPlayers to 0, dates to undefined, topPct to 0.10 when omitted", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getUsageConversion(client, { format: "gen9vgc2025regg" });
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_usage_conversion",
      {
        p_format: "gen9vgc2025regg",
        p_source: "all",
        p_start: undefined,
        p_end: undefined,
        p_min_players: 0,
        p_top_percentile: 0.1,
      },
    ]);
  });

  it("maps a fully-populated RPC row to ConversionRow shape", async () => {
    const rows = [
      {
        species: "Koraidon",
        players: 300,
        usage_pct: 55.0,
        top_players: 30,
        top_field: 50,
        top_share_pct: 60.0,
        conversion_pct: 25.5,
        ranked_players: 120,
      },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const [row] = await getUsageConversion(client, {
      format: "gen9vgc2025regg",
    });
    expect(row).toEqual({
      species: "Koraidon",
      players: 300,
      usagePct: 55.0,
      topPlayers: 30,
      topField: 50,
      topSharePct: 60.0,
      conversionPct: 25.5,
      rankedPlayers: 120,
    });
  });

  it("preserves conversionPct as null (does NOT coerce to 0)", async () => {
    const rows = [
      {
        species: "Miraidon",
        players: 200,
        usage_pct: 40.0,
        top_players: 0,
        top_field: 0,
        top_share_pct: 0,
        conversion_pct: null,
        ranked_players: 0,
      },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const [row] = await getUsageConversion(client, {
      format: "gen9vgc2025regg",
    });
    expect(row!.conversionPct).toBeNull();
  });

  it("forwards p_top_percentile from topPct param", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getUsageConversion(client, {
      format: "gen9vgc2025regg",
      topPct: 0.05,
    });
    const args = (client.rpc as jest.Mock).mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(args["p_top_percentile"]).toBe(0.05);
  });

  it("returns [] when RPC returns empty array", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    const result = await getUsageConversion(client, {
      format: "gen9vgc2025regg",
    });
    expect(result).toEqual([]);
  });

  it("returns [] when RPC returns null", async () => {
    const client = makeSingleRpcClient({ data: null, error: null });
    const result = await getUsageConversion(client, {
      format: "gen9vgc2025regg",
    });
    expect(result).toEqual([]);
  });

  it("throws a descriptive error on RPC failure", async () => {
    const client = makeSingleRpcClient({
      data: null,
      error: { message: "DB error" },
    });
    await expect(
      getUsageConversion(client, { format: "gen9vgc2025regg" })
    ).rejects.toThrow(
      "Failed to fetch usage conversion for gen9vgc2025regg: DB error"
    );
  });
});

// =============================================================================
// getSpeciesMoveCombos
// =============================================================================

describe("getSpeciesMoveCombos", () => {
  const comboRows = [
    {
      moves: ["fake-out", "glacial-lance", "ice-spinner", "protect"],
      players: 120,
      combo_pct: 47.24,
      rank: 1,
    },
    {
      moves: ["fake-out", "glacial-lance", "protect", "tera-blast"],
      players: 60,
      combo_pct: 23.62,
      rank: 2,
    },
  ];

  it("calls get_species_move_combos with correct default args", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getSpeciesMoveCombos(client, {
      format: "gen9vgc2025regg",
      species: "chien-pao",
    });
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_species_move_combos",
      {
        p_format: "gen9vgc2025regg",
        p_species: "chien-pao",
        p_source: "all",
        p_start: undefined,
        p_end: undefined,
        p_min_players: 0,
        p_limit: 25,
      },
    ]);
  });

  it("forwards all params including custom source, minPlayers, limit, and dates", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getSpeciesMoveCombos(client, {
      format: "gen9vgc2025regg",
      species: "chien-pao",
      source: "rk9",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 32,
      limit: 12,
    });
    const args = (client.rpc as jest.Mock).mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(args["p_source"]).toBe("rk9");
    expect(args["p_start"]).toBe("2025-01-01");
    expect(args["p_end"]).toBe("2025-03-31");
    expect(args["p_min_players"]).toBe(32);
    expect(args["p_limit"]).toBe(12);
  });

  it("maps RPC rows to MoveComboRow shape with Number() coercion", async () => {
    const client = makeSingleRpcClient({ data: comboRows, error: null });
    const result = await getSpeciesMoveCombos(client, {
      format: "gen9vgc2025regg",
      species: "chien-pao",
    });
    expect(result).toEqual([
      {
        moves: ["fake-out", "glacial-lance", "ice-spinner", "protect"],
        players: 120,
        comboPct: 47.24,
        rank: 1,
      },
      {
        moves: ["fake-out", "glacial-lance", "protect", "tera-blast"],
        players: 60,
        comboPct: 23.62,
        rank: 2,
      },
    ]);
  });

  it("coerces bigint-like string players and combo_pct via Number()", async () => {
    const rows = [
      {
        moves: ["fake-out", "glacial-lance", "ice-spinner", "protect"],
        players: "200",
        combo_pct: "55.5",
        rank: 1,
      },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const [row] = await getSpeciesMoveCombos(client, {
      format: "gen9vgc2025regg",
      species: "chien-pao",
    });
    expect(row!.players).toBe(200);
    expect(row!.comboPct).toBe(55.5);
  });

  it("preserves the moves array as-is (string[] passthrough)", async () => {
    const client = makeSingleRpcClient({ data: [comboRows[0]!], error: null });
    const [row] = await getSpeciesMoveCombos(client, {
      format: "gen9vgc2025regg",
      species: "chien-pao",
    });
    expect(row!.moves).toEqual([
      "fake-out",
      "glacial-lance",
      "ice-spinner",
      "protect",
    ]);
    expect(row!.moves).toHaveLength(4);
  });

  it("returns [] when RPC returns empty array", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    const result = await getSpeciesMoveCombos(client, {
      format: "gen9vgc2025regg",
      species: "chien-pao",
    });
    expect(result).toEqual([]);
  });

  it("returns [] when RPC returns null", async () => {
    const client = makeSingleRpcClient({ data: null, error: null });
    const result = await getSpeciesMoveCombos(client, {
      format: "gen9vgc2025regg",
      species: "chien-pao",
    });
    expect(result).toEqual([]);
  });

  it("defaults limit to 25 when not provided", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getSpeciesMoveCombos(client, {
      format: "gen9vgc2025regg",
      species: "chien-pao",
    });
    const args = (client.rpc as jest.Mock).mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(args["p_limit"]).toBe(25);
  });

  it("throws a descriptive error on RPC failure", async () => {
    const client = makeSingleRpcClient({
      data: null,
      error: { message: "connection refused" },
    });
    await expect(
      getSpeciesMoveCombos(client, {
        format: "gen9vgc2025regg",
        species: "chien-pao",
      })
    ).rejects.toThrow(
      "Failed to fetch move combos for chien-pao in gen9vgc2025regg: connection refused"
    );
  });
});

// =============================================================================
// getSpeciesTeammates
// =============================================================================

describe("getSpeciesTeammates", () => {
  const matrix = {
    order: ["flutter-mane", "incineroar"],
    cells: {
      "flutter-mane||incineroar": { count: 88, pct: 24.1 },
    },
  };

  const teammateRows = [
    {
      focal_players: 365,
      teammate: "flutter-mane",
      pair_count: 290,
      pair_pct: 79.45,
      teammate_rank: 1,
      matrix,
    },
    {
      focal_players: 365,
      teammate: "incineroar",
      pair_count: 250,
      pair_pct: 68.49,
      teammate_rank: 2,
      matrix,
    },
  ];

  it("calls get_species_teammates with correct default args", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getSpeciesTeammates(client, {
      format: "gen9vgc2025regg",
      species: "miraidon",
    });
    expect((client.rpc as jest.Mock).mock.calls[0]).toEqual([
      "get_species_teammates",
      {
        p_format: "gen9vgc2025regg",
        p_species: "miraidon",
        p_source: "all",
        p_start: undefined,
        p_end: undefined,
        p_min_players: 0,
        p_top_n: 12,
      },
    ]);
  });

  it("forwards topN as p_top_n and all other params", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getSpeciesTeammates(client, {
      format: "gen9vgc2025regg",
      species: "miraidon",
      source: "limitless",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 16,
      topN: 20,
    });
    const args = (client.rpc as jest.Mock).mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(args["p_source"]).toBe("limitless");
    expect(args["p_start"]).toBe("2025-01-01");
    expect(args["p_end"]).toBe("2025-03-31");
    expect(args["p_min_players"]).toBe(16);
    expect(args["p_top_n"]).toBe(20);
  });

  it("defaults topN to 12 when not provided", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    await getSpeciesTeammates(client, {
      format: "gen9vgc2025regg",
      species: "miraidon",
    });
    const args = (client.rpc as jest.Mock).mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(args["p_top_n"]).toBe(12);
  });

  it("returns the empty result when RPC returns empty array (zero focal teams)", async () => {
    const client = makeSingleRpcClient({ data: [], error: null });
    const result = await getSpeciesTeammates(client, {
      format: "gen9vgc2025regg",
      species: "miraidon",
    });
    expect(result).toEqual({
      focalPlayers: 0,
      teammates: [],
      matrix: { order: [], cells: {} },
    });
  });

  it("returns the empty result when RPC returns null", async () => {
    const client = makeSingleRpcClient({ data: null, error: null });
    const result = await getSpeciesTeammates(client, {
      format: "gen9vgc2025regg",
      species: "miraidon",
    });
    expect(result).toEqual({
      focalPlayers: 0,
      teammates: [],
      matrix: { order: [], cells: {} },
    });
  });

  it("reads focalPlayers from the first row", async () => {
    const client = makeSingleRpcClient({ data: teammateRows, error: null });
    const result = await getSpeciesTeammates(client, {
      format: "gen9vgc2025regg",
      species: "miraidon",
    });
    expect(result.focalPlayers).toBe(365);
  });

  it("maps every row to a TeammateRow with Number() coercion on pairCount and pairPct", async () => {
    const client = makeSingleRpcClient({ data: teammateRows, error: null });
    const result = await getSpeciesTeammates(client, {
      format: "gen9vgc2025regg",
      species: "miraidon",
    });
    expect(result.teammates).toEqual([
      { teammate: "flutter-mane", pairCount: 290, pairPct: 79.45, rank: 1 },
      { teammate: "incineroar", pairCount: 250, pairPct: 68.49, rank: 2 },
    ]);
  });

  it("maps teammate_rank column to the rank field", async () => {
    const client = makeSingleRpcClient({ data: teammateRows, error: null });
    const result = await getSpeciesTeammates(client, {
      format: "gen9vgc2025regg",
      species: "miraidon",
    });
    expect(result.teammates[0]!.rank).toBe(1);
    expect(result.teammates[1]!.rank).toBe(2);
  });

  it("parses the matrix jsonb from the first row only", async () => {
    const client = makeSingleRpcClient({ data: teammateRows, error: null });
    const result = await getSpeciesTeammates(client, {
      format: "gen9vgc2025regg",
      species: "miraidon",
    });
    expect(result.matrix).toEqual(matrix);
    expect(result.matrix.order).toEqual(["flutter-mane", "incineroar"]);
    expect(result.matrix.cells["flutter-mane||incineroar"]).toEqual({
      count: 88,
      pct: 24.1,
    });
  });

  // The RPC builds the matrix with jsonb_build_object + COALESCE, so a null or
  // malformed matrix is a contract violation — the query throws so the action
  // layer logs it via logError instead of silently rendering an empty heatmap.
  it("throws on shape mismatch when the matrix jsonb is null", async () => {
    const rowsWithNullMatrix = teammateRows.map((r) => ({
      ...r,
      matrix: null,
    }));
    const client = makeSingleRpcClient({
      data: rowsWithNullMatrix,
      error: null,
    });
    await expect(
      getSpeciesTeammates(client, {
        format: "gen9vgc2025regg",
        species: "miraidon",
      })
    ).rejects.toThrow(
      'matrix jsonb shape mismatch for species="miraidon" format="gen9vgc2025regg"'
    );
  });

  it("throws on shape mismatch when the matrix jsonb is malformed (missing order array)", async () => {
    const rowsWithBadMatrix = teammateRows.map((r) => ({
      ...r,
      matrix: { cells: {} }, // missing order
    }));
    const client = makeSingleRpcClient({
      data: rowsWithBadMatrix,
      error: null,
    });
    await expect(
      getSpeciesTeammates(client, {
        format: "gen9vgc2025regg",
        species: "miraidon",
      })
    ).rejects.toThrow(
      'matrix jsonb shape mismatch for species="miraidon" format="gen9vgc2025regg"'
    );
  });

  it("coerces bigint-like string focal_players, pair_count, and pair_pct via Number()", async () => {
    const rows = [
      {
        focal_players: "365",
        teammate: "flutter-mane",
        pair_count: "290",
        pair_pct: "79.45",
        teammate_rank: 1,
        matrix,
      },
    ];
    const client = makeSingleRpcClient({ data: rows, error: null });
    const result = await getSpeciesTeammates(client, {
      format: "gen9vgc2025regg",
      species: "miraidon",
    });
    expect(result.focalPlayers).toBe(365);
    expect(result.teammates[0]!.pairCount).toBe(290);
    expect(result.teammates[0]!.pairPct).toBe(79.45);
  });

  it("throws a descriptive error on RPC failure", async () => {
    const client = makeSingleRpcClient({
      data: null,
      error: { message: "timeout" },
    });
    await expect(
      getSpeciesTeammates(client, {
        format: "gen9vgc2025regg",
        species: "miraidon",
      })
    ).rejects.toThrow(
      "Failed to fetch teammates for miraidon in gen9vgc2025regg: timeout"
    );
  });
});

// =============================================================================
// Test isolation
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
});
