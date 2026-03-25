import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { upsertNotificationPreferences } from "../notification-preferences";
import type { TypedClient } from "../../client";
import { createMockClient } from "@trainers/test-utils/mocks";

describe("notification-preferences mutations", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient() as unknown as TypedClient;
    jest.clearAllMocks();
  });

  describe("upsertNotificationPreferences", () => {
    const userId = "user-123";
    const preferences = {
      match_ready: true,
      match_result: false,
      tournament_start: true,
    };

    it("should upsert preferences with correct parameters", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const upsertMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        upsert: upsertMock,
      } as unknown as ReturnType<TypedClient["from"]>);

      await upsertNotificationPreferences(mockClient, userId, preferences);

      expect(fromSpy).toHaveBeenCalledWith("notification_preferences");
      expect(upsertMock).toHaveBeenCalledWith(
        {
          user_id: userId,
          preferences,
        },
        { onConflict: "user_id" }
      );
    });

    it("should propagate database errors", async () => {
      const dbError = new Error("Database error");
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({ error: dbError }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await expect(
        upsertNotificationPreferences(mockClient, userId, preferences)
      ).rejects.toThrow("Database error");
    });

    it("should use the notification_preferences table", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await upsertNotificationPreferences(mockClient, userId, preferences);

      expect(fromSpy).toHaveBeenCalledWith("notification_preferences");
    });

    it("should handle updating existing preferences", async () => {
      const updatedPreferences = {
        match_ready: false,
        match_result: true,
        tournament_start: false,
        judge_call: true,
      };
      const fromSpy = jest.spyOn(mockClient, "from");
      const upsertMock = jest.fn().mockResolvedValue({ error: null });

      fromSpy.mockReturnValueOnce({
        upsert: upsertMock,
      } as unknown as ReturnType<TypedClient["from"]>);

      await upsertNotificationPreferences(
        mockClient,
        userId,
        updatedPreferences
      );

      expect(upsertMock).toHaveBeenCalledWith(
        {
          user_id: userId,
          preferences: updatedPreferences,
        },
        { onConflict: "user_id" }
      );
    });
  });
});
