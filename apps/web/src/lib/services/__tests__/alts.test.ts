/**
 * Tests for Alt Service Layer
 */

import { describe, it, expect, jest } from "@jest/globals";
import {
  getAltsByUserIdService,
  createAltService,
  updateAltService,
  deleteAltService,
  getCurrentUserAltsService,
} from "../alts";

// Mock Supabase client
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Mock Supabase functions
jest.mock("@trainers/supabase", () => ({
  getAltsByUserId: jest.fn(),
  getCurrentUserAlts: jest.fn(),
  createAlt: jest.fn(),
  updateAlt: jest.fn(),
  deleteAlt: jest.fn(),
  setMainAlt: jest.fn(),
}));

describe("Alt Service", () => {
  describe("getAltsByUserIdService", () => {
    it("should return alts for a user", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getAltsByUserId } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const userId = "user-123";
      const mockAlts = [
        { id: 1, user_id: userId, username: "player1" },
        { id: 2, user_id: userId, username: "player2" },
      ];

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getAltsByUserId as jest.Mock).mockResolvedValue(mockAlts);

      const result = await getAltsByUserIdService(userId);

      expect(createClient).toHaveBeenCalled();
      expect(getAltsByUserId).toHaveBeenCalledWith(mockSupabase, userId);
      expect(result).toEqual(mockAlts);
    });

    it("should throw error when no alts found", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getAltsByUserId } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const userId = "user-456";

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getAltsByUserId as jest.Mock).mockResolvedValue([]);

      await expect(getAltsByUserIdService(userId)).rejects.toThrow(
        "No alts found for user"
      );
    });
  });

  describe("createAltService", () => {
    it("should create a new alt", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { createAlt } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const altData = { username: "newplayer", display_name: "New Player" };
      const mockCreatedAlt = { id: 789, ...altData };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (createAlt as jest.Mock).mockResolvedValue(mockCreatedAlt);

      const result = await createAltService(altData);

      expect(createClient).toHaveBeenCalled();
      expect(createAlt).toHaveBeenCalledWith(mockSupabase, altData);
      expect(result).toEqual(mockCreatedAlt);
    });
  });

  describe("updateAltService", () => {
    it("should update an alt", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { updateAlt } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const altId = 123;
      const updates = { display_name: "Updated Name" };

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (updateAlt as jest.Mock).mockResolvedValue(undefined);

      await updateAltService(altId, updates);

      expect(createClient).toHaveBeenCalled();
      expect(updateAlt).toHaveBeenCalledWith(mockSupabase, altId, updates);
    });
  });

  describe("deleteAltService", () => {
    it("should delete an alt", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { deleteAlt } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const altId = 123;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (deleteAlt as jest.Mock).mockResolvedValue(undefined);

      await deleteAltService(altId);

      expect(createClient).toHaveBeenCalled();
      expect(deleteAlt).toHaveBeenCalledWith(mockSupabase, altId);
    });
  });

  describe("getCurrentUserAltsService", () => {
    it("should return current user's alts", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const { getCurrentUserAlts } = await import("@trainers/supabase");

      const mockSupabase = {} as any;
      const mockAlts = [{ id: 1, user_id: "user-123", username: "player1" }];

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getCurrentUserAlts as jest.Mock).mockResolvedValue(mockAlts);

      const result = await getCurrentUserAltsService();

      expect(createClient).toHaveBeenCalled();
      expect(getCurrentUserAlts).toHaveBeenCalledWith(mockSupabase);
      expect(result).toEqual(mockAlts);
    });
  });
});
