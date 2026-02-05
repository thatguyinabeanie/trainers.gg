import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getActiveSudoSession,
  isSudoModeActive,
  getSudoSessions,
  startSudoSession,
  endSudoSession,
} from "../sudo-mode";
import type { TypedClient } from "../../client";

// Mock Supabase client
const createMockClient = () => {
  return {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        eq: jest.fn(() => ({
          is: jest.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        is: jest.fn(() => ({
          data: [],
          error: null,
        })),
        single: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
    })),
    auth: {
      getUser: jest.fn(() => ({
        data: { user: null },
        error: null,
      })),
    },
  } as unknown as TypedClient;
};

describe("sudo-mode queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getActiveSudoSession", () => {
    it("should return active session when it exists", async () => {
      const mockSession = {
        id: 1,
        user_id: "user-123",
        started_at: new Date().toISOString(),
        ended_at: null,
      };

      const mockClient = createMockClient();
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: [mockSession],
        error: null,
      });

      const result = await getActiveSudoSession(mockClient);

      expect(result).toEqual(mockSession);
      expect(mockClient.rpc).toHaveBeenCalledWith("get_active_sudo_session", {
        timeout_minutes: 30,
      });
    });

    it("should return null when no active session exists", async () => {
      const mockClient = createMockClient();
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getActiveSudoSession(mockClient);

      expect(result).toBeNull();
    });

    it("should return null on error", async () => {
      const mockClient = createMockClient();
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error("DB error"),
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await getActiveSudoSession(mockClient);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should use custom timeout value", async () => {
      const mockClient = createMockClient();
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      await getActiveSudoSession(mockClient, 60);

      expect(mockClient.rpc).toHaveBeenCalledWith("get_active_sudo_session", {
        timeout_minutes: 60,
      });
    });
  });

  describe("isSudoModeActive", () => {
    it("should return true when sudo is active", async () => {
      const mockClient = createMockClient();
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await isSudoModeActive(mockClient);

      expect(result).toBe(true);
      expect(mockClient.rpc).toHaveBeenCalledWith("is_sudo_active");
    });

    it("should return false when sudo is not active", async () => {
      const mockClient = createMockClient();
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await isSudoModeActive(mockClient);

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      const mockClient = createMockClient();
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error("DB error"),
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await isSudoModeActive(mockClient);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getSudoSessions", () => {
    it("should return all sessions for a user", async () => {
      const mockSessions = [
        {
          id: 1,
          user_id: "user-123",
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        },
        {
          id: 2,
          user_id: "user-123",
          started_at: new Date().toISOString(),
          ended_at: null,
        },
      ];

      const mockClient = createMockClient();

      // Create a chain that includes eq, order, and range
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      };

      const mockFrom = {
        select: jest.fn().mockReturnValue(mockChain),
      };

      (mockClient.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await getSudoSessions(mockClient, "user-123");

      expect(result).toEqual(mockSessions);
      expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("should filter out ended sessions when includeEnded is false", async () => {
      const mockClient = createMockClient();

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockFrom = {
        select: jest.fn().mockReturnValue(mockChain),
      };

      (mockClient.from as jest.Mock).mockReturnValue(mockFrom);

      await getSudoSessions(mockClient, "user-123", {
        includeEnded: false,
      });

      expect(mockChain.is).toHaveBeenCalledWith("ended_at", null);
    });

    it("should handle pagination", async () => {
      const mockClient = createMockClient();

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const mockFrom = {
        select: jest.fn().mockReturnValue(mockChain),
      };

      (mockClient.from as jest.Mock).mockReturnValue(mockFrom);

      await getSudoSessions(mockClient, "user-123", {
        limit: 20,
        offset: 40,
      });

      expect(mockChain.range).toHaveBeenCalledWith(40, 59);
    });
  });

  describe("startSudoSession", () => {
    it("should create a new sudo session", async () => {
      const mockUser = { id: "user-123", email: "admin@test.com" };
      const mockSession = {
        id: 1,
        user_id: "user-123",
        started_at: new Date().toISOString(),
        ended_at: null,
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
      };

      const mockClient = createMockClient();

      // Mock is_site_admin RPC
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      // Mock getUser
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock insert chain
      const mockInsertChain = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockSession,
            error: null,
          }),
        }),
      };

      const mockFromChain = {
        insert: jest.fn().mockReturnValue(mockInsertChain),
      };

      (mockClient.from as jest.Mock).mockReturnValue(mockFromChain);

      const result = await startSudoSession(
        mockClient,
        "192.168.1.1",
        "Mozilla/5.0"
      );

      expect(result).toEqual(mockSession);
      expect(mockClient.rpc).toHaveBeenCalledWith("is_site_admin");
    });

    it("should throw error if user is not site admin", async () => {
      const mockClient = createMockClient();

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: false,
        error: null,
      });

      await expect(startSudoSession(mockClient)).rejects.toThrow(
        "User is not a site admin"
      );
    });

    it("should return existing session if already active", async () => {
      const mockSession = {
        id: 1,
        user_id: "user-123",
        started_at: new Date().toISOString(),
        ended_at: null,
      };

      const mockClient = createMockClient();

      // Mock is_site_admin
      (mockClient.rpc as jest.Mock)
        .mockResolvedValueOnce({
          data: true,
          error: null,
        })
        // Mock get_active_sudo_session
        .mockResolvedValueOnce({
          data: [mockSession],
          error: null,
        });

      const result = await startSudoSession(mockClient);

      expect(result).toEqual(mockSession);
    });
  });

  describe("endSudoSession", () => {
    it("should end an active sudo session", async () => {
      const now = new Date().toISOString();
      const mockSession = {
        id: 1,
        user_id: "user-123",
        started_at: new Date(Date.now() - 10000).toISOString(),
        ended_at: now,
      };

      const mockUser = { id: "user-123", email: "admin@test.com" };

      const mockClient = createMockClient();

      // Mock get_active_sudo_session
      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: [{ ...mockSession, ended_at: null }],
        error: null,
      });

      // Mock getUser
      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock update chain
      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      const mockFromChain = {
        update: jest.fn().mockReturnValue(mockUpdateChain),
        insert: jest.fn(),
      };

      (mockClient.from as jest.Mock).mockReturnValue(mockFromChain);

      const result = await endSudoSession(mockClient);

      expect(result).toBeDefined();
      expect(mockUpdateChain.eq).toHaveBeenCalledWith("id", 1);
    });

    it("should return null if no active session exists", async () => {
      const mockClient = createMockClient();

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await endSudoSession(mockClient);

      expect(result).toBeNull();
    });
  });
});
