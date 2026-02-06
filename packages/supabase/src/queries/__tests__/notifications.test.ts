import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getNotifications,
  getUnreadNotificationCount,
  getActiveMatchNotifications,
} from "../notifications";
import type { TypedClient } from "../../client";

// Mock query builder
type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  range: jest.Mock<() => MockQueryBuilder>;
  is: jest.Mock<() => MockQueryBuilder>;
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
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
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

describe("notifications queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getNotifications", () => {
    it("should fetch notifications with default options", async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: "user-123",
          type: "match_ready",
          message: "Your match is ready",
          read_at: null,
          created_at: "2024-01-01T12:00:00Z",
        },
        {
          id: 2,
          user_id: "user-123",
          type: "tournament_round",
          message: "New tournament round",
          read_at: "2024-01-01T12:05:00Z",
          created_at: "2024-01-01T11:50:00Z",
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockNotifications, error: null }).then(
          resolve
        );
      });

      const result = await getNotifications(mockClient);

      expect(result).toEqual(mockNotifications);
      expect(mockClient.from).toHaveBeenCalledWith("notifications");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("*");
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(0, 19);
    });

    it("should apply custom limit and offset", async () => {
      const mockClient = createMockClient();

      await getNotifications(mockClient, { limit: 50, offset: 100 });

      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(100, 149);
    });

    it("should filter unread notifications only", async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: "user-123",
          type: "match_ready",
          message: "Your match is ready",
          read_at: null,
          created_at: "2024-01-01T12:00:00Z",
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockNotifications, error: null }).then(
          resolve
        );
      });

      const result = await getNotifications(mockClient, { unreadOnly: true });

      expect(result).toEqual(mockNotifications);
      expect(mockClient._queryBuilder.is).toHaveBeenCalledWith("read_at", null);
    });

    it("should not filter when unreadOnly is false", async () => {
      const mockClient = createMockClient();

      await getNotifications(mockClient, { unreadOnly: false });

      expect(mockClient._queryBuilder.is).not.toHaveBeenCalled();
    });

    it("should return empty array when no notifications exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await getNotifications(mockClient);

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(getNotifications(mockClient)).rejects.toThrow(
        "Database error"
      );
    });

    it("should handle deep pagination", async () => {
      const mockClient = createMockClient();

      await getNotifications(mockClient, { limit: 10, offset: 500 });

      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(500, 509);
    });

    it("should order by created_at descending (newest first)", async () => {
      const mockClient = createMockClient();

      await getNotifications(mockClient);

      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
    });
  });

  describe("getUnreadNotificationCount", () => {
    it("should return count of unread notifications", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: null,
          count: 5,
        }).then(resolve);
      });

      const result = await getUnreadNotificationCount(mockClient);

      expect(result).toBe(5);
      expect(mockClient.from).toHaveBeenCalledWith("notifications");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("*", {
        count: "exact",
        head: true,
      });
      expect(mockClient._queryBuilder.is).toHaveBeenCalledWith("read_at", null);
    });

    it("should return 0 when count is null", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: null,
          count: null,
        }).then(resolve);
      });

      const result = await getUnreadNotificationCount(mockClient);

      expect(result).toBe(0);
    });

    it("should return 0 when no unread notifications exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: null,
          count: 0,
        }).then(resolve);
      });

      const result = await getUnreadNotificationCount(mockClient);

      expect(result).toBe(0);
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: dbError,
          count: null,
        }).then(resolve);
      });

      await expect(getUnreadNotificationCount(mockClient)).rejects.toThrow(
        "Database error"
      );
    });

    it("should handle large counts", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: null,
          count: 9999,
        }).then(resolve);
      });

      const result = await getUnreadNotificationCount(mockClient);

      expect(result).toBe(9999);
    });
  });

  describe("getActiveMatchNotifications", () => {
    it("should fetch unread match and tournament notifications", async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: "user-123",
          type: "match_ready",
          message: "Your match is ready",
          read_at: null,
          created_at: "2024-01-01T12:00:00Z",
        },
        {
          id: 2,
          user_id: "user-123",
          type: "tournament_round",
          message: "New tournament round",
          read_at: null,
          created_at: "2024-01-01T11:50:00Z",
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockNotifications,
          error: null,
        }).then(resolve);
      });

      const result = await getActiveMatchNotifications(mockClient);

      expect(result).toEqual(mockNotifications);
      expect(mockClient.from).toHaveBeenCalledWith("notifications");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("*");
      expect(mockClient._queryBuilder.is).toHaveBeenCalledWith("read_at", null);
      expect(mockClient._queryBuilder.in).toHaveBeenCalledWith("type", [
        "match_ready",
        "tournament_round",
      ]);
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
    });

    it("should return empty array when no active match notifications exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await getActiveMatchNotifications(mockClient);

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(getActiveMatchNotifications(mockClient)).rejects.toThrow(
        "Database error"
      );
    });

    it("should filter only match_ready and tournament_round types", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await getActiveMatchNotifications(mockClient);

      expect(mockClient._queryBuilder.in).toHaveBeenCalledWith("type", [
        "match_ready",
        "tournament_round",
      ]);
    });

    it("should only return unread notifications", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await getActiveMatchNotifications(mockClient);

      expect(mockClient._queryBuilder.is).toHaveBeenCalledWith("read_at", null);
    });
  });
});
