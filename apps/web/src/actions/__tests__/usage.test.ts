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

import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import { isSiteAdmin } from "@/lib/sudo/server";
import {
  computeSourceUsage,
  computeUsageRollups,
} from "@trainers/supabase";
import { updateTag } from "next/cache";
import { calculateSourceUsage } from "../usage";

// ---------------------------------------------------------------------------
// Typed mock handles
// ---------------------------------------------------------------------------

const mockGetUserId = getUserId as jest.Mock;
const mockIsSiteAdmin = isSiteAdmin as jest.Mock;
const mockCreateServiceRoleClient = createServiceRoleClient as jest.Mock;
const mockComputeSourceUsage = computeSourceUsage as jest.Mock;
const mockComputeUsageRollups = computeUsageRollups as jest.Mock;
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
