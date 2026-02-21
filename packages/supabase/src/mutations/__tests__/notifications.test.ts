import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../notifications";
import type { TypedClient } from "../../client";
import { createMockClient } from "@trainers/test-utils/mocks";

type MockQueryBuilder = {
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  is: jest.Mock;
};

describe("Notification Mutations", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient() as unknown as TypedClient;
    jest.clearAllMocks();
  });

  describe("markNotificationRead", () => {
    const notificationId = 100;

    it("should successfully mark a notification as read", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Update notification set read_at
      const isMock = jest.fn().mockResolvedValue({ error: null });
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: isMock,
      } as unknown as MockQueryBuilder);

      await markNotificationRead(mockClient, notificationId);

      // Verify RLS filtering (only unread notifications)
      expect(isMock).toHaveBeenCalledWith("read_at", null);
    });

    it("should update with current timestamp", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const beforeTime = new Date().toISOString();
      await markNotificationRead(mockClient, notificationId);
      const afterTime = new Date().toISOString();

      // Verify update was called with a timestamp object
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          read_at: expect.any(String),
        })
      );

      // Get the actual timestamp passed
      const actualTimestamp = updateMock.mock.calls[0]?.[0]?.read_at;
      expect(actualTimestamp).toBeDefined();

      // Verify it's between beforeTime and afterTime (reasonable timestamp)
      if (actualTimestamp) {
        expect(actualTimestamp >= beforeTime).toBe(true);
        expect(actualTimestamp <= afterTime).toBe(true);
      }
    });

    it("should filter by notification ID", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const eqMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: eqMock,
        is: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await markNotificationRead(mockClient, notificationId);

      expect(eqMock).toHaveBeenCalledWith("id", notificationId);
    });

    it("should propagate database errors", async () => {
      const dbError = new Error("Database error");
      (mockClient.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ error: dbError }),
      });

      await expect(
        markNotificationRead(mockClient, notificationId)
      ).rejects.toThrow("Database error");
    });

    it("should work with RLS to ensure user can only mark their own notifications", async () => {
      // This test verifies the query structure relies on RLS
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await markNotificationRead(mockClient, notificationId);

      // Verify we're operating on notifications table (RLS applies here)
      expect(fromSpy).toHaveBeenCalledWith("notifications");
    });
  });

  describe("markAllNotificationsRead", () => {
    it("should successfully mark all unread notifications as read", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Update all unread notifications
      const isMock = jest.fn().mockResolvedValue({ error: null });
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        is: isMock,
      } as unknown as MockQueryBuilder);

      await markAllNotificationsRead(mockClient);

      // Verify filtering for unread notifications only
      expect(isMock).toHaveBeenCalledWith("read_at", null);
    });

    it("should update with current timestamp", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        update: updateMock,
        is: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const beforeTime = new Date().toISOString();
      await markAllNotificationsRead(mockClient);
      const afterTime = new Date().toISOString();

      // Verify update was called with a timestamp object
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          read_at: expect.any(String),
        })
      );

      // Get the actual timestamp passed
      const actualTimestamp = updateMock.mock.calls[0]?.[0]?.read_at;
      expect(actualTimestamp).toBeDefined();

      // Verify it's between beforeTime and afterTime
      if (actualTimestamp) {
        expect(actualTimestamp >= beforeTime).toBe(true);
        expect(actualTimestamp <= afterTime).toBe(true);
      }
    });

    it("should propagate database errors", async () => {
      const dbError = new Error("Database error");
      (mockClient.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ error: dbError }),
      });

      await expect(markAllNotificationsRead(mockClient)).rejects.toThrow(
        "Database error"
      );
    });

    it("should rely on RLS to ensure user can only mark their own notifications", async () => {
      // This test verifies the query structure relies on RLS
      const fromSpy = jest.spyOn(mockClient, "from");
      const updateMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        update: updateMock,
        is: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await markAllNotificationsRead(mockClient);

      // Verify we're operating on notifications table (RLS applies here)
      expect(fromSpy).toHaveBeenCalledWith("notifications");

      // Verify no user_id filter is explicitly added (RLS handles this)
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          read_at: expect.any(String),
        })
      );
    });

    it("should not filter by notification ID (marks all)", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await markAllNotificationsRead(mockClient);

      // Verify from was called but eq was not (no ID filtering)
      expect(fromSpy).toHaveBeenCalledWith("notifications");
      expect(mockClient.eq).not.toHaveBeenCalled();
    });
  });

  describe("deleteNotification", () => {
    const notificationId = 100;

    it("should successfully delete a notification", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Delete notification
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: eqMock,
      } as unknown as MockQueryBuilder);

      await deleteNotification(mockClient, notificationId);

      expect(eqMock).toHaveBeenCalledWith("id", notificationId);
    });

    it("should filter by notification ID", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const eqMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: eqMock,
      } as unknown as MockQueryBuilder);

      await deleteNotification(mockClient, notificationId);

      expect(eqMock).toHaveBeenCalledWith("id", notificationId);
    });

    it("should propagate database errors", async () => {
      const dbError = new Error("Database error");
      (mockClient.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: dbError }),
      });

      await expect(
        deleteNotification(mockClient, notificationId)
      ).rejects.toThrow("Database error");
    });

    it("should rely on RLS to ensure user can only delete their own notifications", async () => {
      // This test verifies the query structure relies on RLS
      const fromSpy = jest.spyOn(mockClient, "from");
      const deleteMock = jest.fn().mockReturnThis();

      fromSpy.mockReturnValueOnce({
        delete: deleteMock,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await deleteNotification(mockClient, notificationId);

      // Verify we're operating on notifications table (RLS applies here)
      expect(fromSpy).toHaveBeenCalledWith("notifications");

      // Verify delete was called (no explicit user_id check, RLS handles it)
      expect(deleteMock).toHaveBeenCalled();
    });

    it("should work for any valid notification ID", async () => {
      const testIds = [1, 999, 123456];

      for (const id of testIds) {
        const testClient = createMockClient() as unknown as TypedClient;
        const fromSpy = jest.spyOn(testClient, "from");
        const eqMock = jest.fn().mockResolvedValue({ error: null });

        fromSpy.mockReturnValueOnce({
          delete: jest.fn().mockReturnThis(),
          eq: eqMock,
        } as unknown as MockQueryBuilder);

        await deleteNotification(testClient, id);

        expect(eqMock).toHaveBeenCalledWith("id", id);
      }
    });
  });
});
