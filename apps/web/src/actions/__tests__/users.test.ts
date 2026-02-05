/**
 * @jest-environment node
 */

import { updateSpritePreferenceAction } from "../users";

// Mock Supabase
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn(() => ({
  update: mockUpdate,
}));
const mockGetUser = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe("updateSpritePreferenceAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  it("successfully updates sprite preference for authenticated user", async () => {
    const result = await updateSpritePreferenceAction("gen5ani");

    expect(result.success).toBe(true);
    expect(mockGetUser).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith("users");
    expect(mockUpdate).toHaveBeenCalledWith({ sprite_preference: "gen5ani" });
    expect(mockEq).toHaveBeenCalledWith("id", "user-123");
  });

  it("accepts gen5 as valid preference", async () => {
    const result = await updateSpritePreferenceAction("gen5");

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ sprite_preference: "gen5" });
  });

  it("accepts gen5ani as valid preference", async () => {
    const result = await updateSpritePreferenceAction("gen5ani");

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ sprite_preference: "gen5ani" });
  });

  it("accepts ani as valid preference", async () => {
    const result = await updateSpritePreferenceAction("ani");

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ sprite_preference: "ani" });
  });

  it("returns error when user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const result = await updateSpritePreferenceAction("gen5");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Not authenticated");
  });

  it("returns error when auth check fails", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Auth error" },
    });

    const result = await updateSpritePreferenceAction("gen5");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Not authenticated");
  });

  it("returns error when database update fails", async () => {
    mockEq.mockResolvedValueOnce({
      error: { message: "Database error" },
    });

    const result = await updateSpritePreferenceAction("gen5");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to update sprite preference");
  });

  it("rejects invalid sprite preference value", async () => {
    // This should fail validation before reaching the database
    // @ts-expect-error - Testing invalid input
    const result = await updateSpritePreferenceAction("invalid");

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
