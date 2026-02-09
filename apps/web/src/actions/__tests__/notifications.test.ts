/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock bot detection
jest.mock("botid/server", () => ({
  checkBotId: jest.fn().mockResolvedValue({ isBot: false }),
}));

// Mock Supabase client
const mockSupabase = {
  auth: { getUser: jest.fn() },
  from: jest.fn(),
  rpc: jest.fn(),
};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabase),
}));

// Mock next/cache updateTag
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// Mock getErrorMessage (used by withAction in @trainers/utils)
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// Mock @trainers/supabase mutations
const mockMarkNotificationRead = jest.fn();
const mockMarkAllNotificationsRead = jest.fn();
const mockDeleteNotification = jest.fn();
jest.mock("@trainers/supabase", () => ({
  markNotificationRead: (...args: unknown[]) =>
    mockMarkNotificationRead(...args),
  markAllNotificationsRead: (...args: unknown[]) =>
    mockMarkAllNotificationsRead(...args),
  deleteNotification: (...args: unknown[]) => mockDeleteNotification(...args),
}));

import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
} from "../notifications";

// =============================================================================
// markNotificationReadAction
// =============================================================================

describe("markNotificationReadAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks a notification as read", async () => {
    mockMarkNotificationRead.mockResolvedValue(undefined);

    const result = await markNotificationReadAction(42);

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockMarkNotificationRead).toHaveBeenCalledWith(mockSupabase, 42);
  });

  it("returns a validation error for an invalid ID", async () => {
    const result = await markNotificationReadAction(-1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
    // The mutation should never be called when validation fails
    expect(mockMarkNotificationRead).not.toHaveBeenCalled();
  });
});

// =============================================================================
// markAllNotificationsReadAction
// =============================================================================

describe("markAllNotificationsReadAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks all notifications as read", async () => {
    mockMarkAllNotificationsRead.mockResolvedValue(undefined);

    const result = await markAllNotificationsReadAction();

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockMarkAllNotificationsRead).toHaveBeenCalledWith(mockSupabase);
  });
});

// =============================================================================
// deleteNotificationAction
// =============================================================================

describe("deleteNotificationAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes a notification", async () => {
    mockDeleteNotification.mockResolvedValue(undefined);

    const result = await deleteNotificationAction(99);

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockDeleteNotification).toHaveBeenCalledWith(mockSupabase, 99);
  });

  it("returns an error when the mutation throws", async () => {
    mockDeleteNotification.mockRejectedValue(
      new Error("Notification not found")
    );

    const result = await deleteNotificationAction(99);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
