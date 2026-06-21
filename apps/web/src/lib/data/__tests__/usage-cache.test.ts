/**
 * @jest-environment node
 *
 * Tests for the 9 'use cache' usage fetchers in usage-cache.ts.
 *
 * Each fetcher is a thin wrapper that:
 *   1. Creates a service-role Supabase client (not an anon client — the
 *      underlying RPCs read team_slots whose anon SELECT was revoked in
 *      Phase 2).
 *   2. Delegates to the corresponding @trainers/supabase query wrapper.
 *   3. Returns the wrapper's value as-is.
 *
 * These tests verify that the mechanical wiring is correct and that
 * createStaticClient() is never used (regression guard for the Phase 2 swap).
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockCreateServiceRoleClient = jest.fn();

// Stub @/lib/supabase/server — only createServiceRoleClient is used; assert
// that createStaticClient is absent from the call record.
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
  // createStaticClient is intentionally NOT exported here so any accidental
  // import of it would throw at import time.
}));

// Individual query-wrapper mocks — one per fetcher.
const mockGetSpeciesUsageDetail = jest.fn();
const mockGetSpeciesUsage = jest.fn();
const mockGetFormatUsageTimeseries = jest.fn();
const mockGetPipelineData = jest.fn();
const mockGetFormatEvents = jest.fn();
const mockGetUsageBySource = jest.fn();
const mockGetUsageConversion = jest.fn();
const mockGetSpeciesMoveCombos = jest.fn();
const mockGetSpeciesTeammates = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getSpeciesUsageDetail: (...args: unknown[]) =>
    mockGetSpeciesUsageDetail(...args),
  getSpeciesUsage: (...args: unknown[]) => mockGetSpeciesUsage(...args),
  getFormatUsageTimeseries: (...args: unknown[]) =>
    mockGetFormatUsageTimeseries(...args),
  getPipelineData: (...args: unknown[]) => mockGetPipelineData(...args),
  getFormatEvents: (...args: unknown[]) => mockGetFormatEvents(...args),
  getUsageBySource: (...args: unknown[]) => mockGetUsageBySource(...args),
  getUsageConversion: (...args: unknown[]) => mockGetUsageConversion(...args),
  getSpeciesMoveCombos: (...args: unknown[]) =>
    mockGetSpeciesMoveCombos(...args),
  getSpeciesTeammates: (...args: unknown[]) => mockGetSpeciesTeammates(...args),
}));

// 'use cache', cacheTag, cacheLife are Next.js internals — stub them so the
// module loads in a Node test environment without a Next.js runtime.
jest.mock("next/cache", () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  CacheTags: {
    USAGE_STATS: "usage-stats",
    usageStats: (format: string) => `usage-stats:${format}`,
  },
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import {
  getCachedSpeciesUsageDetail,
  getCachedFormatUsage,
  getCachedFormatUsageTimeseries,
  getCachedPipelineData,
  getCachedFormatEvents,
  getCachedUsageBySource,
  getCachedUsageConversion,
  getCachedSpeciesMoveCombos,
  getCachedSpeciesTeammates,
} from "../usage-cache";

// =============================================================================
// Shared sentinel client
// =============================================================================

const SERVICE_ROLE_CLIENT = { __serviceRole: true } as const;

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateServiceRoleClient.mockReturnValue(SERVICE_ROLE_CLIENT);
});

// =============================================================================
// getCachedSpeciesUsageDetail
// =============================================================================

describe("getCachedSpeciesUsageDetail", () => {
  const PARAMS = {
    format: "vgc2025reg-i",
    species: "Calyrex-Ice",
    source: "all",
    periodType: "week" as const,
    limit: 12,
    minPlayers: 8,
  };

  const FIXTURE = [
    { period_start: "2025-01-01", usage_pct: 0.42, player_count: 120 },
  ];

  beforeEach(() => {
    mockGetSpeciesUsageDetail.mockResolvedValue(FIXTURE);
  });

  it("returns the value from getSpeciesUsageDetail", async () => {
    const result = await getCachedSpeciesUsageDetail(PARAMS);

    expect(result).toEqual(FIXTURE);
  });

  it("calls getSpeciesUsageDetail with the sentinel client and params", async () => {
    await getCachedSpeciesUsageDetail(PARAMS);

    expect(mockGetSpeciesUsageDetail).toHaveBeenCalledTimes(1);
    expect(mockGetSpeciesUsageDetail).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      PARAMS
    );
  });

  it("creates a service-role client — not an anon client", async () => {
    await getCachedSpeciesUsageDetail(PARAMS);

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("propagates an empty array from the query unchanged", async () => {
    mockGetSpeciesUsageDetail.mockResolvedValue([]);

    const result = await getCachedSpeciesUsageDetail(PARAMS);

    expect(result).toEqual([]);
  });
});

// =============================================================================
// getCachedFormatUsage
// =============================================================================

describe("getCachedFormatUsage", () => {
  const PARAMS = {
    format: "vgc2025reg-i",
    source: "rk9",
    periodType: "week" as const,
    minPlayers: 8,
  };

  const FIXTURE = [{ species: "Koraidon", usage_pct: 0.65, player_count: 80 }];

  beforeEach(() => {
    mockGetSpeciesUsage.mockResolvedValue(FIXTURE);
  });

  it("returns the value from getSpeciesUsage", async () => {
    const result = await getCachedFormatUsage(PARAMS);

    expect(result).toEqual(FIXTURE);
  });

  it("calls getSpeciesUsage with the sentinel client and params", async () => {
    await getCachedFormatUsage(PARAMS);

    expect(mockGetSpeciesUsage).toHaveBeenCalledTimes(1);
    expect(mockGetSpeciesUsage).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      PARAMS
    );
  });

  it("creates a service-role client — not an anon client", async () => {
    await getCachedFormatUsage(PARAMS);

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("propagates an empty array from the query unchanged", async () => {
    mockGetSpeciesUsage.mockResolvedValue([]);

    const result = await getCachedFormatUsage(PARAMS);

    expect(result).toEqual([]);
  });
});

// =============================================================================
// getCachedFormatUsageTimeseries
// =============================================================================

describe("getCachedFormatUsageTimeseries", () => {
  const PARAMS = {
    format: "vgc2025reg-i",
    source: "all",
    periodType: "month" as const,
    periodStart: "2025-01-01",
    periodEnd: "2025-06-01",
    minPlayers: 8,
  };

  const FIXTURE = [
    { period_start: "2025-01-01", species: "Koraidon", usage_pct: 0.55 },
  ];

  beforeEach(() => {
    mockGetFormatUsageTimeseries.mockResolvedValue(FIXTURE);
  });

  it("returns the value from getFormatUsageTimeseries", async () => {
    const result = await getCachedFormatUsageTimeseries(PARAMS);

    expect(result).toEqual(FIXTURE);
  });

  it("calls getFormatUsageTimeseries with the sentinel client and params", async () => {
    await getCachedFormatUsageTimeseries(PARAMS);

    expect(mockGetFormatUsageTimeseries).toHaveBeenCalledTimes(1);
    expect(mockGetFormatUsageTimeseries).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      PARAMS
    );
  });

  it("creates a service-role client — not an anon client", async () => {
    await getCachedFormatUsageTimeseries(PARAMS);

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("handles undefined period boundaries", async () => {
    const paramsWithUndefined = {
      ...PARAMS,
      periodStart: undefined,
      periodEnd: undefined,
    };
    mockGetFormatUsageTimeseries.mockResolvedValue([]);

    const result = await getCachedFormatUsageTimeseries(paramsWithUndefined);

    expect(result).toEqual([]);
    expect(mockGetFormatUsageTimeseries).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      paramsWithUndefined
    );
  });
});

// =============================================================================
// getCachedPipelineData
// =============================================================================

describe("getCachedPipelineData", () => {
  const PARAMS = {
    format: "vgc2025reg-i",
    source: "rk9",
    periodStart: "2025-01-01",
    periodEnd: "2025-06-01",
    minPlayers: 8,
  };

  const FIXTURE = {
    nodes: [{ id: "Koraidon", label: "Koraidon" }],
    links: [],
  };

  beforeEach(() => {
    mockGetPipelineData.mockResolvedValue(FIXTURE);
  });

  it("returns the value from getPipelineData", async () => {
    const result = await getCachedPipelineData(PARAMS);

    expect(result).toEqual(FIXTURE);
  });

  it("calls getPipelineData with the sentinel client and params", async () => {
    await getCachedPipelineData(PARAMS);

    expect(mockGetPipelineData).toHaveBeenCalledTimes(1);
    expect(mockGetPipelineData).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      PARAMS
    );
  });

  it("creates a service-role client — not an anon client", async () => {
    await getCachedPipelineData(PARAMS);

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("propagates null when the query returns null (no matching data)", async () => {
    mockGetPipelineData.mockResolvedValue(null);

    const result = await getCachedPipelineData(PARAMS);

    expect(result).toBeNull();
  });

  it("handles undefined period boundaries", async () => {
    const paramsWithUndefined = {
      ...PARAMS,
      periodStart: undefined,
      periodEnd: undefined,
    };
    mockGetPipelineData.mockResolvedValue(null);

    const result = await getCachedPipelineData(paramsWithUndefined);

    expect(result).toBeNull();
    expect(mockGetPipelineData).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      paramsWithUndefined
    );
  });
});

// =============================================================================
// getCachedFormatEvents
// =============================================================================

describe("getCachedFormatEvents", () => {
  const FORMAT = "vgc2025reg-i";

  const FIXTURE = [
    { event_date: "2025-03-15", event_name: "NAIC" },
    { event_date: "2025-05-20", event_name: "Worlds" },
  ];

  beforeEach(() => {
    mockGetFormatEvents.mockResolvedValue(FIXTURE);
  });

  it("returns the value from getFormatEvents", async () => {
    const result = await getCachedFormatEvents(FORMAT);

    expect(result).toEqual(FIXTURE);
  });

  it("calls getFormatEvents with the sentinel client and the format string", async () => {
    await getCachedFormatEvents(FORMAT);

    expect(mockGetFormatEvents).toHaveBeenCalledTimes(1);
    expect(mockGetFormatEvents).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      FORMAT
    );
  });

  it("creates a service-role client — not an anon client", async () => {
    await getCachedFormatEvents(FORMAT);

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("propagates an empty array for a format with no events", async () => {
    mockGetFormatEvents.mockResolvedValue([]);

    const result = await getCachedFormatEvents(FORMAT);

    expect(result).toEqual([]);
  });

  it("passes the format string through unchanged for different format values", async () => {
    mockGetFormatEvents.mockResolvedValue([]);

    await getCachedFormatEvents("champions-s1");

    expect(mockGetFormatEvents).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      "champions-s1"
    );
  });
});

// =============================================================================
// getCachedUsageBySource
// =============================================================================

describe("getCachedUsageBySource", () => {
  const PARAMS = {
    format: "vgc2025reg-i",
    periodStart: "2025-01-01",
    periodEnd: "2025-06-01",
    minPlayers: 8,
  };

  const FIXTURE = [
    { source: "rk9", species: "Koraidon", usage_pct: 0.65 },
    { source: "limitless", species: "Koraidon", usage_pct: 0.6 },
  ];

  beforeEach(() => {
    mockGetUsageBySource.mockResolvedValue(FIXTURE);
  });

  it("returns the value from getUsageBySource", async () => {
    const result = await getCachedUsageBySource(PARAMS);

    expect(result).toEqual(FIXTURE);
  });

  it("calls getUsageBySource with the sentinel client and params", async () => {
    await getCachedUsageBySource(PARAMS);

    expect(mockGetUsageBySource).toHaveBeenCalledTimes(1);
    expect(mockGetUsageBySource).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      PARAMS
    );
  });

  it("creates a service-role client — not an anon client", async () => {
    await getCachedUsageBySource(PARAMS);

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("handles undefined period boundaries", async () => {
    const paramsWithUndefined = {
      ...PARAMS,
      periodStart: undefined,
      periodEnd: undefined,
    };
    mockGetUsageBySource.mockResolvedValue([]);

    await getCachedUsageBySource(paramsWithUndefined);

    expect(mockGetUsageBySource).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      paramsWithUndefined
    );
  });
});

// =============================================================================
// getCachedUsageConversion
// =============================================================================

describe("getCachedUsageConversion", () => {
  const PARAMS = {
    format: "vgc2025reg-i",
    source: "all",
    periodStart: "2025-01-01",
    periodEnd: "2025-06-01",
    minPlayers: 8,
    topPct: 16,
  };

  const FIXTURE = [
    { species: "Koraidon", overall_pct: 0.65, top_pct: 0.8 },
    { species: "Calyrex-Ice", overall_pct: 0.55, top_pct: 0.45 },
  ];

  beforeEach(() => {
    mockGetUsageConversion.mockResolvedValue(FIXTURE);
  });

  it("returns the value from getUsageConversion", async () => {
    const result = await getCachedUsageConversion(PARAMS);

    expect(result).toEqual(FIXTURE);
  });

  it("calls getUsageConversion with the sentinel client and params", async () => {
    await getCachedUsageConversion(PARAMS);

    expect(mockGetUsageConversion).toHaveBeenCalledTimes(1);
    expect(mockGetUsageConversion).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      PARAMS
    );
  });

  it("creates a service-role client — not an anon client", async () => {
    await getCachedUsageConversion(PARAMS);

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("includes topPct in the params (cache key for percentile bucket)", async () => {
    const paramsTop8 = { ...PARAMS, topPct: 8 };
    mockGetUsageConversion.mockResolvedValue([]);

    await getCachedUsageConversion(paramsTop8);

    expect(mockGetUsageConversion).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      paramsTop8
    );
  });
});

// =============================================================================
// getCachedSpeciesMoveCombos
// =============================================================================

describe("getCachedSpeciesMoveCombos", () => {
  const PARAMS = {
    format: "vgc2025reg-i",
    species: "Koraidon",
    source: "all",
    periodStart: "2025-01-01",
    periodEnd: "2025-06-01",
    minPlayers: 8,
    limit: 20,
  };

  const FIXTURE = [
    {
      move1: "Collision Course",
      move2: "Flare Blitz",
      move3: "Protect",
      move4: "Swords Dance",
      combo_count: 45,
    },
  ];

  beforeEach(() => {
    mockGetSpeciesMoveCombos.mockResolvedValue(FIXTURE);
  });

  it("returns the value from getSpeciesMoveCombos", async () => {
    const result = await getCachedSpeciesMoveCombos(PARAMS);

    expect(result).toEqual(FIXTURE);
  });

  it("calls getSpeciesMoveCombos with the sentinel client and params", async () => {
    await getCachedSpeciesMoveCombos(PARAMS);

    expect(mockGetSpeciesMoveCombos).toHaveBeenCalledTimes(1);
    expect(mockGetSpeciesMoveCombos).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      PARAMS
    );
  });

  it("creates a service-role client — not an anon client", async () => {
    await getCachedSpeciesMoveCombos(PARAMS);

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("propagates an empty array when no combos match", async () => {
    mockGetSpeciesMoveCombos.mockResolvedValue([]);

    const result = await getCachedSpeciesMoveCombos(PARAMS);

    expect(result).toEqual([]);
  });

  it("includes species in params so different species get distinct cache entries", async () => {
    const paramsCalyrex = { ...PARAMS, species: "Calyrex-Ice" };
    mockGetSpeciesMoveCombos.mockResolvedValue([]);

    await getCachedSpeciesMoveCombos(paramsCalyrex);

    expect(mockGetSpeciesMoveCombos).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      paramsCalyrex
    );
  });
});

// =============================================================================
// getCachedSpeciesTeammates
// =============================================================================

describe("getCachedSpeciesTeammates", () => {
  const PARAMS = {
    format: "vgc2025reg-i",
    species: "Koraidon",
    source: "all",
    periodStart: "2025-01-01",
    periodEnd: "2025-06-01",
    minPlayers: 8,
    topN: 10,
  };

  const FIXTURE = {
    focalPlayers: 120,
    teammates: [{ species: "Calyrex-Ice", pair_rate: 0.48 }],
    matrix: [],
  };

  beforeEach(() => {
    mockGetSpeciesTeammates.mockResolvedValue(FIXTURE);
  });

  it("returns the value from getSpeciesTeammates", async () => {
    const result = await getCachedSpeciesTeammates(PARAMS);

    expect(result).toEqual(FIXTURE);
  });

  it("calls getSpeciesTeammates with the sentinel client and params", async () => {
    await getCachedSpeciesTeammates(PARAMS);

    expect(mockGetSpeciesTeammates).toHaveBeenCalledTimes(1);
    expect(mockGetSpeciesTeammates).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      PARAMS
    );
  });

  it("creates a service-role client — not an anon client", async () => {
    await getCachedSpeciesTeammates(PARAMS);

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("passes topN through to the query (controls matrix size)", async () => {
    const paramsTop5 = { ...PARAMS, topN: 5 };
    mockGetSpeciesTeammates.mockResolvedValue({ ...FIXTURE, focalPlayers: 50 });

    await getCachedSpeciesTeammates(paramsTop5);

    expect(mockGetSpeciesTeammates).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      paramsTop5
    );
  });

  it("includes species in params so different species get distinct cache entries", async () => {
    const paramsCalyrex = { ...PARAMS, species: "Calyrex-Ice" };
    mockGetSpeciesTeammates.mockResolvedValue(FIXTURE);

    await getCachedSpeciesTeammates(paramsCalyrex);

    expect(mockGetSpeciesTeammates).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      paramsCalyrex
    );
  });
});

// =============================================================================
// Cross-cutting: createStaticClient is never invoked
// =============================================================================

describe("createStaticClient is never used (Phase 2 regression guard)", () => {
  it("does not call createStaticClient for any fetcher — only createServiceRoleClient", async () => {
    // Run all 9 fetchers. If any accidentally imports createStaticClient from
    // the server module, the mock would need to export it — it doesn't, so any
    // such call would throw. Separately, we verify the service-role factory
    // is called exactly once per fetcher invocation (9 total).
    mockGetSpeciesUsageDetail.mockResolvedValue([]);
    mockGetSpeciesUsage.mockResolvedValue([]);
    mockGetFormatUsageTimeseries.mockResolvedValue([]);
    mockGetPipelineData.mockResolvedValue(null);
    mockGetFormatEvents.mockResolvedValue([]);
    mockGetUsageBySource.mockResolvedValue([]);
    mockGetUsageConversion.mockResolvedValue([]);
    mockGetSpeciesMoveCombos.mockResolvedValue([]);
    mockGetSpeciesTeammates.mockResolvedValue({
      focalPlayers: 0,
      teammates: [],
      matrix: [],
    });

    await getCachedSpeciesUsageDetail({
      format: "f",
      species: "s",
      source: "all",
      periodType: "week",
      limit: 1,
      minPlayers: 1,
    });
    await getCachedFormatUsage({
      format: "f",
      source: "all",
      periodType: "week",
      minPlayers: 1,
    });
    await getCachedFormatUsageTimeseries({
      format: "f",
      source: "all",
      periodType: "week",
      periodStart: undefined,
      periodEnd: undefined,
      minPlayers: 1,
    });
    await getCachedPipelineData({
      format: "f",
      source: "all",
      periodStart: undefined,
      periodEnd: undefined,
      minPlayers: 1,
    });
    await getCachedFormatEvents("f");
    await getCachedUsageBySource({
      format: "f",
      periodStart: undefined,
      periodEnd: undefined,
      minPlayers: 1,
    });
    await getCachedUsageConversion({
      format: "f",
      source: "all",
      periodStart: undefined,
      periodEnd: undefined,
      minPlayers: 1,
      topPct: 16,
    });
    await getCachedSpeciesMoveCombos({
      format: "f",
      species: "s",
      source: "all",
      periodStart: undefined,
      periodEnd: undefined,
      minPlayers: 1,
      limit: 10,
    });
    await getCachedSpeciesTeammates({
      format: "f",
      species: "s",
      source: "all",
      periodStart: undefined,
      periodEnd: undefined,
      minPlayers: 1,
      topN: 5,
    });

    // createServiceRoleClient must have been called exactly 9 times — once
    // per fetcher. No anon/static client was used.
    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(9);
  });
});
