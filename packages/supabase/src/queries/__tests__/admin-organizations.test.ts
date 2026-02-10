import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  listOrganizationsAdmin,
  getOrganizationAdminDetails,
  approveOrganization,
  rejectOrganization,
  suspendOrganization,
  unsuspendOrganization,
  transferOrgOwnership,
} from "../admin-organizations";
import type { TypedClient } from "../../client";

// ---------------------------------------------------------------------------
// Mock Supabase client factory
// ---------------------------------------------------------------------------

type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  insert: jest.Mock<() => MockQueryBuilder>;
  update: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  or: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  range: jest.Mock<
    () => Promise<{ data: unknown; error: unknown; count?: number | null }>
  >;
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
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn((resolve) => {
      return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
    }),
  };

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
};

// ---------------------------------------------------------------------------
// Helper: creates a mock for the typical mutation pattern
// (update -> select -> single) + (audit_log insert)
// ---------------------------------------------------------------------------

function setupMutationMocks(
  mockClient: TypedClient & { _queryBuilder: MockQueryBuilder },
  updatedData: unknown,
  updateError: Error | null = null,
  auditError: Error | null = null
) {
  const mockUpdateChain = {
    eq: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: updateError ? null : updatedData,
          error: updateError,
        }),
      }),
    }),
  };

  const mockAuditInsertChain = {
    insert: jest.fn().mockResolvedValue({ data: null, error: auditError }),
  };

  (mockClient.from as jest.Mock)
    .mockReturnValueOnce({
      update: jest.fn().mockReturnValue(mockUpdateChain),
    })
    .mockReturnValueOnce(mockAuditInsertChain);

  return { mockUpdateChain, mockAuditInsertChain };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("admin-organizations queries", () => {
  let consoleErrorSpy: jest.Spied<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // listOrganizationsAdmin
  // -----------------------------------------------------------------------

  describe("listOrganizationsAdmin", () => {
    it("should return organizations with default pagination", async () => {
      const mockOrgs = [
        {
          id: 1,
          name: "Team Rocket",
          slug: "team-rocket",
          status: "active",
          tier: "free",
        },
      ];

      const mockClient = createMockClient();
      // The chain ends with .range() after order()
      mockClient._queryBuilder.range = jest.fn().mockResolvedValue({
        data: mockOrgs,
        error: null,
        count: 1,
      });

      const result = await listOrganizationsAdmin(mockClient);

      expect(result.data).toEqual(mockOrgs);
      expect(result.count).toBe(1);
      expect(mockClient.from).toHaveBeenCalledWith("organizations");
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
      // Default: offset=0, limit=25 => range(0, 24)
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(0, 24);
    });

    it("should apply search filter across name and slug", async () => {
      const mockClient = createMockClient();

      await listOrganizationsAdmin(mockClient, { search: "rocket" });

      expect(mockClient._queryBuilder.or).toHaveBeenCalledWith(
        "name.ilike.%rocket%,slug.ilike.%rocket%"
      );
    });

    it("should apply status filter", async () => {
      const mockClient = createMockClient();

      await listOrganizationsAdmin(mockClient, {
        status: "pending" as never,
      });

      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "status",
        "pending"
      );
    });

    it("should apply tier filter", async () => {
      const mockClient = createMockClient();

      await listOrganizationsAdmin(mockClient, { tier: "free" as never });

      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("tier", "free");
    });

    it("should use custom limit and offset", async () => {
      const mockClient = createMockClient();

      await listOrganizationsAdmin(mockClient, { limit: 10, offset: 50 });

      // range(50, 50 + 10 - 1) = range(50, 59)
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(50, 59);
    });

    it("should apply all filters together", async () => {
      const mockClient = createMockClient();

      await listOrganizationsAdmin(mockClient, {
        search: "team",
        status: "active" as never,
        tier: "free" as never,
        limit: 5,
        offset: 10,
      });

      expect(mockClient._queryBuilder.or).toHaveBeenCalled();
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "status",
        "active"
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("tier", "free");
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(10, 14);
    });

    it("should not apply search filter when search is undefined", async () => {
      const mockClient = createMockClient();

      await listOrganizationsAdmin(mockClient, {});

      expect(mockClient._queryBuilder.or).not.toHaveBeenCalled();
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.range = jest.fn().mockResolvedValue({
        data: null,
        error: dbError,
        count: null,
      });

      await expect(listOrganizationsAdmin(mockClient)).rejects.toThrow(
        "Database error"
      );
    });

    it("should return empty data and zero count when no orgs match", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.range = jest.fn().mockResolvedValue({
        data: null,
        error: null,
        count: null,
      });

      const result = await listOrganizationsAdmin(mockClient);

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getOrganizationAdminDetails
  // -----------------------------------------------------------------------

  describe("getOrganizationAdminDetails", () => {
    it("should return full org details when found", async () => {
      const mockOrg = {
        id: 1,
        name: "Team Rocket",
        slug: "team-rocket",
        status: "active",
        organization_admin_notes: [{ notes: "Approved by admin" }],
        owner: { id: "user-1", username: "giovanni" },
      };

      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: mockOrg,
        error: null,
      });

      const result = await getOrganizationAdminDetails(mockClient, 1);

      expect(result).toEqual(mockOrg);
      expect(mockClient.from).toHaveBeenCalledWith("organizations");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("id", 1);
      expect(mockClient._queryBuilder.maybeSingle).toHaveBeenCalled();
    });

    it("should return null when organization is not found", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getOrganizationAdminDetails(mockClient, 999);

      expect(result).toBeNull();
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(getOrganizationAdminDetails(mockClient, 1)).rejects.toThrow(
        "Database error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // approveOrganization
  // -----------------------------------------------------------------------

  describe("approveOrganization", () => {
    it("should set status to active and create audit log entry", async () => {
      const mockOrg = { id: 1, name: "Team Rocket", status: "active" };
      setupMutationMocks(createMockClient() as never, mockOrg);

      // Create fresh client to properly wire up mocks
      const mockClient = createMockClient();
      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOrg,
              error: null,
            }),
          }),
        }),
      };

      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockAuditChain);

      const result = await approveOrganization(mockClient, 1, "admin-1");

      expect(result).toEqual(mockOrg);
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "organizations");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "audit_log");
      expect(mockAuditChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.org_approved",
          actor_user_id: "admin-1",
          organization_id: 1,
          metadata: expect.objectContaining({
            organization_id: 1,
          }),
        })
      );
    });

    it("should throw on update error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Update failed");

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue(mockUpdateChain),
      });

      await expect(
        approveOrganization(mockClient, 1, "admin-1")
      ).rejects.toThrow("Update failed");
    });

    it("should log console error if audit insert fails but still return data", async () => {
      const mockOrg = { id: 1, name: "Team Rocket", status: "active" };
      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOrg,
              error: null,
            }),
          }),
        }),
      };

      const auditError = new Error("Audit failed");
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: auditError }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockAuditChain);

      const result = await approveOrganization(mockClient, 1, "admin-1");

      expect(result).toEqual(mockOrg);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error inserting org approval audit log:",
        auditError
      );
    });
  });

  // -----------------------------------------------------------------------
  // rejectOrganization
  // -----------------------------------------------------------------------

  describe("rejectOrganization", () => {
    it("should set status to rejected, upsert admin notes, and create audit log", async () => {
      const mockOrg = {
        id: 1,
        name: "Shady Org",
        status: "rejected",
      };

      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOrg,
              error: null,
            }),
          }),
        }),
      };

      const mockNotesChain = {
        upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockNotesChain)
        .mockReturnValueOnce(mockAuditChain);

      const result = await rejectOrganization(
        mockClient,
        1,
        "admin-1",
        "Violates policy"
      );

      expect(result).toEqual(mockOrg);
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "organizations");
      expect(mockClient.from).toHaveBeenNthCalledWith(
        2,
        "organization_admin_notes"
      );
      expect(mockClient.from).toHaveBeenNthCalledWith(3, "audit_log");
      expect(mockNotesChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 1,
          notes: "Violates policy",
          updated_by: "admin-1",
        }),
        { onConflict: "organization_id" }
      );
      expect(mockAuditChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.org_rejected",
          actor_user_id: "admin-1",
          organization_id: 1,
          metadata: expect.objectContaining({
            organization_id: 1,
            reason: "Violates policy",
          }),
        })
      );
    });

    it("should throw on update error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Update failed");

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue(mockUpdateChain),
      });

      await expect(
        rejectOrganization(mockClient, 1, "admin-1", "reason")
      ).rejects.toThrow("Update failed");
    });
  });

  // -----------------------------------------------------------------------
  // suspendOrganization
  // -----------------------------------------------------------------------

  describe("suspendOrganization", () => {
    it("should set status to suspended, upsert admin notes, and create audit log", async () => {
      const mockOrg = {
        id: 1,
        name: "Bad Org",
        status: "suspended",
      };

      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOrg,
              error: null,
            }),
          }),
        }),
      };

      const mockNotesChain = {
        upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockNotesChain)
        .mockReturnValueOnce(mockAuditChain);

      const result = await suspendOrganization(
        mockClient,
        1,
        "admin-1",
        "Repeated violations"
      );

      expect(result).toEqual(mockOrg);
      expect(mockClient.from).toHaveBeenNthCalledWith(
        2,
        "organization_admin_notes"
      );
      expect(mockNotesChain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 1,
          notes: "Repeated violations",
          updated_by: "admin-1",
        }),
        { onConflict: "organization_id" }
      );
      expect(mockAuditChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.org_suspended",
          actor_user_id: "admin-1",
          organization_id: 1,
          metadata: expect.objectContaining({
            organization_id: 1,
            reason: "Repeated violations",
          }),
        })
      );
    });

    it("should throw on update error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Update failed");

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue(mockUpdateChain),
      });

      await expect(
        suspendOrganization(mockClient, 1, "admin-1", "reason")
      ).rejects.toThrow("Update failed");
    });

    it("should log console error if audit insert fails", async () => {
      const mockOrg = { id: 1, name: "Bad Org", status: "suspended" };
      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOrg,
              error: null,
            }),
          }),
        }),
      };

      const mockNotesChain = {
        upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      const auditError = new Error("Audit failed");
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: auditError }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockNotesChain)
        .mockReturnValueOnce(mockAuditChain);

      const result = await suspendOrganization(
        mockClient,
        1,
        "admin-1",
        "reason"
      );

      expect(result).toEqual(mockOrg);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error inserting org suspension audit log:",
        auditError
      );
    });
  });

  // -----------------------------------------------------------------------
  // unsuspendOrganization
  // -----------------------------------------------------------------------

  describe("unsuspendOrganization", () => {
    it("should set status back to active and create audit log", async () => {
      const mockOrg = { id: 1, name: "Org", status: "active" };

      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOrg,
              error: null,
            }),
          }),
        }),
      };

      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockAuditChain);

      const result = await unsuspendOrganization(mockClient, 1, "admin-1");

      expect(result).toEqual(mockOrg);
      expect(mockAuditChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.org_unsuspended",
          actor_user_id: "admin-1",
          organization_id: 1,
          metadata: expect.objectContaining({
            organization_id: 1,
          }),
        })
      );
    });

    it("should throw on update error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Update failed");

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue(mockUpdateChain),
      });

      await expect(
        unsuspendOrganization(mockClient, 1, "admin-1")
      ).rejects.toThrow("Update failed");
    });

    it("should log console error if audit insert fails", async () => {
      const mockOrg = { id: 1, status: "active" };
      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockOrg,
              error: null,
            }),
          }),
        }),
      };

      const auditError = new Error("Audit failed");
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: auditError }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockAuditChain);

      const result = await unsuspendOrganization(mockClient, 1, "admin-1");

      expect(result).toEqual(mockOrg);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error inserting org unsuspend audit log:",
        auditError
      );
    });
  });

  // -----------------------------------------------------------------------
  // transferOrgOwnership
  // -----------------------------------------------------------------------

  describe("transferOrgOwnership", () => {
    it("should transfer ownership and create audit log with previous and new owner", async () => {
      const mockClient = createMockClient();

      // First call: fetch current org to get previous owner
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { owner_user_id: "old-owner" },
              error: null,
            }),
          }),
        }),
      };

      // Second call: update owner
      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 1, owner_user_id: "new-owner" },
              error: null,
            }),
          }),
        }),
      };

      // Third call: audit log insert
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockAuditChain);

      const result = await transferOrgOwnership(
        mockClient,
        1,
        "new-owner",
        "admin-1"
      );

      expect(result).toEqual({ id: 1, owner_user_id: "new-owner" });
      // Three from() calls: fetch, update, audit
      expect(mockClient.from).toHaveBeenCalledTimes(3);
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "organizations");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "organizations");
      expect(mockClient.from).toHaveBeenNthCalledWith(3, "audit_log");
      expect(mockAuditChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.org_ownership_transferred",
          actor_user_id: "admin-1",
          organization_id: 1,
          metadata: expect.objectContaining({
            organization_id: 1,
            previous_owner_user_id: "old-owner",
            new_owner_user_id: "new-owner",
          }),
        })
      );
    });

    it("should throw on fetch error (getting current owner)", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Fetch failed");

      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockFetchChain);

      await expect(
        transferOrgOwnership(mockClient, 1, "new-owner", "admin-1")
      ).rejects.toThrow("Fetch failed");
    });

    it("should throw on update error", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { owner_user_id: "old-owner" },
              error: null,
            }),
          }),
        }),
      };

      const updateError = new Error("Update failed");
      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: updateError,
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        });

      await expect(
        transferOrgOwnership(mockClient, 1, "new-owner", "admin-1")
      ).rejects.toThrow("Update failed");
    });

    it("should log console error if audit insert fails but still return data", async () => {
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { owner_user_id: "old-owner" },
              error: null,
            }),
          }),
        }),
      };

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 1, owner_user_id: "new-owner" },
              error: null,
            }),
          }),
        }),
      };

      const auditError = new Error("Audit failed");
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: auditError }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockAuditChain);

      const result = await transferOrgOwnership(
        mockClient,
        1,
        "new-owner",
        "admin-1"
      );

      expect(result).toEqual({ id: 1, owner_user_id: "new-owner" });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error inserting ownership transfer audit log:",
        auditError
      );
    });
  });
});
