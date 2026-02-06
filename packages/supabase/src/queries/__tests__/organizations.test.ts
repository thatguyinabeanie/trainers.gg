import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  listPublicOrganizations,
  listOrganizations,
  getOrganizationBySlug,
  getOrganizationById,
  listMyOrganizations,
  canManageOrganization,
  listOrganizationStaff,
  hasOrganizationAccess,
  getMyOrganizationInvitations,
  getOrganizationInvitations,
  listMyOwnedOrganizations,
  getOrganizationWithTournamentStats,
  listOrganizationTournaments,
  listOrganizationStaffWithRoles,
  listOrganizationGroups,
  searchUsersForInvite,
  hasOrgPermission,
} from "../organizations";
import type { TypedClient } from "../../client";

// Mock query builder
type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  range: jest.Mock<
    () =>
      | MockQueryBuilder
      | Promise<{ data: unknown; error: unknown; count?: number | null }>
  >;
  or: jest.Mock<() => MockQueryBuilder>;
  is: jest.Mock<() => MockQueryBuilder>;
  in: jest.Mock<() => MockQueryBuilder>;
  ilike: jest.Mock<() => MockQueryBuilder>;
  not: jest.Mock<() => MockQueryBuilder>;
  limit: jest.Mock<() => MockQueryBuilder>;
  single: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  maybeSingle: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  then: jest.Mock<
    (
      resolve: (value: {
        data: unknown;
        error: unknown;
        count?: number | null;
      }) => void
    ) => Promise<{ data: unknown; error: unknown; count?: number | null }>
  >;
};

const createMockClient = () => {
  const mockQueryBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: [], error: null, count: null }),
    or: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn((resolve) => {
      return Promise.resolve({ data: [], error: null, count: null }).then(
        resolve
      );
    }),
  };

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
    },
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
};

