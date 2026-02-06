/**
 * @jest-environment node
 */

import { updateTag } from "next/cache";
import * as supabaseModule from "@trainers/supabase";
import {
  searchUsersForStaffInvite,
  inviteStaffMember,
  inviteStaffToGroup,
  changeStaffRoleAction,
  moveStaffToGroup,
  removeStaffAction,
  getOrganizationGroups,
} from "../staff";

// Mock Next.js cache
jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

// Mock Supabase server client
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockSupabase),
}));

// Mock @trainers/supabase mutations
jest.mock("@trainers/supabase");

describe("Staff Management Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("searchUsersForStaffInvite", () => {
    it("successfully searches users", async () => {
      const mockUsers = [
        {
          id: "user-1",
          username: "player1",
          first_name: "John",
          last_name: "Doe",
          image: null,
        },
        {
          id: "user-2",
          username: "player2",
          first_name: "Jane",
          last_name: "Smith",
          image: "https://example.com/avatar.jpg",
        },
      ];
      (supabaseModule.searchUsersForInvite as jest.Mock).mockResolvedValue(
        mockUsers
      );

      const result = await searchUsersForStaffInvite(1, "player");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUsers);
        expect(result.data).toHaveLength(2);
      }
      expect(supabaseModule.searchUsersForInvite).toHaveBeenCalledWith(
        mockSupabase,
        1,
        "player"
      );
    });

    it("returns empty array when no users match", async () => {
      (supabaseModule.searchUsersForInvite as jest.Mock).mockResolvedValue([]);

      const result = await searchUsersForStaffInvite(1, "nonexistent");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("excludes users already in organization", async () => {
      const mockUsers = [
        {
          id: "user-3",
          username: "newuser",
          first_name: "New",
          last_name: "User",
          image: null,
        },
      ];
      (supabaseModule.searchUsersForInvite as jest.Mock).mockResolvedValue(
        mockUsers
      );

      const result = await searchUsersForStaffInvite(1, "user");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]!.id).toBe("user-3");
      }
    });

    it("returns error when search fails", async () => {
      (supabaseModule.searchUsersForInvite as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const result = await searchUsersForStaffInvite(1, "test");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to search users");
      }
    });

    it("handles search with special characters", async () => {
      (supabaseModule.searchUsersForInvite as jest.Mock).mockResolvedValue([]);

      const result = await searchUsersForStaffInvite(1, "@user#test");

      expect(result.success).toBe(true);
      expect(supabaseModule.searchUsersForInvite).toHaveBeenCalledWith(
        mockSupabase,
        1,
        "@user#test"
      );
    });
  });

  describe("inviteStaffMember", () => {
    it("successfully invites staff member without group", async () => {
      (supabaseModule.addStaffMember as jest.Mock).mockResolvedValue({});

      const result = await inviteStaffMember(1, "user-123", "test-org");

      expect(result.success).toBe(true);
      expect(supabaseModule.addStaffMember).toHaveBeenCalledWith(
        mockSupabase,
        1,
        "user-123"
      );
      expect(updateTag).toHaveBeenCalledWith("organization:test-org");
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("invites staff without slug parameter", async () => {
      (supabaseModule.addStaffMember as jest.Mock).mockResolvedValue({});

      const result = await inviteStaffMember(1, "user-123");

      expect(result.success).toBe(true);
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("returns error when invite fails", async () => {
      (supabaseModule.addStaffMember as jest.Mock).mockRejectedValue(
        new Error("User already staff")
      );

      const result = await inviteStaffMember(1, "user-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to add staff member");
      }
    });

    it("returns error when user not found", async () => {
      (supabaseModule.addStaffMember as jest.Mock).mockRejectedValue(
        new Error("User does not exist")
      );

      const result = await inviteStaffMember(1, "nonexistent");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to add staff member");
      }
    });

    it("returns error when not authorized", async () => {
      (supabaseModule.addStaffMember as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await inviteStaffMember(1, "user-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to add staff member");
      }
    });
  });

  describe("inviteStaffToGroup", () => {
    it("successfully invites staff to specific group", async () => {
      (supabaseModule.addStaffToGroup as jest.Mock).mockResolvedValue({});

      const result = await inviteStaffToGroup(1, "user-123", 5, "test-org");

      expect(result.success).toBe(true);
      expect(supabaseModule.addStaffToGroup).toHaveBeenCalledWith(
        mockSupabase,
        1,
        "user-123",
        5
      );
      expect(updateTag).toHaveBeenCalledWith("organization:test-org");
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("invites to group without slug", async () => {
      (supabaseModule.addStaffToGroup as jest.Mock).mockResolvedValue({});

      const result = await inviteStaffToGroup(1, "user-123", 5);

      expect(result.success).toBe(true);
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("returns error when group not found", async () => {
      (supabaseModule.addStaffToGroup as jest.Mock).mockRejectedValue(
        new Error("Group does not exist")
      );

      const result = await inviteStaffToGroup(1, "user-123", 999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to add staff member");
      }
    });

    it("returns error when user already in group", async () => {
      (supabaseModule.addStaffToGroup as jest.Mock).mockRejectedValue(
        new Error("User already in group")
      );

      const result = await inviteStaffToGroup(1, "user-123", 5);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to add staff member");
      }
    });
  });

  describe("changeStaffRoleAction", () => {
    it("successfully changes staff group", async () => {
      (supabaseModule.changeStaffRole as jest.Mock).mockResolvedValue({});

      const result = await changeStaffRoleAction(1, "user-123", 3, "test-org");

      expect(result.success).toBe(true);
      expect(supabaseModule.changeStaffRole).toHaveBeenCalledWith(
        mockSupabase,
        1,
        "user-123",
        3
      );
      expect(updateTag).toHaveBeenCalledWith("organization:test-org");
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("changes role without slug", async () => {
      (supabaseModule.changeStaffRole as jest.Mock).mockResolvedValue({});

      const result = await changeStaffRoleAction(1, "user-123", 3);

      expect(result.success).toBe(true);
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("returns error when change fails", async () => {
      (supabaseModule.changeStaffRole as jest.Mock).mockRejectedValue(
        new Error("Cannot change role")
      );

      const result = await changeStaffRoleAction(1, "user-123", 3);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to change staff group");
      }
    });

    it("returns error when not authorized", async () => {
      (supabaseModule.changeStaffRole as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await changeStaffRoleAction(1, "user-123", 3);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to change staff group");
      }
    });

    it("returns error when trying to change owner role", async () => {
      (supabaseModule.changeStaffRole as jest.Mock).mockRejectedValue(
        new Error("Cannot change owner role")
      );

      const result = await changeStaffRoleAction(1, "owner-id", 3);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to change staff group");
      }
    });
  });

  describe("moveStaffToGroup", () => {
    it("successfully moves staff to group", async () => {
      (supabaseModule.changeStaffRole as jest.Mock).mockResolvedValue({});

      const result = await moveStaffToGroup(1, "user-123", 5, "test-org");

      expect(result.success).toBe(true);
      expect(supabaseModule.changeStaffRole).toHaveBeenCalledWith(
        mockSupabase,
        1,
        "user-123",
        5
      );
      expect(updateTag).toHaveBeenCalledWith("organization:test-org");
    });

    it("is alias for changeStaffRoleAction", async () => {
      (supabaseModule.changeStaffRole as jest.Mock).mockResolvedValue({});

      await moveStaffToGroup(1, "user-123", 5);
      await changeStaffRoleAction(1, "user-123", 5);

      // Both should call the same mutation
      expect(supabaseModule.changeStaffRole).toHaveBeenCalledTimes(2);
      expect(supabaseModule.changeStaffRole).toHaveBeenNthCalledWith(
        1,
        mockSupabase,
        1,
        "user-123",
        5
      );
      expect(supabaseModule.changeStaffRole).toHaveBeenNthCalledWith(
        2,
        mockSupabase,
        1,
        "user-123",
        5
      );
    });
  });

  describe("removeStaffAction", () => {
    it("successfully removes staff member", async () => {
      (supabaseModule.removeStaffCompletely as jest.Mock).mockResolvedValue({});

      const result = await removeStaffAction(1, "user-123", "test-org");

      expect(result.success).toBe(true);
      expect(supabaseModule.removeStaffCompletely).toHaveBeenCalledWith(
        mockSupabase,
        1,
        "user-123"
      );
      expect(updateTag).toHaveBeenCalledWith("organization:test-org");
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("removes staff without slug", async () => {
      (supabaseModule.removeStaffCompletely as jest.Mock).mockResolvedValue({});

      const result = await removeStaffAction(1, "user-123");

      expect(result.success).toBe(true);
      expect(updateTag).toHaveBeenCalledWith("organization:1");
    });

    it("returns error when removal fails", async () => {
      (supabaseModule.removeStaffCompletely as jest.Mock).mockRejectedValue(
        new Error("Staff member not found")
      );

      const result = await removeStaffAction(1, "nonexistent");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to remove staff member");
      }
    });

    it("returns error when not authorized", async () => {
      (supabaseModule.removeStaffCompletely as jest.Mock).mockRejectedValue(
        new Error("Permission denied")
      );

      const result = await removeStaffAction(1, "user-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to remove staff member");
      }
    });

    it("returns error when trying to remove owner", async () => {
      (supabaseModule.removeStaffCompletely as jest.Mock).mockRejectedValue(
        new Error("Cannot remove organization owner")
      );

      const result = await removeStaffAction(1, "owner-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to remove staff member");
      }
    });

    it("returns error when trying to remove last admin", async () => {
      (supabaseModule.removeStaffCompletely as jest.Mock).mockRejectedValue(
        new Error("Cannot remove last admin")
      );

      const result = await removeStaffAction(1, "admin-id");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to remove staff member");
      }
    });
  });

  describe("getOrganizationGroups", () => {
    it("successfully gets organization groups", async () => {
      const mockGroups = [
        {
          id: 1,
          name: "Admins",
          description: "Organization administrators",
          role: {
            id: 1,
            name: "Admin",
            description: "Full permissions",
          },
          memberCount: 3,
        },
        {
          id: 2,
          name: "Tournament Organizers",
          description: "Can create and manage tournaments",
          role: {
            id: 2,
            name: "TO",
            description: "Tournament organizer role",
          },
          memberCount: 5,
        },
      ];
      (supabaseModule.listOrganizationGroups as jest.Mock).mockResolvedValue(
        mockGroups
      );

      const result = await getOrganizationGroups(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockGroups);
        expect(result.data).toHaveLength(2);
      }
      expect(supabaseModule.listOrganizationGroups).toHaveBeenCalledWith(
        mockSupabase,
        1
      );
    });

    it("returns empty array when no groups exist", async () => {
      (supabaseModule.listOrganizationGroups as jest.Mock).mockResolvedValue(
        []
      );

      const result = await getOrganizationGroups(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("handles groups with null description", async () => {
      const mockGroups = [
        {
          id: 1,
          name: "Staff",
          description: null,
          role: {
            id: 1,
            name: "Staff",
            description: null,
          },
          memberCount: 0,
        },
      ];
      (supabaseModule.listOrganizationGroups as jest.Mock).mockResolvedValue(
        mockGroups
      );

      const result = await getOrganizationGroups(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0]!.description).toBeNull();
        expect(result.data[0]!.role!.description).toBeNull();
      }
    });

    it("handles groups with null role", async () => {
      const mockGroups = [
        {
          id: 1,
          name: "Unassigned",
          description: "Staff without a role",
          role: null,
          memberCount: 2,
        },
      ];
      (supabaseModule.listOrganizationGroups as jest.Mock).mockResolvedValue(
        mockGroups
      );

      const result = await getOrganizationGroups(1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0]!.role).toBeNull();
      }
    });

    it("returns error when fetch fails", async () => {
      (supabaseModule.listOrganizationGroups as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getOrganizationGroups(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to fetch groups");
      }
    });

    it("returns error when organization not found", async () => {
      (supabaseModule.listOrganizationGroups as jest.Mock).mockRejectedValue(
        new Error("Organization does not exist")
      );

      const result = await getOrganizationGroups(999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy(); // "Failed to fetch groups");
      }
    });
  });
});
