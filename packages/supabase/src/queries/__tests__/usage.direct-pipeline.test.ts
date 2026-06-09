import { describe, it, expect, jest } from "@jest/globals";
import { getDirectPipelineData } from "../usage";
import type { TypedClient } from "../../client";

// =============================================================================
// Mock client helpers (mirrors the pattern in usage.test.ts)
// =============================================================================

type MockResult = { data: unknown; error: unknown };

function makeQueryBuilder(result: MockResult) {
  const builder: Record<string, unknown> = {};
  const returnSelf = jest.fn().mockReturnValue(builder);
  builder["select"] = returnSelf;
  builder["eq"] = returnSelf;
  builder["order"] = returnSelf;
  builder["in"] = returnSelf;
  builder["gte"] = returnSelf;
  builder["lte"] = returnSelf;
  builder["limit"] = returnSelf;
  builder["maybeSingle"] = jest.fn().mockResolvedValue(result);
  builder["then"] = (
    resolve: (v: unknown) => unknown,
    reject: (e: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

function makeSingleClient(result: MockResult) {
  const client = {
    from: jest.fn(() => makeQueryBuilder(result)),
    rpc: jest.fn(() => makeQueryBuilder(result)),
  };
  return client as unknown as TypedClient;
}

// =============================================================================
// Fixtures
// =============================================================================

const eventUsageRows = [
  {
    source: "rk9",
    event_key: "rk9:EVT001",
    division: "masters",
    species: "flutter-mane",
    team_count: 80,
    total_teams: 256,
    details: {
      moves: [{ v: "Shadow Ball", n: 60 }],
      tera: [{ v: "Fairy", n: 70 }],
      item: [{ v: "Choice Specs", n: 50 }],
      ability: [{ v: "Protosynthesis", n: 80 }],
      nature: [{ v: "Timid", n: 65 }],
      abilityItem: [],
    },
    event_date: "2024-05-01",
  },
  {
    source: "rk9",
    event_key: "rk9:EVT001",
    division: "masters",
    species: "incineroar",
    team_count: 200,
    total_teams: 256,
    details: {
      moves: [{ v: "Fake Out", n: 200 }],
      tera: [{ v: "Dark", n: 120 }],
      item: [{ v: "Safety Goggles", n: 100 }],
      ability: [{ v: "Intimidate", n: 200 }],
      nature: [{ v: "Impish", n: 180 }],
      abilityItem: [],
    },
    event_date: "2024-05-01",
  },
];

// =============================================================================
// getDirectPipelineData — no data
// =============================================================================

describe("getDirectPipelineData — no data", () => {
  it("returns null when the query returns an empty array", async () => {
    const client = makeSingleClient({ data: [], error: null });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
    });

    expect(result).toBeNull();
  });

  it("returns null when the query returns null", async () => {
    const client = makeSingleClient({ data: null, error: null });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
    });

    expect(result).toBeNull();
  });
});

// =============================================================================
// getDirectPipelineData — error handling
// =============================================================================

describe("getDirectPipelineData — error handling", () => {
  it("throws a descriptive error when the query fails", async () => {
    const client = makeSingleClient({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(
      getDirectPipelineData(client, { format: "gen9vgc2024regg" })
    ).rejects.toThrow(
      "Failed to fetch direct pipeline data for gen9vgc2024regg: permission denied"
    );
  });
});

// =============================================================================
// getDirectPipelineData — usage percentage computation
// =============================================================================

describe("getDirectPipelineData — usage percentage computation", () => {
  it("computes usagePct correctly: incineroar 200/256 = 78.13%", async () => {
    const client = makeSingleClient({ data: eventUsageRows, error: null });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
    });

    expect(result).not.toBeNull();
    const incineroar = result!.data.find((s) => s.species === "incineroar");
    expect(incineroar).toBeDefined();
    // 200 / 256 * 100 = 78.125, rounded to 2 decimal places = 78.13
    expect(incineroar!.usagePct).toBe(78.13);
  });

  it("computes usagePct correctly: flutter-mane 80/256 = 31.25%", async () => {
    const client = makeSingleClient({ data: eventUsageRows, error: null });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
    });

    const flutterMane = result!.data.find((s) => s.species === "flutter-mane");
    expect(flutterMane).toBeDefined();
    // 80 / 256 * 100 = 31.25
    expect(flutterMane!.usagePct).toBe(31.25);
  });

  it("assigns rank 1 to the most-used species", async () => {
    const client = makeSingleClient({ data: eventUsageRows, error: null });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
    });

    const incineroar = result!.data.find((s) => s.species === "incineroar");
    expect(incineroar!.rank).toBe(1);
    const flutterMane = result!.data.find((s) => s.species === "flutter-mane");
    expect(flutterMane!.rank).toBe(2);
  });
});

