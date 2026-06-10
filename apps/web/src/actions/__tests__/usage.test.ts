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

jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
  unstable_cache: jest.fn((fn: () => unknown) => fn),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import {
  createServiceRoleClient,
  createStaticClient,
  getUserId,
} from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import {
  compileSourceTeamSlots,
  getSpeciesUsageDetail,
  getSpeciesUsage,
  getFormatUsageTimeseries,
  getPipelineData,
  getFormatEvents,
} from "@trainers/supabase";
import { updateTag } from "next/cache";
import {
  calculateSourceUsage,
  calculateAllSourceUsage,
  fetchSpeciesUsageDetail,
  fetchFormatUsage,
  fetchFormatUsageTimeseries,
  fetchPipelineData,
  fetchFormatEvents,
} from "../usage";

// ---------------------------------------------------------------------------
// Typed mock handles
// ---------------------------------------------------------------------------

const mockGetUserId = getUserId as jest.Mock;
const mockIsSiteAdmin = isSiteAdmin as jest.Mock;
const mockCreateServiceRoleClient = createServiceRoleClient as jest.Mock;
const mockCreateStaticClient = createStaticClient as jest.Mock;
const mockCompileSourceTeamSlots = compileSourceTeamSlots as jest.Mock;
const mockGetSpeciesUsageDetail = getSpeciesUsageDetail as jest.Mock;
const mockGetSpeciesUsage = getSpeciesUsage as jest.Mock;
const mockGetFormatUsageTimeseries = getFormatUsageTimeseries as jest.Mock;
const mockGetPipelineData = getPipelineData as jest.Mock;
const mockGetFormatEvents = getFormatEvents as jest.Mock;
const mockUpdateTag = updateTag as jest.Mock;

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
    expect(result.data.bucketsWritten).toBe(0);

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
      bucketsWritten: 0,
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
  beforeEach(() => {
    // fetchSpeciesUsageDetail uses createStaticClient inside unstable_cache
    // (which is mocked as passthrough). Give it a minimal stub.
    mockCreateStaticClient.mockReturnValue({});
  });

  it("happy path: returns data from getSpeciesUsageDetail", async () => {
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
    mockGetSpeciesUsageDetail.mockResolvedValueOnce(periods);

    const result = await fetchSpeciesUsageDetail({
      format: "gen9vgc2025regg",
      species: "koraidon",
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual(periods);
    expect(mockGetSpeciesUsageDetail).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        format: "gen9vgc2025regg",
        species: "koraidon",
        source: "all",
      })
    );
  });

  it("passes custom source and periodType to getSpeciesUsageDetail", async () => {
    mockGetSpeciesUsageDetail.mockResolvedValueOnce([]);

    await fetchSpeciesUsageDetail({
      format: "gen9vgc2025regg",
      species: "koraidon",
      source: "rk9",
      periodType: "month",
      limit: 6,
    });

    expect(mockGetSpeciesUsageDetail).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        source: "rk9",
        periodType: "month",
        limit: 6,
      })
    );
  });

  it("includes minPlayers in cache key and passes it through", async () => {
    mockGetSpeciesUsageDetail.mockResolvedValueOnce([]);

    await fetchSpeciesUsageDetail({
      format: "gen9vgc2025regg",
      species: "koraidon",
      minPlayers: 100,
    });

    expect(mockGetSpeciesUsageDetail).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ minPlayers: 100 })
    );
  });

  it("returns { success: false } when getSpeciesUsageDetail throws", async () => {
    mockGetSpeciesUsageDetail.mockRejectedValueOnce(
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
  beforeEach(() => {
    mockCreateStaticClient.mockReturnValue({});
  });

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
    mockGetSpeciesUsage.mockResolvedValueOnce(rows);

    const result = await fetchFormatUsage({ format: "gen9vgc2025regg" });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual(rows);
    expect(mockGetSpeciesUsage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        format: "gen9vgc2025regg",
        source: "all",
        periodType: "week",
      })
    );
  });

  it("passes custom source and periodType through to getSpeciesUsage", async () => {
    mockGetSpeciesUsage.mockResolvedValueOnce([]);

    await fetchFormatUsage({
      format: "gen9vgc2025regg",
      source: "rk9",
      periodType: "month",
    });

    expect(mockGetSpeciesUsage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ source: "rk9", periodType: "month" })
    );
  });

  it("returns { success: false } when getSpeciesUsage throws", async () => {
    mockGetSpeciesUsage.mockRejectedValueOnce(new Error("format query failed"));

    const result = await fetchFormatUsage({ format: "gen9vgc2025regg" });

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /format query failed/
    );
  });

  it("defaults source to 'all' and periodType to 'week' when not provided", async () => {
    mockGetSpeciesUsage.mockResolvedValueOnce([]);

    await fetchFormatUsage({ format: "gen9vgc2025regg" });

    expect(mockGetSpeciesUsage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ source: "all", periodType: "week" })
    );
  });

  it("passes minPlayers through to getSpeciesUsage", async () => {
    mockGetSpeciesUsage.mockResolvedValueOnce([]);

    await fetchFormatUsage({ format: "gen9vgc2025regg", minPlayers: 100 });

    expect(mockGetSpeciesUsage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ minPlayers: 100 })
    );
  });
});

