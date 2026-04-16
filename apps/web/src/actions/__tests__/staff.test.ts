/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock bot detection
jest.mock("botid/server", () => ({
  checkBotId: jest.fn().mockResolvedValue({ isBot: false }),
}));

// Mock rejectBots while preserving the rest of ../utils (withAction, etc.)
const mockRejectBots = jest.fn().mockResolvedValue(undefined);
jest.mock("../utils", () => {
  const actual = jest.requireActual("../utils") as Record<string, unknown>;
  return {
    ...actual,
    rejectBots: (...args: unknown[]) => mockRejectBots(...args),
  };
});

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

// staff.ts imports getErrorMessage from @trainers/utils
jest.mock("@trainers/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// Mock cache-invalidation helper
const mockInvalidateCommunityPageCaches = jest.fn();
jest.mock("@/lib/cache-invalidation", () => ({
  invalidateCommunityPageCaches: (...args: unknown[]) =>
    mockInvalidateCommunityPageCaches(...args),
}));

// Mock @trainers/supabase mutations and queries
const mockSearchUsersForInvite = jest.fn();
const mockListCommunityGroups = jest.fn();
const mockAddStaffMember = jest.fn();
const mockAddStaffToGroup = jest.fn();
const mockChangeStaffRole = jest.fn();
const mockRemoveStaffFromGroup = jest.fn();
const mockRemoveStaffCompletely = jest.fn();
jest.mock("@trainers/supabase", () => ({
  searchUsersForInvite: (...args: unknown[]) =>
    mockSearchUsersForInvite(...args),
  listCommunityGroups: (...args: unknown[]) => mockListCommunityGroups(...args),
  addStaffMember: (...args: unknown[]) => mockAddStaffMember(...args),
  addStaffToGroup: (...args: unknown[]) => mockAddStaffToGroup(...args),
  changeStaffRole: (...args: unknown[]) => mockChangeStaffRole(...args),
  removeStaffFromGroup: (...args: unknown[]) =>
    mockRemoveStaffFromGroup(...args),
  removeStaffCompletely: (...args: unknown[]) =>
    mockRemoveStaffCompletely(...args),
}));

// Mock enqueue helpers — critical: verify correct roleType and action args
const mockEnqueueCommunityRoleSync = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/discord/enqueue-helpers", () => ({
  enqueueCommunityRoleSync: (...args: unknown[]) =>
    mockEnqueueCommunityRoleSync(...args),
}));

import {
  searchUsersForStaffInvite,
  inviteStaffMember,
  inviteStaffToGroup,
  changeStaffRoleAction,
  moveStaffToGroup,
  removeStaffAction,
  unassignStaffAction,
  getOrganizationGroups,
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

  it("adds staff and enqueues role sync with 'staff' + 'add'", async () => {
    mockAddStaffMember.mockResolvedValue(undefined);

    const result = await inviteStaffMember(1, "user-uuid-789", "team-rocket");

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockAddStaffMember).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-uuid-789"
    );
    expect(mockInvalidateCommunityPageCaches).toHaveBeenCalledWith(
      "team-rocket",
      1
    );
    // Critical: verify correct roleType and action
    expect(mockEnqueueCommunityRoleSync).toHaveBeenCalledWith(
      mockSupabase,
      1,
      ["user-uuid-789"],
      "staff",
      "add",
      "staff_added:1:user-uuid-789"
    );
  });

  it("returns error when mutation throws", async () => {
    mockAddStaffMember.mockRejectedValue(new Error("DB error"));

    const result = await inviteStaffMember(1, "user-uuid-789");

    expect(result).toEqual({
      success: false,
      error: "Failed to add staff member",
    });
  });
});

// =============================================================================
// inviteStaffToGroup
// =============================================================================

