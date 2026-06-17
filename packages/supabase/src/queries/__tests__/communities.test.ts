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
  listAllCommunitiesForSudo,
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

  // A minimal private-schema builder that .schema("private") returns.
  // Supports the .from("user_pii").select(...).in(...) chain used by getPiiByUserIds.
  const privateSchemaBuilder: MockQueryBuilder = {
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
  const privateSchema = {
    from: jest.fn().mockReturnValue(privateSchemaBuilder),
    _queryBuilder: privateSchemaBuilder,
  };

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    schema: jest.fn().mockReturnValue(privateSchema),
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      admin: {
        getUserById: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    },
    _queryBuilder: mockQueryBuilder,
    _privateSchema: privateSchema,
  } as unknown as TypedClient & {
    _queryBuilder: MockQueryBuilder;
    _privateSchema: typeof privateSchema;
  };
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
    /**
     * Build a mock client for listCommunityStaffWithRoles.
     *
     * The function issues .from() calls in this order (all via the public schema):
     *   0. communities — .single() → owner_user_id
     *   1. community_staff — .then() → staff rows
     *   2. groups — .then() → groups (empty for simple case)
     *   3. group_roles — .then() → group roles (empty for simple case)
     *   4. user_group_roles — .then() → user group roles (empty for simple case)
     *   5. users — .single() → owner user row
     *
     * Plus:
     *   - supabase.schema("private").from("user_pii") — .then() → PII rows
     *   - supabase.auth.admin.getUserById(id) → email rows (one per user)
     */
    /**
     * Build mock clients sequenced to match listCommunityStaffWithRoles.
     *
     * The public client issues .from() calls in this order:
     *   0. communities  → .single() → { owner_user_id }
     *   1. community_staff → .then() → staff rows
     *   2. groups       → .then() → groups
     *   3. group_roles  → .then() → group roles
     *   4. user_group_roles → .then() → user group roles
     *   5. users        → .single() → owner user row
     *
     * The service client handles PII + email enrichment (3rd arg):
     *   - serviceSupabase.rpc("get_users_pii", ...) → piiRows
     *   - serviceSupabase.auth.admin.getUserById(id) → email (one call per user)
     *
     * Returns { client, serviceClient } — pass both to listCommunityStaffWithRoles.
     */
    function buildStaffWithRolesMockClient(opts: {
      ownerUserId: string;
      staffMembers: Array<{
        id: number;
        user_id: string;
        community_id: number;
        created_at: string | null;
        user: { id: string; username: string | null; image: string | null };
      }>;
      ownerUser: { id: string; username: string | null; image: string | null };
      piiRows?: Array<{
        user_id: string;
        first_name: string | null;
        last_name: string | null;
      }>;
      emailMap?: Record<string, string | null>;
    }): { client: TypedClient; serviceClient: TypedClient } {
      // Pre-define each .from() call's resolution by call index.
      // Each entry has the method used to terminate it and the data to return.
      const fromCalls: Array<{ method: "single" | "then"; data: unknown }> = [
        // 0: communities → .single()
        { method: "single", data: { owner_user_id: opts.ownerUserId } },
        // 1: community_staff → .then()
        { method: "then", data: opts.staffMembers },
        // 2: groups → .then()
        { method: "then", data: [] },
        // 3: group_roles → .then()
        { method: "then", data: [] },
        // 4: user_group_roles → .then()
        { method: "then", data: [] },
        // 5: users (owner) → .single()
        { method: "single", data: opts.ownerUser },
      ];

      let fromIdx = 0;

      const makePublicBuilder = () => {
        const callDef = fromCalls[fromIdx++] ?? { method: "then", data: [] };
        const b: Record<string, unknown> = {};
        const chain = () => b;
        b["select"] = jest.fn().mockImplementation(chain);
        b["eq"] = jest.fn().mockImplementation(chain);
        b["order"] = jest.fn().mockImplementation(chain);
        b["in"] = jest.fn().mockImplementation(chain);
        b["limit"] = jest.fn().mockImplementation(chain);
        b["not"] = jest.fn().mockImplementation(chain);
        b["single"] = jest
          .fn()
          .mockResolvedValue({ data: callDef.data, error: null });
        b["maybeSingle"] = jest
          .fn()
          .mockResolvedValue({ data: null, error: null });
        b["then"] = jest
          .fn()
          .mockImplementation((resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: callDef.data, error: null }).then(resolve)
          );
        return b;
      };

      // Service-role client: handles get_users_pii RPC + auth.admin emails.
      // Both helpers require service role — the RPC is EXECUTE-granted to
      // service_role only; auth.admin is likewise service-role-only.
      const piiRows = opts.piiRows ?? [];
      const emailMap = opts.emailMap ?? {};

      const getUserById = jest.fn().mockImplementation((id: string) =>
        Promise.resolve({
          data: { user: { email: emailMap[id] ?? null } },
          error: null,
        })
      );

      const serviceClient = {
        rpc: jest.fn().mockResolvedValue({ data: piiRows, error: null }),
        auth: {
          admin: { getUserById },
        },
      } as unknown as TypedClient;

      const client = {
        from: jest.fn().mockImplementation(makePublicBuilder),
        rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
          admin: {
            getUserById: jest
              .fn()
              .mockResolvedValue({ data: { user: null }, error: null }),
          },
        },
      } as unknown as TypedClient;

      return { client, serviceClient };
    }

    it("returns an array with the owner listed first", async () => {
      const { client, serviceClient } = buildStaffWithRolesMockClient({
        ownerUserId: "user-1",
        staffMembers: [
          {
            id: 1,
            user_id: "user-2",
            community_id: 1,
            created_at: "2025-01-01T00:00:00Z",
            user: { id: "user-2", username: "staff1", image: null },
          },
        ],
        ownerUser: { id: "user-1", username: "owner1", image: null },
        piiRows: [
          { user_id: "user-1", first_name: "Owner", last_name: "One" },
          { user_id: "user-2", first_name: "Staff", last_name: "Member" },
        ],
        emailMap: {
          "user-1": "owner@example.com",
          "user-2": "staff@example.com",
        },
      });

      const result = await listCommunityStaffWithRoles(client, 1, serviceClient);

      expect(Array.isArray(result)).toBe(true);
      // Owner (not in staff table) is prepended first
      expect(result[0]?.isOwner).toBe(true);
      expect(result[0]?.user_id).toBe("user-1");
      expect(result[0]?.user?.first_name).toBe("Owner");
      expect(result[0]?.user?.email).toBe("owner@example.com");
    }, 10000);

    it("merges PII and email into each staff member", async () => {
      const { client, serviceClient } = buildStaffWithRolesMockClient({
        ownerUserId: "user-owner",
        staffMembers: [
          {
            id: 5,
            user_id: "user-staff",
            community_id: 1,
            created_at: null,
            user: { id: "user-staff", username: "brock", image: null },
          },
        ],
        ownerUser: { id: "user-owner", username: "owner", image: null },
        piiRows: [
          { user_id: "user-staff", first_name: "Brock", last_name: "Rock" },
        ],
        emailMap: { "user-staff": "brock@example.com" },
      });

      const result = await listCommunityStaffWithRoles(client, 1, serviceClient);

      const staffMember = result.find((r) => r.user_id === "user-staff");
      expect(staffMember).toBeDefined();
      expect(staffMember?.user?.first_name).toBe("Brock");
      expect(staffMember?.user?.last_name).toBe("Rock");
      expect(staffMember?.user?.email).toBe("brock@example.com");
    }, 10000);

    it("returns empty array when community has no staff and no owner row", async () => {
      const { client, serviceClient } = buildStaffWithRolesMockClient({
        ownerUserId: "user-owner",
        staffMembers: [],
        // owner user lookup returns null — owner not in users table
        ownerUser: null as unknown as {
          id: string;
          username: string | null;
          image: string | null;
        },
      });

      const result = await listCommunityStaffWithRoles(client, 1, serviceClient);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
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
    /**
     * Build per-call mock clients for searchUsersForInvite.
     *
     * The function issues .from() calls in this order on the public client:
     *   0. community_staff → .then() → existing staff user_ids
     *   1. communities     → .single() → { owner_user_id }
     *   2. users           → .then() (after .ilike().limit() / .not().limit()) → matching users
     *
     * Plus a serviceSupabase client for PII enrichment:
     *   - serviceSupabase.rpc("get_users_pii", ...) → piiRows
     */
    function buildSearchMockClient(opts: {
      existingStaff?: string[];
      ownerUserId?: string;
      searchResults?: Array<{
        id: string;
        username: string | null;
        image: string | null;
      }>;
      piiRows?: Array<{
        user_id: string;
        first_name: string | null;
        last_name: string | null;
      }>;
    }): { client: TypedClient; serviceClient: TypedClient } {
      const {
        existingStaff = [],
        ownerUserId = "owner-1",
        searchResults = [],
        piiRows = [],
      } = opts;

      const staffData = existingStaff.map((id) => ({ user_id: id }));

      // Track which .from() call we are on
      let fromIdx = 0;

      const makeThenBuilder = (data: unknown) => {
        const b: Record<string, unknown> = {};
        const chain = () => b;
        b["select"] = jest.fn().mockImplementation(chain);
        b["eq"] = jest.fn().mockImplementation(chain);
        b["in"] = jest.fn().mockImplementation(chain);
        b["ilike"] = jest.fn().mockImplementation(chain);
        b["not"] = jest.fn().mockImplementation(chain);
        b["limit"] = jest.fn().mockImplementation(chain);
        b["order"] = jest.fn().mockImplementation(chain);
        b["single"] = jest.fn().mockResolvedValue({ data: null, error: null });
        b["maybeSingle"] = jest.fn().mockResolvedValue({ data: null, error: null });
        b["then"] = jest.fn().mockImplementation(
          (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data, error: null }).then(resolve)
        );
        return b;
      };

      const makeSingleBuilder = (data: unknown) => {
        const b: Record<string, unknown> = {};
        const chain = () => b;
        b["select"] = jest.fn().mockImplementation(chain);
        b["eq"] = jest.fn().mockImplementation(chain);
        b["single"] = jest.fn().mockResolvedValue({ data, error: null });
        b["maybeSingle"] = jest.fn().mockResolvedValue({ data: null, error: null });
        b["then"] = jest.fn().mockImplementation(
          (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data, error: null }).then(resolve)
        );
        return b;
      };

      const client = {
        from: jest.fn().mockImplementation(() => {
          const idx = fromIdx++;
          if (idx === 0) return makeThenBuilder(staffData); // community_staff
          if (idx === 1) return makeSingleBuilder({ owner_user_id: ownerUserId }); // communities
          return makeThenBuilder(searchResults); // users
        }),
        rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
          admin: {
            getUserById: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
          },
        },
      } as unknown as TypedClient;

      const serviceClient = {
        rpc: jest.fn().mockResolvedValue({ data: piiRows, error: null }),
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
          },
        },
      } as unknown as TypedClient;

      return { client, serviceClient };
    }

    it("should search users by username", async () => {
      const searchResults = [
        { id: "user-2", username: "testuser1", image: null },
        { id: "user-3", username: "testuser2", image: null },
      ];

      const { client, serviceClient } = buildSearchMockClient({
        existingStaff: [],
        ownerUserId: "owner-1",
        searchResults,
        piiRows: [],
      });

      const result = await searchUsersForInvite(
        client,
        1,
        "testuser",
        10,
        serviceClient
      );

      // Results enriched with null PII names since no piiRows provided
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "user-2",
        username: "testuser1",
        first_name: null,
        last_name: null,
      });
      expect(result[1]).toMatchObject({
        id: "user-3",
        username: "testuser2",
        first_name: null,
        last_name: null,
      });
    }, 10000);

    it("should return empty array for short search term", async () => {
      const mockClient = createMockClient();

      const result = await searchUsersForInvite(mockClient, 1, "a");

      expect(result).toEqual([]);
    });

    it("should exclude existing staff from search results", async () => {
      // user-1 is existing staff; only non-staff users should appear in search results
      const { client, serviceClient } = buildSearchMockClient({
        existingStaff: ["user-1"],
        ownerUserId: "owner-1",
        searchResults: [], // DB returns empty because staff excluded server-side
        piiRows: [],
      });

      const result = await searchUsersForInvite(
        client,
        1,
        "test",
        10,
        serviceClient
      );

      // The users query builder should have had .not() called to exclude staff + owner
      expect(result).toEqual([]);
      // Verify that the users .from() was called (idx=2) and .not was available in the chain
      expect(client.from).toHaveBeenCalledTimes(3);
    }, 10000);

    it("should enrich results with PII names from serviceSupabase", async () => {
      const { client, serviceClient } = buildSearchMockClient({
        searchResults: [{ id: "user-42", username: "ash", image: null }],
        piiRows: [{ user_id: "user-42", first_name: "Ash", last_name: "Ketchum" }],
      });

      const result = await searchUsersForInvite(
        client,
        1,
        "ash",
        10,
        serviceClient
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "user-42",
        username: "ash",
        first_name: "Ash",
        last_name: "Ketchum",
      });
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
     * getCommunityStats issues them.
     *
     * The function runs the first three queries in parallel via Promise.all,
     * so their .then() callbacks fire in creation order (0→1→2), followed by
     * the sequential registrations query (only when tournaments exist):
     *
     *   0. tournaments          (select id, status)           — parallel
     *   1. community_staff      (count)                       — parallel
     *   2. groups               (select id)                   — parallel
     *   3. tournament_registrations  (select alt_id, alt:alts...)
     *      — only when there are tournaments
     *   4. group_roles          (select id, role:roles(name)) — only when there
     *      are groups
     *   5+. user_group_roles    (count) — one call per non-empty role bucket
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
        // 0. tournaments (parallel)
        {
          data: [
            { id: 1, status: "active" },
            { id: 2, status: "completed" },
          ],
        },
        // 1. community_staff count (parallel)
        { data: null, count: 3 },
        // 2. groups (parallel)
        { data: [] },
        // 3. tournament_registrations (sequential, after parallel batch)
        {
          data: [
            { alt_id: 10, alt: { user_id: "user-a" } },
            { alt_id: 11, alt: { user_id: "user-b" } },
          ],
        },
      ]);

      const result = await getCommunityStats(client, 1);

      expect(typeof result.totalTournaments).toBe("number");
      expect(typeof result.activeTournaments).toBe("number");
      expect(typeof result.uniquePlayers).toBe("number");
      expect(typeof result.totalEntries).toBe("number");
      expect(typeof result.staffCount).toBe("number");
      expect(typeof result.adminCount).toBe("number");
      expect(typeof result.judgeCount).toBe("number");
    });

    it("returns zeros when community has no tournaments", async () => {
      const client = buildStatsMockClient([
        // 0. tournaments — empty (parallel)
        { data: [] },
        // 1. community_staff count (parallel)
        { data: null, count: 0 },
        // 2. groups (parallel)
        { data: [] },
        // no registrations call — tournament list is empty
      ]);

      const result = await getCommunityStats(client, 99);

      expect(result.totalTournaments).toBe(0);
      expect(result.activeTournaments).toBe(0);
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
        2,
      ],
      [
        "upcoming only",
        [
          { id: 1, status: "upcoming" },
          { id: 2, status: "completed" },
        ],
        0,
      ],
      [
        "mixed active and upcoming",
        [
          { id: 1, status: "active" },
          { id: 2, status: "upcoming" },
          { id: 3, status: "upcoming" },
          { id: 4, status: "completed" },
        ],
        1,
      ],
    ])(
      "correctly counts %s tournaments",
      async (_label, tournaments, expectedActive) => {
        const client = buildStatsMockClient([
          { data: tournaments },
          { data: null, count: 0 },
          { data: [] },
          { data: [] },
        ]);

        const result = await getCommunityStats(client, 1);

        expect(result.activeTournaments).toBe(expectedActive);
        expect(result.totalTournaments).toBe(tournaments.length);
      }
    );

    it("counts unique players vs total entries correctly", async () => {
      // 3 registrations, but user-a appears twice (different alts, same user)
      const client = buildStatsMockClient([
        // 0. tournaments (parallel)
        { data: [{ id: 1, status: "active" }] },
        // 1. community_staff count (parallel)
        { data: null, count: 0 },
        // 2. groups (parallel)
        { data: [] },
        // 3. tournament_registrations count query — count: 3 (sequential, head:true)
        { data: null, count: 3 },
        // 4. tournament_registrations user_id join — user-a has 2 entries, user-b has 1 (sequential)
        {
          data: [
            { alt: { user_id: "user-a" } },
            { alt: { user_id: "user-a" } },
            { alt: { user_id: "user-b" } },
          ],
        },
      ]);

      const result = await getCommunityStats(client, 1);

      expect(result.totalEntries).toBe(3);
      expect(result.uniquePlayers).toBe(2);
    });

    it.each([
      [
        "tournaments query fails",
        [
          { data: null, error: { message: "tournaments DB error" } },
          { data: null, count: 0 },
          { data: [] },
        ],
        "Failed to fetch tournament counts: tournaments DB error",
      ],
      [
        "staff query fails",
        [
          { data: [] },
          { data: null, error: { message: "staff DB error" } },
          { data: [] },
        ],
        "Failed to fetch staff count: staff DB error",
      ],
      [
        "groups query fails",
        [
          { data: [] },
          { data: null, count: 0 },
          { data: null, error: { message: "groups DB error" } },
        ],
        "Failed to fetch groups: groups DB error",
      ],
    ])("throws when the %s", async (_label, resolvedCalls, expectedMessage) => {
      const client = buildStatsMockClient(resolvedCalls);

      await expect(getCommunityStats(client, 1)).rejects.toThrow(
        expectedMessage
      );
    });
  });

  // ===========================================================================
  // getTopReturningPlayers
  // ===========================================================================

  describe("getTopReturningPlayers", () => {
    /**
     * Build a mock client for getTopReturningPlayers.
     * The function uses a single supabase.rpc("get_top_returning_players", {...})
     * call that returns pre-aggregated rows from the database.
     */
    function buildTopPlayersMockClient(
      rpcData: Array<{
        user_id: string;
        username: string;
        avatar_url: string | null;
        event_count: number;
      }>
    ) {
      const makeBuilder = () => {
        const builder: Record<string, jest.Mock> = {};
        const chainMethods = ["select", "eq", "is", "in", "order", "limit"];
        for (const method of chainMethods) {
          builder[method] = jest.fn().mockReturnThis();
        }
        builder["then"] = jest.fn(
          (resolve: (value: { data: unknown; error: unknown }) => void) =>
            Promise.resolve({ data: [], error: null }).then(resolve)
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
        rpc: jest.fn().mockResolvedValue({ data: rpcData, error: null }),
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
        },
      } as unknown as TypedClient;
    }

    it("returns empty array when RPC returns no rows", async () => {
      const client = buildTopPlayersMockClient([]);

      const result = await getTopReturningPlayers(client, 1);

      expect(result).toEqual([]);
    });

    it("maps RPC rows to TopPlayer objects sorted by event count descending", async () => {
      const client = buildTopPlayersMockClient([
        // RPC returns rows already sorted descending by event_count
        {
          user_id: "user-b",
          username: "bob",
          avatar_url: null,
          event_count: 3,
        },
        {
          user_id: "user-a",
          username: "alice",
          avatar_url: null,
          event_count: 2,
        },
        {
          user_id: "user-c",
          username: "carol",
          avatar_url: null,
          event_count: 1,
        },
      ]);

      const result = await getTopReturningPlayers(client, 1);

      expect(result).toHaveLength(3);
      expect(result[0]?.userId).toBe("user-b");
      expect(result[0]?.eventCount).toBe(3);
      expect(result[1]?.userId).toBe("user-a");
      expect(result[1]?.eventCount).toBe(2);
      expect(result[2]?.userId).toBe("user-c");
      expect(result[2]?.eventCount).toBe(1);
    });

    it("passes the limit parameter to the RPC call", async () => {
      const client = buildTopPlayersMockClient([
        {
          user_id: "user-a",
          username: "alice",
          avatar_url: null,
          event_count: 2,
        },
        {
          user_id: "user-b",
          username: "bob",
          avatar_url: null,
          event_count: 1,
        },
      ]);

      const result = await getTopReturningPlayers(client, 42, 2);

      expect(result).toHaveLength(2);
      expect(client.rpc).toHaveBeenCalledWith("get_top_returning_players", {
        p_community_id: 42,
        p_limit: 2,
      });
    });

    it("maps snake_case RPC fields to camelCase TopPlayer fields", async () => {
      const client = buildTopPlayersMockClient([
        {
          user_id: "user-x",
          username: "xavier",
          avatar_url: "https://example.com/avatar.png",
          event_count: 5,
        },
      ]);

      const result = await getTopReturningPlayers(client, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: "user-x",
        username: "xavier",
        avatarUrl: "https://example.com/avatar.png",
        eventCount: 5,
      });
    });
  });

  // ===========================================================================
  // getCommunityActivity
  // ===========================================================================

  describe("getCommunityActivity", () => {
    /**
     * getCommunityActivity uses Promise.all with 4 parallel queries.
     * Each query gets its own .from() builder, so payloads are consumed
     * in the order the builders are created (creation order = Promise.all order):
     *
     *   0. tournaments (created — select name, created_at)
     *   1. tournaments (completed — select name, updated_at)
     *   2. tournament_registrations (select tournament_id, created_at, alt, tournament)
     *   3. community_staff (select created_at, user)
     */
    function buildActivityMockClient(
      payloads: Array<{ data: unknown; error?: unknown }>
    ) {
      let callIndex = 0;

      const makeBuilder = () => {
        const idx = callIndex++;
        const payload = payloads[idx] ?? { data: [], error: null };

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
          (resolve: (value: { data: unknown; error: unknown }) => void) =>
            Promise.resolve({
              data: payload.data,
              error: payload.error ?? null,
            }).then(resolve)
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
      const client = buildActivityMockClient([
        { data: [] }, // 0. created tournaments
        { data: [] }, // 1. completed tournaments
        { data: [] }, // 2. registrations
        { data: [] }, // 3. staff joins
      ]);

      const result = await getCommunityActivity(client, 1);

      expect(result).toEqual([]);
    });

    it("sorts activities by timestamp descending (most recent first)", async () => {
      const client = buildActivityMockClient([
        // 0. created tournaments
        {
          data: [
            { name: "Spring Cup", created_at: "2025-03-01T12:00:00Z" },
            { name: "Winter Cup", created_at: "2025-01-01T12:00:00Z" },
          ],
        },
        // 1. completed tournaments
        {
          data: [{ name: "Fall Cup", updated_at: "2025-09-01T12:00:00Z" }],
        },
        // 2. registrations
        {
          data: [
            {
              tournament_id: 10,
              created_at: "2025-02-15T12:00:00Z",
              alt: { username: "ash" },
              tournament: { name: "Spring Cup", community_id: 1 },
            },
          ],
        },
        // 3. staff joins
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
      // 10 created tournaments — each becomes one activity item
      const manyTournaments = Array.from({ length: 10 }, (_, i) => ({
        name: `Tournament ${i}`,
        created_at: `2025-0${(i % 9) + 1}-01T12:00:00Z`,
      }));

      const client = buildActivityMockClient([
        { data: manyTournaments }, // 0. created tournaments
        { data: [] }, // 1. completed tournaments
        { data: [] }, // 2. registrations
        { data: [] }, // 3. staff joins
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

      const client = buildActivityMockClient([
        // 0. created tournaments
        {
          data:
            expectedType === "tournament_created"
              ? [{ name: "My Cup", created_at: ts }]
              : [],
        },
        // 1. completed tournaments
        {
          data:
            expectedType === "tournament_completed"
              ? [{ name: "My Cup", updated_at: ts }]
              : [],
        },
        // 2. registrations (inner-joined with tournaments)
        {
          data:
            expectedType === "registration"
              ? [
                  {
                    tournament_id: 5,
                    created_at: ts,
                    alt: { username: "ash" },
                    tournament: { name: "My Cup", community_id: 1 },
                  },
                ]
              : [],
        },
        // 3. staff joins
        {
          data:
            expectedType === "staff_joined"
              ? [{ created_at: ts, user: { username: "misty" } }]
              : [],
        },
      ]);

      const result = await getCommunityActivity(client, 1);

      const found = result.some((item) => item.type === expectedType);
      expect(found).toBe(true);
    });

    it.each([
      [
        "created tournaments query fails",
        [
          { data: null, error: { message: "created tournaments DB error" } },
          { data: [] },
          { data: [] },
          { data: [] },
        ],
        "Failed to fetch created tournaments: created tournaments DB error",
      ],
      [
        "completed tournaments query fails",
        [
          { data: [] },
          { data: null, error: { message: "completed tournaments DB error" } },
          { data: [] },
          { data: [] },
        ],
        "Failed to fetch completed tournaments: completed tournaments DB error",
      ],
      [
        "registrations query fails",
        [
          { data: [] },
          { data: [] },
          { data: null, error: { message: "registrations DB error" } },
          { data: [] },
        ],
        "Failed to fetch registrations: registrations DB error",
      ],
      [
        "staff joins query fails",
        [
          { data: [] },
          { data: [] },
          { data: [] },
          { data: null, error: { message: "staff joins DB error" } },
        ],
        "Failed to fetch staff joins: staff joins DB error",
      ],
    ])("throws when the %s", async (_label, payloads, expectedMessage) => {
      const client = buildActivityMockClient(payloads);

      await expect(getCommunityActivity(client, 1)).rejects.toThrow(
        expectedMessage
      );
    });
  });

  describe("listAllCommunitiesForSudo", () => {
    it("returns all communities with isOwner: false and isSudoAccess: true", async () => {
      const communities = organizationFactory.buildList(3, {
        status: "active",
      });

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: communities, error: null }).then(
          resolve
        );
      });

      const result = await listAllCommunitiesForSudo(mockClient);

      expect(result).toHaveLength(3);
      result.forEach((community) => {
        expect(community.isOwner).toBe(false);
        expect(community.isSudoAccess).toBe(true);
      });
    });

    it("preserves the original community fields alongside the sudo flags", async () => {
      const community = organizationFactory.build({
        name: "Pallet Town League",
        slug: "pallet-town-league",
        status: "active",
      });

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [community], error: null }).then(
          resolve
        );
      });

      const result = await listAllCommunitiesForSudo(mockClient);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "Pallet Town League",
        slug: "pallet-town-league",
        status: "active",
        isOwner: false,
        isSudoAccess: true,
      });
    });

    it("returns empty array when no communities exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await listAllCommunitiesForSudo(mockClient);

      expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      const result = await listAllCommunitiesForSudo(mockClient);

      expect(result).toEqual([]);
    });

    it("throws when Supabase returns an error", async () => {
      const dbError = new Error("permission denied for table communities");

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(listAllCommunitiesForSudo(mockClient)).rejects.toThrow(
        "permission denied for table communities"
      );
    });

    it("queries communities with no filters and orders by name", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      await listAllCommunitiesForSudo(mockClient);

      expect(mockClient.from).toHaveBeenCalledWith("communities");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("*");
      // Only name ordering is done at DB level — status sorting happens in JS
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith("name", {
        ascending: true,
      });
      expect(mockClient._queryBuilder.order).toHaveBeenCalledTimes(1);
    });

    it("sorts results by status order (active first) then name", async () => {
      const mockClient = createMockClient();
      const unsorted = [
        { id: 1, name: "Zebra", status: "pending" },
        { id: 2, name: "Alpha", status: "active" },
        { id: 3, name: "Beta", status: "suspended" },
        { id: 4, name: "Alpha", status: "pending" },
      ];
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: unsorted, error: null }).then(resolve);
      });

      const result = await listAllCommunitiesForSudo(mockClient);

      expect(result.map((c) => c.id)).toEqual([2, 4, 1, 3]);
    });
  });
});
