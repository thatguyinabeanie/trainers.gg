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

// Mock getErrorMessage (used directly in organization actions)
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// Mock @trainers/supabase mutations
const mockUpdateCommunity = jest.fn();
const mockInviteToCommunity = jest.fn();
const mockAcceptCommunityInvitation = jest.fn();
const mockDeclineCommunityInvitation = jest.fn();
const mockLeaveCommunity = jest.fn();
const mockRemoveStaff = jest.fn();
jest.mock("@trainers/supabase", () => ({
  updateCommunity: (...args: unknown[]) => mockUpdateCommunity(...args),
  inviteToCommunity: (...args: unknown[]) => mockInviteToCommunity(...args),
  acceptCommunityInvitation: (...args: unknown[]) =>
    mockAcceptCommunityInvitation(...args),
  declineCommunityInvitation: (...args: unknown[]) =>
    mockDeclineCommunityInvitation(...args),
  leaveCommunity: (...args: unknown[]) => mockLeaveCommunity(...args),
  removeStaff: (...args: unknown[]) => mockRemoveStaff(...args),
}));

import {
  updateOrganization,
  inviteToOrganization,
  acceptOrganizationInvitation,
  leaveOrganization,
  removeStaff,
} from "../communities";

// =============================================================================
// updateOrganization
// =============================================================================

describe("updateOrganization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("revalidates the organizations list when display data changes", async () => {
    mockUpdateCommunity.mockResolvedValue(undefined);

    const result = await updateOrganization(
      1,
      { name: "New Name", description: "Updated desc" },
      "team-rocket"
    );

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockUpdateCommunity).toHaveBeenCalledWith(mockSupabase, 1, {
      name: "New Name",
      description: "Updated desc",
    });
    // List revalidated because name changed
    expect(mockUpdateTag).toHaveBeenCalledWith("communities-list");
    // Individual org pages revalidated
    expect(mockUpdateTag).toHaveBeenCalledWith("community:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("community:1");
  });

  it("does not revalidate the list when only socialLinks changes", async () => {
    mockUpdateCommunity.mockResolvedValue(undefined);

    const result = await updateOrganization(
      1,
      {
        socialLinks: [{ platform: "website", url: "https://example.com" }],
      },
      "team-rocket"
    );

    expect(result.success).toBe(true);
    // List should NOT be revalidated — socialLinks is not display data
    expect(mockUpdateTag).not.toHaveBeenCalledWith("communities-list");
    // Individual org pages should still be revalidated
    expect(mockUpdateTag).toHaveBeenCalledWith("community:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("community:1");
  });
});

// =============================================================================
// inviteToOrganization
// =============================================================================

describe("inviteToOrganization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("invites a user and returns the invitation id", async () => {
    mockInviteToCommunity.mockResolvedValue({ id: 55 });

    const result = await inviteToOrganization(1, "user-uuid-123");

    expect(result).toEqual({
      success: true,
      data: { invitationId: 55 },
    });
    expect(mockInviteToCommunity).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-uuid-123"
    );
  });
});

// =============================================================================
// acceptOrganizationInvitation
// =============================================================================

describe("acceptOrganizationInvitation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("accepts an invitation and revalidates the organization page by slug", async () => {
    mockAcceptCommunityInvitation.mockResolvedValue(undefined);

    const result = await acceptOrganizationInvitation(55, "team-rocket");

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockAcceptCommunityInvitation).toHaveBeenCalledWith(
      mockSupabase,
      55
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("community:team-rocket");
  });
});

// =============================================================================
// leaveOrganization
// =============================================================================

describe("leaveOrganization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("leaves an organization and revalidates the org page", async () => {
    mockLeaveCommunity.mockResolvedValue(undefined);

    const result = await leaveOrganization(1, "team-rocket");

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockLeaveCommunity).toHaveBeenCalledWith(mockSupabase, 1);
    expect(mockUpdateTag).toHaveBeenCalledWith("community:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("community:1");
  });
});

// =============================================================================
// removeStaff
// =============================================================================

describe("removeStaff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes a staff member and revalidates the org page", async () => {
    mockRemoveStaff.mockResolvedValue(undefined);

    const result = await removeStaff(1, "user-uuid-456", "team-rocket");

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockRemoveStaff).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-uuid-456"
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("community:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("community:1");
  });

  it("returns an error when the mutation throws", async () => {
    mockRemoveStaff.mockRejectedValue(new Error("Cannot remove owner"));

    const result = await removeStaff(1, "user-uuid-456", "team-rocket");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to remove staff");
    }
  });
});