describe("inviteStaffToGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds staff to group and enqueues role sync with 'staff' + 'add'", async () => {
    mockAddStaffToGroup.mockResolvedValue(undefined);

    const result = await inviteStaffToGroup(1, "user-456", 10, "slug");

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockAddStaffToGroup).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-456",
      10
    );
    expect(mockEnqueueCommunityRoleSync).toHaveBeenCalledWith(
      mockSupabase,
      1,
      ["user-456"],
      "staff",
      "add",
      "staff_added:1:user-456"
    );
  });
});

// =============================================================================
// changeStaffRoleAction
// =============================================================================

describe("changeStaffRoleAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("changes group and does NOT call role sync", async () => {
    mockChangeStaffRole.mockResolvedValue(undefined);

    const result = await changeStaffRoleAction(1, "user-789", 5, "slug");

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockChangeStaffRole).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-789",
      5
    );
    expect(mockInvalidateCommunityPageCaches).toHaveBeenCalledWith("slug", 1);
    expect(mockEnqueueCommunityRoleSync).not.toHaveBeenCalled();
  });
});

// =============================================================================
// moveStaffToGroup (alias)
// =============================================================================

describe("moveStaffToGroup", () => {
  beforeEach(() => jest.clearAllMocks());

  it("delegates to changeStaffRoleAction", async () => {
    mockChangeStaffRole.mockResolvedValue(undefined);

    const result = await moveStaffToGroup(1, "user-789", 5, "slug");

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockChangeStaffRole).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-789",
      5
    );
  });
});

// =============================================================================
// removeStaffAction
// =============================================================================

describe("removeStaffAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes staff and enqueues role sync with 'staff' + 'remove'", async () => {
    mockRemoveStaffCompletely.mockResolvedValue(undefined);

    const result = await removeStaffAction(1, "user-123", "slug");

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockRemoveStaffCompletely).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-123"
    );
    // Critical: verify roleType is "staff" and action is "remove" (not "add")
    expect(mockEnqueueCommunityRoleSync).toHaveBeenCalledWith(
      mockSupabase,
      1,
      ["user-123"],
      "staff",
      "remove",
      "staff_removed:1:user-123"
    );
  });

  it("returns error when mutation throws", async () => {
    mockRemoveStaffCompletely.mockRejectedValue(new Error("FK violation"));

    const result = await removeStaffAction(1, "user-123");

    expect(result).toEqual({
      success: false,
      error: "Failed to remove staff member",
    });
  });
});

// =============================================================================
// unassignStaffAction
// =============================================================================

describe("unassignStaffAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unassigns from group and does NOT call role sync", async () => {
    mockRemoveStaffFromGroup.mockResolvedValue(undefined);

    const result = await unassignStaffAction(1, "user-123", "slug");

    expect(result).toEqual({ success: true, data: { success: true } });
    expect(mockRemoveStaffFromGroup).toHaveBeenCalledWith(
      mockSupabase,
      1,
      "user-123"
    );
    expect(mockEnqueueCommunityRoleSync).not.toHaveBeenCalled();
  });

  it("returns error when mutation throws", async () => {
    mockRemoveStaffFromGroup.mockRejectedValue(new Error("Not found"));

    const result = await unassignStaffAction(1, "user-123");

    expect(result).toEqual({
      success: false,
      error: "Failed to unassign staff member",
    });
  });
});

// =============================================================================
// getOrganizationGroups
// =============================================================================

describe("getOrganizationGroups", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns groups on success", async () => {
    const groups = [
      {
        id: 1,
        name: "Judges",
        description: null,
        role: null,
        memberCount: 3,
      },
    ];
    mockListCommunityGroups.mockResolvedValue(groups);

    const result = await getOrganizationGroups(1);

    expect(result).toEqual({ success: true, data: groups });
    expect(mockListCommunityGroups).toHaveBeenCalledWith(mockSupabase, 1);
  });

  it("returns error when query throws", async () => {
    mockListCommunityGroups.mockRejectedValue(new Error("DB error"));

    const result = await getOrganizationGroups(1);

    expect(result).toEqual({
      success: false,
      error: "Failed to fetch groups",
    });
  });
});
