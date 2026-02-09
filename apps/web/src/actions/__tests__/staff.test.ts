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

// Mock getErrorMessage (used directly in staff actions)
jest.mock("@/lib/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// Mock @trainers/supabase mutations and queries
const mockSearchUsersForInvite = jest.fn();
const mockAddStaffMember = jest.fn();
const mockAddStaffToGroup = jest.fn();
const mockChangeStaffRole = jest.fn();
const mockRemoveStaffCompletely = jest.fn();
jest.mock("@trainers/supabase", () => ({
  searchUsersForInvite: (...args: unknown[]) =>
    mockSearchUsersForInvite(...args),
  listOrganizationGroups: jest.fn(),
  addStaffMember: (...args: unknown[]) => mockAddStaffMember(...args),
  addStaffToGroup: (...args: unknown[]) => mockAddStaffToGroup(...args),
  changeStaffRole: (...args: unknown[]) => mockChangeStaffRole(...args),
  removeStaffCompletely: (...args: unknown[]) =>
    mockRemoveStaffCompletely(...args),
}));

import {
  searchUsersForStaffInvite,
  inviteStaffMember,
  inviteStaffToGroup,
  changeStaffRoleAction,
  removeStaffAction,
} from "../staff";

// =============================================================================
// searchUsersForStaffInvite
// =============================================================================

describe("searchUsersForStaffInvite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns matching users from the search query", async () => {
    const mockUsers = [
      {
        id: "user-1",
        username: "ash",
        first_name: "Ash",
        last_name: "Ketchum",
        image: null,
      },
    ];
    mockSearchUsersForInvite.mockResolvedValue(mockUsers);

    const result = await searchUsersForStaffInvite(1, "ash");

    expect(result).toEqual({ success: true, data: mockUsers });
    expect(mockSearchUsersForInvite).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "ash"
    );
  });
});

// =============================================================================
// inviteStaffMember
// =============================================================================

describe("inviteStaffMember", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds a staff member and revalidates the org page by slug", async () => {
    mockAddStaffMember.mockResolvedValue(undefined);

    const result = await inviteStaffMember(1, "user-uuid-789", "team-rocket");

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockAddStaffMember).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-uuid-789"
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:1");
  });
});

// =============================================================================
// inviteStaffToGroup
// =============================================================================

describe("inviteStaffToGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds a staff member to a specific group and revalidates the org page", async () => {
    mockAddStaffToGroup.mockResolvedValue(undefined);

    const result = await inviteStaffToGroup(
      1,
      "user-uuid-789",
      10,
      "team-rocket"
    );

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockAddStaffToGroup).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-uuid-789",
      10
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:1");
  });
});

// =============================================================================
// changeStaffRoleAction
// =============================================================================

describe("changeStaffRoleAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("changes a staff member group and revalidates the org page", async () => {
    mockChangeStaffRole.mockResolvedValue(undefined);

    const result = await changeStaffRoleAction(
      1,
      "user-uuid-789",
      5,
      "team-rocket"
    );

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockChangeStaffRole).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-uuid-789",
      5
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:1");
  });
});

// =============================================================================
// removeStaffAction
// =============================================================================

describe("removeStaffAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes a staff member and revalidates the org page", async () => {
    mockRemoveStaffCompletely.mockResolvedValue(undefined);

    const result = await removeStaffAction(1, "user-uuid-789", "team-rocket");

    expect(result).toEqual({
      success: true,
      data: { success: true },
    });
    expect(mockRemoveStaffCompletely).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-uuid-789"
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:team-rocket");
    expect(mockUpdateTag).toHaveBeenCalledWith("organization:1");
  });

  it("returns an error when the mutation throws", async () => {
    mockRemoveStaffCompletely.mockRejectedValue(
      new Error("Cannot remove owner")
    );

    const result = await removeStaffAction(1, "user-uuid-789", "team-rocket");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to remove staff member");
    }
  });
});