describe("fetchFormatUsageTimeseries", () => {
  beforeEach(() => {
    mockCreateStaticClient.mockReturnValue({});
  });

  it("happy path: returns timeseries points", async () => {
    const points = [
      {
        periodStart: "2025-01-01",
        periodEnd: "2025-01-07",
        usage: { koraidon: 52.3 },
      },
    ];
    mockGetFormatUsageTimeseries.mockResolvedValueOnce(points);

    const result = await fetchFormatUsageTimeseries({
      format: "gen9vgc2025regg",
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual(points);
    expect(mockGetFormatUsageTimeseries).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        format: "gen9vgc2025regg",
        source: "all",
        periodType: "week",
      })
    );
  });

  it("passes custom source and periodType through", async () => {
    mockGetFormatUsageTimeseries.mockResolvedValueOnce([]);

    await fetchFormatUsageTimeseries({
      format: "gen9vgc2025regg",
      source: "rk9",
      periodType: "month",
    });

    expect(mockGetFormatUsageTimeseries).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ source: "rk9", periodType: "month" })
    );
  });

  it("passes periodStart, periodEnd, and minPlayers through", async () => {
    mockGetFormatUsageTimeseries.mockResolvedValueOnce([]);

    await fetchFormatUsageTimeseries({
      format: "gen9vgc2025regg",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 64,
    });

    expect(mockGetFormatUsageTimeseries).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        periodStart: "2025-01-01",
        periodEnd: "2025-03-31",
        minPlayers: 64,
      })
    );
  });

  it("returns { success: false } when query throws", async () => {
    mockGetFormatUsageTimeseries.mockRejectedValueOnce(
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
  beforeEach(() => {
    mockCreateStaticClient.mockReturnValue({});
  });

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
    mockGetPipelineData.mockResolvedValue(mockData);

    const result = await fetchPipelineData({
      format: "gen9vgc2025regg",
      source: "all",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.data[0]?.species).toBe("Sneasler");
    }
    expect(mockGetPipelineData).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        format: "gen9vgc2025regg",
        source: "all",
      })
    );
  });

  it("passes periodStart, periodEnd, and minPlayers through to getPipelineData", async () => {
    mockGetPipelineData.mockResolvedValue(null);

    await fetchPipelineData({
      format: "gen9vgc2025regg",
      source: "rk9",
      periodStart: "2025-01-01",
      periodEnd: "2025-03-31",
      minPlayers: 100,
    });

    expect(mockGetPipelineData).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        source: "rk9",
        periodStart: "2025-01-01",
        periodEnd: "2025-03-31",
        minPlayers: 100,
      })
    );
  });

  it("returns success with null when no data exists", async () => {
    mockGetPipelineData.mockResolvedValue(null);

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
    mockGetPipelineData.mockRejectedValue(new Error("DB failure"));

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
  beforeEach(() => {
    mockCreateStaticClient.mockReturnValue({});
  });

  it("returns success with event list", async () => {
    const mockEvents = [
      { eventKey: "rk9:001", eventDate: "2025-01-12", source: "rk9" },
    ];
    mockGetFormatEvents.mockResolvedValue(mockEvents);

    const result = await fetchFormatEvents("gen9vgc2025regg");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
    expect(mockGetFormatEvents).toHaveBeenCalledWith({}, "gen9vgc2025regg");
  });

  it("returns failure when query throws", async () => {
    mockGetFormatEvents.mockRejectedValue(new Error("DB failure"));

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
        bucketsWritten: 0,
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
        bucketsWritten: 0,
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