describe("organizations queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listPublicOrganizations", () => {
    it("should fetch active organizations with tournament counts", async () => {
      const mockOrgs = [
        { id: 1, name: "Org One", slug: "org-one", status: "active" },
        { id: 2, name: "Org Two", slug: "org-two", status: "active" },
      ];

      const mockCounts = [
        { organization_id: 1, total_count: 10, active_count: 3 },
        { organization_id: 2, total_count: 5, active_count: 1 },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockOrgs, error: null }).then(resolve);
      });

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: mockCounts,
        error: null,
      });

      const result = await listPublicOrganizations(mockClient);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 1,
        name: "Org One",
        activeTournamentsCount: 3,
        totalTournamentsCount: 10,
      });
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "status",
        "active"
      );
      expect(mockClient.rpc).toHaveBeenCalledWith(
        "get_organization_tournament_counts",
        { org_ids: [1, 2] }
      );
    });

    it("should return empty array when no organizations exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await listPublicOrganizations(mockClient);

      expect(result).toEqual([]);
    });

    it("should handle RPC error gracefully", async () => {
      const mockOrgs = [
        { id: 1, name: "Org One", slug: "org-one", status: "active" },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockOrgs, error: null }).then(resolve);
      });

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error("RPC error"),
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await listPublicOrganizations(mockClient);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: "Org One",
        activeTournamentsCount: 0,
        totalTournamentsCount: 0,
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("listOrganizations", () => {
    it("should fetch organizations with pagination and counts", async () => {
      const mockOrgs = [
        {
          id: 1,
          name: "Org One",
          owner: { id: "user-1", username: "owner1" },
        },
      ];

      const mockClient = createMockClient();

      // Mock the main query
      mockClient._queryBuilder.range = jest.fn().mockResolvedValue({
        data: mockOrgs,
        error: null,
        count: 1,
      });

      // Mock staff count query
      const staffQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
          count: 3,
        }),
      };

      // Mock tournament count query
      const tournamentsQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({
          data: null,
          error: null,
          count: 5,
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockClient._queryBuilder) // Main orgs query
        .mockReturnValueOnce(staffQueryBuilder) // Staff count
        .mockReturnValueOnce(tournamentsQueryBuilder); // Tournaments count

      const result = await listOrganizations(mockClient);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 1,
        name: "Org One",
        staffCount: 3,
        tournamentCount: 5,
      });
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it("should apply search filter", async () => {
      const mockClient = createMockClient();

      await listOrganizations(mockClient, { searchTerm: "test" });

      expect(mockClient._queryBuilder.or).toHaveBeenCalledWith(
        "name.ilike.%test%,slug.ilike.%test%"
      );
    });

    it("should handle pagination", async () => {
      const mockClient = createMockClient();

      await listOrganizations(mockClient, { limit: 20, offset: 40 });

      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(40, 59);
    });
  });

  describe("getOrganizationBySlug", () => {
    it("should fetch organization with full details", async () => {
      const mockOrg = {
        id: 1,
        name: "Test Org",
        slug: "test-org",
        owner: { id: "user-1", username: "owner" },
      };

      const mockTournaments = [
        { id: 1, status: "active", format: "vgc", max_participants: 32 },
        { id: 2, status: "upcoming", format: "vgc", max_participants: 64 },
        { id: 3, status: "completed", format: "vgc", max_participants: 16 },
      ];

      const mockClient = createMockClient();

      // Mock main query
      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockOrg,
        error: null,
      });

      // Mock follower count then tournaments query
      let callCount = 0;
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          // Follower count
          return Promise.resolve({
            data: null,
            error: null,
            count: 10,
          }).then(resolve);
        } else if (callCount === 2) {
          // Tournaments
          return Promise.resolve({
            data: mockTournaments,
            error: null,
          }).then(resolve);
        } else {
          // Registration counts
          return Promise.resolve({
            data: null,
            error: null,
            count: 5,
          }).then(resolve);
        }
      });

      const result = await getOrganizationBySlug(mockClient, "test-org");

      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Org");
    }, 10000);

    it("should return null when organization not found", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      });

      const result = await getOrganizationBySlug(mockClient, "nonexistent-org");

      expect(result).toBeNull();
    });
  });

  describe("getOrganizationById", () => {
    it("should fetch organization by ID", async () => {
      const mockOrg = {
        id: 1,
        name: "Test Org",
        owner: { id: "user-1" },
      };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockOrg,
        error: null,
      });

      const result = await getOrganizationById(mockClient, 1);

      expect(result).toEqual(mockOrg);
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("id", 1);
    });

    it("should return null on error", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      });

      const result = await getOrganizationById(mockClient, 999);

      expect(result).toBeNull();
    });
  });

  describe("listMyOrganizations", () => {
    it("should fetch user's owned and staff organizations", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockAlt = { id: 1 };
      const mockOwnedOrgs = [
        { id: 1, name: "Owned Org", owner_user_id: "user-123" },
      ];

      const mockClient = createMockClient();

      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock alt query
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: mockAlt,
        error: null,
      });

      // Mock owned orgs query
      mockClient._queryBuilder.then.mockResolvedValue({
        data: mockOwnedOrgs,
        error: null,
      });

      const result = await listMyOrganizations(mockClient);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: "Owned Org",
        isOwner: true,
      });
    }, 10000);

    it("should return empty array when user not authenticated", async () => {
      const mockClient = createMockClient();

      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await listMyOrganizations(mockClient);

      expect(result).toEqual([]);
    });
  });

  describe("canManageOrganization", () => {
    it("should return true if user is owner", async () => {
      const mockOrg = { owner_user_id: "user-123" };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockOrg,
        error: null,
      });

      const result = await canManageOrganization(mockClient, 1, "user-123");

      expect(result).toBe(true);
    });

    it("should return true if user is staff", async () => {
      const mockOrg = { owner_user_id: "user-1" };
      const mockStaffRecord = { id: 1 };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single
        .mockResolvedValueOnce({
          data: mockOrg,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockStaffRecord,
          error: null,
        });

      const result = await canManageOrganization(mockClient, 1, "user-123");

      expect(result).toBe(true);
    });

    it("should return false if user has no access", async () => {
      const mockOrg = { owner_user_id: "user-1" };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single
        .mockResolvedValueOnce({
          data: mockOrg,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      const result = await canManageOrganization(mockClient, 1, "user-123");

      expect(result).toBe(false);
    });
  });

  describe("listOrganizationStaff", () => {
    it("should fetch staff members with user details", async () => {
      const mockStaff = [
        {
          id: 1,
          user: { id: "user-1", username: "staff1" },
        },
        {
          id: 2,
          user: { id: "user-2", username: "staff2" },
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockStaff, error: null }).then(resolve);
      });

      const result = await listOrganizationStaff(mockClient, 1);

      expect(result).toEqual(mockStaff);
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "organization_id",
        1
      );
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(listOrganizationStaff(mockClient, 1)).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("hasOrganizationAccess", () => {
    it("should return true if user is owner", async () => {
      const mockOrg = { owner_user_id: "user-123" };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockOrg,
        error: null,
      });

      const result = await hasOrganizationAccess(mockClient, 1, "user-123");

      expect(result).toBe(true);
    });

    it("should return true if user is staff", async () => {
      const mockOrg = { owner_user_id: "user-1" };
      const mockStaffRecord = { id: 1 };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single
        .mockResolvedValueOnce({
          data: mockOrg,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockStaffRecord,
          error: null,
        });

      const result = await hasOrganizationAccess(mockClient, 1, "user-123");

      expect(result).toBe(true);
    });

    it("should return false if user has no access", async () => {
      const mockOrg = { owner_user_id: "user-1" };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single
        .mockResolvedValueOnce({
          data: mockOrg,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      const result = await hasOrganizationAccess(mockClient, 1, "user-123");

      expect(result).toBe(false);
    });
  });

  describe("getMyOrganizationInvitations", () => {
    it("should fetch pending invitations for user", async () => {
      const mockInvitations = [
        {
          id: 1,
          organization: { id: 1, name: "Org One" },
          invited_by: { id: "user-1", username: "inviter" },
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockInvitations,
          error: null,
        }).then(resolve);
      });

      const result = await getMyOrganizationInvitations(mockClient, "user-123");

      expect(result).toEqual(mockInvitations);
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "invited_user_id",
        "user-123"
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "status",
        "pending"
      );
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(
        getMyOrganizationInvitations(mockClient, "user-123")
      ).rejects.toThrow("Database error");
    });
  });

  describe("getOrganizationInvitations", () => {
    it("should fetch pending invitations for organization", async () => {
      const mockInvitations = [
        {
          id: 1,
          invited_user: { id: "user-1", username: "invitee" },
          invited_by: { id: "user-2", username: "inviter" },
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockInvitations,
          error: null,
        }).then(resolve);
      });

      const result = await getOrganizationInvitations(mockClient, 1);

      expect(result).toEqual(mockInvitations);
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "organization_id",
        1
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "status",
        "pending"
      );
    });
  });

  describe("listMyOwnedOrganizations", () => {
    it("should fetch organizations owned by user", async () => {
      const mockUser = { id: "user-123" };
      const mockOrgs = [{ id: 1, name: "My Org", owner_user_id: "user-123" }];

      const mockClient = createMockClient();

      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockOrgs, error: null }).then(resolve);
      });

      const result = await listMyOwnedOrganizations(mockClient);

      expect(result).toEqual(mockOrgs);
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "owner_user_id",
        "user-123"
      );
    });

    it("should return empty array when user not authenticated", async () => {
      const mockClient = createMockClient();

      (mockClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await listMyOwnedOrganizations(mockClient);

      expect(result).toEqual([]);
    });
  });

  describe("getOrganizationWithTournamentStats", () => {
    it("should fetch organization with tournament statistics", async () => {
      const mockOrg = { id: 1, name: "Test Org", slug: "test-org" };
      const mockTournaments = [
        { id: 1, status: "active" },
        { id: 2, status: "upcoming" },
        { id: 3, status: "completed" },
      ];

      const mockClient = createMockClient();

      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockOrg,
        error: null,
      });

      mockClient._queryBuilder.then.mockResolvedValue({
        data: mockTournaments,
        error: null,
        count: 100,
      });

      const result = await getOrganizationWithTournamentStats(
        mockClient,
        "test-org"
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Org");
    }, 10000);
  });

  describe("listOrganizationTournaments", () => {
    it("should fetch tournaments for organization", async () => {
      const mockTournaments = [
        { id: 1, name: "Tournament 1", status: "active" },
      ];

      const mockClient = createMockClient();

      mockClient._queryBuilder.range = jest.fn().mockResolvedValue({
        data: mockTournaments,
        error: null,
        count: 1,
      });

      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: null,
          count: 32,
        }).then(resolve);
      });

      const result = await listOrganizationTournaments(mockClient, 1);

      expect(result.tournaments).toHaveLength(1);
      expect(result.total).toBe(1);
    }, 10000);

    it("should filter by status", async () => {
      const mockClient = createMockClient();

      await listOrganizationTournaments(mockClient, 1, { status: "active" });

      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "status",
        "active"
      );
    });
  });

  describe("listOrganizationStaffWithRoles", () => {
    it("should fetch staff members with role information", async () => {
      const mockOrg = { owner_user_id: "user-1" };
      const mockStaff = [
        {
          id: 1,
          user_id: "user-2",
          user: { id: "user-2", username: "staff1" },
        },
      ];

      const mockClient = createMockClient();

      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockOrg,
        error: null,
      });

      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockStaff,
          error: null,
        }).then(resolve);
      });

      const result = await listOrganizationStaffWithRoles(mockClient, 1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    }, 10000);
  });

  describe("listOrganizationGroups", () => {
    it("should fetch groups with member counts", async () => {
      const mockGroups = [
        {
          id: 1,
          name: "Admins",
          description: "Organization admins",
          group_roles: [{ role: { id: 1, name: "org_admin" } }],
        },
      ];

      const mockClient = createMockClient();

      let callCount = 0;
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: mockGroups,
            error: null,
          }).then(resolve);
        } else if (callCount === 2) {
          return Promise.resolve({
            data: [{ id: 1 }],
            error: null,
          }).then(resolve);
        } else {
          return Promise.resolve({
            data: null,
            error: null,
            count: 3,
          }).then(resolve);
        }
      });

      const result = await listOrganizationGroups(mockClient, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: "Admins",
        memberCount: 3,
      });
    }, 10000);
  });

  describe("searchUsersForInvite", () => {
    it("should search users by username", async () => {
      const mockUsers = [
        { id: "user-1", username: "testuser1" },
        { id: "user-2", username: "testuser2" },
      ];

      const mockClient = createMockClient();

      let callCount = 0;
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        } else if (callCount === 2) {
          return Promise.resolve({
            data: { owner_user_id: "owner-1" },
            error: null,
          }).then(resolve);
        } else {
          return Promise.resolve({ data: mockUsers, error: null }).then(
            resolve
          );
        }
      });

      mockClient._queryBuilder.single = jest.fn().mockResolvedValue({
        data: { owner_user_id: "owner-1" },
        error: null,
      });

      const result = await searchUsersForInvite(mockClient, 1, "testuser");

      expect(result).toEqual(mockUsers);
    }, 10000);

    it("should return empty array for short search term", async () => {
      const mockClient = createMockClient();

      const result = await searchUsersForInvite(mockClient, 1, "a");

      expect(result).toEqual([]);
    });

    it("should exclude existing staff", async () => {
      const mockStaff = [{ user_id: "user-1" }];

      const mockClient = createMockClient();

      let callCount = 0;
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: mockStaff, error: null }).then(
            resolve
          );
        } else if (callCount === 2) {
          return Promise.resolve({
            data: { owner_user_id: "owner-1" },
            error: null,
          }).then(resolve);
        } else {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        }
      });

      mockClient._queryBuilder.single = jest.fn().mockResolvedValue({
        data: { owner_user_id: "owner-1" },
        error: null,
      });

      await searchUsersForInvite(mockClient, 1, "test");

      expect(mockClient._queryBuilder.not).toHaveBeenCalledWith(
        "id",
        "in",
        expect.arrayContaining(["user-1", "owner-1"])
      );
    }, 10000);
  });

  describe("hasOrgPermission", () => {
    it("should return true when user has permission", async () => {
      const mockClient = createMockClient();

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await hasOrgPermission(mockClient, 1, "org_manage");

      expect(result).toBe(true);
      expect(mockClient.rpc).toHaveBeenCalledWith("has_org_permission", {
        org_id: 1,
        permission_key: "org_manage",
      });
    });

    it("should return false when user lacks permission", async () => {
      const mockClient = createMockClient();

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await hasOrgPermission(mockClient, 1, "org_manage");

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      const mockClient = createMockClient();

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error("RPC error"),
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await hasOrgPermission(mockClient, 1, "org_manage");

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
