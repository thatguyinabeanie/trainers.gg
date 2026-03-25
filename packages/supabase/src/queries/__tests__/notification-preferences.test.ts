import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getNotificationPreferences } from "../notification-preferences";
import { createMockClient } from "@trainers/test-utils/mocks";
import type { TypedClient } from "../../client";

describe("notification-preferences queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getNotificationPreferences", () => {
    const userId = "user-123";

    it("should return preferences when a row exists", async () => {
      const savedPreferences = {
        match_ready: true,
        match_result: false,
        tournament_start: true,
      };

      const mockClient = createMockClient();
      mockClient.maybeSingle.mockResolvedValue({
        data: { preferences: savedPreferences },
        error: null,
      });

      const result = await getNotificationPreferences(
        mockClient as unknown as TypedClient,
        userId
      );

      expect(result).toEqual(savedPreferences);
      expect(mockClient.from).toHaveBeenCalledWith("notification_preferences");
      expect(mockClient.select).toHaveBeenCalledWith("preferences");
      expect(mockClient.eq).toHaveBeenCalledWith("user_id", userId);
    });

    it("should return null when no preferences row exists", async () => {
      const mockClient = createMockClient();
      mockClient.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getNotificationPreferences(
        mockClient as unknown as TypedClient,
        userId
      );

      expect(result).toBeNull();
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        getNotificationPreferences(mockClient as unknown as TypedClient, userId)
      ).rejects.toThrow("Database error");
    });

    it("should query by the provided user ID", async () => {
      const customUserId = "custom-user-456";
      const mockClient = createMockClient();
      mockClient.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await getNotificationPreferences(
        mockClient as unknown as TypedClient,
        customUserId
      );

      expect(mockClient.eq).toHaveBeenCalledWith("user_id", customUserId);
    });
  });
});
