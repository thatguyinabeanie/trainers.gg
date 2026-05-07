import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@trainers/supabase", () => ({
  getFeatureFlag: jest.fn(),
}));

import { checkFeatureAccess, checkCommunityFeatureAccess } from "../check-flag";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlag } from "@trainers/supabase";

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const mockGetFeatureFlag = getFeatureFlag as jest.MockedFunction<
  typeof getFeatureFlag
>;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateClient.mockResolvedValue({} as ReturnType<typeof createClient> extends Promise<infer T> ? T : never);
});

// ---------------------------------------------------------------------------
// checkFeatureAccess
// ---------------------------------------------------------------------------

describe("checkFeatureAccess", () => {
  it("returns false when flag does not exist", async () => {
    mockGetFeatureFlag.mockResolvedValue(null);
    expect(await checkFeatureAccess("some_flag", "user-1")).toBe(false);
  });

  it("returns true when flag is globally enabled", async () => {
    mockGetFeatureFlag.mockResolvedValue({
      enabled: true,
      metadata: {},
    } as any);
    expect(await checkFeatureAccess("some_flag", "user-1")).toBe(true);
  });

  it("returns true when user is in allowed_users", async () => {
    mockGetFeatureFlag.mockResolvedValue({
      enabled: false,
      metadata: { allowed_users: ["user-1", "user-2"] },
    } as any);
    expect(await checkFeatureAccess("some_flag", "user-1")).toBe(true);
  });

  it("returns false when user is NOT in allowed_users", async () => {
    mockGetFeatureFlag.mockResolvedValue({
      enabled: false,
      metadata: { allowed_users: ["user-2", "user-3"] },
    } as any);
    expect(await checkFeatureAccess("some_flag", "user-1")).toBe(false);
  });

  it("returns false when metadata has no allowed_users", async () => {
    mockGetFeatureFlag.mockResolvedValue({
      enabled: false,
      metadata: {},
    } as any);
    expect(await checkFeatureAccess("some_flag", "user-1")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkCommunityFeatureAccess
// ---------------------------------------------------------------------------

describe("checkCommunityFeatureAccess", () => {
  it("returns false when flag does not exist", async () => {
    mockGetFeatureFlag.mockResolvedValue(null);
    expect(await checkCommunityFeatureAccess("discord", 42)).toBe(false);
  });

  it("returns true when flag is globally enabled", async () => {
    mockGetFeatureFlag.mockResolvedValue({
      enabled: true,
      metadata: {},
    } as any);
    expect(await checkCommunityFeatureAccess("discord", 42)).toBe(true);
  });

  it("returns true when community is in allowed_communities", async () => {
    mockGetFeatureFlag.mockResolvedValue({
      enabled: false,
      metadata: { allowed_communities: [42, 99] },
    } as any);
    expect(await checkCommunityFeatureAccess("discord", 42)).toBe(true);
  });

  it("returns false when community is NOT in allowed_communities", async () => {
    mockGetFeatureFlag.mockResolvedValue({
      enabled: false,
      metadata: { allowed_communities: [99, 100] },
    } as any);
    expect(await checkCommunityFeatureAccess("discord", 42)).toBe(false);
  });

  it("returns false on error (fail closed)", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockGetFeatureFlag.mockRejectedValue(new Error("DB error"));
    expect(await checkCommunityFeatureAccess("discord", 42)).toBe(false);
    jest.restoreAllMocks();
  });

  it("logs error to console.error on failure", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockGetFeatureFlag.mockRejectedValue(new Error("DB error"));

    await checkCommunityFeatureAccess("discord", 42);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[feature-flags] Failed to check flag for community:",
      { flagKey: "discord", communityId: 42 },
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
