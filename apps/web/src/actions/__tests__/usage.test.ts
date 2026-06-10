/**
 * @jest-environment node
 */

// ---------------------------------------------------------------------------
// Module mocks — hoisted before imports by Jest
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(),
  createStaticClient: jest.fn(),
  getUserId: jest.fn(),
}));

jest.mock("@/lib/sudo/server", () => ({
  isSiteAdmin: jest.fn(),
}));

jest.mock("@trainers/supabase", () => ({
  compileSourceTeamSlots: jest.fn(),
  getSpeciesUsage: jest.fn(),
  getSpeciesUsageDetail: jest.fn(),
  getFormatUsageTimeseries: jest.fn(),
  getPipelineData: jest.fn(),
  getFormatEvents: jest.fn(),
}));

// 'use cache' is a compile-time directive — inert under Jest.
// cacheTag / cacheLife are no-ops; they never run here.
jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

// Mock the usage-cache lib module so tests exercise the action logic in
// isolation without triggering 'use cache' at the lib layer.
jest.mock("@/lib/data/usage-cache", () => ({
  getCachedSpeciesUsageDetail: jest.fn(),
  getCachedFormatUsage: jest.fn(),
  getCachedFormatUsageTimeseries: jest.fn(),
  getCachedPipelineData: jest.fn(),
  getCachedFormatEvents: jest.fn(),
  getCachedUsageBySource: jest.fn(),
  getCachedUsageConversion: jest.fn(),
  getCachedSpeciesMoveCombos: jest.fn(),
  getCachedSpeciesTeammates: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import { compileSourceTeamSlots } from "@trainers/supabase";
import { updateTag } from "next/cache";
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
} from "@/lib/data/usage-cache";
import {
  calculateSourceUsage,
  calculateAllSourceUsage,
  fetchSpeciesUsageDetail,
  fetchFormatUsage,
  fetchFormatUsageTimeseries,
  fetchPipelineData,
  fetchFormatEvents,
  fetchUsageBySource,
  fetchUsageConversion,
  fetchSpeciesMoveCombos,
  fetchSpeciesTeammates,
} from "../usage";

// ---------------------------------------------------------------------------
// Typed mock handles
// ---------------------------------------------------------------------------

const mockGetUserId = getUserId as jest.Mock;
const mockIsSiteAdmin = isSiteAdmin as jest.Mock;
const mockCreateServiceRoleClient = createServiceRoleClient as jest.Mock;
const mockCompileSourceTeamSlots = compileSourceTeamSlots as jest.Mock;
const mockUpdateTag = updateTag as jest.Mock;
const mockGetCachedSpeciesUsageDetail =
  getCachedSpeciesUsageDetail as jest.Mock;
const mockGetCachedFormatUsage = getCachedFormatUsage as jest.Mock;
const mockGetCachedFormatUsageTimeseries =
  getCachedFormatUsageTimeseries as jest.Mock;
const mockGetCachedPipelineData = getCachedPipelineData as jest.Mock;
const mockGetCachedFormatEvents = getCachedFormatEvents as jest.Mock;
const mockGetCachedUsageBySource = getCachedUsageBySource as jest.Mock;
const mockGetCachedUsageConversion = getCachedUsageConversion as jest.Mock;
const mockGetCachedSpeciesMoveCombos = getCachedSpeciesMoveCombos as jest.Mock;
const mockGetCachedSpeciesTeammates = getCachedSpeciesTeammates as jest.Mock;

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

/** Minimal service-role client stub — calculateSourceUsage only passes it
 *  through to the @trainers/supabase helpers, which are themselves mocked. */
const stubServiceRoleClient = {};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUserId.mockResolvedValue("user-1");
  mockIsSiteAdmin.mockResolvedValue(true);
  mockCreateServiceRoleClient.mockReturnValue(stubServiceRoleClient);
});

// ---------------------------------------------------------------------------
// calculateSourceUsage
// ---------------------------------------------------------------------------

