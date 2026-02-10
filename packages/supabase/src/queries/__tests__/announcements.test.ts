import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  listAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../announcements";
import type { TypedClient } from "../../client";

// ---------------------------------------------------------------------------
// Mock Supabase client factory
//
// All builder methods return `this` for full chainability.
// The query resolves when `await` triggers the `then` property.
// Terminal methods like `single` resolve directly.
// ---------------------------------------------------------------------------

type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  insert: jest.Mock<() => MockQueryBuilder>;
  update: jest.Mock<() => MockQueryBuilder>;
  delete: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  or: jest.Mock<() => MockQueryBuilder>;
  lte: jest.Mock<() => MockQueryBuilder>;
  gt: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  single: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  then: jest.Mock<
    (
      resolve: (value: { data: unknown; error: unknown }) => void
    ) => Promise<{ data: unknown; error: unknown }>
  >;
};

const createMockClient = () => {
  const mockQueryBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn((resolve) => {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    }),
  };

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("announcements queries", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on console.error to verify audit log warning behavior
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // listAnnouncements
  // -----------------------------------------------------------------------

  describe("listAnnouncements", () => {
    it("should return all announcements ordered by created_at descending when no filter", async () => {
      const mockAnnouncements = [
        { id: 1, title: "Maintenance", type: "warning", is_active: true },
        { id: 2, title: "New Feature", type: "info", is_active: false },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockAnnouncements,
          error: null,
        }).then(resolve);
      });

      const result = await listAnnouncements(mockClient);

      expect(result).toEqual(mockAnnouncements);
      expect(mockClient.from).toHaveBeenCalledWith("announcements");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("*");
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
    });

    it("should apply active status filter", async () => {
      const mockClient = createMockClient();

      await listAnnouncements(mockClient, { status: "active" });

      // active: is_active=true, start_at<=now, (end_at is null or end_at > now)
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "is_active",
        true
      );
      expect(mockClient._queryBuilder.lte).toHaveBeenCalledWith(
        "start_at",
        expect.any(String)
      );
      expect(mockClient._queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining("end_at.is.null")
      );
    });

    it("should apply scheduled status filter", async () => {
      const mockClient = createMockClient();

      await listAnnouncements(mockClient, { status: "scheduled" });

      // scheduled: is_active=true, start_at > now
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "is_active",
        true
      );
      expect(mockClient._queryBuilder.gt).toHaveBeenCalledWith(
        "start_at",
        expect.any(String)
      );
    });

    it("should apply expired status filter", async () => {
      const mockClient = createMockClient();

      await listAnnouncements(mockClient, { status: "expired" });

      // expired: is_active=false OR end_at <= now
      expect(mockClient._queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining("is_active.eq.false")
      );
    });

    it("should not apply any filters when no status provided", async () => {
      const mockClient = createMockClient();

      await listAnnouncements(mockClient, {});

      expect(mockClient._queryBuilder.eq).not.toHaveBeenCalled();
      expect(mockClient._queryBuilder.lte).not.toHaveBeenCalled();
      expect(mockClient._queryBuilder.gt).not.toHaveBeenCalled();
      expect(mockClient._queryBuilder.or).not.toHaveBeenCalled();
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(listAnnouncements(mockClient)).rejects.toThrow(
        "Database error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // getActiveAnnouncements
  // -----------------------------------------------------------------------

  describe("getActiveAnnouncements", () => {
    it("should return currently visible announcements", async () => {
      const mockActive = [
        {
          id: 1,
          title: "Live Announcement",
          type: "info",
          is_active: true,
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockActive,
          error: null,
        }).then(resolve);
      });

      const result = await getActiveAnnouncements(mockClient);

      expect(result).toEqual(mockActive);
      expect(mockClient.from).toHaveBeenCalledWith("announcements");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "is_active",
        true
      );
      expect(mockClient._queryBuilder.lte).toHaveBeenCalledWith(
        "start_at",
        expect.any(String)
      );
      expect(mockClient._queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining("end_at.is.null")
      );
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
    });

    it("should return empty array when no active announcements", async () => {
      const mockClient = createMockClient();

      const result = await getActiveAnnouncements(mockClient);

      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      await expect(getActiveAnnouncements(mockClient)).rejects.toThrow(
        "Database error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // createAnnouncement
  // -----------------------------------------------------------------------

  describe("createAnnouncement", () => {
    it("should insert a new announcement with required fields", async () => {
      const mockAnnouncement = {
        id: 1,
        title: "New Announcement",
        message: "Hello world",
        type: "info",
        is_active: true,
        start_at: "2024-01-01T00:00:00Z",
        end_at: null,
        created_by: "admin-1",
      };

      const mockClient = createMockClient();

      // Mock insert chain for announcements
      const mockInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAnnouncement,
              error: null,
            }),
          }),
        }),
      };

      // Mock insert chain for audit_log
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockInsertChain)
        .mockReturnValueOnce(mockAuditChain);

      const result = await createAnnouncement(
        mockClient,
        {
          title: "New Announcement",
          message: "Hello world",
          type: "info",
        },
        "admin-1"
      );

      expect(result).toEqual(mockAnnouncement);
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "announcements");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "audit_log");
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "New Announcement",
          message: "Hello world",
          type: "info",
          is_active: true,
          end_at: null,
          created_by: "admin-1",
        })
      );
    });

    it("should use provided optional fields (start_at, end_at, is_active)", async () => {
      const mockAnnouncement = {
        id: 1,
        title: "Scheduled",
        message: "Coming soon",
        type: "warning",
        start_at: "2024-06-01T00:00:00Z",
        end_at: "2024-06-30T23:59:59Z",
        is_active: false,
        created_by: "admin-1",
      };

      const mockClient = createMockClient();

      const mockInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAnnouncement,
              error: null,
            }),
          }),
        }),
      };

      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockInsertChain)
        .mockReturnValueOnce(mockAuditChain);

      await createAnnouncement(
        mockClient,
        {
          title: "Scheduled",
          message: "Coming soon",
          type: "warning",
          start_at: "2024-06-01T00:00:00Z",
          end_at: "2024-06-30T23:59:59Z",
          is_active: false,
        },
        "admin-1"
      );

      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          start_at: "2024-06-01T00:00:00Z",
          end_at: "2024-06-30T23:59:59Z",
          is_active: false,
        })
      );
    });

    it("should log audit entry on success", async () => {
      const mockAnnouncement = {
        id: 42,
        title: "Audited Announcement",
        message: "Test audit",
        type: "success",
        is_active: true,
        created_by: "admin-1",
      };

      const mockClient = createMockClient();

      const mockInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAnnouncement,
              error: null,
            }),
          }),
        }),
      };

      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockInsertChain)
        .mockReturnValueOnce(mockAuditChain);

      await createAnnouncement(
        mockClient,
        {
          title: "Audited Announcement",
          message: "Test audit",
          type: "success",
        },
        "admin-1"
      );

      expect(mockAuditChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.announcement_created",
          actor_user_id: "admin-1",
          metadata: expect.objectContaining({
            announcement_id: 42,
            title: "Audited Announcement",
            type: "success",
          }),
        })
      );
    });

    it("should throw on insert error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Insert failed");

      const mockInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockInsertChain);

      await expect(
        createAnnouncement(
          mockClient,
          { title: "Fail", message: "Fail", type: "error" },
          "admin-1"
        )
      ).rejects.toThrow("Insert failed");
    });

    it("should log warning but not throw when audit insert fails", async () => {
      const mockAnnouncement = {
        id: 1,
        title: "Test",
        message: "Test",
        type: "info",
        is_active: true,
        created_by: "admin-1",
      };

      const mockClient = createMockClient();

      const mockInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAnnouncement,
              error: null,
            }),
          }),
        }),
      };

      const auditError = new Error("Audit insert failed");
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: auditError,
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockInsertChain)
        .mockReturnValueOnce(mockAuditChain);

      // Should NOT throw despite audit error
      const result = await createAnnouncement(
        mockClient,
        { title: "Test", message: "Test", type: "info" },
        "admin-1"
      );

      // Should still return the announcement successfully
      expect(result).toEqual(mockAnnouncement);

      // Should log the error to console.error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to log announcement_created to audit log:",
        auditError
      );
    });
  });

  // -----------------------------------------------------------------------
  // updateAnnouncement
  // -----------------------------------------------------------------------

  describe("updateAnnouncement", () => {
    it("should update specified fields only", async () => {
      const mockAnnouncement = {
        id: 1,
        title: "Updated Title",
        message: "Updated message",
        type: "warning",
      };

      const mockClient = createMockClient();

      // Mock update chain for announcements
      const mockUpdateFn = jest.fn();
      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAnnouncement,
              error: null,
            }),
          }),
        }),
      };

      mockUpdateFn.mockReturnValue(mockUpdateChain);

      // Mock audit log insert
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: mockUpdateFn,
        })
        .mockReturnValueOnce(mockAuditChain);

      const result = await updateAnnouncement(
        mockClient,
        1,
        { title: "Updated Title", message: "Updated message" },
        "admin-1"
      );

      expect(result).toEqual(mockAnnouncement);
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "announcements");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "audit_log");

      // Verify the update payload includes only provided fields + updated_at
      const updatePayload = mockUpdateFn.mock.calls[0]![0] as Record<
        string,
        unknown
      >;
      expect(updatePayload).toHaveProperty("title", "Updated Title");
      expect(updatePayload).toHaveProperty("message", "Updated message");
      expect(updatePayload).toHaveProperty("updated_at");
      // Should NOT contain fields that were not provided
      expect(updatePayload).not.toHaveProperty("type");
      expect(updatePayload).not.toHaveProperty("start_at");
      expect(updatePayload).not.toHaveProperty("end_at");
      expect(updatePayload).not.toHaveProperty("is_active");
    });

    it("should record only non-undefined fields in audit metadata", async () => {
      const mockAnnouncement = {
        id: 1,
        title: "Only Title",
        is_active: false,
      };

      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAnnouncement,
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

      await updateAnnouncement(mockClient, 1, { is_active: false }, "admin-1");

      expect(mockAuditChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.announcement_updated",
          actor_user_id: "admin-1",
          metadata: expect.objectContaining({
            announcement_id: 1,
            updated_fields: ["is_active"],
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
        updateAnnouncement(mockClient, 1, { title: "fail" }, "admin-1")
      ).rejects.toThrow("Update failed");
    });

    it("should log warning but not throw when audit insert fails", async () => {
      const mockAnnouncement = {
        id: 1,
        title: "Updated",
        message: "Updated message",
        type: "info",
      };

      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAnnouncement,
              error: null,
            }),
          }),
        }),
      };

      const auditError = new Error("Audit insert failed");
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: auditError,
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockAuditChain);

      // Should NOT throw despite audit error
      const result = await updateAnnouncement(
        mockClient,
        1,
        { title: "Updated" },
        "admin-1"
      );

      // Should still return the announcement successfully
      expect(result).toEqual(mockAnnouncement);

      // Should log the error to console.error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to log announcement_updated to audit log:",
        auditError
      );
    });
  });

  // -----------------------------------------------------------------------
  // deleteAnnouncement
  // -----------------------------------------------------------------------

  describe("deleteAnnouncement", () => {
    it("should fetch, delete the announcement, and create audit log entry", async () => {
      const existingAnnouncement = {
        id: 1,
        title: "Old Announcement",
        type: "info",
      };

      const mockClient = createMockClient();

      // First from call: fetch existing announcement
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingAnnouncement,
              error: null,
            }),
          }),
        }),
      };

      // Second from call: delete announcement
      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      };

      // Third from call: audit log
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockDeleteChain)
        .mockReturnValueOnce(mockAuditChain);

      await deleteAnnouncement(mockClient, 1, "admin-1");

      expect(mockClient.from).toHaveBeenNthCalledWith(1, "announcements");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "announcements");
      expect(mockClient.from).toHaveBeenNthCalledWith(3, "audit_log");
      expect(mockAuditChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.announcement_deleted",
          actor_user_id: "admin-1",
          metadata: expect.objectContaining({
            announcement_id: 1,
            title: "Old Announcement",
          }),
        })
      );
    });

    it("should throw when announcement not found (fetch error)", async () => {
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
        deleteAnnouncement(mockClient, 1, "admin-1")
      ).rejects.toThrow("Fetch failed");
    });

    it("should throw on delete error", async () => {
      const existingAnnouncement = { id: 1, title: "Test" };
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingAnnouncement,
              error: null,
            }),
          }),
        }),
      };

      const deleteError = new Error("Delete failed");
      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: deleteError,
          }),
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockDeleteChain);

      await expect(
        deleteAnnouncement(mockClient, 1, "admin-1")
      ).rejects.toThrow("Delete failed");
    });

    it("should log warning but not throw when audit insert fails", async () => {
      const existingAnnouncement = {
        id: 1,
        title: "To Delete",
        type: "info",
      };

      const mockClient = createMockClient();

      // First from call: fetch existing announcement
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingAnnouncement,
              error: null,
            }),
          }),
        }),
      };

      // Second from call: delete announcement (succeeds)
      const mockDeleteChain = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      };

      // Third from call: audit log (fails)
      const auditError = new Error("Audit insert failed");
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: auditError,
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockDeleteChain)
        .mockReturnValueOnce(mockAuditChain);

      // Should NOT throw despite audit error
      await expect(
        deleteAnnouncement(mockClient, 1, "admin-1")
      ).resolves.toBeUndefined();

      // Should log the error to console.error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to log announcement_deleted to audit log:",
        auditError
      );
    });
  });
});
