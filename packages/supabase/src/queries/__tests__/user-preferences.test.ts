import { describe, it, expect, jest, beforeEach } from "@jest/globals";

import { createMockClient } from "@trainers/test-utils/mocks";

import type { TypedClient } from "../../client";
import { getUserPreferences } from "../user-preferences";

describe("getUserPreferences", () => {
  const userId = "user-abc-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the preferences object when a row exists", async () => {
    const savedPrefs = { speedTiers: { defaultView: "sidepane" } };
    const mockClient = createMockClient();
    mockClient.maybeSingle.mockResolvedValue({
      data: { preferences: savedPrefs },
      error: null,
    });

    const result = await getUserPreferences(
      mockClient as unknown as TypedClient,
      userId
    );

    expect(result).toEqual(savedPrefs);
  });

  it("queries the user_preferences table", async () => {
    const mockClient = createMockClient();
    mockClient.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getUserPreferences(mockClient as unknown as TypedClient, userId);

    expect(mockClient.from).toHaveBeenCalledWith("user_preferences");
  });

  it("selects only the preferences column", async () => {
    const mockClient = createMockClient();
    mockClient.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getUserPreferences(mockClient as unknown as TypedClient, userId);

    expect(mockClient.select).toHaveBeenCalledWith("preferences");
  });

  it("filters by the provided user_id", async () => {
    const mockClient = createMockClient();
    mockClient.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getUserPreferences(mockClient as unknown as TypedClient, userId);

    expect(mockClient.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("returns null when no row exists for the user", async () => {
    const mockClient = createMockClient();
    mockClient.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getUserPreferences(
      mockClient as unknown as TypedClient,
      userId
    );

    expect(result).toBeNull();
  });

  it("throws on a database error", async () => {
    const mockClient = createMockClient();
    const dbError = new Error("connection refused");
    mockClient.maybeSingle.mockResolvedValue({ data: null, error: dbError });

    await expect(
      getUserPreferences(mockClient as unknown as TypedClient, userId)
    ).rejects.toThrow("connection refused");
  });

  it("handles a different user ID correctly", async () => {
    const differentUserId = "other-user-999";
    const mockClient = createMockClient();
    mockClient.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getUserPreferences(
      mockClient as unknown as TypedClient,
      differentUserId
    );

    expect(mockClient.eq).toHaveBeenCalledWith("user_id", differentUserId);
  });

  it("returns an empty object when the preferences column is an empty object", async () => {
    const mockClient = createMockClient();
    mockClient.maybeSingle.mockResolvedValue({
      data: { preferences: {} },
      error: null,
    });

    const result = await getUserPreferences(
      mockClient as unknown as TypedClient,
      userId
    );

    expect(result).toEqual({});
  });
});
