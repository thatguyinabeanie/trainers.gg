import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getTournamentAuditLog,
  getMatchAuditLog,
  getAuditLog,
  getAuditLogStats,
} from "../audit-log";
import type { TypedClient } from "../../client";
import type { Database } from "../../types";

type AuditAction = Database["public"]["Enums"]["audit_action"];

// Mock query builder — chainable methods that return `this`,
// plus a `then` method so `await query` resolves to the mock result.
type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  range: jest.Mock<() => MockQueryBuilder>;
  in: jest.Mock<() => MockQueryBuilder>;
  not: jest.Mock<() => MockQueryBuilder>;
  gte: jest.Mock<() => MockQueryBuilder>;
  lte: jest.Mock<() => MockQueryBuilder>;
  then: jest.Mock<
    (
      resolve: (value: {
        data: unknown;
        error: unknown;
        count?: unknown;
      }) => void
    ) => Promise<{ data: unknown; error: unknown; count?: unknown }>
  >;
};

// Creates a single mock query builder with default empty success resolution
const createMockQueryBuilder = (): MockQueryBuilder => {
  const builder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    }),
  };
  return builder;
};

// Creates a mock Supabase client where every `.from()` call returns the same query builder.
// Use `_queryBuilder` to configure the mock response and assert calls.
const createMockClient = () => {
  const mockQueryBuilder = createMockQueryBuilder();

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
};

// Creates a mock Supabase client that returns a *new* query builder for each `.from()` call.
// Useful for functions like `getAuditLogStats` that call `.from()` multiple times in parallel.
// Returns the list of builders in call order via `_builders`.
const createMultiCallMockClient = () => {
  const builders: MockQueryBuilder[] = [];

  const fromMock = jest.fn(() => {
    const builder = createMockQueryBuilder();
    builders.push(builder);
    return builder;
  });

  return {
    from: fromMock,
    _builders: builders,
  } as unknown as TypedClient & {
    _builders: MockQueryBuilder[];
    from: jest.Mock;
  };
};