describe("calculateSourceUsage", () => {
  it("returns error when not authenticated", async () => {
    mockGetUserId.mockResolvedValueOnce(null);

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toBe(
      "Not authenticated"
    );
    // Guard: no usage work should happen without an authenticated user
    expect(mockCompileSourceTeamSlots).not.toHaveBeenCalled();
  });

  it("returns error when user is not a site admin", async () => {
    mockIsSiteAdmin.mockResolvedValueOnce(false);

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toBe(
      "Requires site admin"
    );
    expect(mockCompileSourceTeamSlots).not.toHaveBeenCalled();
  });

  it("returns success with zero counts and skips cache busting when no new events", async () => {
    mockCompileSourceTeamSlots.mockResolvedValueOnce({
      eventsCompiled: 0,
      formats: [],
    });

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.eventsComputed).toBe(0);
    expect(result.data.formatsProcessed).toBe(0);

    // No new formats → cache busting must be skipped entirely
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("happy path: compiles team_slots, returns counts, and busts cache tags", async () => {
    const formats = ["gen9vgc2025regg"];
    mockCompileSourceTeamSlots.mockResolvedValueOnce({
      eventsCompiled: 3,
      formats,
    });

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual({
      eventsComputed: 3,
      formatsProcessed: 1,
    });

    // compileSourceTeamSlots must be called with the validated source
    expect(mockCompileSourceTeamSlots).toHaveBeenCalledWith(
      stubServiceRoleClient,
      "rk9"
    );

    // Global usage tag must be busted
    expect(mockUpdateTag).toHaveBeenCalledWith("usage-stats");
    // Per-format tag must be busted for each format
    expect(mockUpdateTag).toHaveBeenCalledWith("usage-stats:gen9vgc2025regg");
    expect(mockUpdateTag).toHaveBeenCalledTimes(2); // one global + one per-format
  });

  it("happy path: busts one cache tag per format when multiple formats are touched", async () => {
    const formats = ["gen9vgc2025regg", "gen9vgc2025regs"];
    mockCompileSourceTeamSlots.mockResolvedValueOnce({
      eventsCompiled: 5,
      formats,
    });

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(true);
    // 1 global + 2 per-format = 3 total updateTag calls
    expect(mockUpdateTag).toHaveBeenCalledTimes(3);
    expect(mockUpdateTag).toHaveBeenCalledWith("usage-stats");
    expect(mockUpdateTag).toHaveBeenCalledWith("usage-stats:gen9vgc2025regg");
    expect(mockUpdateTag).toHaveBeenCalledWith("usage-stats:gen9vgc2025regs");
  });

  it.each([["rk9"], ["limitless"]] as const)(
    "passes the correct source (%s) through to compileSourceTeamSlots",
    async (source) => {
      mockCompileSourceTeamSlots.mockResolvedValueOnce({
        eventsCompiled: 1,
        formats: ["gen9vgc2025regg"],
      });

      await calculateSourceUsage(source);

      expect(mockCompileSourceTeamSlots).toHaveBeenCalledWith(
        stubServiceRoleClient,
        source
      );
    }
  );

  it("returns error when compileSourceTeamSlots throws", async () => {
    mockCompileSourceTeamSlots.mockRejectedValueOnce(
      new Error("DB connection refused")
    );

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /DB connection refused/
    );
    // Cache busting must not happen when compilation fails
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// fetchSpeciesUsageDetail
// ---------------------------------------------------------------------------

describe("fetchSpeciesUsageDetail", () => {
  it("happy path: returns data from getCachedSpeciesUsageDetail", async () => {
    const periods = [
      {
        id: 1,
        format_id: "gen9vgc2025regg",
        species: "koraidon",
        usage_pct: 52.3,
        source: "all",
        period_type: "week",
        period_start: "2025-01-01",
        period_end: "2025-01-07",
      },
    ];
    mockGetCachedSpeciesUsageDetail.mockResolvedValueOnce(periods);

    const result = await fetchSpeciesUsageDetail({
      format: "gen9vgc2025regg",
      species: "koraidon",
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual(periods);
    expect(mockGetCachedSpeciesUsageDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "gen9vgc2025regg",
        species: "koraidon",
        source: "all",
      })
    );
  });

  it("passes custom source and periodType to getCachedSpeciesUsageDetail", async () => {
    mockGetCachedSpeciesUsageDetail.mockResolvedValueOnce([]);

    await fetchSpeciesUsageDetail({
      format: "gen9vgc2025regg",
      species: "koraidon",
      source: "rk9",
      periodType: "month",
      limit: 6,
    });

    expect(mockGetCachedSpeciesUsageDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "rk9",
        periodType: "month",
        limit: 6,
      })
    );
  });

  it("includes minPlayers and passes it through", async () => {
    mockGetCachedSpeciesUsageDetail.mockResolvedValueOnce([]);

    await fetchSpeciesUsageDetail({
      format: "gen9vgc2025regg",
      species: "koraidon",
      minPlayers: 100,
    });

    expect(mockGetCachedSpeciesUsageDetail).toHaveBeenCalledWith(
      expect.objectContaining({ minPlayers: 100 })
    );
  });

  it("returns { success: false } when getCachedSpeciesUsageDetail throws", async () => {
    mockGetCachedSpeciesUsageDetail.mockRejectedValueOnce(
      new Error("species query failed")
    );

    const result = await fetchSpeciesUsageDetail({
      format: "gen9vgc2025regg",
      species: "koraidon",
    });

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /species query failed/
    );
  });
});

// ---------------------------------------------------------------------------
// fetchFormatUsage
// ---------------------------------------------------------------------------

describe("fetchFormatUsage", () => {
  it("happy path: returns format usage rows", async () => {
    const rows = [
      { species: "koraidon", usagePct: 52.3, rank: 1, usageChange7d: null },
      {
        species: "ogerpon-hearthflame",
        usagePct: 48.1,
        rank: 2,
        usageChange7d: 1.2,
      },
    ];
    mockGetCachedFormatUsage.mockResolvedValueOnce(rows);

    const result = await fetchFormatUsage({ format: "gen9vgc2025regg" });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual(rows);
    expect(mockGetCachedFormatUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "gen9vgc2025regg",
        source: "all",
        periodType: "week",
      })
    );
  });

  it("passes custom source and periodType through to getCachedFormatUsage", async () => {
    mockGetCachedFormatUsage.mockResolvedValueOnce([]);

    await fetchFormatUsage({
      format: "gen9vgc2025regg",
      source: "rk9",
      periodType: "month",
    });

    expect(mockGetCachedFormatUsage).toHaveBeenCalledWith(
      expect.objectContaining({ source: "rk9", periodType: "month" })
    );
  });

  it("returns { success: false } when getCachedFormatUsage throws", async () => {
    mockGetCachedFormatUsage.mockRejectedValueOnce(
      new Error("format query failed")
    );

    const result = await fetchFormatUsage({ format: "gen9vgc2025regg" });

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /format query failed/
    );
  });

  it("defaults source to 'all' and periodType to 'week' when not provided", async () => {
    mockGetCachedFormatUsage.mockResolvedValueOnce([]);

    await fetchFormatUsage({ format: "gen9vgc2025regg" });

    expect(mockGetCachedFormatUsage).toHaveBeenCalledWith(
      expect.objectContaining({ source: "all", periodType: "week" })
    );
  });

  it("passes minPlayers through to getCachedFormatUsage", async () => {
    mockGetCachedFormatUsage.mockResolvedValueOnce([]);

    await fetchFormatUsage({ format: "gen9vgc2025regg", minPlayers: 100 });

    expect(mockGetCachedFormatUsage).toHaveBeenCalledWith(
      expect.objectContaining({ minPlayers: 100 })
    );
  });
});

