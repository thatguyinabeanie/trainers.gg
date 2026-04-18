/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock dependencies
const mockCreateClient = jest.fn();
const mockStartSudoSession = jest.fn();
const mockEndSudoSession = jest.fn();
const mockCheckSudoModeActive = jest.fn();
const mockGetUser = jest.fn();
const mockServiceRoleQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn(),
};
const mockServiceRoleFromFn = jest.fn(() => mockServiceRoleQueryBuilder);
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
  getUser: (...args: unknown[]) => mockGetUser(...args),
  createServiceRoleClient: () => ({ from: mockServiceRoleFromFn }),
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
    mockServiceRoleQueryBuilder.select.mockReturnThis();
    mockServiceRoleQueryBuilder.eq.mockReturnThis();
    mockServiceRoleQueryBuilder.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });
    mockServiceRoleFromFn.mockReturnValue(mockServiceRoleQueryBuilder);
  });

  describe("isSiteAdmin", () => {
    it("should return true for user with site_admin role", async () => {
      mockGetUser.mockResolvedValue({ id: "user-123" });
      mockServiceRoleQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { role_id: 1 },
        error: null,
      });

      const result = await isSiteAdmin();
      expect(result).toBe(true);
    });

    it("should return false for user without site_admin role", async () => {
      mockGetUser.mockResolvedValue({ id: "user-123" });
      // Default: maybeSingle returns null → no role

      const result = await isSiteAdmin();
      expect(result).toBe(false);
    });

    it("should return false when no session exists", async () => {
      mockGetUser.mockResolvedValue(null);

      const result = await isSiteAdmin();
      expect(result).toBe(false);
    });

    it("should return false when session fetch errors", async () => {
      mockGetUser.mockResolvedValue(null);

      const result = await isSiteAdmin();
      expect(result).toBe(false);
    });
  });

  describe("isSudoModeActive", () => {
    it("should return true when all conditions are met", async () => {
      mockGetUser.mockResolvedValue({ id: "user-123" });
      mockServiceRoleQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { role_id: 1 },
        error: null,
      });
      mockCookies.get.mockReturnValue({ value: "active" });
      mockCreateClient.mockResolvedValue({});
      mockCheckSudoModeActive.mockResolvedValue(true);

      const result = await isSudoModeActive();
      expect(result).toBe(true);
    });

    it("should return false when user is not site admin", async () => {
      mockGetUser.mockResolvedValue({ id: "user-123" });
      // Default: no role → isSiteAdmin returns false

      const result = await isSudoModeActive();
      expect(result).toBe(false);
    });

    it("should return false when sudo cookie is missing", async () => {
      mockGetUser.mockResolvedValue({ id: "user-123" });
      mockServiceRoleQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { role_id: 1 },
        error: null,
      });
      mockCookies.get.mockReturnValue(undefined);

      const result = await isSudoModeActive();
      expect(result).toBe(false);
    });

    it("should return false when database session is inactive", async () => {
      mockGetUser.mockResolvedValue({ id: "user-123" });
      mockServiceRoleQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { role_id: 1 },
        error: null,
      });
      mockCookies.get.mockReturnValue({ value: "active" });
      mockCreateClient.mockResolvedValue({});
      mockCheckSudoModeActive.mockResolvedValue(false);

      const result = await isSudoModeActive();
      expect(result).toBe(false);
    });
  });

  describe("activateSudoMode", () => {
    it("should activate sudo mode for site admin", async () => {
      mockGetUser.mockResolvedValue({ id: "user-123" });
      mockServiceRoleQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { role_id: 1 },
        error: null,
      });

      const mockSupabase = {};
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
      mockGetUser.mockResolvedValue({ id: "user-123" });
      // Default: no role → not admin

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
      mockGetUser.mockResolvedValue({ id: "user-123" });
      mockServiceRoleQueryBuilder.maybeSingle.mockResolvedValueOnce({
        data: { role_id: 1 },
        error: null,
      });
      mockCookies.get.mockReturnValue({ value: "active" });
      mockCreateClient.mockResolvedValue({});
      mockCheckSudoModeActive.mockResolvedValue(true);

      await expect(requireSudoMode()).resolves.not.toThrow();
    });

    it("should throw when sudo is not active", async () => {
      mockGetUser.mockResolvedValue({ id: "user-123" });
      // Default: no role → not admin → sudo not active

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
