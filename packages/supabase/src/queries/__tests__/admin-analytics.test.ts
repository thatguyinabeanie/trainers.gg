import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getPlatformOverview,
  getUserGrowthStats,
  getActiveUserStats,
  getTournamentStats,
  getOrganizationStats,
  getInviteConversionStats,
} from "../admin-analytics";
import type { TypedClient } from "../../client";

// ---------------------------------------------------------------------------
// Mock Supabase client factory
//
// Supports two call patterns:
// 1. `.from(table).select(...)...` — chainable query builder (thenable)
// 2. `.rpc(fn, args)` — direct RPC call (returns Promise)
//
// Tests that use `.from()` share the `_queryBuilder` handle.
// Tests that use `.rpc()` configure `_rpcResult` before calling.
// ---------------------------------------------------------------------------

type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  gte: jest.Mock<() => MockQueryBuilder>;
  lt: jest.Mock<() => MockQueryBuilder>;
  not: jest.Mock<() => MockQueryBuilder>;
  is: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  then: jest.Mock<
    (
      resolve: (value: {
        data: unknown;
        error: unknown;
        count?: number | null;
      }) => void
    ) => Promise<{ data: unknown; error: unknown; count?: number | null }>
  >;
};

const createMockClient = () => {
  const mockQueryBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => {
      return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
    }),
  };

  // Default RPC result — overridden per-test as needed.
  let rpcResult: { data: unknown; error: unknown } = {
    data: [],
    error: null,
  };

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    rpc: jest.fn().mockImplementation(() => Promise.resolve(rpcResult)),
    _queryBuilder: mockQueryBuilder,
    /** Set the value that the next `.rpc()` call will resolve with. */
    _setRpcResult(result: { data: unknown; error: unknown }) {
      rpcResult = result;
      // Re-bind so the mock picks up the new value.
      (this as ReturnType<typeof createMockClient>).rpc = jest
        .fn()
        .mockImplementation(() => Promise.resolve(result));
    },
  } as unknown as TypedClient & {
    _queryBuilder: MockQueryBuilder;
    _setRpcResult: (result: { data: unknown; error: unknown }) => void;
    rpc: jest.Mock;
  };
};

/**
 * Helper: converts a Date to YYYY-MM-DD, matching the source's toDateString.
 */