// ---------------------------------------------------------------------------
// fetchFormatUsageTimeseries
// ---------------------------------------------------------------------------

describe("fetchFormatUsageTimeseries", () => {
  it("happy path: returns timeseries points", async () => {
    const points = [
      {
        periodStart: "2025-01-01",
        periodEnd: "2025-01-07",
        usage: { koraidon: 52.3 },
      },
    ];
    mockGetCachedFormatUsageTimeseries.mockResolvedValueOnce(points);

    const result = await fetchFormatUsageTimeseries({
      format: "gen9vgc2025regg",
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual(points);
    expect(mockGetCachedFormatUsageTimeseries).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "gen9vgc2025regg",
        source: "all",
        periodType: "week",
      })
    );
  });

  it("passes custom source and periodType through", async () => {
    mockGetCachedFormatUsageTimeseries.mockResolvedValueOnce([]);

    await fetchFormatUsageTimeseries({
      format: "gen9vgc2025regg",
      source: "rk9",
      periodType: "month",
    });

    expect(mockGetCachedFormatUsageTimeseries).toHaveBeenCalledWith(
      expect.objectContaining({ source: "rk9", periodType: "month" })
    );
  });

  it("passes periodStart, periodEnd, and minPlayers through", async () => {
    mockGetCachedFormatUsageTimeseries.mockResolvedValueOnce([]);

    await fetchFormatUsageTimeseries({
      format: "gen9vgc2025regg",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 64,
    });

    expect(mockGetCachedFormatUsageTimeseries).toHaveBeenCalledWith(
      expect.objectContaining({
        periodStart: "2025-01-01",
        periodEnd: "2025-03-31",
        minPlayers: 64,
      })
    );
  });

  it("returns { success: false } when query throws", async () => {
    mockGetCachedFormatUsageTimeseries.mockRejectedValueOnce(
      new Error("timeseries query failed")
    );

    const result = await fetchFormatUsageTimeseries({
      format: "gen9vgc2025regg",
    });

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /timeseries query failed/
    );
  });
});

