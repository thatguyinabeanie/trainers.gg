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
const mockCreateOrganization = jest.fn();
const mockUpdateOrganization = jest.fn();
const mockInviteToOrganization = jest.fn();
const mockAcceptOrganizationInvitation = jest.fn();
const mockDeclineOrganizationInvitation = jest.fn();
const mockLeaveOrganization = jest.fn();
const mockRemoveStaff = jest.fn();
jest.mock("@trainers/supabase", () => ({
  createOrganization: (...args: unknown[]) => mockCreateOrganization(...args),
  updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args),
  inviteToOrganization: (...args: unknown[]) =>
    mockInviteToOrganization(...args),
  acceptOrganizationInvitation: (...args: unknown[]) =>
    mockAcceptOrganizationInvitation(...args),
  declineOrganizationInvitation: (...args: unknown[]) =>
    mockDeclineOrganizationInvitation(...args),
  leaveOrganization: (...args: unknown[]) => mockLeaveOrganization(...args),
  removeStaff: (...args: unknown[]) => mockRemoveStaff(...args),
}));

import {
  createOrganization,
  updateOrganization,
  inviteToOrganization,
  acceptOrganizationInvitation,
  leaveOrganization,
  removeStaff,
} from "../organizations";

// =============================================================================
// createOrganization
// =============================================================================

describe("createOrganization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an organization and revalidates the organizations list", async () => {
    mockCreateOrganization.mockResolvedValue({
      id: 1,
      slug: "team-rocket",
      name: "Team Rocket",
    });

    const result = await createOrganization({
      name: "Team Rocket",
      slug: "team-rocket",
      description: "Prepare for trouble",
    });

    expect(result).toEqual({
      success: true,
      data: { id: 1, slug: "team-rocket", name: "Team Rocket" },
    });
    expect(mockCreateOrganization).toHaveBeenCalledWith(mockSupabase, {
      name: "Team Rocket",
      slug: "team-rocket",
      description: "Prepare for trouble",
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("organizations-list");
  });

  it("returns an error when the mutation throws", async () => {
    mockCreateOrganization.mockRejectedValue(new Error("Slug already taken"));

    const result = await createOrganization({
      name: "Team Rocket",
      slug: "team-rocket",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to create organization");
    }
  });
});

// =============================================================================
// updateOrganization
// =============================================================================

describe("updateOrganization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("revalidates the organizations list when display data changes", async () => {
    mockUpdateOrganization.mockResolvedValue(undefined);

    const result = await updateOrganization(
      1,
      { name: "New Name", description: "Updated desc" },
      "team-rocket"
    );

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockUpdateOrganization).toHaveBeenCalledWith(mockSupabase, 1, {
      name: "New Name",
      description: "Updated desc",
    });
    // List revalidated because name changed
    expect(mockUpdateTag).toHaveBeenCalledWith("organizations-list");
    // Individual org pages revalidated
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:1");
  });

  it("does not revalidate the list when only socialLinks changes", async () => {
    mockUpdateOrganization.mockResolvedValue(undefined);

    const result = await updateOrganization(
      1,
      {
        socialLinks: [{ platform: "website", url: "https://example.com" }],
      },
      "team-rocket"
    );

    expect(result.success).toBe(true);
    // List should NOT be revalidated — socialLinks is not display data
    expect(mockUpdateTag).not.toHaveBeenCalledWith("organizations-list");
    // Individual org pages should still be revalidated
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:1");
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
    mockInviteToOrganization.mockResolvedValue({ id: 55 });

    const result = await inviteToOrganization(1, "user-uuid-123");

    expect(result).toEqual({
      success: true,
      data: { invitationId: 55 },
    });
    expect(mockInviteToOrganization).toHaveBeenCalledWith(
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
    mockAcceptOrganizationInvitation.mockResolvedValue(undefined);

    const result = await acceptOrganizationInvitation(55, "team-rocket");

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockAcceptOrganizationInvitation).toHaveBeenCalledWith(
      mockSupabase,
      55
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:team-rocket");
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
    mockLeaveOrganization.mockResolvedValue(undefined);

    const result = await leaveOrganization(1, "team-rocket");

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockLeaveOrganization).toHaveBeenCalledWith(mockSupabase, 1);
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:1");
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
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:1");
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
