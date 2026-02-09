import {
  updateAlt,
  updateUsername,
  ensureAlt,
  createAlt,
  deleteAlt,
  setMainAlt,
} from "../users";
import type { TypedClient } from "../../client";

type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  ilike: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  update: jest.Mock;
  insert: jest.Mock;
  delete: jest.Mock;
  in: jest.Mock;
};

type MockAuthResponse = {
  data: { user: { id: string; email?: string } | null };
};

const createMockClient = () => {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn(),
    },
  };
  return mockClient as unknown as TypedClient;
};

describe("User Mutations", () => {
  let mockClient: TypedClient;
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    mockClient = createMockClient();
    jest.clearAllMocks();
  });

  describe("updateAlt", () => {
    const altId = 10;
    const mockAlt = { id: altId, user_id: mockUser.id };

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should successfully update alt avatar", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get alt to verify ownership
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update alt
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await updateAlt(mockClient, altId, {
        avatarUrl: "https://example.com/avatar.png",
      });

      expect(result).toEqual({ success: true });
    });

    it("should update avatar and in-game name", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const updateMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await updateAlt(mockClient, altId, {
        avatarUrl: "https://example.com/avatar.png",
        inGameName: "PlayerOne",
      });

      expect(updateMock).toHaveBeenCalledWith({
        avatar_url: "https://example.com/avatar.png",
        in_game_name: "PlayerOne",
      });
    });

    it("should handle null in-game name", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const updateMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await updateAlt(mockClient, altId, {
        inGameName: null,
      });

      expect(updateMock).toHaveBeenCalledWith({
        in_game_name: null,
      });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        updateAlt(mockClient, altId, { inGameName: "Test" })
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if alt not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        updateAlt(mockClient, altId, { inGameName: "Test" })
      ).rejects.toThrow("Alt not found");
    });

    it("should throw error if user does not own alt", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: altId, user_id: "different-user" },
          error: null,
        }),
      });

      await expect(
        updateAlt(mockClient, altId, { inGameName: "Test" })
      ).rejects.toThrow("You can only update your own alt");
    });

    it("should propagate database errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const dbError = new Error("Database error");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: dbError }),
      } as unknown as MockQueryBuilder);

      await expect(
        updateAlt(mockClient, altId, { inGameName: "Test" })
      ).rejects.toThrow("Database error");
    });
  });

  describe("updateUsername", () => {
    const altId = 10;
    const mockAlt = { id: altId, user_id: mockUser.id };
    const newUsername = "NewUsername";

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should successfully update username when available", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get alt to verify ownership
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check username uniqueness (case-insensitive, not found)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Update username
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await updateUsername(mockClient, altId, newUsername);

      expect(result).toEqual({ success: true });
    });

    it("should preserve username casing when storing", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const ilikeMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        ilike: ilikeMock,
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      const updateMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      await updateUsername(mockClient, altId, "MixedCase");

      // Check that ilike was used for case-insensitive uniqueness check
      expect(ilikeMock).toHaveBeenCalledWith("username", "MixedCase");
      // Check that update preserves original casing
      expect(updateMock).toHaveBeenCalledWith({ username: "MixedCase" });
    });

    it("should throw error if username already taken", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Username exists (case-insensitive check)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 999 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(
        updateUsername(mockClient, altId, newUsername)
      ).rejects.toThrow("Username is already taken");
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        updateUsername(mockClient, altId, newUsername)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error if alt not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        updateUsername(mockClient, altId, newUsername)
      ).rejects.toThrow("Alt not found");
    });

    it("should throw error if user does not own alt", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: altId, user_id: "different-user" },
          error: null,
        }),
      });

      await expect(
        updateUsername(mockClient, altId, newUsername)
      ).rejects.toThrow("You can only update your own alt");
    });

    it("should propagate update errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      const updateError = new Error("Update failed");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: updateError }),
      } as unknown as MockQueryBuilder);

      await expect(
        updateUsername(mockClient, altId, newUsername)
      ).rejects.toThrow("Update failed");
    });
  });

  describe("ensureAlt", () => {
    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should return existing alt if found", async () => {
      const existingAlt = {
        id: 10,
        user_id: mockUser.id,
        username: "testuser",
        display_name: "Test User",
      };

      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: existingAlt,
          error: null,
        }),
      });

      const result = await ensureAlt(mockClient);

      expect(result).toEqual(existingAlt);
    });

    it("should create new alt with email-based username if none exists", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: No existing alt
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get user data
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { email: "test@example.com", name: "Test User" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check username uniqueness (available)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert new alt
      const newAlt = {
        id: 11,
        user_id: mockUser.id,
        username: "test",
        display_name: "Test User",
      };
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: newAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await ensureAlt(mockClient);

      expect(result).toEqual(newAlt);
    });

    it("should append random suffix if username is taken", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: No existing alt
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get user data
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { email: "test@example.com" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: First username check (taken)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 999 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Second username check (available)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert new alt
      const newAlt = { id: 11, username: "test_abc123" };
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: newAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await ensureAlt(mockClient);

      expect(result.username).toContain("test_");
    });

    it("should use user ID fallback if email is missing", async () => {
      // Create mock client with user that has no email
      const noEmailUser = { id: "user-123", email: undefined };
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: noEmailUser },
      } as MockAuthResponse);

      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: No existing alt
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Get user data (no email)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { email: null },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check username uniqueness (available)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert new alt
      const insertMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 11 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await ensureAlt(mockClient);

      // Username should start with "user_" followed by first 8 chars of user ID
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.stringContaining("user_"),
        })
      );
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(ensureAlt(mockClient)).rejects.toThrow("Not authenticated");
    });

    it("should propagate insert errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { email: "test@example.com" },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      const dbError = new Error("Insert failed");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError }),
      } as unknown as MockQueryBuilder);

      await expect(ensureAlt(mockClient)).rejects.toThrow("Insert failed");
    });
  });

  describe("createAlt", () => {
    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should create a new alt successfully", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Username uniqueness check (available, case-insensitive)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      // Mock: Insert alt (display_name auto-synced with username, casing preserved)
      const newAlt = {
        id: 20,
        username: "NewPlayer",
        display_name: "NewPlayer",
      };
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: newAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const result = await createAlt(mockClient, {
        username: "NewPlayer",
      });

      expect(result).toEqual(newAlt);
    });

    it("should include optional fields when provided", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      const insertMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 20 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await createAlt(mockClient, {
        username: "player",
        avatarUrl: "https://example.com/avatar.png",
        inGameName: "PlayerOne",
      });

      expect(insertMock).toHaveBeenCalledWith({
        user_id: mockUser.id,
        username: "player",
        display_name: "player",
        avatar_url: "https://example.com/avatar.png",
        in_game_name: "PlayerOne",
      });
    });

    it("should preserve username casing while checking case-insensitively", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      const ilikeMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        ilike: ilikeMock,
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      const insertMock = jest.fn().mockReturnThis();
      fromSpy.mockReturnValueOnce({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 20 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await createAlt(mockClient, {
        username: "MixedCase",
      });

      expect(ilikeMock).toHaveBeenCalledWith("username", "MixedCase");
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "MixedCase",
          display_name: "MixedCase",
        })
      );
    });

    it("should throw error if username is already taken", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 999 },
          error: null,
        }),
      });

      await expect(
        createAlt(mockClient, {
          username: "taken",
        })
      ).rejects.toThrow("Username is already taken");
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(
        createAlt(mockClient, {
          username: "test",
        })
      ).rejects.toThrow("Not authenticated");
    });

    it("should propagate insert errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as MockQueryBuilder);

      const dbError = new Error("Insert failed");
      fromSpy.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: dbError }),
      } as unknown as MockQueryBuilder);

      await expect(
        createAlt(mockClient, {
          username: "test",
        })
      ).rejects.toThrow("Insert failed");
    });
  });

  describe("deleteAlt", () => {
    const altId = 10;
    const mockAlt = { id: altId, user_id: mockUser.id };

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should successfully delete a non-main alt not in active tournaments", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get alt to verify ownership
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Get user data (alt is not main_alt)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { main_alt_id: 99 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Check active tournament registrations (none)
      const inMock = jest.fn().mockResolvedValue({ count: 0, error: null });
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: inMock,
      } as unknown as MockQueryBuilder);

      // Mock: Delete alt
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await deleteAlt(mockClient, altId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(deleteAlt(mockClient, altId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if alt not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(deleteAlt(mockClient, altId)).rejects.toThrow(
        "Alt not found"
      );
    });

    it("should throw error if user does not own alt", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: altId, user_id: "different-user" },
          error: null,
        }),
      });

      await expect(deleteAlt(mockClient, altId)).rejects.toThrow(
        "You can only delete your own alt"
      );
    });

    it("should throw error if trying to delete main alt", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Alt is the main alt
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { main_alt_id: altId },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      await expect(deleteAlt(mockClient, altId)).rejects.toThrow(
        "Cannot delete your main alt. Set a different main alt first."
      );
    });

    it("should throw error if alt is registered in active tournaments", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { main_alt_id: 99 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Alt has active tournament registrations
      const inMock = jest.fn().mockResolvedValue({ count: 2, error: null });
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: inMock,
      } as unknown as MockQueryBuilder);

      await expect(deleteAlt(mockClient, altId)).rejects.toThrow(
        "Cannot delete an alt that is registered in active tournaments"
      );

      expect(inMock).toHaveBeenCalledWith("status", [
        "registered",
        "checked_in",
      ]);
    });

    it("should propagate count errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { main_alt_id: 99 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const countError = new Error("Count query failed");
      const inMock = jest
        .fn()
        .mockResolvedValue({ count: null, error: countError });
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: inMock,
      } as unknown as MockQueryBuilder);

      await expect(deleteAlt(mockClient, altId)).rejects.toThrow(
        "Count query failed"
      );
    });

    it("should propagate delete errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { main_alt_id: 99 },
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const inMock = jest.fn().mockResolvedValue({ count: 0, error: null });
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: inMock,
      } as unknown as MockQueryBuilder);

      const deleteError = new Error("Delete failed");
      fromSpy.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: deleteError }),
      } as unknown as MockQueryBuilder);

      await expect(deleteAlt(mockClient, altId)).rejects.toThrow(
        "Delete failed"
      );
    });
  });

  describe("setMainAlt", () => {
    const altId = 10;
    const mockAlt = { id: altId, user_id: mockUser.id };

    beforeEach(() => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      } as MockAuthResponse);
    });

    it("should successfully set main alt", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // Mock: Get alt to verify ownership
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      // Mock: Update user's main_alt_id
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as unknown as MockQueryBuilder);

      const result = await setMainAlt(mockClient, altId);

      expect(result).toEqual({ success: true });
    });

    it("should throw error if not authenticated", async () => {
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      } as MockAuthResponse);

      await expect(setMainAlt(mockClient, altId)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error if alt not found", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(setMainAlt(mockClient, altId)).rejects.toThrow(
        "Alt not found"
      );
    });

    it("should throw error if user does not own alt", async () => {
      (mockClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: altId, user_id: "different-user" },
          error: null,
        }),
      });

      await expect(setMainAlt(mockClient, altId)).rejects.toThrow(
        "You can only set your own alt as main"
      );
    });

    it("should propagate update errors", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAlt,
          error: null,
        }),
      } as unknown as MockQueryBuilder);

      const updateError = new Error("Update failed");
      fromSpy.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: updateError }),
      } as unknown as MockQueryBuilder);

      await expect(setMainAlt(mockClient, altId)).rejects.toThrow(
        "Update failed"
      );
    });
  });
});
