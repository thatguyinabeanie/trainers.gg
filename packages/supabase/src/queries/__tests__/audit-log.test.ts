import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getTournamentAuditLog, getMatchAuditLog } from "../audit-log";
import type { TypedClient } from "../../client";
import type { Database } from "../../types";

type AuditAction = Database["public"]["Enums"]["audit_action"];

// Mock query builder
type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  range: jest.Mock<() => MockQueryBuilder>;
  in: jest.Mock<() => MockQueryBuilder>;
  then: jest.Mock<
    (
      resolve: (value: { data: unknown; error: unknown }) => void
    ) => Promise<{ data: unknown; error: unknown }>
  >;
};

const createMockClient = () => {
  const mockQueryBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    }),
  };

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
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
});
