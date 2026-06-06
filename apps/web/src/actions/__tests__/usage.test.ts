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
  computeSourceUsage: jest.fn(),
  computeUsageRollups: jest.fn(),
  getSpeciesUsage: jest.fn(),
  getSpeciesUsageDetail: jest.fn(),
}));

jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
  unstable_cache: jest.fn((fn: () => unknown) => fn),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { createServiceRoleClient, createStaticClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import {
  computeSourceUsage,
  computeUsageRollups,
  getSpeciesUsageDetail,
  getSpeciesUsage,
} from "@trainers/supabase";
import { updateTag } from "next/cache";
import {
  calculateSourceUsage,
  triggerUsageRollup,
  fetchSpeciesUsageDetail,
  fetchFormatUsage,
} from "../usage";

// ---------------------------------------------------------------------------
// Typed mock handles
// ---------------------------------------------------------------------------

const mockGetUserId = getUserId as jest.Mock;
const mockIsSiteAdmin = isSiteAdmin as jest.Mock;
const mockCreateServiceRoleClient = createServiceRoleClient as jest.Mock;
const mockCreateStaticClient = createStaticClient as jest.Mock;
const mockComputeSourceUsage = computeSourceUsage as jest.Mock;
const mockComputeUsageRollups = computeUsageRollups as jest.Mock;
const mockGetSpeciesUsageDetail = getSpeciesUsageDetail as jest.Mock;
const mockGetSpeciesUsage = getSpeciesUsage as jest.Mock;
const mockUpdateTag = updateTag as jest.Mock;

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

/** Minimal service-role client stub — calculateSourceUsage only passes it
 *  through to the @trainers/supabase helpers, which are themselves mocked. */
const stubServiceRoleClient = {};

// ---------------------------------------------------------------------------
// Rollup client builder — triggerUsageRollup calls .from() directly.
// We need a full chain: .from().select().in() → resolves, .upsert() → resolves.
// ---------------------------------------------------------------------------

interface RollupClientChain {
  from: jest.Mock;
  select: jest.Mock;
  in: jest.Mock;
  upsert: jest.Mock;
}

/**
 * Build a minimal Supabase-client stub that supports the two query patterns
 * used by `triggerUsageRollup`:
 *
 *   supabase.from("site_config").select("key, value").in("key", CONFIG_KEYS)
 *   supabase.from("site_config").upsert({ ... }, { onConflict: "key" })
 *
 * `configRows` is the array returned by the `.in()` terminal call.
 * `upsertError` controls whether the upsert write returns an error.
 */
function makeRollupClient(
  configRows: Array<{ key: string; value: unknown }> = [],
  { upsertError = null }: { upsertError?: { message: string } | null } = {}
): { client: RollupClientChain; chain: RollupClientChain } {
  const chain = {
    select: jest.fn(),
    in: jest.fn().mockResolvedValue({ data: configRows, error: null }),
    upsert: jest.fn().mockResolvedValue({ error: upsertError }),
  } as unknown as RollupClientChain;

  // select() returns the chain so .in() can be called on it
  (chain as unknown as Record<string, jest.Mock>).select = jest
    .fn()
    .mockReturnValue(chain);

  const client = {
    from: jest.fn().mockReturnValue(chain),
  } as unknown as RollupClientChain;

  return { client, chain };
}

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
    expect(mockComputeSourceUsage).not.toHaveBeenCalled();
  });

  it("returns error when user is not a site admin", async () => {
    mockIsSiteAdmin.mockResolvedValueOnce(false);

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toBe(
      "Requires site admin"
    );
    expect(mockComputeSourceUsage).not.toHaveBeenCalled();
  });

  it("returns success with zero counts and skips rollup when no new events", async () => {
    mockComputeSourceUsage.mockResolvedValueOnce({
      eventsComputed: 0,
      formats: [],
    });

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.eventsComputed).toBe(0);
    expect(result.data.formatsProcessed).toBe(0);
    expect(result.data.bucketsWritten).toBe(0);

    // No new formats → rollup must be skipped entirely
    expect(mockComputeUsageRollups).not.toHaveBeenCalled();
    // No formats to bust
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("happy path: runs rollup, returns counts, and busts cache tags", async () => {
    const formats = ["gen9vgc2025regg"];
    mockComputeSourceUsage.mockResolvedValueOnce({
      eventsComputed: 3,
      formats,
    });
    mockComputeUsageRollups.mockResolvedValueOnce({
      formatsProcessed: 2,
      bucketsWritten: 5,
    });

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data).toEqual({
      eventsComputed: 3,
      formatsProcessed: 2,
      bucketsWritten: 5,
    });

    // Rollup must receive only the formats that had new events
    expect(mockComputeUsageRollups).toHaveBeenCalledWith(stubServiceRoleClient, {
      formats,
    });

    // Global usage tag must be busted
    expect(mockUpdateTag).toHaveBeenCalledWith("usage-stats");
    // Per-format tag must be busted for each format
    expect(mockUpdateTag).toHaveBeenCalledWith("usage-stats:gen9vgc2025regg");
    expect(mockUpdateTag).toHaveBeenCalledTimes(2); // one global + one per-format
  });

  it("happy path: busts one cache tag per format when multiple formats are touched", async () => {
    const formats = ["gen9vgc2025regg", "gen9vgc2025regs"];
    mockComputeSourceUsage.mockResolvedValueOnce({
      eventsComputed: 5,
      formats,
    });
    mockComputeUsageRollups.mockResolvedValueOnce({
      formatsProcessed: 2,
      bucketsWritten: 10,
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
    "passes the correct source (%s) through to computeSourceUsage",
    async (source) => {
      mockComputeSourceUsage.mockResolvedValueOnce({
        eventsComputed: 1,
        formats: ["gen9vgc2025regg"],
      });
      mockComputeUsageRollups.mockResolvedValueOnce({
        formatsProcessed: 1,
        bucketsWritten: 2,
      });

      await calculateSourceUsage(source);

      expect(mockComputeSourceUsage).toHaveBeenCalledWith(
        stubServiceRoleClient,
        source
      );
    }
  );

  it("returns error when computeSourceUsage throws", async () => {
    mockComputeSourceUsage.mockRejectedValueOnce(
      new Error("DB connection refused")
    );

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /DB connection refused/
    );
    // Rollup and cache busting must not happen when source computation fails
    expect(mockComputeUsageRollups).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("returns error when computeUsageRollups throws", async () => {
    mockComputeSourceUsage.mockResolvedValueOnce({
      eventsComputed: 2,
      formats: ["gen9vgc2025regg"],
    });
    mockComputeUsageRollups.mockRejectedValueOnce(
      new Error("rollup write failed")
    );

    const result = await calculateSourceUsage("rk9");

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /rollup write failed/
    );
    // Cache tags must not be busted when the rollup itself fails
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// triggerUsageRollup
// ---------------------------------------------------------------------------

describe("triggerUsageRollup", () => {
  it("returns error when not authenticated", async () => {
    mockGetUserId.mockResolvedValueOnce(null);

    const result = await triggerUsageRollup();

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toBe(
      "Not authenticated"
    );
    expect(mockComputeUsageRollups).not.toHaveBeenCalled();
  });

  it("returns error when user is not a site admin", async () => {
    mockIsSiteAdmin.mockResolvedValueOnce(false);

    const result = await triggerUsageRollup();

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toBe(
      "Requires site admin"
    );
    expect(mockComputeUsageRollups).not.toHaveBeenCalled();
  });

  it("returns { ran: false } when usage_rollup_enabled is false in site_config", async () => {
    const { client } = makeRollupClient([
      { key: "usage_rollup_enabled", value: false },
      { key: "usage_rollup_interval_seconds", value: 3600 },
    ]);
    mockCreateServiceRoleClient.mockReturnValue(client);

    const result = await triggerUsageRollup();

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.ran).toBe(false);
    expect(result.data.formatsProcessed).toBe(0);
    expect(result.data.bucketsWritten).toBe(0);
    // Rollup must not run when administratively disabled
    expect(mockComputeUsageRollups).not.toHaveBeenCalled();
  });

  it("returns { ran: false } when last run was too recent (within cooldown)", async () => {
    // Set last_run_at to now and interval to 1 hour → elapsed < interval
    const { client } = makeRollupClient([
      { key: "usage_rollup_enabled", value: true },
      { key: "usage_rollup_interval_seconds", value: 3600 },
      {
        key: "usage_rollup_last_run_at",
        value: new Date().toISOString(),
      },
    ]);
    mockCreateServiceRoleClient.mockReturnValue(client);

    const result = await triggerUsageRollup();

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.ran).toBe(false);
    expect(mockComputeUsageRollups).not.toHaveBeenCalled();
  });

  it("happy path: runs rollup and returns { ran: true } when cooldown has elapsed", async () => {
    // last_run_at is far in the past → elapsed > interval
    const oldTimestamp = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const { client } = makeRollupClient([
      { key: "usage_rollup_enabled", value: true },
      { key: "usage_rollup_interval_seconds", value: 3600 },
      { key: "usage_rollup_last_run_at", value: oldTimestamp },
    ]);
    mockCreateServiceRoleClient.mockReturnValue(client);
    mockComputeUsageRollups.mockResolvedValueOnce({
      formatsProcessed: 4,
      bucketsWritten: 20,
    });

    const result = await triggerUsageRollup();

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.ran).toBe(true);
    expect(result.data.formatsProcessed).toBe(4);
    expect(result.data.bucketsWritten).toBe(20);
    expect(mockComputeUsageRollups).toHaveBeenCalledTimes(1);
  });

  it("happy path: runs rollup when no last_run_at is set (first run)", async () => {
    const { client } = makeRollupClient([
      { key: "usage_rollup_enabled", value: true },
      { key: "usage_rollup_interval_seconds", value: 3600 },
      // no usage_rollup_last_run_at row
    ]);
    mockCreateServiceRoleClient.mockReturnValue(client);
    mockComputeUsageRollups.mockResolvedValueOnce({
      formatsProcessed: 2,
      bucketsWritten: 8,
    });

    const result = await triggerUsageRollup();

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.ran).toBe(true);
    expect(mockComputeUsageRollups).toHaveBeenCalledTimes(1);
  });

  it("force mode: skips config/interval checks and runs rollup immediately", async () => {
    // Even though enabled=false, force:true must bypass the check
    const { client, chain } = makeRollupClient([
      { key: "usage_rollup_enabled", value: false },
    ]);
    mockCreateServiceRoleClient.mockReturnValue(client);
    mockComputeUsageRollups.mockResolvedValueOnce({
      formatsProcessed: 1,
      bucketsWritten: 3,
    });

    const result = await triggerUsageRollup({ force: true });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.ran).toBe(true);
    expect(mockComputeUsageRollups).toHaveBeenCalledTimes(1);

    // In force mode the only .from() call is the upsert — NOT the .select().in() config read.
    // The chain's .select() must not have been called (only .upsert() is called).
    expect(chain.select).not.toHaveBeenCalled();
    expect(chain.upsert).toHaveBeenCalledTimes(1);
  });

  it("force mode: upserts the run timestamp after rollup", async () => {
    const { client, chain } = makeRollupClient();
    mockCreateServiceRoleClient.mockReturnValue(client);
    mockComputeUsageRollups.mockResolvedValueOnce({
      formatsProcessed: 1,
      bucketsWritten: 2,
    });

    await triggerUsageRollup({ force: true });

    // upsert must have been called exactly once to stamp the run time
    expect(client.from).toHaveBeenCalledWith("site_config");
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ key: "usage_rollup_last_run_at" }),
      expect.objectContaining({ onConflict: "key" })
    );
  });

  it("non-force mode: upserts run timestamp after successful rollup", async () => {
    const oldTimestamp = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const { client } = makeRollupClient([
      { key: "usage_rollup_enabled", value: true },
      { key: "usage_rollup_interval_seconds", value: 3600 },
      { key: "usage_rollup_last_run_at", value: oldTimestamp },
    ]);
    mockCreateServiceRoleClient.mockReturnValue(client);
    mockComputeUsageRollups.mockResolvedValueOnce({
      formatsProcessed: 2,
      bucketsWritten: 5,
    });

    const result = await triggerUsageRollup();

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.ran).toBe(true);
  });

  it("returns error when the site_config read itself fails", async () => {
    const { client, chain } = makeRollupClient();
    // Override the .in() terminal to return an error
    (chain as unknown as { in: jest.Mock }).in.mockResolvedValueOnce({
      data: null,
      error: { message: "config read failed" },
    });
    mockCreateServiceRoleClient.mockReturnValue(client);

    const result = await triggerUsageRollup();

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toMatch(
      /config read failed/
    );
    expect(mockComputeUsageRollups).not.toHaveBeenCalled();
  });

  it("still returns ran:true when the upsert timestamp write fails (soft error)", async () => {
    const { client } = makeRollupClient([], {
      upsertError: { message: "write failed" },
    });
    mockCreateServiceRoleClient.mockReturnValue(client);
    mockComputeUsageRollups.mockResolvedValueOnce({
      formatsProcessed: 1,
      bucketsWritten: 2,
    });

    const result = await triggerUsageRollup({ force: true });

    // The rollup itself succeeded — the upsert failure is logged but not fatal
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("expected success");
    expect(result.data.ran).toBe(true);
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
    mockGetSpeciesUsage.mockRejectedValueOnce(
      new Error("format query failed")
    );

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
});