function toDateString(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("admin-analytics queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // getPlatformOverview (unchanged — still uses .from().select())
  // -----------------------------------------------------------------------

  describe("getPlatformOverview", () => {
    it("should return totals for users, organizations, tournaments, and matches", async () => {
      const mockClient = createMockClient();

      // countTable calls from(table).select("*", { count: "exact", head: true })
      // which is then awaited (triggers `then`).
      // 4 parallel calls, one per table.
      let callCount = 0;
      const counts = [42, 10, 25, 300]; // users, orgs, tournaments, matches

      mockClient._queryBuilder.then = jest.fn((resolve) => {
        const count = counts[callCount] ?? 0;
        callCount++;
        return Promise.resolve({ data: null, error: null, count }).then(
          resolve
        );
      });

      const result = await getPlatformOverview(mockClient);

      expect(result).toEqual({
        totalUsers: 42,
        totalOrganizations: 10,
        totalTournaments: 25,
        totalMatches: 300,
      });

      expect(mockClient.from).toHaveBeenCalledWith("users");
      expect(mockClient.from).toHaveBeenCalledWith("organizations");
      expect(mockClient.from).toHaveBeenCalledWith("tournaments");
      expect(mockClient.from).toHaveBeenCalledWith("tournament_matches");
    });

    it("should return 0 for null counts", async () => {
      const mockClient = createMockClient();

      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: null, count: null }).then(
          resolve
        );
      });

      const result = await getPlatformOverview(mockClient);

      expect(result).toEqual({
        totalUsers: 0,
        totalOrganizations: 0,
        totalTournaments: 0,
        totalMatches: 0,
      });
    });

    it("should throw if any count query errors", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Count failed");

      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: dbError,
          count: null,
        }).then(resolve);
      });

      await expect(getPlatformOverview(mockClient)).rejects.toThrow(
        "Count failed"
      );
    });
  });

  // -----------------------------------------------------------------------
  // getUserGrowthStats (refactored — now uses .rpc())
  // -----------------------------------------------------------------------

  describe("getUserGrowthStats", () => {
    it("should return daily signup counts for the default 30-day window", async () => {
      // Compute dates relative to now to ensure they fall within
      // the 30-day lookback window that getUserGrowthStats uses.
      const now = new Date();
      // Use a date 5 days ago (safely within the window)
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const dateA = toDateString(fiveDaysAgo);
      // Use a date 10 days ago
      const tenDaysAgo = new Date(now);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const dateB = toDateString(tenDaysAgo);

      const mockClient = createMockClient();

      // The RPC returns pre-aggregated {date, count} rows.
      mockClient._setRpcResult({
        data: [
          { date: dateB, count: 1 },
          { date: dateA, count: 2 },
        ],
        error: null,
      });

      const result = await getUserGrowthStats(mockClient);

      // Should have at least 31 entries (30 days ago through today, inclusive)
      expect(result.length).toBeGreaterThanOrEqual(30);

      // All entries should have date and count properties
      for (const entry of result) {
        expect(entry).toHaveProperty("date");
        expect(entry).toHaveProperty("count");
        expect(typeof entry.date).toBe("string");
        expect(typeof entry.count).toBe("number");
      }

      // dateA should have 2 signups
      const dateAEntry = result.find((e) => e.date === dateA);
      expect(dateAEntry?.count).toBe(2);

      // dateB should have 1 signup
      const dateBEntry = result.find((e) => e.date === dateB);
      expect(dateBEntry?.count).toBe(1);

      // Verify the RPC was called with the correct function name and args
      expect(mockClient.rpc).toHaveBeenCalledWith("get_user_growth_stats", {
        lookback_days: 30,
      });
    });

    it("should use custom day count", async () => {
      const mockClient = createMockClient();

      // Default rpc result is { data: [], error: null } — no signups.
      const result = await getUserGrowthStats(mockClient, 7);

      // Should have at least 7 entries
      expect(result.length).toBeGreaterThanOrEqual(7);
      // With no data, all counts should be 0
      for (const entry of result) {
        expect(entry.count).toBe(0);
      }

      // Verify custom lookback was passed to RPC
      expect(mockClient.rpc).toHaveBeenCalledWith("get_user_growth_stats", {
        lookback_days: 7,
      });
    });

    it("should back-fill days with zero signups", async () => {
      const mockClient = createMockClient();

      const result = await getUserGrowthStats(mockClient, 3);

      expect(result.length).toBeGreaterThanOrEqual(3);
      for (const entry of result) {
        expect(entry.count).toBe(0);
      }
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._setRpcResult({ data: null, error: dbError });

      await expect(getUserGrowthStats(mockClient)).rejects.toThrow(
        "Database error"
      );
    });

    it("should handle null data as empty (all zeros)", async () => {
      const mockClient = createMockClient();
      mockClient._setRpcResult({ data: null, error: null });

      const result = await getUserGrowthStats(mockClient, 3);

      expect(result.length).toBeGreaterThanOrEqual(3);
      for (const entry of result) {
        expect(entry.count).toBe(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // getActiveUserStats (unchanged — still uses .from().select())
  // -----------------------------------------------------------------------

  describe("getActiveUserStats", () => {
    it("should return active user counts for 7-day and 30-day windows", async () => {
      const mockClient = createMockClient();

      // The function runs two parallel queries via Promise.all.
      // Each ends with .gte() which is thenable via `then`.
      let callCount = 0;
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          // 7-day count
          return Promise.resolve({
            data: null,
            error: null,
            count: 15,
          }).then(resolve);
        }
        // 30-day count
        return Promise.resolve({
          data: null,
          error: null,
          count: 50,
        }).then(resolve);
      });

      const result = await getActiveUserStats(mockClient);

      expect(result).toEqual({
        active7d: 15,
        active30d: 50,
      });

      expect(mockClient.from).toHaveBeenCalledWith("users");
      expect(mockClient._queryBuilder.gte).toHaveBeenCalledWith(
        "last_sign_in_at",
        expect.any(String)
      );
    });

    it("should return 0 for null counts", async () => {
      const mockClient = createMockClient();

      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: null, count: null }).then(
          resolve
        );
      });

      const result = await getActiveUserStats(mockClient);

      expect(result).toEqual({
        active7d: 0,
        active30d: 0,
      });
    });

    it("should throw if 7-day query errors", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("7d query failed");

      let callCount = 0;
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: null,
            error: dbError,
            count: null,
          }).then(resolve);
        }
        return Promise.resolve({
          data: null,
          error: null,
          count: 50,
        }).then(resolve);
      });

      await expect(getActiveUserStats(mockClient)).rejects.toThrow(
        "7d query failed"
      );
    });

    it("should throw if 30-day query errors", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("30d query failed");

      let callCount = 0;
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: null,
            error: null,
            count: 15,
          }).then(resolve);
        }
        return Promise.resolve({
          data: null,
          error: dbError,
          count: null,
        }).then(resolve);
      });

      await expect(getActiveUserStats(mockClient)).rejects.toThrow(
        "30d query failed"
      );
    });
  });

  // -----------------------------------------------------------------------
  // getTournamentStats (refactored — now uses .rpc())
  // -----------------------------------------------------------------------

  describe("getTournamentStats", () => {
    it("should return tournament counts grouped by status", async () => {
      const mockClient = createMockClient();

      // The RPC returns pre-aggregated {status, count} rows.
      mockClient._setRpcResult({
        data: [
          { status: "draft", count: 2 },
          { status: "in_progress", count: 1 },
          { status: "completed", count: 3 },
        ],
        error: null,
      });

      const result = await getTournamentStats(mockClient);

      expect(result).toEqual({
        draft: 2,
        in_progress: 1,
        completed: 3,
      });
      expect(mockClient.rpc).toHaveBeenCalledWith(
        "get_tournament_counts_by_status"
      );
    });

    it("should return empty object when no tournaments exist", async () => {
      const mockClient = createMockClient();

      // Default rpc result is { data: [], error: null }
      const result = await getTournamentStats(mockClient);

      expect(result).toEqual({});
    });

    it("should handle null data as empty", async () => {
      const mockClient = createMockClient();
      mockClient._setRpcResult({ data: null, error: null });

      const result = await getTournamentStats(mockClient);

      expect(result).toEqual({});
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._setRpcResult({ data: null, error: dbError });

      await expect(getTournamentStats(mockClient)).rejects.toThrow(
        "Database error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // getOrganizationStats (refactored — now uses .rpc())
  // -----------------------------------------------------------------------

  describe("getOrganizationStats", () => {
    it("should return organization counts grouped by status and tier", async () => {
      const mockClient = createMockClient();

      // The RPC returns a single jsonb object with by_status and by_tier.
      mockClient._setRpcResult({
        data: {
          by_status: { active: 3, pending: 1, suspended: 1 },
          by_tier: { free: 3, premium: 2 },
        },
        error: null,
      });

      const result = await getOrganizationStats(mockClient);

      expect(result.byStatus).toEqual({
        active: 3,
        pending: 1,
        suspended: 1,
      });
      expect(result.byTier).toEqual({
        free: 3,
        premium: 2,
      });
      expect(mockClient.rpc).toHaveBeenCalledWith("get_organization_counts");
    });

    it("should return empty objects when no organizations exist", async () => {
      const mockClient = createMockClient();

      // When tables are empty, the RPC returns { by_status: {}, by_tier: {} }
      mockClient._setRpcResult({
        data: { by_status: {}, by_tier: {} },
        error: null,
      });

      const result = await getOrganizationStats(mockClient);

      expect(result).toEqual({ byStatus: {}, byTier: {} });
    });

    it("should handle null data gracefully", async () => {
      const mockClient = createMockClient();
      mockClient._setRpcResult({ data: null, error: null });

      const result = await getOrganizationStats(mockClient);

      expect(result).toEqual({ byStatus: {}, byTier: {} });
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._setRpcResult({ data: null, error: dbError });

      await expect(getOrganizationStats(mockClient)).rejects.toThrow(
        "Database error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // getInviteConversionStats (unchanged — still uses .from().select())
  // -----------------------------------------------------------------------

  describe("getInviteConversionStats", () => {
    it("should return invite metrics with correct conversion rate", async () => {
      const mockClient = createMockClient();

      // Three sequential queries, each awaited via `then`:
      // 1. totalSent: .select("*", { count: "exact", head: true }) -> then
      // 2. totalUsed: .select(...).not(...) -> then
      // 3. totalExpired: .select(...).lt(...).is(...) -> then
      let callCount = 0;
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: null,
            error: null,
            count: 100,
          }).then(resolve);
        }
        if (callCount === 2) {
          return Promise.resolve({
            data: null,
            error: null,
            count: 40,
          }).then(resolve);
        }
        return Promise.resolve({
          data: null,
          error: null,
          count: 20,
        }).then(resolve);
      });

      const result = await getInviteConversionStats(mockClient);

      expect(result).toEqual({
        totalSent: 100,
        totalUsed: 40,
        totalExpired: 20,
        conversionRate: 0.4, // 40/100
      });

      expect(mockClient.from).toHaveBeenCalledWith("beta_invites");
    });

    it("should return 0 conversion rate when no invites sent", async () => {
      const mockClient = createMockClient();

      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: null,
          count: 0,
        }).then(resolve);
      });

      const result = await getInviteConversionStats(mockClient);

      expect(result.conversionRate).toBe(0);
      expect(result.totalSent).toBe(0);
      expect(result.totalUsed).toBe(0);
      expect(result.totalExpired).toBe(0);
    });

    it("should handle null counts as 0", async () => {
      const mockClient = createMockClient();

      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: null,
          count: null,
        }).then(resolve);
      });

      const result = await getInviteConversionStats(mockClient);

      expect(result).toEqual({
        totalSent: 0,
        totalUsed: 0,
        totalExpired: 0,
        conversionRate: 0,
      });
    });

    it("should throw on totalSent query error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Sent query failed");

      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: dbError,
          count: null,
        }).then(resolve);
      });

      await expect(getInviteConversionStats(mockClient)).rejects.toThrow(
        "Sent query failed"
      );
    });

    it("should throw on totalUsed query error", async () => {
      const mockClient = createMockClient();
      const usedError = new Error("Used query failed");

      let callCount = 0;
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: null,
            error: null,
            count: 100,
          }).then(resolve);
        }
        return Promise.resolve({
          data: null,
          error: usedError,
          count: null,
        }).then(resolve);
      });

      await expect(getInviteConversionStats(mockClient)).rejects.toThrow(
        "Used query failed"
      );
    });

    it("should throw on totalExpired query error", async () => {
      const mockClient = createMockClient();
      const expiredError = new Error("Expired query failed");

      let callCount = 0;
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            data: null,
            error: null,
            count: 100,
          }).then(resolve);
        }
        return Promise.resolve({
          data: null,
          error: expiredError,
          count: null,
        }).then(resolve);
      });

      await expect(getInviteConversionStats(mockClient)).rejects.toThrow(
        "Expired query failed"
      );
    });
  });
});
