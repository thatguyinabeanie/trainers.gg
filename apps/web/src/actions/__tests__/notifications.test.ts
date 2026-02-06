/**
 * @jest-environment node
 */

import * as supabaseModule from "@trainers/supabase";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
} from "../notifications";

// Mock Supabase server client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabase),
}));

// Mock @trainers/supabase mutations
jest.mock("@trainers/supabase");

// Mock utils
jest.mock("../utils", () => ({
  withAction: (fn: () => Promise<unknown>, fallbackMessage: string) =>
    fn().then(
      (data) => ({ success: true, data }),
      (error) => ({
        success: false,
        error: error.message || fallbackMessage,
      })
    ),
}));

describe("Notification Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("markNotificationReadAction", () => {
    it("successfully marks notification as read", async () => {
      (supabaseModule.markNotificationRead as jest.Mock).mockResolvedValue({});

      const result = await markNotificationReadAction(1);

      expect(result.success).toBe(true);
      expect(supabaseModule.markNotificationRead).toHaveBeenCalledWith(
        mockSupabase,
        1
      );
    });

    it("returns error when notification not found", async () => {
      (supabaseModule.markNotificationRead as jest.Mock).mockRejectedValue(
        new Error("Notification not found")
      );

      const result = await markNotificationReadAction(999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Notification not found");
      }
    });

    it("returns error when not owner of notification", async () => {
      (supabaseModule.markNotificationRead as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await markNotificationReadAction(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Permission denied");
      }
    });

    it("returns error when notification already read", async () => {
      (supabaseModule.markNotificationRead as jest.Mock).mockRejectedValue(
        new Error("Notification already read")
      );

      const result = await markNotificationReadAction(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already read");
      }
    });

    it("returns error for invalid notificationId (negative)", async () => {
      const result = await markNotificationReadAction(-1);

      expect(result.success).toBe(false);
    });

    it("returns error for invalid notificationId (zero)", async () => {
      const result = await markNotificationReadAction(0);

      expect(result.success).toBe(false);
    });

    it("returns error for invalid notificationId (decimal)", async () => {
      const result = await markNotificationReadAction(1.5);

      expect(result.success).toBe(false);
    });

    it("allows marking same notification multiple times (idempotent)", async () => {
      (supabaseModule.markNotificationRead as jest.Mock).mockResolvedValue({});

      const result1 = await markNotificationReadAction(1);
      const result2 = await markNotificationReadAction(1);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(supabaseModule.markNotificationRead).toHaveBeenCalledTimes(2);
    });
  });

  describe("markAllNotificationsReadAction", () => {
    it("successfully marks all notifications as read", async () => {
      (supabaseModule.markAllNotificationsRead as jest.Mock).mockResolvedValue(
        {}
      );

      const result = await markAllNotificationsReadAction();

      expect(result.success).toBe(true);
      expect(supabaseModule.markAllNotificationsRead).toHaveBeenCalledWith(
        mockSupabase
      );
    });

    it("succeeds when user has no notifications", async () => {
      (supabaseModule.markAllNotificationsRead as jest.Mock).mockResolvedValue(
        {}
      );

      const result = await markAllNotificationsReadAction();

      expect(result.success).toBe(true);
    });

    it("succeeds when all notifications already read", async () => {
      (supabaseModule.markAllNotificationsRead as jest.Mock).mockResolvedValue(
        {}
      );

      const result = await markAllNotificationsReadAction();

      expect(result.success).toBe(true);
    });

    it("returns error when not authenticated", async () => {
      (supabaseModule.markAllNotificationsRead as jest.Mock).mockRejectedValue(
        new Error("Not authenticated")
      );

      const result = await markAllNotificationsReadAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Not authenticated");
      }
    });

    it("returns error when database operation fails", async () => {
      (supabaseModule.markAllNotificationsRead as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const result = await markAllNotificationsReadAction();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Database error");
      }
    });

    it("allows calling multiple times (idempotent)", async () => {
      (supabaseModule.markAllNotificationsRead as jest.Mock).mockResolvedValue(
        {}
      );

      const result1 = await markAllNotificationsReadAction();
      const result2 = await markAllNotificationsReadAction();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(supabaseModule.markAllNotificationsRead).toHaveBeenCalledTimes(2);
    });
  });

  describe("deleteNotificationAction", () => {
    it("successfully deletes notification", async () => {
      (supabaseModule.deleteNotification as jest.Mock).mockResolvedValue({});

      const result = await deleteNotificationAction(1);

      expect(result.success).toBe(true);
      expect(supabaseModule.deleteNotification).toHaveBeenCalledWith(
        mockSupabase,
        1
      );
    });

    it("returns error when notification not found", async () => {
      (supabaseModule.deleteNotification as jest.Mock).mockRejectedValue(
        new Error("Notification not found")
      );

      const result = await deleteNotificationAction(999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Notification not found");
      }
    });

    it("returns error when not owner of notification", async () => {
      (supabaseModule.deleteNotification as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await deleteNotificationAction(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Permission denied");
      }
    });

    it("returns error when notification already deleted", async () => {
      (supabaseModule.deleteNotification as jest.Mock).mockRejectedValue(
        new Error("Notification already deleted")
      );

      const result = await deleteNotificationAction(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already deleted");
      }
    });

    it("returns error for invalid notificationId (negative)", async () => {
      const result = await deleteNotificationAction(-1);

      expect(result.success).toBe(false);
    });

    it("returns error for invalid notificationId (zero)", async () => {
      const result = await deleteNotificationAction(0);

      expect(result.success).toBe(false);
    });

    it("returns error for invalid notificationId (decimal)", async () => {
      const result = await deleteNotificationAction(3.14);

      expect(result.success).toBe(false);
    });

    it("deletes read notification", async () => {
      (supabaseModule.deleteNotification as jest.Mock).mockResolvedValue({});

      const result = await deleteNotificationAction(5);

      expect(result.success).toBe(true);
      expect(supabaseModule.deleteNotification).toHaveBeenCalledWith(
        mockSupabase,
        5
      );
    });

    it("deletes unread notification", async () => {
      (supabaseModule.deleteNotification as jest.Mock).mockResolvedValue({});

      const result = await deleteNotificationAction(7);

      expect(result.success).toBe(true);
      expect(supabaseModule.deleteNotification).toHaveBeenCalledWith(
        mockSupabase,
        7
      );
    });

    it("cannot delete notification twice", async () => {
      (supabaseModule.deleteNotification as jest.Mock)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("Notification not found"));

      const result1 = await deleteNotificationAction(1);
      const result2 = await deleteNotificationAction(1);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error).toContain("Notification not found");
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles concurrent marking of same notification", async () => {
      (supabaseModule.markNotificationRead as jest.Mock).mockResolvedValue({});

      const results = await Promise.all([
        markNotificationReadAction(1),
        markNotificationReadAction(1),
        markNotificationReadAction(1),
      ]);

      expect(results.every((r) => r.success)).toBe(true);
      expect(supabaseModule.markNotificationRead).toHaveBeenCalledTimes(3);
    });

    it("handles marking read and then deleting", async () => {
      (supabaseModule.markNotificationRead as jest.Mock).mockResolvedValue({});
      (supabaseModule.deleteNotification as jest.Mock).mockResolvedValue({});

      const readResult = await markNotificationReadAction(1);
      const deleteResult = await deleteNotificationAction(1);

      expect(readResult.success).toBe(true);
      expect(deleteResult.success).toBe(true);
    });

    it("handles deleting without marking read", async () => {
      (supabaseModule.deleteNotification as jest.Mock).mockResolvedValue({});

      const result = await deleteNotificationAction(1);

      expect(result.success).toBe(true);
    });

    it("handles marking all read when some already read", async () => {
      (supabaseModule.markAllNotificationsRead as jest.Mock).mockResolvedValue(
        {}
      );

      const result = await markAllNotificationsReadAction();

      expect(result.success).toBe(true);
    });

    it("handles very large notification IDs", async () => {
      (supabaseModule.markNotificationRead as jest.Mock).mockResolvedValue({});

      const result = await markNotificationReadAction(2147483647); // max int32

      expect(result.success).toBe(true);
      expect(supabaseModule.markNotificationRead).toHaveBeenCalledWith(
        mockSupabase,
        2147483647
      );
    });
  });
});
