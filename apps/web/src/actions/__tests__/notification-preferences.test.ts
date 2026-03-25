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
const mockGetNotificationPreferences = jest.fn();
const mockUpsertNotificationPreferences = jest.fn();
jest.mock("@trainers/supabase", () => ({
  getNotificationPreferences: (...args: unknown[]) =>
    mockGetNotificationPreferences(...args),
  upsertNotificationPreferences: (...args: unknown[]) =>
    mockUpsertNotificationPreferences(...args),
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
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
} from "../notification-preferences";

const mockUser = { id: "user-123", email: "user@example.com" };

// ============================================================================
// getNotificationPreferencesAction
// ============================================================================

describe("getNotificationPreferencesAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns preferences for authenticated user", async () => {
    mockGetUser.mockResolvedValue(mockUser);
    const prefs = { email_match_ready: true, email_tournament_start: false };
    mockGetNotificationPreferences.mockResolvedValue(prefs);

    const result = await getNotificationPreferencesAction();

    expect(result).toEqual({ success: true, data: { preferences: prefs } });
    expect(mockGetNotificationPreferences).toHaveBeenCalledWith(
      mockSupabase,
      mockUser.id
    );
  });

  it("returns null preferences when none exist", async () => {
    mockGetUser.mockResolvedValue(mockUser);
    mockGetNotificationPreferences.mockResolvedValue(null);

    const result = await getNotificationPreferencesAction();

    expect(result).toEqual({ success: true, data: { preferences: null } });
  });

  it("returns error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await getNotificationPreferencesAction();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
    expect(mockGetNotificationPreferences).not.toHaveBeenCalled();
  });
});

// ============================================================================
// updateNotificationPreferencesAction
// ============================================================================

describe("updateNotificationPreferencesAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validPreferences = {
    match_ready: true,
    match_result: false,
    tournament_start: true,
    tournament_complete: false,
  };

  it("saves preferences for authenticated user", async () => {
    mockGetUser.mockResolvedValue(mockUser);
    mockUpsertNotificationPreferences.mockResolvedValue(undefined);

    const result = await updateNotificationPreferencesAction(validPreferences);

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockUpsertNotificationPreferences).toHaveBeenCalledWith(
      mockSupabase,
      mockUser.id,
      validPreferences
    );
  });

  it("returns error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const result = await updateNotificationPreferencesAction(validPreferences);

    expect(result.success).toBe(false);
    expect(mockUpsertNotificationPreferences).not.toHaveBeenCalled();
  });

  it("returns error when upsert throws", async () => {
    mockGetUser.mockResolvedValue(mockUser);
    mockUpsertNotificationPreferences.mockRejectedValue(new Error("DB error"));

    const result = await updateNotificationPreferencesAction(validPreferences);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
