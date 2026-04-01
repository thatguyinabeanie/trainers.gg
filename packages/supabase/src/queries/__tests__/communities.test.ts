import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { organizationFactory } from "@trainers/test-utils/factories";
import {
  listPublicCommunities,
  listCommunities,
  getCommunityBySlug,
  getCommunityById,
  listMyCommunities,
  canManageCommunity,
  listCommunityStaff,
  hasCommunityAccess,
  getMyCommunityInvitations,
  getCommunityInvitations,
  listMyOwnedCommunities,
  getCommunityWithTournamentStats,
  listCommunityTournaments,
  listCommunityStaffWithRoles,
  listCommunityGroups,
  searchUsersForInvite,
  hasCommunityPermission,
  getCommunityStats,
  getTopReturningPlayers,
  getCommunityActivity,
} from "../communities";
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

describe("communities queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listPublicCommunities", () => {
    it("should fetch active organizations with tournament counts", async () => {
      const mockOrgs = [
        { id: 1, name: "Org One", slug: "org-one", status: "active" },
        { id: 2, name: "Org Two", slug: "org-two", status: "active" },
      ];

      const mockCounts = [
        { community_id: 1, total_count: 10, active_count: 3 },
        { community_id: 2, total_count: 5, active_count: 1 },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockOrgs, error: null }).then(resolve);
      });

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: mockCounts,
        error: null,
      });

      const result = await listPublicCommunities(mockClient);

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
        "get_community_tournament_counts",
        { community_ids: [1, 2] }
      );
    });

    it("should return empty array when no organizations exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await listPublicCommunities(mockClient);

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

      const result = await listPublicCommunities(mockClient);

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

    it("should include discord_invite_url in returned organizations", async () => {
      const mockOrg = organizationFactory.build({
        discord_invite_url: "https://discord.gg/test-server",
      });

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [mockOrg], error: null }).then(resolve);
      });

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: [
          {
            community_id: mockOrg.id,
            total_count: 0,
            active_count: 0,
          },
        ],
        error: null,
      });

      const result = await listPublicCommunities(mockClient);

      expect(result).toHaveLength(1);
      expect(result[0]?.discord_invite_url).toBe(
        "https://discord.gg/test-server"
      );
    });
  });

  describe("listCommunities", () => {
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

      const result = await listCommunities(mockClient);

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

      await listCommunities(mockClient, { searchTerm: "test" });

      expect(mockClient._queryBuilder.or).toHaveBeenCalledWith(
        "name.ilike.%test%,slug.ilike.%test%"
      );
    });

    it("should handle pagination", async () => {
      const mockClient = createMockClient();

      await listCommunities(mockClient, { limit: 20, offset: 40 });

      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(40, 59);
    });
  });

  describe("getCommunityBySlug", () => {
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

      const result = await getCommunityBySlug(mockClient, "test-org");

      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Org");
    }, 10000);

    it("should return null when organization not found", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      });

      const result = await getCommunityBySlug(mockClient, "nonexistent-org");

      expect(result).toBeNull();
    });
  });

  describe("getCommunityById", () => {
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

      const result = await getCommunityById(mockClient, 1);

      expect(result).toEqual(mockOrg);
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("id", 1);
    });

    it("should return null on error", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: null,
        error: new Error("Not found"),
      });

      const result = await getCommunityById(mockClient, 999);

      expect(result).toBeNull();
    });
  });

  describe("listMyCommunities", () => {
    it.skip("should fetch user's owned and staff organizations", async () => {
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

      const result = await listMyCommunities(mockClient);

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

      const result = await listMyCommunities(mockClient);

      expect(result).toEqual([]);
    });
  });

  describe("canManageCommunity", () => {
    it("should return true if user is owner", async () => {
      const mockOrg = { owner_user_id: "user-123" };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockOrg,
        error: null,
      });

      const result = await canManageCommunity(mockClient, 1, "user-123");

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

      const result = await canManageCommunity(mockClient, 1, "user-123");

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

      const result = await canManageCommunity(mockClient, 1, "user-123");

      expect(result).toBe(false);
    });
  });

  describe("listCommunityStaff", () => {
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

      const result = await listCommunityStaff(mockClient, 1);

      expect(result).toEqual(mockStaff);
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "community_id",
        1
      );
    });

    it("should throw error on database failure", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(listCommunityStaff(mockClient, 1)).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("hasCommunityAccess", () => {
    it("should return true if user is owner", async () => {
      const mockOrg = { owner_user_id: "user-123" };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockOrg,
        error: null,
      });

      const result = await hasCommunityAccess(mockClient, 1, "user-123");

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

      const result = await hasCommunityAccess(mockClient, 1, "user-123");

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

      const result = await hasCommunityAccess(mockClient, 1, "user-123");

      expect(result).toBe(false);
    });
  });

  describe("getMyCommunityInvitations", () => {
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

      const result = await getMyCommunityInvitations(mockClient, "user-123");

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
        getMyCommunityInvitations(mockClient, "user-123")
      ).rejects.toThrow("Database error");
    });
  });

  describe("getCommunityInvitations", () => {
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

      const result = await getCommunityInvitations(mockClient, 1);

      expect(result).toEqual(mockInvitations);
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "community_id",
        1
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "status",
        "pending"
      );
    });
  });

  describe("listMyOwnedCommunities", () => {
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

      const result = await listMyOwnedCommunities(mockClient);

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

      const result = await listMyOwnedCommunities(mockClient);

      expect(result).toEqual([]);
    });
  });

  describe("getCommunityWithTournamentStats", () => {
    it.skip("should fetch organization with tournament statistics", async () => {
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

      const result = await getCommunityWithTournamentStats(
        mockClient,
        "test-org"
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Org");
    }, 10000);
  });

  describe("listCommunityTournaments", () => {
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

      const result = await listCommunityTournaments(mockClient, 1);

      expect(result.tournaments).toHaveLength(1);
      expect(result.total).toBe(1);
    }, 10000);

    it("should filter by status", async () => {
      const mockClient = createMockClient();

      await listCommunityTournaments(mockClient, 1, { status: "active" });

      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "status",
        "active"
      );
    });
  });

  describe("listCommunityStaffWithRoles", () => {
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

      const result = await listCommunityStaffWithRoles(mockClient, 1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    }, 10000);
  });

  describe("listCommunityGroups", () => {
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

      const result = await listCommunityGroups(mockClient, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: "Admins",
        memberCount: 3,
      });
    }, 10000);
  });

  describe("searchUsersForInvite", () => {
    it.skip("should search users by username", async () => {
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

    it.skip("should exclude existing staff", async () => {
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

  describe("hasCommunityPermission", () => {
    it("should return true when user has permission", async () => {
      const mockClient = createMockClient();

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await hasCommunityPermission(mockClient, 1, "org_manage");

      expect(result).toBe(true);
      expect(mockClient.rpc).toHaveBeenCalledWith("has_community_permission", {
        p_community_id: 1,
        permission_key: "org_manage",
      });
    });

    it("should return false when user lacks permission", async () => {
      const mockClient = createMockClient();

      (mockClient.rpc as jest.Mock).mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await hasCommunityPermission(mockClient, 1, "org_manage");

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

      const result = await hasCommunityPermission(mockClient, 1, "org_manage");

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  // ===========================================================================
  // getCommunityStats
  // ===========================================================================

  describe("getCommunityStats", () => {
    /**
     * Build a mock client whose .from() calls resolve in the fixed sequence that
     * getCommunityStats issues them:
     *   1. tournaments          (select id, status)
     *   2. tournament_registrations  (select alt_id, alt:alts...) — only when
     *      there are tournaments
     *   3. community_staff      (count)
     *   4. groups               (select id)
     *   5. group_roles          (select id, role:roles(name)) — only when there
     *      are groups
     *   6+. user_group_roles    (count) — one call per non-empty role bucket
     *
     * Callers pass resolved data for each call in order; any unspecified call
     * resolves to `{ data: [], error: null, count: null }`.
     */
    function buildStatsMockClient(
      resolvedCalls: Array<{
        data?: unknown;
        error?: unknown;
        count?: number | null;
      }>
    ) {
      let callIndex = 0;

      const makeBuilder = () => {
        const builder: Record<string, jest.Mock> = {};
        const chainMethods = [
          "select",
          "eq",
          "is",
          "in",
          "order",
          "limit",
          "not",
          "or",
          "ilike",
          "range",
        ];
        for (const method of chainMethods) {
          builder[method] = jest.fn().mockReturnThis();
        }

        // Terminal: .then() resolves to the next pre-configured payload
        builder["then"] = jest.fn(
          (
            resolve: (value: {
              data: unknown;
              error: unknown;
              count?: number | null;
            }) => void
          ) => {
            const payload = resolvedCalls[callIndex++] ?? {
              data: [],
              error: null,
              count: null,
            };
            return Promise.resolve({
              data: payload.data ?? [],
              error: payload.error ?? null,
              count: payload.count ?? null,
            }).then(resolve);
          }
        );

        builder["single"] = jest
          .fn()
          .mockResolvedValue({ data: null, error: null });
        builder["maybeSingle"] = jest
          .fn()
          .mockResolvedValue({ data: null, error: null });

        return builder;
      };

      return {
        from: jest.fn().mockImplementation(() => makeBuilder()),
        rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as unknown as TypedClient;
    }

    it("returns a stats object with all numeric fields", async () => {
      const client = buildStatsMockClient([
        // 1. tournaments
        {
          data: [
            { id: 1, status: "active" },
            { id: 2, status: "completed" },
          ],
        },
        // 2. tournament_registrations
        {
          data: [
            { alt_id: 10, alt: { user_id: "user-a" } },
            { alt_id: 11, alt: { user_id: "user-b" } },
          ],
        },
        // 3. community_staff count
        { data: null, count: 3 },
        // 4. groups
        { data: [] },
      ]);

      const result = await getCommunityStats(client, 1);

      expect(typeof result.totalTournaments).toBe("number");
      expect(typeof result.activeTournaments).toBe("number");
      expect(typeof result.upcomingTournaments).toBe("number");
      expect(typeof result.uniquePlayers).toBe("number");
      expect(typeof result.totalEntries).toBe("number");
      expect(typeof result.staffCount).toBe("number");
      expect(typeof result.adminCount).toBe("number");
      expect(typeof result.judgeCount).toBe("number");
    });

    it("returns zeros when community has no tournaments", async () => {
      const client = buildStatsMockClient([
        // 1. tournaments — empty
        { data: [] },
        // 2. community_staff count
        { data: null, count: 0 },
        // 3. groups
        { data: [] },
      ]);

      const result = await getCommunityStats(client, 99);

      expect(result.totalTournaments).toBe(0);
      expect(result.activeTournaments).toBe(0);
      expect(result.upcomingTournaments).toBe(0);
      expect(result.uniquePlayers).toBe(0);
      expect(result.totalEntries).toBe(0);
    });

    it.each([
      [
        "active only",
        [
          { id: 1, status: "active" },
          { id: 2, status: "active" },
          { id: 3, status: "completed" },
        ],
        2, // activeTournaments
        0, // upcomingTournaments
      ],
      [
        "upcoming only",
        [
          { id: 1, status: "upcoming" },
          { id: 2, status: "completed" },
        ],
        0, // activeTournaments
        1, // upcomingTournaments
      ],
      [
        "mixed active and upcoming",
        [
          { id: 1, status: "active" },
          { id: 2, status: "upcoming" },
          { id: 3, status: "upcoming" },
          { id: 4, status: "completed" },
        ],
        1, // activeTournaments
        2, // upcomingTournaments
      ],
    ])(
      "correctly counts %s tournaments",
      async (_label, tournaments, expectedActive, expectedUpcoming) => {
        const client = buildStatsMockClient([
          // 1. tournaments
          { data: tournaments },
          // 2. tournament_registrations
          { data: [] },
          // 3. community_staff count
          { data: null, count: 0 },
          // 4. groups
          { data: [] },
        ]);

        const result = await getCommunityStats(client, 1);

        expect(result.activeTournaments).toBe(expectedActive);
        expect(result.upcomingTournaments).toBe(expectedUpcoming);
        expect(result.totalTournaments).toBe(tournaments.length);
      }
    );

    it("counts unique players vs total entries correctly", async () => {
      // 3 registrations, but user-a appears twice (different alts, same user)
      const client = buildStatsMockClient([
        // 1. tournaments
        { data: [{ id: 1, status: "active" }] },
        // 2. tournament_registrations — user-a has 2 entries, user-b has 1
        {
          data: [
            { alt_id: 10, alt: { user_id: "user-a" } },
            { alt_id: 11, alt: { user_id: "user-a" } },
            { alt_id: 12, alt: { user_id: "user-b" } },
          ],
        },
        // 3. community_staff count
        { data: null, count: 0 },
        // 4. groups
        { data: [] },
      ]);

      const result = await getCommunityStats(client, 1);

      expect(result.totalEntries).toBe(3);
      expect(result.uniquePlayers).toBe(2);
    });
  });

  // ===========================================================================
  // getTopReturningPlayers
  // ===========================================================================

  describe("getTopReturningPlayers", () => {
    /**
     * Build a mock client for getTopReturningPlayers.
     * The function makes exactly two .from() calls in order:
     *   1. tournaments   (select id) — resolved via .then()
     *   2. tournament_registrations (select tournament_id, alt:alts...) — via .then()
     *
     * When tournaments returns empty the second call never happens.
     */
    function buildTopPlayersMockClient(options: {
      tournaments?: Array<{ id: number }>;
      registrations?: Array<{
        tournament_id: number;
        alt: { user_id: string; username: string; avatar_url: string | null };
      }>;
    }) {
      const { tournaments = [], registrations = [] } = options;
      let callIndex = 0;
      const payloads = [{ data: tournaments }, { data: registrations }];

      const makeBuilder = () => {
        const builder: Record<string, jest.Mock> = {};
        const chainMethods = ["select", "eq", "is", "in", "order", "limit"];
        for (const method of chainMethods) {
          builder[method] = jest.fn().mockReturnThis();
        }
        builder["then"] = jest.fn(
          (resolve: (value: { data: unknown; error: unknown }) => void) => {
            const payload = payloads[callIndex++] ?? { data: [] };
            return Promise.resolve({
              data: payload.data,
              error: null,
            }).then(resolve);
          }
        );
        builder["single"] = jest
          .fn()
          .mockResolvedValue({ data: null, error: null });
        builder["maybeSingle"] = jest
          .fn()
          .mockResolvedValue({ data: null, error: null });
        return builder;
      };

      return {
        from: jest.fn().mockImplementation(() => makeBuilder()),
        rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as unknown as TypedClient;
    }

    it("returns empty array when community has no tournaments", async () => {
      const client = buildTopPlayersMockClient({ tournaments: [] });

      const result = await getTopReturningPlayers(client, 1);

      expect(result).toEqual([]);
    });

    it("returns players sorted by event count descending", async () => {
      const client = buildTopPlayersMockClient({
        tournaments: [{ id: 1 }, { id: 2 }, { id: 3 }],
        registrations: [
          // user-b attends 3 tournaments
          {
            tournament_id: 1,
            alt: { user_id: "user-b", username: "bob", avatar_url: null },
          },
          {
            tournament_id: 2,
            alt: { user_id: "user-b", username: "bob", avatar_url: null },
          },
          {
            tournament_id: 3,
            alt: { user_id: "user-b", username: "bob", avatar_url: null },
          },
          // user-a attends 2 tournaments
          {
            tournament_id: 1,
            alt: { user_id: "user-a", username: "alice", avatar_url: null },
          },
          {
            tournament_id: 2,
            alt: { user_id: "user-a", username: "alice", avatar_url: null },
          },
          // user-c attends 1 tournament
          {
            tournament_id: 1,
            alt: { user_id: "user-c", username: "carol", avatar_url: null },
          },
        ],
      });

      const result = await getTopReturningPlayers(client, 1);

      expect(result).toHaveLength(3);
      expect(result[0]?.userId).toBe("user-b");
      expect(result[0]?.eventCount).toBe(3);
      expect(result[1]?.userId).toBe("user-a");
      expect(result[1]?.eventCount).toBe(2);
      expect(result[2]?.userId).toBe("user-c");
      expect(result[2]?.eventCount).toBe(1);
    });

    it("respects limit parameter", async () => {
      const client = buildTopPlayersMockClient({
        tournaments: [{ id: 1 }, { id: 2 }],
        registrations: [
          {
            tournament_id: 1,
            alt: { user_id: "user-a", username: "alice", avatar_url: null },
          },
          {
            tournament_id: 2,
            alt: { user_id: "user-a", username: "alice", avatar_url: null },
          },
          {
            tournament_id: 1,
            alt: { user_id: "user-b", username: "bob", avatar_url: null },
          },
          {
            tournament_id: 1,
            alt: { user_id: "user-c", username: "carol", avatar_url: null },
          },
        ],
      });

      const result = await getTopReturningPlayers(client, 1, 2);

      expect(result).toHaveLength(2);
    });

    it("counts unique tournaments per user, not duplicate entries in the same tournament", async () => {
      // user-a has two registrations in tournament 1 (different alts), one in tournament 2
      const client = buildTopPlayersMockClient({
        tournaments: [{ id: 1 }, { id: 2 }],
        registrations: [
          {
            tournament_id: 1,
            alt: { user_id: "user-a", username: "alice", avatar_url: null },
          },
          {
            tournament_id: 1,
            alt: { user_id: "user-a", username: "alice", avatar_url: null },
          },
          {
            tournament_id: 2,
            alt: { user_id: "user-a", username: "alice", avatar_url: null },
          },
        ],
      });

      const result = await getTopReturningPlayers(client, 1);

      expect(result).toHaveLength(1);
      // Should be 2 unique tournaments, not 3 raw entries
      expect(result[0]?.eventCount).toBe(2);
    });
  });

  // ===========================================================================
  // getCommunityActivity
  // ===========================================================================

  describe("getCommunityActivity", () => {
    /**
     * getCommunityActivity issues these .from() calls in order:
     *   1. tournaments  (created — select name, created_at) — .then()
     *   2. tournaments  (completed — select name, updated_at) — .then()
     *   3. tournaments  (for registrations — select id, name) — .then()
     *   4. tournament_registrations (select tournament_id, created_at, alt) — .then()
     *      (only when call 3 returns non-empty tournament list)
     *   5. community_staff (select created_at, user) — .then()
     *
     * Payloads are consumed in the order the .from() builders call .then().
     */
    function buildActivityMockClient(
      payloads: Array<{ data: unknown; error?: unknown }>
    ) {
      let callIndex = 0;

      const makeBuilder = () => {
        const builder: Record<string, jest.Mock> = {};
        const chainMethods = [
          "select",
          "eq",
          "is",
          "in",
          "order",
          "limit",
          "not",
          "or",
        ];
        for (const method of chainMethods) {
          builder[method] = jest.fn().mockReturnThis();
        }
        builder["then"] = jest.fn(
          (resolve: (value: { data: unknown; error: unknown }) => void) => {
            const payload = payloads[callIndex++] ?? { data: [], error: null };
            return Promise.resolve({
              data: payload.data,
              error: payload.error ?? null,
            }).then(resolve);
          }
        );
        builder["single"] = jest
          .fn()
          .mockResolvedValue({ data: null, error: null });
        builder["maybeSingle"] = jest
          .fn()
          .mockResolvedValue({ data: null, error: null });
        return builder;
      };

      return {
        from: jest.fn().mockImplementation(() => makeBuilder()),
        rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as unknown as TypedClient;
    }

    it("returns empty array when community has no activity", async () => {
      // All four data sources return empty
      const client = buildActivityMockClient([
        { data: [] }, // created tournaments
        { data: [] }, // completed tournaments
        { data: [] }, // tournaments for registrations (no registrations call)
        { data: [] }, // staff joins
      ]);

      const result = await getCommunityActivity(client, 1);

      expect(result).toEqual([]);
    });

    it("sorts activities by timestamp descending (most recent first)", async () => {
      const client = buildActivityMockClient([
        // created tournaments
        {
          data: [
            { name: "Spring Cup", created_at: "2025-03-01T12:00:00Z" },
            { name: "Winter Cup", created_at: "2025-01-01T12:00:00Z" },
          ],
        },
        // completed tournaments
        {
          data: [{ name: "Fall Cup", updated_at: "2025-09-01T12:00:00Z" }],
        },
        // tournaments for registrations
        { data: [{ id: 10, name: "Spring Cup" }] },
        // registrations
        {
          data: [
            {
              tournament_id: 10,
              created_at: "2025-02-15T12:00:00Z",
              alt: { username: "ash" },
            },
          ],
        },
        // staff joins
        { data: [] },
      ]);

      const result = await getCommunityActivity(client, 1);

      // Items should be newest first
      const timestamps = result.map((item) => item.timestamp);
      for (let i = 1; i < timestamps.length; i++) {
        expect(new Date(timestamps[i - 1]!).getTime()).toBeGreaterThanOrEqual(
          new Date(timestamps[i]!).getTime()
        );
      }
    });

    it("respects limit parameter", async () => {
      // Generate 10 created tournaments
      const manyTournaments = Array.from({ length: 10 }, (_, i) => ({
        name: `Tournament ${i}`,
        created_at: `2025-0${(i % 9) + 1}-01T12:00:00Z`,
      }));

      const client = buildActivityMockClient([
        { data: manyTournaments }, // created
        { data: [] }, // completed
        { data: [] }, // tournaments for registrations
        { data: [] }, // staff joins
      ]);

      const result = await getCommunityActivity(client, 1, 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it.each([
      ["registration", "registration" as const],
      ["tournament_completed", "tournament_completed" as const],
      ["staff_joined", "staff_joined" as const],
      ["tournament_created", "tournament_created" as const],
    ])("includes %s activity type", async (_label, expectedType) => {
      const ts = "2025-06-01T12:00:00Z";

      // Build payloads that produce exactly one item of each type
      const payloads: Array<{ data: unknown }> = [
        // created tournaments
        {
          data:
            expectedType === "tournament_created"
              ? [{ name: "My Cup", created_at: ts }]
              : [],
        },
        // completed tournaments
        {
          data:
            expectedType === "tournament_completed"
              ? [{ name: "My Cup", updated_at: ts }]
              : [],
        },
        // tournaments for registrations
        {
          data:
            expectedType === "registration" ? [{ id: 5, name: "My Cup" }] : [],
        },
        // registrations (only if the previous call returned tournaments)
        ...(expectedType === "registration"
          ? [
              {
                data: [
                  {
                    tournament_id: 5,
                    created_at: ts,
                    alt: { username: "ash" },
                  },
                ],
              },
            ]
          : []),
        // staff joins
        {
          data:
            expectedType === "staff_joined"
              ? [{ created_at: ts, user: { username: "misty" } }]
              : [],
        },
      ];

      const client = buildActivityMockClient(payloads);

      const result = await getCommunityActivity(client, 1);

      const found = result.some((item) => item.type === expectedType);
      expect(found).toBe(true);
    });
  });
});
