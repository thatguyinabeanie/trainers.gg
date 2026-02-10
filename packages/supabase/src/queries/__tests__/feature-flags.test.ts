import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  listFeatureFlags,
  getFeatureFlag,
  isFeatureEnabled,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
} from "../feature-flags";
import type { TypedClient } from "../../client";

// ---------------------------------------------------------------------------
// Mock Supabase client factory
// ---------------------------------------------------------------------------

type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  insert: jest.Mock<() => MockQueryBuilder>;
  update: jest.Mock<() => MockQueryBuilder>;
  delete: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  single: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  maybeSingle: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
};

const createMockClient = () => {
  const mockQueryBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("feature-flags queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // listFeatureFlags
  // -----------------------------------------------------------------------

  describe("listFeatureFlags", () => {
    it("should return all flags ordered by key ascending", async () => {
      const mockFlags = [
        { id: 1, key: "beta_access", enabled: true },
        { id: 2, key: "maintenance_mode", enabled: false },
        { id: 3, key: "new_feature", enabled: true },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: mockFlags,
        error: null,
      });

      const result = await listFeatureFlags(mockClient);

      expect(result).toEqual(mockFlags);
      expect(mockClient.from).toHaveBeenCalledWith("feature_flags");
      expect(mockClient._queryBuilder.select).toHaveBeenCalledWith("*");
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith("key", {
        ascending: true,
      });
    });

    it("should return empty array when no flags exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await listFeatureFlags(mockClient);

      expect(result).toEqual([]);
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.order.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(listFeatureFlags(mockClient)).rejects.toThrow(
        "Database error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // getFeatureFlag
  // -----------------------------------------------------------------------

  describe("getFeatureFlag", () => {
    it("should return the flag when found", async () => {
      const mockFlag = {
        id: 1,
        key: "maintenance_mode",
        enabled: false,
        description: "Enable maintenance mode",
      };

      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: mockFlag,
        error: null,
      });

      const result = await getFeatureFlag(mockClient, "maintenance_mode");

      expect(result).toEqual(mockFlag);
      expect(mockClient.from).toHaveBeenCalledWith("feature_flags");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "key",
        "maintenance_mode"
      );
      expect(mockClient._queryBuilder.maybeSingle).toHaveBeenCalled();
    });

    it("should return null when flag is not found", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getFeatureFlag(mockClient, "nonexistent");

      expect(result).toBeNull();
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(
        getFeatureFlag(mockClient, "maintenance_mode")
      ).rejects.toThrow("Database error");
    });
  });

  // -----------------------------------------------------------------------
  // isFeatureEnabled
  // -----------------------------------------------------------------------

  describe("isFeatureEnabled", () => {
    it("should return true when flag is enabled", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: { id: 1, key: "beta_access", enabled: true },
        error: null,
      });

      const result = await isFeatureEnabled(mockClient, "beta_access");

      expect(result).toBe(true);
    });

    it("should return false when flag is disabled", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: { id: 1, key: "beta_access", enabled: false },
        error: null,
      });

      const result = await isFeatureEnabled(mockClient, "beta_access");

      expect(result).toBe(false);
    });

    it("should return false when flag does not exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await isFeatureEnabled(mockClient, "nonexistent");

      expect(result).toBe(false);
    });

    it("should throw when database errors", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(isFeatureEnabled(mockClient, "beta_access")).rejects.toThrow(
        "Database error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // createFeatureFlag
  // -----------------------------------------------------------------------

  describe("createFeatureFlag", () => {
    it("should insert a new flag and create audit log entry", async () => {
      const mockFlag = {
        id: 1,
        key: "new_feature",
        description: "A new feature",
        enabled: true,
        metadata: {},
        created_by: "admin-1",
      };

      const mockClient = createMockClient();

      // Mock insert chain for feature_flags
      const mockFlagInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockFlag,
              error: null,
            }),
          }),
        }),
      };

      // Mock insert chain for audit_log
      const mockAuditInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFlagInsertChain)
        .mockReturnValueOnce(mockAuditInsertChain);

      const result = await createFeatureFlag(
        mockClient,
        {
          key: "new_feature",
          description: "A new feature",
          enabled: true,
        },
        "admin-1"
      );

      expect(result).toEqual(mockFlag);
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "feature_flags");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "audit_log");
      expect(mockFlagInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "new_feature",
          description: "A new feature",
          enabled: true,
          metadata: {},
          created_by: "admin-1",
        })
      );
      expect(mockAuditInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.flag_created",
          actor_user_id: "admin-1",
          metadata: expect.objectContaining({
            flag_id: 1,
            flag_key: "new_feature",
            enabled: true,
          }),
        })
      );
    });

    it("should use default values when optional fields are omitted", async () => {
      const mockFlag = {
        id: 1,
        key: "minimal_flag",
        description: null,
        enabled: false,
        metadata: {},
        created_by: "admin-1",
      };

      const mockClient = createMockClient();

      const mockFlagInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockFlag,
              error: null,
            }),
          }),
        }),
      };

      const mockAuditInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFlagInsertChain)
        .mockReturnValueOnce(mockAuditInsertChain);

      await createFeatureFlag(mockClient, { key: "minimal_flag" }, "admin-1");

      // Defaults: description=null, enabled=false, metadata={}
      expect(mockFlagInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "minimal_flag",
          description: null,
          enabled: false,
          metadata: {},
        })
      );
    });

    it("should throw on insert error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Insert failed");

      const mockFlagInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockFlagInsertChain);

      await expect(
        createFeatureFlag(mockClient, { key: "fail" }, "admin-1")
      ).rejects.toThrow("Insert failed");
    });
  });

  // -----------------------------------------------------------------------
  // updateFeatureFlag
  // -----------------------------------------------------------------------

  describe("updateFeatureFlag", () => {
    it("should update the flag, fetch existing state, and create audit log", async () => {
      const existingFlag = {
        id: 1,
        key: "my_flag",
        enabled: false,
        description: "Old desc",
        metadata: {},
      };

      const updatedFlag = {
        id: 1,
        key: "my_flag",
        enabled: true,
        description: "New desc",
        metadata: {},
      };

      const mockClient = createMockClient();

      // First from call: fetch existing flag
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingFlag,
              error: null,
            }),
          }),
        }),
      };

      // Second from call: update flag
      const mockUpdateChain = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedFlag,
                error: null,
              }),
            }),
          }),
        }),
      };

      // Third from call: audit log
      const mockAuditChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockUpdateChain)
        .mockReturnValueOnce(mockAuditChain);

      const result = await updateFeatureFlag(
        mockClient,
        1,
        { description: "New desc", enabled: true },
        "admin-1"
      );

      expect(result).toEqual(updatedFlag);
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "feature_flags");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "feature_flags");
      expect(mockClient.from).toHaveBeenNthCalledWith(3, "audit_log");
      expect(mockAuditChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.flag_toggled",
          actor_user_id: "admin-1",
          metadata: expect.objectContaining({
            flag_id: 1,
            flag_key: "my_flag",
            old_enabled: false,
            new_enabled: true,
          }),
        })
      );
    });

    it("should throw on fetch error (getting existing flag)", async () => {
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
        updateFeatureFlag(mockClient, 1, { enabled: true }, "admin-1")
      ).rejects.toThrow("Fetch failed");
    });

    it("should throw on update error", async () => {
      const existingFlag = { id: 1, key: "my_flag", enabled: false };
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingFlag,
              error: null,
            }),
          }),
        }),
      };

      const updateError = new Error("Update failed");
      const mockUpdateChain = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: updateError,
              }),
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce(mockUpdateChain);

      await expect(
        updateFeatureFlag(mockClient, 1, { enabled: true }, "admin-1")
      ).rejects.toThrow("Update failed");
    });
  });

  // -----------------------------------------------------------------------
  // deleteFeatureFlag
  // -----------------------------------------------------------------------

  describe("deleteFeatureFlag", () => {
    it("should fetch the flag, delete it, and create audit log", async () => {
      const existingFlag = {
        id: 1,
        key: "old_feature",
        enabled: true,
      };

      const mockClient = createMockClient();

      // First from call: fetch existing flag
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingFlag,
              error: null,
            }),
          }),
        }),
      };

      // Second from call: delete flag
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

      await deleteFeatureFlag(mockClient, 1, "admin-1");

      expect(mockClient.from).toHaveBeenNthCalledWith(1, "feature_flags");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "feature_flags");
      expect(mockClient.from).toHaveBeenNthCalledWith(3, "audit_log");
      expect(mockAuditChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.flag_deleted",
          actor_user_id: "admin-1",
          metadata: expect.objectContaining({
            flag_id: 1,
            flag_key: "old_feature",
          }),
        })
      );
    });

    it("should throw on fetch error", async () => {
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

      await expect(deleteFeatureFlag(mockClient, 1, "admin-1")).rejects.toThrow(
        "Fetch failed"
      );
    });

    it("should throw on delete error", async () => {
      const existingFlag = { id: 1, key: "flag", enabled: true };
      const mockClient = createMockClient();

      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: existingFlag,
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

      await expect(deleteFeatureFlag(mockClient, 1, "admin-1")).rejects.toThrow(
        "Delete failed"
      );
    });
  });
});