// =============================================================================
// fetchPipelineData
// =============================================================================

describe("fetchPipelineData", () => {
  it("returns success with pipeline data", async () => {
    const mockData = {
      data: [
        {
          species: "Sneasler",
          usagePct: 22,
          rank: 1,
          abilities: [],
          natures: [],
          moves: [],
        },
      ],
      periodStart: "2025-01-24",
      periodEnd: "2025-01-31",
    };
    mockGetCachedPipelineData.mockResolvedValue(mockData);

    const result = await fetchPipelineData({
      format: "gen9vgc2025regg",
      source: "all",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.data[0]?.species).toBe("Sneasler");
    }
    expect(mockGetCachedPipelineData).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "gen9vgc2025regg",
        source: "all",
      })
    );
  });

  it("passes periodStart, periodEnd, and minPlayers through to getCachedPipelineData", async () => {
    mockGetCachedPipelineData.mockResolvedValue(null);

    await fetchPipelineData({
      format: "gen9vgc2025regg",
      source: "rk9",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 100,
    });

    expect(mockGetCachedPipelineData).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "rk9",
        periodStart: "2025-01-01",
        periodEnd: "2025-03-31",
        minPlayers: 100,
      })
    );
  });

  it("returns success with null when no data exists", async () => {
    mockGetCachedPipelineData.mockResolvedValue(null);

    const result = await fetchPipelineData({
      format: "gen9vgc2025regg",
      source: "all",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("returns failure when query throws", async () => {
    mockGetCachedPipelineData.mockRejectedValue(new Error("DB failure"));

    const result = await fetchPipelineData({
      format: "gen9vgc2025regg",
      source: "all",
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// fetchFormatEvents
// =============================================================================

describe("fetchFormatEvents", () => {
  it("returns success with event list", async () => {
    const mockEvents = [
      { eventKey: "rk9:001", eventDate: "2025-01-12", source: "rk9" },
    ];
    mockGetCachedFormatEvents.mockResolvedValue(mockEvents);

    const result = await fetchFormatEvents("gen9vgc2025regg");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
    expect(mockGetCachedFormatEvents).toHaveBeenCalledWith("gen9vgc2025regg");
  });

  it("returns failure when query throws", async () => {
    mockGetCachedFormatEvents.mockRejectedValue(new Error("DB failure"));

    const result = await fetchFormatEvents("gen9vgc2025regg");

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// calculateAllSourceUsage
// =============================================================================

describe("calculateAllSourceUsage", () => {
  it("sums results across all sources (rk9 + limitless)", async () => {
    // rk9: 2 events, 1 format
    mockCompileSourceTeamSlots
      .mockResolvedValueOnce({
        eventsCompiled: 2,
        formats: ["gen9vgc2025regg"],
      })
      .mockResolvedValueOnce({
        eventsCompiled: 5,
        formats: ["gen9vgc2025regg", "gen9vgc2025regs"],
      });

    const result = await calculateAllSourceUsage();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        eventsComputed: 7,
        formatsProcessed: 3,
      });
    }
  });

  it("returns zero counts when both sources have no new events", async () => {
    mockCompileSourceTeamSlots
      .mockResolvedValueOnce({ eventsCompiled: 0, formats: [] })
      .mockResolvedValueOnce({ eventsCompiled: 0, formats: [] });

    const result = await calculateAllSourceUsage();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        eventsComputed: 0,
        formatsProcessed: 0,
      });
    }
    // No new events → no cache tags busted
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns failure if any source fails", async () => {
    // First source (rk9) fails immediately
    mockCompileSourceTeamSlots.mockRejectedValueOnce(new Error("boom"));

    const result = await calculateAllSourceUsage();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/boom/);
    }
  });

  it("returns failure if second source fails", async () => {
    // rk9 succeeds, limitless fails
    mockCompileSourceTeamSlots
      .mockResolvedValueOnce({
        eventsCompiled: 2,
        formats: ["gen9vgc2025regg"],
      })
      .mockRejectedValueOnce(new Error("limitless boom"));

    const result = await calculateAllSourceUsage();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/limitless boom/);
    }
  });

  it("returns error when not authenticated", async () => {
    mockGetUserId.mockResolvedValueOnce(null);

    const result = await calculateAllSourceUsage();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Not authenticated");
    }
    expect(mockCompileSourceTeamSlots).not.toHaveBeenCalled();
  });

  it("returns error when user is not a site admin", async () => {
    mockIsSiteAdmin.mockResolvedValueOnce(false);

    const result = await calculateAllSourceUsage();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Requires site admin");
    }
    expect(mockCompileSourceTeamSlots).not.toHaveBeenCalled();
  });
});

