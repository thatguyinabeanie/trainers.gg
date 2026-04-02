/**
 * @jest-environment node
 *
 * Cache invalidation tests for updateOrganization.
 *
 * Verifies that communities-list is always revalidated on any update,
 * not just when name/description/logoUrl change.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock Supabase client
const mockSupabase = {
  auth: { getUser: jest.fn() },
  from: jest.fn(),
  rpc: jest.fn(),
};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabase),
}));

// Mock next/cache
const mockUpdateTag = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// Mock @/lib/utils
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// Mock @trainers/supabase mutations
const mockUpdateCommunity = jest.fn();
jest.mock("@trainers/supabase", () => ({
  updateCommunity: (...args: unknown[]) => mockUpdateCommunity(...args),
  inviteToCommunity: jest.fn(),
  acceptCommunityInvitation: jest.fn(),
  declineCommunityInvitation: jest.fn(),
  leaveCommunity: jest.fn(),
  removeStaff: jest.fn(),
}));

import { updateOrganization } from "../communities";

describe("updateOrganization cache invalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateCommunity.mockResolvedValue(undefined);
  });

  it("revalidates communities-list when only socialLinks change", async () => {
    // This tests the bug: previously, socialLinks-only updates skipped
    // the communities-list cache tag, causing stale data on /communities.
    const result = await updateOrganization(
      1,
      { socialLinks: [{ platform: "website", url: "https://example.com" }] },
      "team-rocket"
    );

    expect(result.success).toBe(true);
    expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
  });

  it("revalidates communities-list when name changes", async () => {
    const result = await updateOrganization(1, { name: "New Name" });

    expect(result.success).toBe(true);
    expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
  });

  it("revalidates communities-list when description changes", async () => {
    const result = await updateOrganization(1, {
      description: "Updated description",
    });

    expect(result.success).toBe(true);
    expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
  });

  it("revalidates communities-list when logoUrl changes", async () => {
    const result = await updateOrganization(1, {
      logoUrl: "https://img.example.com/logo.png",
    });

    expect(result.success).toBe(true);
    expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
  });
});
