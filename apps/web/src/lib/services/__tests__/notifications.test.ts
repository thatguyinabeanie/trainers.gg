/**
 * Tests for Notification Service Layer
 */

import { describe, it, expect, jest } from "@jest/globals";
import {
  getUserNotificationsService,
  markNotificationReadService,
  deleteNotificationService,
} from "../notifications";

// Mock Supabase client
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Mock Supabase functions
jest.mock("@trainers/supabase", () => ({
  getNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  deleteNotification: jest.fn(),
}));

describe("Notification Service", () => {
  describe("getUserNotificationsService", () => {
    it("should return notifications from getNotifications", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getNotifications } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const mockNotifications = [
        { id: 1, message: "Test notification", read: false },
      ];

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      const result = await getUserNotificationsService();

      expect(createClient).toHaveBeenCalled();
      expect(getNotifications).toHaveBeenCalledWith(mockSupabase);
      expect(result).toEqual(mockNotifications);
    });
  });

  describe("markNotificationReadService", () => {
    it("should mark a notification as read", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { markNotificationRead } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const notificationId = 123;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (markNotificationRead as jest.Mock).mockResolvedValue(undefined);

      await markNotificationReadService(notificationId);

      expect(createClient).toHaveBeenCalled();
      expect(markNotificationRead).toHaveBeenCalledWith(
        mockSupabase,
        notificationId
      );
    });
  });

  describe("deleteNotificationService", () => {
    it("should delete a notification", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { deleteNotification } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const notificationId = 456;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (deleteNotification as jest.Mock).mockResolvedValue(undefined);

      await deleteNotificationService(notificationId);

      expect(createClient).toHaveBeenCalled();
      expect(deleteNotification).toHaveBeenCalledWith(
        mockSupabase,
        notificationId
      );
    });
  });
});