describe("audit-log queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getTournamentAuditLog", () => {
    it("should fetch audit log entries for a tournament", async () => {
      const mockLogs = [
        {
          id: 1,
          tournament_id: 100,
          action: "tournament_start",
          created_at: "2024-01-01T12:00:00Z",
        },
        {
          id: 2,
          tournament_id: 100,
          action: "round_start",
          created_at: "2024-01-01T12:30:00Z",
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockLogs, error: null }).then(resolve);
      });

      const result = await getTournamentAuditLog(mockClient, 100);

      expect(result).toEqual(mockLogs);
      expect(mockClient.from).toHaveBeenCalledWith("audit_log");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("*");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "tournament_id",
        100
      );
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(0, 49);
    });

    it("should handle empty result", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await getTournamentAuditLog(mockClient, 999);

      expect(result).toEqual([]);
    });

    it("should apply pagination with custom limit and offset", async () => {
      const mockClient = createMockClient();

      await getTournamentAuditLog(mockClient, 100, {
        limit: 20,
        offset: 40,
      });

      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(40, 59);
    });

    it("should filter by action types", async () => {
      const mockClient = createMockClient();
      const actions: AuditAction[] = ["tournament_start", "round_start"];

      await getTournamentAuditLog(mockClient, 100, { actions });

      expect(mockClient._queryBuilder.in).toHaveBeenCalledWith(
        "action",
        actions
      );
    });

    it("should not filter when actions array is empty", async () => {
      const mockClient = createMockClient();

      await getTournamentAuditLog(mockClient, 100, { actions: [] });

      expect(mockClient._queryBuilder.in).not.toHaveBeenCalled();
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(getTournamentAuditLog(mockClient, 100)).rejects.toThrow(
        "Database error"
      );
    });

    it("should handle large offset for deep pagination", async () => {
      const mockClient = createMockClient();

      await getTournamentAuditLog(mockClient, 100, {
        limit: 100,
        offset: 1000,
      });

      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(1000, 1099);
    });

    it("should filter by multiple action types", async () => {
      const mockClient = createMockClient();
      const actions: AuditAction[] = [
        "tournament_start",
        "tournament_end",
        "round_start",
        "round_end",
      ];

      await getTournamentAuditLog(mockClient, 100, { actions });

      expect(mockClient._queryBuilder.in).toHaveBeenCalledWith(
        "action",
        actions
      );
    });
  });

  describe("getMatchAuditLog", () => {
    it("should fetch audit log entries for a match", async () => {
      const mockLogs = [
        {
          id: 1,
          match_id: 50,
          action: "match_start",
          created_at: "2024-01-01T13:00:00Z",
        },
        {
          id: 2,
          match_id: 50,
          action: "score_submit",
          created_at: "2024-01-01T13:15:00Z",
        },
      ];

      const mockClient = createMockClient();
      // For getMatchAuditLog, the query chain doesn't use range
      mockClient._queryBuilder.order = jest
        .fn()
        .mockResolvedValue({ data: mockLogs, error: null });

      const result = await getMatchAuditLog(mockClient, 50);

      expect(result).toEqual(mockLogs);
      expect(mockClient.from).toHaveBeenCalledWith("audit_log");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("*");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("match_id", 50);
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
    });

    it("should handle empty result for match", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order = jest
        .fn()
        .mockResolvedValue({ data: [], error: null });

      const result = await getMatchAuditLog(mockClient, 999);

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.order = jest
        .fn()
        .mockResolvedValue({ data: null, error: dbError });

      await expect(getMatchAuditLog(mockClient, 50)).rejects.toThrow(
        "Database error"
      );
    });

    it("should return all match logs without pagination", async () => {
      const mockLogs = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        match_id: 50,
        action: "score_submit",
        created_at: `2024-01-01T${String(13 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`,
      }));

      const mockClient = createMockClient();
      mockClient._queryBuilder.order = jest
        .fn()
        .mockResolvedValue({ data: mockLogs, error: null });

      const result = await getMatchAuditLog(mockClient, 50);

      expect(result).toHaveLength(100);
      expect(result).toEqual(mockLogs);
    });
  });

  describe("getAuditLog", () => {
    it("should query with default pagination and no filters", async () => {
      const mockData = [
        {
          id: 1,
          action: "tournament.started",
          created_at: "2024-06-01T10:00:00Z",
          actor_user: {
            id: "u1",
            username: "ash",
            first_name: "Ash",
            last_name: "Ketchum",
            image: null,
          },
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockData,
          error: null,
          count: 1,
        }).then(resolve);
      });

      const result = await getAuditLog(mockClient);

      // Verify return shape includes data and count
      expect(result).toEqual({ data: mockData, count: 1 });

      // Verify base query chain
      expect(mockClient.from).toHaveBeenCalledWith("audit_log");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith(
        "*, actor_user:users!audit_log_actor_user_id_fkey(id, username, first_name, last_name, image)",
        { count: "exact", head: false }
      );
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
      // Default pagination: offset=0, limit=50 → range(0, 49)
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(0, 49);

      // No filters applied
      expect(mockClient._queryBuilder.in).not.toHaveBeenCalled();
      expect(mockClient._queryBuilder.eq).not.toHaveBeenCalled();
      expect(mockClient._queryBuilder.gte).not.toHaveBeenCalled();
      expect(mockClient._queryBuilder.lte).not.toHaveBeenCalled();
      expect(mockClient._queryBuilder.not).not.toHaveBeenCalled();
    });

    it("should apply custom limit and offset", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      await getAuditLog(mockClient, { limit: 25, offset: 100 });

      // range(100, 124) → offset=100, limit=25
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(100, 124);
    });

    it("should filter by action types", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      const actions: AuditAction[] = [
        "match.score_submitted",
        "match.score_agreed",
      ];

      await getAuditLog(mockClient, { actions });

      expect(mockClient._queryBuilder.in).toHaveBeenCalledWith(
        "action",
        actions
      );
    });

    it("should not filter actions when array is empty", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      await getAuditLog(mockClient, { actions: [] });

      expect(mockClient._queryBuilder.in).not.toHaveBeenCalled();
    });

    it("should filter by actorUserId", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      await getAuditLog(mockClient, {
        actorUserId: "user-abc-123",
      });

      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "actor_user_id",
        "user-abc-123"
      );
    });

    it("should filter by date range", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      const dateRange = {
        start: "2024-01-01T00:00:00Z",
        end: "2024-01-31T23:59:59Z",
      };

      await getAuditLog(mockClient, { dateRange });

      expect(mockClient._queryBuilder.gte).toHaveBeenCalledWith(
        "created_at",
        "2024-01-01T00:00:00Z"
      );
      expect(mockClient._queryBuilder.lte).toHaveBeenCalledWith(
        "created_at",
        "2024-01-31T23:59:59Z"
      );
    });

    it("should filter by entityType 'tournament'", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      await getAuditLog(mockClient, { entityType: "tournament" });

      expect(mockClient._queryBuilder.not).toHaveBeenCalledWith(
        "tournament_id",
        "is",
        null
      );
    });

    it("should filter by entityType 'match'", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      await getAuditLog(mockClient, { entityType: "match" });

      expect(mockClient._queryBuilder.not).toHaveBeenCalledWith(
        "match_id",
        "is",
        null
      );
    });

    it("should filter by entityType 'organization'", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      await getAuditLog(mockClient, { entityType: "organization" });

      expect(mockClient._queryBuilder.not).toHaveBeenCalledWith(
        "organization_id",
        "is",
        null
      );
    });

    it("should apply all filters simultaneously", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      const actions: AuditAction[] = ["tournament.started"];
      const dateRange = {
        start: "2024-06-01T00:00:00Z",
        end: "2024-06-30T23:59:59Z",
      };

      await getAuditLog(mockClient, {
        actions,
        actorUserId: "user-xyz",
        dateRange,
        entityType: "tournament",
        limit: 10,
        offset: 20,
      });

      // Pagination
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(20, 29);

      // Actions filter
      expect(mockClient._queryBuilder.in).toHaveBeenCalledWith(
        "action",
        actions
      );

      // Actor filter
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "actor_user_id",
        "user-xyz"
      );

      // Date range filter
      expect(mockClient._queryBuilder.gte).toHaveBeenCalledWith(
        "created_at",
        "2024-06-01T00:00:00Z"
      );
      expect(mockClient._queryBuilder.lte).toHaveBeenCalledWith(
        "created_at",
        "2024-06-30T23:59:59Z"
      );

      // Entity type filter
      expect(mockClient._queryBuilder.not).toHaveBeenCalledWith(
        "tournament_id",
        "is",
        null
      );
    });

    it("should return count alongside data", async () => {
      const mockData = [
        { id: 1, action: "admin.sudo_activated" },
        { id: 2, action: "admin.sudo_deactivated" },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockData,
          error: null,
          count: 42,
        }).then(resolve);
      });

      const result = await getAuditLog(mockClient);

      expect(result.data).toEqual(mockData);
      expect(result.count).toBe(42);
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Permission denied");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: dbError,
          count: null,
        }).then(resolve);
      });

      await expect(getAuditLog(mockClient)).rejects.toThrow(
        "Permission denied"
      );
    });

    it("should handle empty result with zero count", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: [],
          error: null,
          count: 0,
        }).then(resolve);
      });

      const result = await getAuditLog(mockClient);

      expect(result).toEqual({ data: [], count: 0 });
    });

    it("should not apply date range filter when dateRange is undefined", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      await getAuditLog(mockClient, { actorUserId: "user-1" });

      expect(mockClient._queryBuilder.gte).not.toHaveBeenCalled();
      expect(mockClient._queryBuilder.lte).not.toHaveBeenCalled();
    });

    it("should not apply entity type filter when entityType is undefined", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null, count: 0 }).then(
          resolve
        );
      });

      await getAuditLog(mockClient, { actions: ["match.score_submitted"] });

      expect(mockClient._queryBuilder.not).not.toHaveBeenCalled();
    });
  });

  describe("getAuditLogStats", () => {
    it("should return counts for 24h, 7d, and 30d periods", async () => {
      const mockClient = createMultiCallMockClient();

      // The function calls .from("audit_log") three times via Promise.all.
      // Each builder resolves independently via its .gte() terminal call.
      // We need to set up .gte() on each builder to resolve with the count.
      // Since builders are created lazily by .from(), we configure them
      // after the call by making .from() return pre-configured builders.

      const builder24h = createMockQueryBuilder();
      builder24h.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 15 });

      const builder7d = createMockQueryBuilder();
      builder7d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 120 });

      const builder30d = createMockQueryBuilder();
      builder30d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 500 });

      // Override .from() to return our pre-configured builders in sequence
      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(builder24h)
        .mockReturnValueOnce(builder7d)
        .mockReturnValueOnce(builder30d);

      const result = await getAuditLogStats(
        mockClient as unknown as TypedClient
      );

      expect(result).toEqual({
        total24h: 15,
        total7d: 120,
        total30d: 500,
      });

      // All three calls target the audit_log table
      expect(mockClient.from).toHaveBeenCalledTimes(3);
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "audit_log");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "audit_log");
      expect(mockClient.from).toHaveBeenNthCalledWith(3, "audit_log");

      // Each builder uses head:true count query
      expect(builder24h.select).toHaveBeenCalledWith("*", {
        count: "exact",
        head: true,
      });
      expect(builder7d.select).toHaveBeenCalledWith("*", {
        count: "exact",
        head: true,
      });
      expect(builder30d.select).toHaveBeenCalledWith("*", {
        count: "exact",
        head: true,
      });

      // Each builder filters by created_at >= some ISO timestamp
      expect(builder24h.gte).toHaveBeenCalledWith(
        "created_at",
        expect.any(String)
      );
      expect(builder7d.gte).toHaveBeenCalledWith(
        "created_at",
        expect.any(String)
      );
      expect(builder30d.gte).toHaveBeenCalledWith(
        "created_at",
        expect.any(String)
      );
    });

    it("should return 0 when counts are null", async () => {
      const mockClient = createMultiCallMockClient();

      const builder24h = createMockQueryBuilder();
      builder24h.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: null });

      const builder7d = createMockQueryBuilder();
      builder7d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: null });

      const builder30d = createMockQueryBuilder();
      builder30d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: null });

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(builder24h)
        .mockReturnValueOnce(builder7d)
        .mockReturnValueOnce(builder30d);

      const result = await getAuditLogStats(
        mockClient as unknown as TypedClient
      );

      expect(result).toEqual({
        total24h: 0,
        total7d: 0,
        total30d: 0,
      });
    });

    it("should throw when the 24h query fails", async () => {
      const mockClient = createMultiCallMockClient();
      const dbError = new Error("Connection timeout");

      const builder24h = createMockQueryBuilder();
      builder24h.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: dbError, count: null });

      const builder7d = createMockQueryBuilder();
      builder7d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 100 });

      const builder30d = createMockQueryBuilder();
      builder30d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 500 });

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(builder24h)
        .mockReturnValueOnce(builder7d)
        .mockReturnValueOnce(builder30d);

      await expect(
        getAuditLogStats(mockClient as unknown as TypedClient)
      ).rejects.toThrow("Connection timeout");
    });

    it("should throw when the 7d query fails", async () => {
      const mockClient = createMultiCallMockClient();
      const dbError = new Error("7d query failed");

      const builder24h = createMockQueryBuilder();
      builder24h.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 10 });

      const builder7d = createMockQueryBuilder();
      builder7d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: dbError, count: null });

      const builder30d = createMockQueryBuilder();
      builder30d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 500 });

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(builder24h)
        .mockReturnValueOnce(builder7d)
        .mockReturnValueOnce(builder30d);

      await expect(
        getAuditLogStats(mockClient as unknown as TypedClient)
      ).rejects.toThrow("7d query failed");
    });

    it("should throw when the 30d query fails", async () => {
      const mockClient = createMultiCallMockClient();
      const dbError = new Error("30d query failed");

      const builder24h = createMockQueryBuilder();
      builder24h.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 10 });

      const builder7d = createMockQueryBuilder();
      builder7d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 100 });

      const builder30d = createMockQueryBuilder();
      builder30d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: dbError, count: null });

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(builder24h)
        .mockReturnValueOnce(builder7d)
        .mockReturnValueOnce(builder30d);

      await expect(
        getAuditLogStats(mockClient as unknown as TypedClient)
      ).rejects.toThrow("30d query failed");
    });

    it("should pass ISO timestamp strings to gte filters", async () => {
      const mockClient = createMultiCallMockClient();

      const builder24h = createMockQueryBuilder();
      builder24h.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 0 });

      const builder7d = createMockQueryBuilder();
      builder7d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 0 });

      const builder30d = createMockQueryBuilder();
      builder30d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 0 });

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(builder24h)
        .mockReturnValueOnce(builder7d)
        .mockReturnValueOnce(builder30d);

      await getAuditLogStats(mockClient as unknown as TypedClient);

      // Verify the timestamps are valid ISO strings
      const timestamp24h = (builder24h.gte as jest.Mock).mock
        .calls[0]![1] as string;
      const timestamp7d = (builder7d.gte as jest.Mock).mock
        .calls[0]![1] as string;
      const timestamp30d = (builder30d.gte as jest.Mock).mock
        .calls[0]![1] as string;

      // Each should parse to a valid date
      expect(new Date(timestamp24h).toISOString()).toBe(timestamp24h);
      expect(new Date(timestamp7d).toISOString()).toBe(timestamp7d);
      expect(new Date(timestamp30d).toISOString()).toBe(timestamp30d);

      // The 24h timestamp should be more recent than 7d, which is more recent than 30d
      expect(new Date(timestamp24h).getTime()).toBeGreaterThan(
        new Date(timestamp7d).getTime()
      );
      expect(new Date(timestamp7d).getTime()).toBeGreaterThan(
        new Date(timestamp30d).getTime()
      );
    });

    it("should return zero counts when no audit log entries exist", async () => {
      const mockClient = createMultiCallMockClient();

      const builder24h = createMockQueryBuilder();
      builder24h.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 0 });

      const builder7d = createMockQueryBuilder();
      builder7d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 0 });

      const builder30d = createMockQueryBuilder();
      builder30d.gte = jest
        .fn()
        .mockResolvedValue({ data: null, error: null, count: 0 });

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(builder24h)
        .mockReturnValueOnce(builder7d)
        .mockReturnValueOnce(builder30d);

      const result = await getAuditLogStats(
        mockClient as unknown as TypedClient
      );

      expect(result).toEqual({
        total24h: 0,
        total7d: 0,
        total30d: 0,
      });
    });
  });
});