// =============================================================================
// fetchUsageBySource
// =============================================================================

describe("fetchUsageBySource", () => {
  it("happy path: returns source usage rows", async () => {
    const rows = [
      { species: "koraidon", source: "rk9", usagePct: 55.1, rank: 1 },
      { species: "koraidon", source: "limitless", usagePct: 50.2, rank: 1 },
    ];
    mockGetCachedUsageBySource.mockResolvedValueOnce(rows);

    const result = await fetchUsageBySource({ format: "gen9vgc2025regg" });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual(rows);
    expect(mockGetCachedUsageBySource).toHaveBeenCalledWith({
      format: "gen9vgc2025regg",
      periodStart: undefined,
      periodEnd: undefined,
      minPlayers: 0,
    });
  });

  it("defaults minPlayers to 0 when not provided", async () => {
    mockGetCachedUsageBySource.mockResolvedValueOnce([]);

    await fetchUsageBySource({ format: "gen9vgc2025regg" });

    expect(mockGetCachedUsageBySource).toHaveBeenCalledWith(
      expect.objectContaining({ minPlayers: 0 })
    );
  });

  it("passes periodStart, periodEnd, and minPlayers through", async () => {
    mockGetCachedUsageBySource.mockResolvedValueOnce([]);

    await fetchUsageBySource({
      format: "gen9vgc2025regg",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 64,
    });

    expect(mockGetCachedUsageBySource).toHaveBeenCalledWith(
      expect.objectContaining({
        periodStart: "2025-01-01",
        periodEnd: "2025-03-31",
        minPlayers: 64,
      })
    );
  });

  it("returns { success: false } when query throws", async () => {
    mockGetCachedUsageBySource.mockRejectedValueOnce(
      new Error("source query failed")
    );

    const result = await fetchUsageBySource({ format: "gen9vgc2025regg" });

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /source query failed/
    );
  });
});

