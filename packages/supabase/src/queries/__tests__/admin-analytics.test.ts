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
// All builder methods return `this` for full chainability.
// Resolution happens when the query is `await`-ed, which triggers
// the `then` property on the builder (making it "thenable").
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

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
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
  // getPlatformOverview
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
  // getUserGrowthStats
  // -----------------------------------------------------------------------

  describe("getUserGrowthStats", () => {
    it("should return daily signup counts for the default 30-day window", async () => {
      // Compute dates relative to now (in UTC) to ensure they fall within
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
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: [
            { created_at: `${dateA}T10:00:00.000Z` },
            { created_at: `${dateA}T14:00:00.000Z` },
            { created_at: `${dateB}T09:00:00.000Z` },
          ],
          error: null,
        }).then(resolve);
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
    });

    it("should use custom day count", async () => {
      const mockClient = createMockClient();

      const result = await getUserGrowthStats(mockClient, 7);

      // Should have at least 7 entries
      expect(result.length).toBeGreaterThanOrEqual(7);
      // With no data (default mock returns []), all counts should be 0
      for (const entry of result) {
        expect(entry.count).toBe(0);
      }
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
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(getUserGrowthStats(mockClient)).rejects.toThrow(
        "Database error"
      );
    });

    it("should skip rows with null created_at", async () => {
      // Use a date within the 30-day window
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const signupDate = toDateString(fiveDaysAgo);

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: [
            { created_at: `${signupDate}T10:00:00.000Z` },
            { created_at: null },
            { created_at: `${signupDate}T14:00:00.000Z` },
          ],
          error: null,
        }).then(resolve);
      });

      const result = await getUserGrowthStats(mockClient);

      // The entry for signupDate should have count 2 (null row skipped)
      const entry = result.find((e) => e.date === signupDate);
      expect(entry?.count).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // getActiveUserStats
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
  // getTournamentStats
  // -----------------------------------------------------------------------

  describe("getTournamentStats", () => {
    it("should return tournament counts grouped by status", async () => {
      const mockTournaments = [
        { id: 1, status: "draft" },
        { id: 2, status: "draft" },
        { id: 3, status: "in_progress" },
        { id: 4, status: "completed" },
        { id: 5, status: "completed" },
        { id: 6, status: "completed" },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockTournaments,
          error: null,
        }).then(resolve);
      });

      const result = await getTournamentStats(mockClient);

      expect(result).toEqual({
        draft: 2,
        in_progress: 1,
        completed: 3,
      });
      expect(mockClient.from).toHaveBeenCalledWith("tournaments");
    });

    it("should use 'unknown' for null status values", async () => {
      const mockTournaments = [
        { id: 1, status: null },
        { id: 2, status: "active" },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockTournaments,
          error: null,
        }).then(resolve);
      });

      const result = await getTournamentStats(mockClient);

      expect(result).toEqual({
        unknown: 1,
        active: 1,
      });
    });

    it("should return empty object when no tournaments exist", async () => {
      const mockClient = createMockClient();

      const result = await getTournamentStats(mockClient);

      expect(result).toEqual({});
    });

    it("should handle null data as empty", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      const result = await getTournamentStats(mockClient);

      expect(result).toEqual({});
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(getTournamentStats(mockClient)).rejects.toThrow(
        "Database error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // getOrganizationStats
  // -----------------------------------------------------------------------

  describe("getOrganizationStats", () => {
    it("should return organization counts grouped by status and tier", async () => {
      const mockOrgs = [
        { id: 1, status: "active", tier: "free" },
        { id: 2, status: "active", tier: "premium" },
        { id: 3, status: "pending", tier: "free" },
        { id: 4, status: "suspended", tier: "premium" },
        { id: 5, status: "active", tier: "free" },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockOrgs, error: null }).then(resolve);
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
      expect(mockClient.from).toHaveBeenCalledWith("organizations");
    });

    it("should use 'unknown' for null status or tier values", async () => {
      const mockOrgs = [
        { id: 1, status: null, tier: null },
        { id: 2, status: "active", tier: "free" },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockOrgs, error: null }).then(resolve);
      });

      const result = await getOrganizationStats(mockClient);

      expect(result.byStatus).toEqual({
        unknown: 1,
        active: 1,
      });
      expect(result.byTier).toEqual({
        unknown: 1,
        free: 1,
      });
    });

    it("should return empty objects when no organizations exist", async () => {
      const mockClient = createMockClient();

      const result = await getOrganizationStats(mockClient);

      expect(result).toEqual({ byStatus: {}, byTier: {} });
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(getOrganizationStats(mockClient)).rejects.toThrow(
        "Database error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // getInviteConversionStats
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