// =============================================================================
// getDirectPipelineData — plural field mapping
// =============================================================================

describe("getDirectPipelineData — plural field name mapping", () => {
  it("maps ability[] → abilities[] on PipelineSpeciesData", async () => {
    const client = makeSingleClient({
      data: [eventUsageRows[0]!],
      error: null,
    });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
    });

    const row = result!.data[0]!;
    // Should be under `abilities`, not `ability`
    expect(row.abilities).toBeDefined();
    expect(row.abilities[0]!.value).toBe("Protosynthesis");
    expect(row.abilities[0]!.count).toBe(80);
  });

  it("maps item[] → items[] on PipelineSpeciesData", async () => {
    const client = makeSingleClient({
      data: [eventUsageRows[0]!],
      error: null,
    });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
    });

    const row = result!.data[0]!;
    expect(row.items).toBeDefined();
    expect(row.items[0]!.value).toBe("Choice Specs");
  });

  it("maps nature[] → natures[] on PipelineSpeciesData", async () => {
    const client = makeSingleClient({
      data: [eventUsageRows[0]!],
      error: null,
    });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
    });

    const row = result!.data[0]!;
    expect(row.natures).toBeDefined();
    expect(row.natures[0]!.value).toBe("Timid");
  });

  it("passes moves[] through unchanged", async () => {
    const client = makeSingleClient({
      data: [eventUsageRows[0]!],
      error: null,
    });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
    });

    const row = result!.data[0]!;
    expect(row.moves[0]!.value).toBe("Shadow Ball");
  });
});

// =============================================================================
// getDirectPipelineData — period start/end from event_date range
// =============================================================================

describe("getDirectPipelineData — periodStart and periodEnd", () => {
  it("derives periodStart/periodEnd from event_date range when not provided", async () => {
    const rows = [
      { ...eventUsageRows[0]!, event_date: "2024-05-01" },
      { ...eventUsageRows[1]!, event_date: "2024-05-15" },
    ];
    const client = makeSingleClient({ data: rows, error: null });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
    });

    expect(result!.periodStart).toBe("2024-05-01");
    expect(result!.periodEnd).toBe("2024-05-15");
  });

  it("uses provided periodStart when supplied", async () => {
    const client = makeSingleClient({ data: eventUsageRows, error: null });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
      periodStart: "2024-04-01",
    });

    expect(result!.periodStart).toBe("2024-04-01");
  });

  it("uses provided periodEnd when supplied", async () => {
    const client = makeSingleClient({ data: eventUsageRows, error: null });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
      periodEnd: "2024-06-30",
    });

    expect(result!.periodEnd).toBe("2024-06-30");
  });

  it("uses both provided periodStart and periodEnd when both supplied", async () => {
    const client = makeSingleClient({ data: eventUsageRows, error: null });

    const result = await getDirectPipelineData(client, {
      format: "gen9vgc2024regg",
      periodStart: "2024-01-01",
      periodEnd: "2024-12-31",
    });

    expect(result!.periodStart).toBe("2024-01-01");
    expect(result!.periodEnd).toBe("2024-12-31");
  });
});
