/**
 * @jest-environment node
 */

import * as supabaseModule from "@trainers/supabase";
import {
  createAltAction,
  updateAltAction,
  deleteAltAction,
  setMainAltAction,
  updateProfileAction,
} from "../alts";

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

describe("Alt Management Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAltAction", () => {
    it("successfully creates an alt", async () => {
      const mockAlt = { id: 1 };
      (supabaseModule.createAlt as jest.Mock).mockResolvedValue(mockAlt);

      const result = await createAltAction({
        username: "player1",
        displayName: "Player One",
        inGameName: "P1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(1);
      }
      expect(supabaseModule.createAlt).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          username: "player1",
          displayName: "Player One",
          inGameName: "P1",
        })
      );
    });

    it("creates alt without optional IGN", async () => {
      const mockAlt = { id: 2 };
      (supabaseModule.createAlt as jest.Mock).mockResolvedValue(mockAlt);

      const result = await createAltAction({
        username: "player2",
        displayName: "Player Two",
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.createAlt).toHaveBeenCalledWith(
        mockSupabase,
        expect.objectContaining({
          username: "player2",
          displayName: "Player Two",
          inGameName: undefined,
        })
      );
    });

    it("returns error when username is invalid", async () => {
      const result = await createAltAction({
        username: "Player 1", // spaces not allowed
        displayName: "Player One",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "Username must be lowercase letters, numbers, and underscores only"
        );
      }
    });

    it("returns error when username has uppercase", async () => {
      const result = await createAltAction({
        username: "Player1", // uppercase not allowed
        displayName: "Player One",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("lowercase");
      }
    });

    it("returns error when username is too long", async () => {
      const result = await createAltAction({
        username: "a".repeat(31),
        displayName: "Test",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("30 characters or fewer");
      }
    });

    it("returns error when display name is empty", async () => {
      const result = await createAltAction({
        username: "player1",
        displayName: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Display name is required");
      }
    });

    it("returns error when display name is too long", async () => {
      const result = await createAltAction({
        username: "player1",
        displayName: "a".repeat(65),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("64 characters or fewer");
      }
    });

    it("returns error when IGN is too long", async () => {
      const result = await createAltAction({
        username: "player1",
        displayName: "Player",
        inGameName: "a".repeat(51),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("50 characters or fewer");
      }
    });

    it("returns error when username already exists", async () => {
      (supabaseModule.createAlt as jest.Mock).mockRejectedValue(
        new Error("Username already taken")
      );

      const result = await createAltAction({
        username: "duplicate",
        displayName: "Duplicate",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Username already taken");
      }
    });

    it("accepts valid username with underscores", async () => {
      const mockAlt = { id: 3 };
      (supabaseModule.createAlt as jest.Mock).mockResolvedValue(mockAlt);

      const result = await createAltAction({
        username: "player_one_123",
        displayName: "Player",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("updateAltAction", () => {
    it("successfully updates alt display name", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockResolvedValue({});

      const result = await updateAltAction(1, {
        displayName: "New Name",
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.updateAlt).toHaveBeenCalledWith(
        mockSupabase,
        1,
        expect.objectContaining({
          displayName: "New Name",
        })
      );
    });

    it("successfully updates alt bio", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockResolvedValue({});

      const result = await updateAltAction(1, {
        bio: "My bio text",
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.updateAlt).toHaveBeenCalledWith(
        mockSupabase,
        1,
        expect.objectContaining({
          bio: "My bio text",
        })
      );
    });

    it("successfully updates alt IGN", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockResolvedValue({});

      const result = await updateAltAction(1, {
        inGameName: "NewIGN",
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.updateAlt).toHaveBeenCalledWith(
        mockSupabase,
        1,
        expect.objectContaining({
          inGameName: "NewIGN",
        })
      );
    });

    it("successfully clears IGN with null", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockResolvedValue({});

      const result = await updateAltAction(1, {
        inGameName: null,
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.updateAlt).toHaveBeenCalledWith(
        mockSupabase,
        1,
        expect.objectContaining({
          inGameName: null,
        })
      );
    });

    it("successfully updates multiple fields", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockResolvedValue({});

      const result = await updateAltAction(1, {
        displayName: "New Name",
        bio: "New bio",
        inGameName: "NewIGN",
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.updateAlt).toHaveBeenCalledWith(
        mockSupabase,
        1,
        expect.objectContaining({
          displayName: "New Name",
          bio: "New bio",
          inGameName: "NewIGN",
        })
      );
    });

    it("returns error when display name is too long", async () => {
      const result = await updateAltAction(1, {
        displayName: "a".repeat(65),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("64 characters or fewer");
      }
    });

    it("returns error when bio is too long", async () => {
      const result = await updateAltAction(1, {
        bio: "a".repeat(257),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("256 characters or fewer");
      }
    });

    it("returns error when IGN is too long", async () => {
      const result = await updateAltAction(1, {
        inGameName: "a".repeat(51),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("50 characters or fewer");
      }
    });

    it("returns error when alt not found", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockRejectedValue(
        new Error("Alt not found")
      );

      const result = await updateAltAction(999, { displayName: "Test" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Alt not found");
      }
    });

    it("returns error when not owner of alt", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await updateAltAction(1, { displayName: "Test" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Permission denied");
      }
    });

    it("returns error when altId is invalid", async () => {
      const result = await updateAltAction(-1, { displayName: "Test" });

      expect(result.success).toBe(false);
    });
  });

  describe("deleteAltAction", () => {
    it("successfully deletes an alt", async () => {
      (supabaseModule.deleteAlt as jest.Mock).mockResolvedValue({});

      const result = await deleteAltAction(2);

      expect(result.success).toBe(true);
      expect(supabaseModule.deleteAlt).toHaveBeenCalledWith(mockSupabase, 2);
    });

    it("returns error when trying to delete main alt", async () => {
      (supabaseModule.deleteAlt as jest.Mock).mockRejectedValue(
        new Error("Cannot delete main alt")
      );

      const result = await deleteAltAction(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Cannot delete main alt");
      }
    });

    it("returns error when alt is in active tournament", async () => {
      (supabaseModule.deleteAlt as jest.Mock).mockRejectedValue(
        new Error("Alt is registered in active tournament")
      );

      const result = await deleteAltAction(2);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("active tournament");
      }
    });

    it("returns error when alt not found", async () => {
      (supabaseModule.deleteAlt as jest.Mock).mockRejectedValue(
        new Error("Alt not found")
      );

      const result = await deleteAltAction(999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Alt not found");
      }
    });

    it("returns error when not owner", async () => {
      (supabaseModule.deleteAlt as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await deleteAltAction(2);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Permission denied");
      }
    });

    it("returns error when altId is invalid", async () => {
      const result = await deleteAltAction(0);

      expect(result.success).toBe(false);
    });
  });

  describe("setMainAltAction", () => {
    it("successfully sets main alt", async () => {
      (supabaseModule.setMainAlt as jest.Mock).mockResolvedValue({});

      const result = await setMainAltAction(2);

      expect(result.success).toBe(true);
      expect(supabaseModule.setMainAlt).toHaveBeenCalledWith(mockSupabase, 2);
    });

    it("returns error when alt not found", async () => {
      (supabaseModule.setMainAlt as jest.Mock).mockRejectedValue(
        new Error("Alt not found")
      );

      const result = await setMainAltAction(999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Alt not found");
      }
    });

    it("returns error when not owner of alt", async () => {
      (supabaseModule.setMainAlt as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await setMainAltAction(2);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Permission denied");
      }
    });

    it("returns error when altId is invalid", async () => {
      const result = await setMainAltAction(-5);

      expect(result.success).toBe(false);
    });

    it("allows setting current main alt again (idempotent)", async () => {
      (supabaseModule.setMainAlt as jest.Mock).mockResolvedValue({});

      const result = await setMainAltAction(1);

      expect(result.success).toBe(true);
      expect(supabaseModule.setMainAlt).toHaveBeenCalledWith(mockSupabase, 1);
    });
  });

  describe("updateProfileAction", () => {
    it("successfully updates profile display name", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockResolvedValue({});

      const result = await updateProfileAction(1, {
        displayName: "New Profile Name",
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.updateAlt).toHaveBeenCalledWith(
        mockSupabase,
        1,
        expect.objectContaining({
          displayName: "New Profile Name",
        })
      );
    });

    it("successfully updates profile bio", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockResolvedValue({});

      const result = await updateProfileAction(1, {
        bio: "My profile bio",
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.updateAlt).toHaveBeenCalledWith(
        mockSupabase,
        1,
        expect.objectContaining({
          bio: "My profile bio",
        })
      );
    });

    it("successfully updates both display name and bio", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockResolvedValue({});

      const result = await updateProfileAction(1, {
        displayName: "New Name",
        bio: "New bio",
      });

      expect(result.success).toBe(true);
      expect(supabaseModule.updateAlt).toHaveBeenCalledWith(
        mockSupabase,
        1,
        expect.objectContaining({
          displayName: "New Name",
          bio: "New bio",
        })
      );
    });

    it("returns error when display name is empty", async () => {
      const result = await updateProfileAction(1, {
        displayName: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Display name is required");
      }
    });

    it("returns error when display name is too long", async () => {
      const result = await updateProfileAction(1, {
        displayName: "a".repeat(65),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("64 characters or fewer");
      }
    });

    it("returns error when bio is too long", async () => {
      const result = await updateProfileAction(1, {
        bio: "a".repeat(257),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("256 characters or fewer");
      }
    });

    it("returns error when alt not found", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockRejectedValue(
        new Error("Alt not found")
      );

      const result = await updateProfileAction(999, { bio: "Test" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Alt not found");
      }
    });

    it("returns error when not main alt", async () => {
      (supabaseModule.updateAlt as jest.Mock).mockRejectedValue(
        new Error("Can only update main alt profile")
      );

      const result = await updateProfileAction(2, { bio: "Test" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("main alt");
      }
    });

    it("returns error when altId is invalid", async () => {
      const result = await updateProfileAction(0, { bio: "Test" });

      expect(result.success).toBe(false);
    });
  });
});
