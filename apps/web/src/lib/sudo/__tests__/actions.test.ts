/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock the server utilities
const mockIsSiteAdmin = jest.fn();
const mockIsSudoModeActive = jest.fn();
const mockActivateSudoMode = jest.fn();
const mockDeactivateSudoMode = jest.fn();
const mockHeaders = jest.fn();

jest.mock("../server", () => ({
  isSiteAdmin: mockIsSiteAdmin,
  isSudoModeActive: mockIsSudoModeActive,
  activateSudoMode: mockActivateSudoMode,
  deactivateSudoMode: mockDeactivateSudoMode,
}));

jest.mock("next/headers", () => ({
  headers: mockHeaders,
}));

import { toggleSudoMode, checkSudoStatus } from "../actions";

describe("sudo/actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default headers mock
    mockHeaders.mockResolvedValue({
      get: jest.fn((header: string) => {
        if (header === "x-forwarded-for") return "192.168.1.1";
        if (header === "user-agent") return "Mozilla/5.0";
        return null;
      }),
    });
  });

  describe("toggleSudoMode", () => {
    it("should activate sudo mode when currently inactive", async () => {
      mockIsSiteAdmin.mockResolvedValue(true);
      mockIsSudoModeActive.mockResolvedValue(false);
      mockActivateSudoMode.mockResolvedValue(undefined);

      const result = await toggleSudoMode();

      expect(result).toEqual({
        success: true,
        isActive: true,
      });
      expect(mockActivateSudoMode).toHaveBeenCalledWith(
        "192.168.1.1",
        "Mozilla/5.0"
      );
      expect(mockDeactivateSudoMode).not.toHaveBeenCalled();
    });

    it("should deactivate sudo mode when currently active", async () => {
      mockIsSiteAdmin.mockResolvedValue(true);
      mockIsSudoModeActive.mockResolvedValue(true);
      mockDeactivateSudoMode.mockResolvedValue(undefined);

      const result = await toggleSudoMode();

      expect(result).toEqual({
        success: true,
        isActive: false,
      });
      expect(mockDeactivateSudoMode).toHaveBeenCalled();
      expect(mockActivateSudoMode).not.toHaveBeenCalled();
    });

    it("should return error for non-admin user", async () => {
      mockIsSiteAdmin.mockResolvedValue(false);

      const result = await toggleSudoMode();

      expect(result).toEqual({
        success: false,
        error: "Only site admins can use sudo mode",
      });
      expect(mockActivateSudoMode).not.toHaveBeenCalled();
      expect(mockDeactivateSudoMode).not.toHaveBeenCalled();
    });

    it("should handle activation errors", async () => {
      mockIsSiteAdmin.mockResolvedValue(true);
      mockIsSudoModeActive.mockResolvedValue(false);
      mockActivateSudoMode.mockRejectedValue(new Error("DB error"));

      const result = await toggleSudoMode();

      expect(result).toEqual({
        success: false,
        error: "DB error",
      });
    });

    it("should handle deactivation errors", async () => {
      mockIsSiteAdmin.mockResolvedValue(true);
      mockIsSudoModeActive.mockResolvedValue(true);
      mockDeactivateSudoMode.mockRejectedValue(
        new Error("Failed to end session")
      );

      const result = await toggleSudoMode();

      expect(result).toEqual({
        success: false,
        error: "Failed to end session",
      });
    });

    it("should handle unexpected errors gracefully", async () => {
      mockIsSiteAdmin.mockResolvedValue(true);
      mockIsSudoModeActive.mockRejectedValue(new Error("Unexpected error"));

      const result = await toggleSudoMode();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("checkSudoStatus", () => {
    it("should return active status for site admin with sudo mode", async () => {
      mockIsSiteAdmin.mockResolvedValue(true);
      mockIsSudoModeActive.mockResolvedValue(true);

      const result = await checkSudoStatus();

      expect(result).toEqual({
        isActive: true,
        isSiteAdmin: true,
      });
    });

    it("should return inactive status for site admin without sudo mode", async () => {
      mockIsSiteAdmin.mockResolvedValue(true);
      mockIsSudoModeActive.mockResolvedValue(false);

      const result = await checkSudoStatus();

      expect(result).toEqual({
        isActive: false,
        isSiteAdmin: true,
      });
    });

    it("should return false for non-admin user", async () => {
      mockIsSiteAdmin.mockResolvedValue(false);

      const result = await checkSudoStatus();

      expect(result).toEqual({
        isActive: false,
        isSiteAdmin: false,
      });
      expect(mockIsSudoModeActive).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      mockIsSiteAdmin.mockRejectedValue(new Error("Auth error"));

      const result = await checkSudoStatus();

      expect(result).toEqual({
        isActive: false,
        isSiteAdmin: false,
      });
    });
  });
});