// =============================================================================
// fetchUsageConversion
// =============================================================================

describe("fetchUsageConversion", () => {
  it("happy path: returns conversion rows", async () => {
    const rows = [
      {
        species: "koraidon",
        usagePct: 55.1,
        topCutPct: 62.3,
        conversionRate: 1.13,
      },
    ];
    mockGetCachedUsageConversion.mockResolvedValueOnce(rows);

    const result = await fetchUsageConversion({ format: "gen9vgc2025regg" });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual(rows);
    expect(mockGetCachedUsageConversion).toHaveBeenCalledWith({
      format: "gen9vgc2025regg",
      source: "all",
      periodStart: undefined,
      periodEnd: undefined,
      minPlayers: 0,
      topPct: 0.1,
    });
  });

  it("defaults source to 'all', minPlayers to 0, and topPct to 0.10", async () => {
    mockGetCachedUsageConversion.mockResolvedValueOnce([]);

    await fetchUsageConversion({ format: "gen9vgc2025regg" });

    expect(mockGetCachedUsageConversion).toHaveBeenCalledWith(
      expect.objectContaining({ source: "all", minPlayers: 0, topPct: 0.1 })
    );
  });

  it("passes custom source, periodStart, periodEnd, minPlayers, and topPct through", async () => {
    mockGetCachedUsageConversion.mockResolvedValueOnce([]);

    await fetchUsageConversion({
      format: "gen9vgc2025regg",
      source: "rk9",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 100,
      topPct: 0.25,
    });

    expect(mockGetCachedUsageConversion).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "rk9",
        periodStart: "2025-01-01",
        periodEnd: "2025-03-31",
        minPlayers: 100,
        topPct: 0.25,
      })
    );
  });

  it("returns { success: false } when query throws", async () => {
    mockGetCachedUsageConversion.mockRejectedValueOnce(
      new Error("conversion query failed")
    );

    const result = await fetchUsageConversion({ format: "gen9vgc2025regg" });

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /conversion query failed/
    );
  });
});

// =============================================================================
// fetchSpeciesMoveCombos
// =============================================================================

describe("fetchSpeciesMoveCombos", () => {
  it("happy path: returns move combo rows", async () => {
    const rows = [
      {
        moves: ["fake-out", "glacial-lance", "protect", "tera-blast"],
        players: 88,
        comboPct: 42.31,
        rank: 1,
      },
      {
        moves: ["fake-out", "ice-shard", "protect", "tera-blast"],
        players: 45,
        comboPct: 21.63,
        rank: 2,
      },
    ];
    mockGetCachedSpeciesMoveCombos.mockResolvedValueOnce(rows);

    const result = await fetchSpeciesMoveCombos({
      format: "gen9championsvgc2026regma",
      species: "chien-pao",
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual(rows);
    expect(mockGetCachedSpeciesMoveCombos).toHaveBeenCalledWith({
      format: "gen9championsvgc2026regma",
      species: "chien-pao",
      source: "all",
      periodStart: undefined,
      periodEnd: undefined,
      minPlayers: 0,
      limit: 25,
    });
  });

  it("defaults source to 'all', minPlayers to 0, and limit to 25", async () => {
    mockGetCachedSpeciesMoveCombos.mockResolvedValueOnce([]);

    await fetchSpeciesMoveCombos({
      format: "gen9championsvgc2026regma",
      species: "chien-pao",
    });

    expect(mockGetCachedSpeciesMoveCombos).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "all",
        minPlayers: 0,
        limit: 25,
      })
    );
  });

  it("passes custom source, periodStart, periodEnd, minPlayers, and limit through", async () => {
    mockGetCachedSpeciesMoveCombos.mockResolvedValueOnce([]);

    await fetchSpeciesMoveCombos({
      format: "gen9championsvgc2026regma",
      species: "chien-pao",
      source: "rk9",
      periodStart: "2026-01-01",
      periodEnd: "2026-03-31",
      minPlayers: 64,
      limit: 10,
    });

    expect(mockGetCachedSpeciesMoveCombos).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "rk9",
        periodStart: "2026-01-01",
        periodEnd: "2026-03-31",
        minPlayers: 64,
        limit: 10,
      })
    );
  });

  it("forwards format and species to getCachedSpeciesMoveCombos", async () => {
    mockGetCachedSpeciesMoveCombos.mockResolvedValueOnce([]);

    await fetchSpeciesMoveCombos({
      format: "gen9championsvgc2026regma",
      species: "koraidon",
    });

    expect(mockGetCachedSpeciesMoveCombos).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "gen9championsvgc2026regma",
        species: "koraidon",
      })
    );
  });

  it("returns { success: false } when getCachedSpeciesMoveCombos throws", async () => {
    mockGetCachedSpeciesMoveCombos.mockRejectedValueOnce(
      new Error("combo query failed")
    );

    const result = await fetchSpeciesMoveCombos({
      format: "gen9championsvgc2026regma",
      species: "chien-pao",
    });

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /combo query failed/
    );
  });
});

