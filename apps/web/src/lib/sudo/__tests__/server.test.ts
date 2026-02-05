/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock dependencies
const mockCreateClient = jest.fn();
const mockStartSudoSession = jest.fn();
const mockEndSudoSession = jest.fn();
const mockCheckSudoModeActive = jest.fn();
const mockCookies = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => mockCookies),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

jest.mock("@trainers/supabase", () => ({
  startSudoSession: mockStartSudoSession,
  endSudoSession: mockEndSudoSession,
  isSudoModeActive: mockCheckSudoModeActive,
}));

import {
  isSiteAdmin,
  isSudoModeActive,
  activateSudoMode,
  deactivateSudoMode,
  requireSudoMode,
  getRequestMetadata,
} from "../server";

describe("sudo/server", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isSiteAdmin", () => {
    it("should return true for user with site_admin role", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: createMockJWT({ site_roles: ["site_admin"] }),
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const result = await isSiteAdmin();
      expect(result).toBe(true);
    });

    it("should return false for user without site_admin role", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: createMockJWT({ site_roles: [] }),
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const result = await isSiteAdmin();
      expect(result).toBe(false);
    });

    it("should return false when no session exists", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const result = await isSiteAdmin();
      expect(result).toBe(false);
    });

    it("should return false when session fetch errors", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
            error: new Error("Auth error"),
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const result = await isSiteAdmin();
      expect(result).toBe(false);
    });
  });

  describe("isSudoModeActive", () => {
    it("should return true when all conditions are met", async () => {
      // Mock site admin check
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: createMockJWT({ site_roles: ["site_admin"] }),
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      // Mock cookie exists
      mockCookies.get.mockReturnValue({ value: "active" });

      // Mock active session in DB
      mockCheckSudoModeActive.mockResolvedValue(true);

      const result = await isSudoModeActive();
      expect(result).toBe(true);
    });

    it("should return false when user is not site admin", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: createMockJWT({ site_roles: [] }),
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      const result = await isSudoModeActive();
      expect(result).toBe(false);
    });

    it("should return false when sudo cookie is missing", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: createMockJWT({ site_roles: ["site_admin"] }),
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      mockCookies.get.mockReturnValue(undefined);

      const result = await isSudoModeActive();
      expect(result).toBe(false);
    });

    it("should return false when database session is inactive", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: createMockJWT({ site_roles: ["site_admin"] }),
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      mockCookies.get.mockReturnValue({ value: "active" });
      mockCheckSudoModeActive.mockResolvedValue(false);

      const result = await isSudoModeActive();
      expect(result).toBe(false);
    });
  });

  describe("activateSudoMode", () => {
    it("should activate sudo mode for site admin", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: createMockJWT({ site_roles: ["site_admin"] }),
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      mockStartSudoSession.mockResolvedValue({
        id: 1,
        user_id: "user-123",
        started_at: new Date().toISOString(),
      });

      await activateSudoMode("192.168.1.1", "Mozilla/5.0");

      expect(mockStartSudoSession).toHaveBeenCalledWith(
        mockSupabase,
        "192.168.1.1",
        "Mozilla/5.0"
      );
      expect(mockCookies.set).toHaveBeenCalledWith(
        "sudo_mode",
        "active",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          maxAge: 1800,
          path: "/",
        })
      );
    });

    it("should throw error for non-admin user", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: createMockJWT({ site_roles: [] }),
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      await expect(activateSudoMode()).rejects.toThrow(
        "Only site admins can activate sudo mode"
      );
    });
  });

  describe("deactivateSudoMode", () => {
    it("should deactivate sudo mode", async () => {
      const mockSupabase = {};
      mockCreateClient.mockResolvedValue(mockSupabase);

      mockEndSudoSession.mockResolvedValue({
        id: 1,
        user_id: "user-123",
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
      });

      await deactivateSudoMode();

      expect(mockEndSudoSession).toHaveBeenCalledWith(mockSupabase);
      expect(mockCookies.delete).toHaveBeenCalledWith("sudo_mode");
    });

    it("should handle errors gracefully", async () => {
      const mockSupabase = {};
      mockCreateClient.mockResolvedValue(mockSupabase);

      mockEndSudoSession.mockRejectedValue(new Error("DB error"));

      await expect(deactivateSudoMode()).rejects.toThrow(
        "Failed to deactivate sudo mode"
      );
    });
  });

  describe("requireSudoMode", () => {
    it("should not throw when sudo is active", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: createMockJWT({ site_roles: ["site_admin"] }),
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      mockCookies.get.mockReturnValue({ value: "active" });
      mockCheckSudoModeActive.mockResolvedValue(true);

      await expect(requireSudoMode()).resolves.not.toThrow();
    });

    it("should throw when sudo is not active", async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: createMockJWT({ site_roles: [] }),
              },
            },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabase);

      await expect(requireSudoMode()).rejects.toThrow(
        "Sudo mode is required for this action"
      );
    });
  });

  describe("getRequestMetadata", () => {
    it("should extract IP address and user agent from request", () => {
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            if (header === "x-forwarded-for") return "192.168.1.1, 10.0.0.1";
            if (header === "user-agent") return "Mozilla/5.0";
            return null;
          }),
        },
      } as unknown as Request;

      const result = getRequestMetadata(mockRequest);
      expect(result).toEqual({
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      });
    });

    it("should handle missing headers", () => {
      const mockRequest = {
        headers: {
          get: jest.fn(() => null),
        },
      } as unknown as Request;

      const result = getRequestMetadata(mockRequest);
      expect(result).toEqual({
        ipAddress: undefined,
        userAgent: undefined,
      });
    });

    it("should handle missing request", () => {
      const result = getRequestMetadata();
      expect(result).toEqual({});
    });
  });
});

// Helper to create a mock JWT token
function createMockJWT(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const signature = "mock-signature";
  return `${header}.${body}.${signature}`;
}
