import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { Json } from "@trainers/supabase";

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(),
}));

jest.mock("@trainers/supabase", () => ({
  getFeatureFlag: jest.fn(),
}));

import {
  checkFeatureAccess,
  checkCommunityFeatureAccess,
  isCoachingPublic,
} from "../check-flag";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getFeatureFlag } from "@trainers/supabase";

const mockCreateServiceRoleClient =
  createServiceRoleClient as jest.MockedFunction<
    typeof createServiceRoleClient
  >;
const mockGetFeatureFlag = getFeatureFlag as jest.MockedFunction<
  typeof getFeatureFlag
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal feature flag row for test mocking */
function buildFlag(overrides: { enabled: boolean; metadata: Json }) {
  return {
    id: 1,
    key: "test_flag",
    description: null,
    enabled: overrides.enabled,
    metadata: overrides.metadata,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateServiceRoleClient.mockReturnValue(
    {} as ReturnType<typeof createServiceRoleClient>
  );
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
    mockGetFeatureFlag.mockResolvedValue(
      buildFlag({ enabled: true, metadata: {} })
    );
    expect(await checkFeatureAccess("some_flag", "user-1")).toBe(true);
  });

  it("returns true when user is in allowed_users", async () => {
    mockGetFeatureFlag.mockResolvedValue(
      buildFlag({
        enabled: false,
        metadata: { allowed_users: ["user-1", "user-2"] },
      })
    );
    expect(await checkFeatureAccess("some_flag", "user-1")).toBe(true);
  });

  it("returns false when user is NOT in allowed_users", async () => {
    mockGetFeatureFlag.mockResolvedValue(
      buildFlag({
        enabled: false,
        metadata: { allowed_users: ["user-2", "user-3"] },
      })
    );
    expect(await checkFeatureAccess("some_flag", "user-1")).toBe(false);
  });

  it("returns false when metadata has no allowed_users", async () => {
    mockGetFeatureFlag.mockResolvedValue(
      buildFlag({ enabled: false, metadata: {} })
    );
    expect(await checkFeatureAccess("some_flag", "user-1")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isCoachingPublic — reads the "coaching" flag via the service-role client
// (RLS audit #6) and reports only the global enabled state.
// ---------------------------------------------------------------------------

describe("isCoachingPublic", () => {
  it("uses the service-role client (not the session client) to read the flag", async () => {
    mockGetFeatureFlag.mockResolvedValue(null);
    await isCoachingPublic();
    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("returns false when the coaching flag does not exist", async () => {
    mockGetFeatureFlag.mockResolvedValue(null);
    expect(await isCoachingPublic()).toBe(false);
  });

  it("returns true when the coaching flag is globally enabled", async () => {
    mockGetFeatureFlag.mockResolvedValue(
      buildFlag({ enabled: true, metadata: {} })
    );
    expect(await isCoachingPublic()).toBe(true);
  });

  it("returns false when the coaching flag is globally disabled", async () => {
    mockGetFeatureFlag.mockResolvedValue(
      buildFlag({ enabled: false, metadata: { allowed_users: ["user-1"] } })
    );
    expect(await isCoachingPublic()).toBe(false);
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
    mockGetFeatureFlag.mockResolvedValue(
      buildFlag({ enabled: true, metadata: {} })
    );
    expect(await checkCommunityFeatureAccess("discord", 42)).toBe(true);
  });

  it("returns true when community is in allowed_communities", async () => {
    mockGetFeatureFlag.mockResolvedValue(
      buildFlag({
        enabled: false,
        metadata: { allowed_communities: [42, 99] },
      })
    );
    expect(await checkCommunityFeatureAccess("discord", 42)).toBe(true);
  });

  it("returns false when community is NOT in allowed_communities", async () => {
    mockGetFeatureFlag.mockResolvedValue(
      buildFlag({
        enabled: false,
        metadata: { allowed_communities: [99, 100] },
      })
    );
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