// =============================================================================
// fetchSpeciesTeammates
// =============================================================================

describe("fetchSpeciesTeammates", () => {
  const stubResult = {
    focalPlayers: 208,
    teammates: [
      { teammate: "miraidon", pairCount: 180, pairPct: 86.54, rank: 1 },
      { teammate: "flutter-mane", pairCount: 140, pairPct: 67.31, rank: 2 },
    ],
    matrix: {
      order: ["miraidon", "flutter-mane"],
      cells: {
        "flutter-mane||miraidon": { count: 120, pct: 57.69 },
      },
    },
  };

  it("happy path: returns teammates result", async () => {
    mockGetCachedSpeciesTeammates.mockResolvedValueOnce(stubResult);

    const result = await fetchSpeciesTeammates({
      format: "gen9championsvgc2026regma",
      species: "chien-pao",
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual(stubResult);
    expect(mockGetCachedSpeciesTeammates).toHaveBeenCalledWith({
      format: "gen9championsvgc2026regma",
      species: "chien-pao",
      source: "all",
      periodStart: undefined,
      periodEnd: undefined,
      minPlayers: 0,
      topN: 12,
    });
  });

  it("defaults source to 'all', minPlayers to 0, and topN to 12", async () => {
    mockGetCachedSpeciesTeammates.mockResolvedValueOnce(stubResult);

    await fetchSpeciesTeammates({
      format: "gen9championsvgc2026regma",
      species: "chien-pao",
    });

    expect(mockGetCachedSpeciesTeammates).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "all",
        minPlayers: 0,
        topN: 12,
      })
    );
  });

  it("passes custom source, periodStart, periodEnd, minPlayers, and topN through", async () => {
    mockGetCachedSpeciesTeammates.mockResolvedValueOnce(stubResult);

    await fetchSpeciesTeammates({
      format: "gen9championsvgc2026regma",
      species: "chien-pao",
      source: "limitless",
      periodStart: "2026-01-01",
      periodEnd: "2026-03-31",
      minPlayers: 100,
      topN: 20,
    });

    expect(mockGetCachedSpeciesTeammates).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "limitless",
        periodStart: "2026-01-01",
        periodEnd: "2026-03-31",
        minPlayers: 100,
        topN: 20,
      })
    );
  });

  it("forwards format and species to getCachedSpeciesTeammates", async () => {
    mockGetCachedSpeciesTeammates.mockResolvedValueOnce(stubResult);

    await fetchSpeciesTeammates({
      format: "gen9championsvgc2026regma",
      species: "koraidon",
    });

    expect(mockGetCachedSpeciesTeammates).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "gen9championsvgc2026regma",
        species: "koraidon",
      })
    );
  });

  it("returns { success: false } when getCachedSpeciesTeammates throws", async () => {
    mockGetCachedSpeciesTeammates.mockRejectedValueOnce(
      new Error("teammates query failed")
    );

    const result = await fetchSpeciesTeammates({
      format: "gen9championsvgc2026regma",
      species: "chien-pao",
    });

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /teammates query failed/
    );
  });
});
