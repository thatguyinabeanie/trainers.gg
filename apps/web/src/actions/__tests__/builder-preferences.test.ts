/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Supabase server utilities
const mockGetUser = jest.fn();
const mockSupabase = {};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabase),
  getUser: (...args: unknown[]) => mockGetUser(...args),
}));

// Mock @trainers/supabase queries/mutations
const mockGetUserPreferences = jest.fn();
const mockUpsertUserPreferences = jest.fn();
jest.mock("@trainers/supabase", () => ({
  getUserPreferences: (...args: unknown[]) => mockGetUserPreferences(...args),
  upsertUserPreferences: (...args: unknown[]) =>
    mockUpsertUserPreferences(...args),
}));

// Mock botid (required by withAction → utils.ts → botid)
jest.mock("botid/server", () => ({
  checkBotId: jest.fn().mockResolvedValue({ isBot: false }),
}));

// Mock getErrorMessage
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

import {
  getBuilderPreferencesAction,
  updateBuilderPreferencesAction,
} from "../builder-preferences";

const mockUser = { id: "user-123", email: "user@example.com" };

// ============================================================================
// getBuilderPreferencesAction
// ============================================================================

describe("getBuilderPreferencesAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns schema-coerced preferences when a row exists", async () => {
    mockGetUser.mockResolvedValue(mockUser);
    mockGetUserPreferences.mockResolvedValue({
      speedTiers: { defaultView: "sidepane", openOnLoad: true },
    });

    const result = await getBuilderPreferencesAction();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preferences).toEqual({
        speedTiers: { defaultView: "sidepane", openOnLoad: true },
      });
    }
    expect(mockGetUserPreferences).toHaveBeenCalledWith(mockSupabase, mockUser.id);
  });

  it("fills defaults for partial stored preferences", async () => {
    mockGetUser.mockResolvedValue(mockUser);
    // Stored row missing keys — schema should backfill defaults.
    mockGetUserPreferences.mockResolvedValue({});

    const result = await getBuilderPreferencesAction();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preferences).toEqual({
        speedTiers: { defaultView: "dialog", openOnLoad: false },
      });
    }
  });

  it("returns null preferences when no row exists", async () => {
    mockGetUser.mockResolvedValue(mockUser);
    mockGetUserPreferences.mockResolvedValue(null);

    const result = await getBuilderPreferencesAction();

    expect(result).toEqual({ success: true, data: { preferences: null } });
  });

  it("returns null preferences (not an error) for a signed-out user", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await getBuilderPreferencesAction();

    expect(result).toEqual({ success: true, data: { preferences: null } });
    expect(mockGetUserPreferences).not.toHaveBeenCalled();
  });
});

// ============================================================================
// updateBuilderPreferencesAction
// ============================================================================

describe("updateBuilderPreferencesAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validPreferences = {
    speedTiers: { defaultView: "sidepane" as const, openOnLoad: true },
  };

  it("saves preferences for an authenticated user", async () => {
    mockGetUser.mockResolvedValue(mockUser);
    mockUpsertUserPreferences.mockResolvedValue(undefined);

    const result = await updateBuilderPreferencesAction(validPreferences);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockUpsertUserPreferences).toHaveBeenCalledWith(
      mockSupabase,
      mockUser.id,
      validPreferences
    );
  });

  it("returns an error when the user is not authenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await updateBuilderPreferencesAction(validPreferences);

    expect(result.success).toBe(false);
    expect(mockUpsertUserPreferences).not.toHaveBeenCalled();
  });

  it("returns an error when the upsert throws", async () => {
    mockGetUser.mockResolvedValue(mockUser);
    mockUpsertUserPreferences.mockRejectedValue(new Error("DB error"));

    const result = await updateBuilderPreferencesAction(validPreferences);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
