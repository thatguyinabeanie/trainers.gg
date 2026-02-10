import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  listUsersAdmin,
  getUserAdminDetails,
  suspendUser,
  unsuspendUser,
  startImpersonation,
  endImpersonation,
} from "../admin-users";
import type { TypedClient } from "../../client";

// ---------------------------------------------------------------------------
// Mock Supabase client factory
//
// The builder is fully chainable: every method returns `this`.
// Resolution happens when the query is awaited, which triggers
// the `then` property on the builder (making it "thenable").
// ---------------------------------------------------------------------------

type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  insert: jest.Mock<() => MockQueryBuilder>;
  update: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  is: jest.Mock<() => MockQueryBuilder>;
  or: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  range: jest.Mock<() => MockQueryBuilder>;
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
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
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
// Tests
// ---------------------------------------------------------------------------

describe("admin-users queries", () => {
  let consoleErrorSpy: jest.Spied<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // listUsersAdmin
  // -----------------------------------------------------------------------

  describe("listUsersAdmin", () => {
    it("should return users with default pagination", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "alice@example.com",
          username: "alice",
          is_locked: false,
          created_at: "2024-01-15T00:00:00Z",
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: mockUsers,
          error: null,
          count: 1,
        }).then(resolve);
      });

      const result = await listUsersAdmin(mockClient);

      expect(result.data).toEqual(mockUsers);
      expect(result.count).toBe(1);
      expect(mockClient.from).toHaveBeenCalledWith("users");
      // Default pagination: offset=0, limit=25 => range(0, 24)
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(0, 24);
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith(
        "created_at",
        { ascending: false }
      );
    });

    it("should apply search filter across username and email", async () => {
      const mockClient = createMockClient();

      await listUsersAdmin(mockClient, { search: "alice" });

      expect(mockClient._queryBuilder.or).toHaveBeenCalledWith(
        "username.ilike.%alice%,email.ilike.%alice%"
      );
    });

    it("should escape special characters in search", async () => {
      const mockClient = createMockClient();

      // escapeLike escapes %, _, and \ characters
      await listUsersAdmin(mockClient, { search: "50%" });

      expect(mockClient._queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining("50\\%")
      );
    });

    it("should apply isLocked filter when true", async () => {
      const mockClient = createMockClient();

      await listUsersAdmin(mockClient, { isLocked: true });

      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "is_locked",
        true
      );
    });

    it("should apply isLocked filter when false", async () => {
      const mockClient = createMockClient();

      await listUsersAdmin(mockClient, { isLocked: false });

      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "is_locked",
        false
      );
    });

    it("should not apply isLocked filter when undefined", async () => {
      const mockClient = createMockClient();

      await listUsersAdmin(mockClient, {});

      // eq should not have been called for is_locked
      expect(mockClient._queryBuilder.eq).not.toHaveBeenCalled();
    });

    it("should use custom limit and offset", async () => {
      const mockClient = createMockClient();

      await listUsersAdmin(mockClient, { limit: 10, offset: 30 });

      // range(30, 30 + 10 - 1) = range(30, 39)
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(30, 39);
    });

    it("should apply all filters together", async () => {
      const mockClient = createMockClient();

      await listUsersAdmin(mockClient, {
        search: "test",
        isLocked: true,
        limit: 50,
        offset: 100,
      });

      expect(mockClient._queryBuilder.or).toHaveBeenCalled();
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "is_locked",
        true
      );
      expect(mockClient._queryBuilder.range).toHaveBeenCalledWith(100, 149);
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: dbError,
          count: null,
        }).then(resolve);
      });

      await expect(listUsersAdmin(mockClient)).rejects.toThrow(
        "Database error"
      );
    });

    it("should return empty data and zero count when no users match", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({
          data: null,
          error: null,
          count: null,
        }).then(resolve);
      });

      const result = await listUsersAdmin(mockClient);

      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // getUserAdminDetails
  // -----------------------------------------------------------------------

  describe("getUserAdminDetails", () => {
    it("should return full user details when found", async () => {
      const mockUser = {
        id: "user-1",
        email: "alice@example.com",
        username: "alice",
        is_locked: false,
        alts: [{ id: 1, username: "alice-alt" }],
        user_roles: [{ id: 1, role: { id: 1, name: "site_admin" } }],
      };

      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const result = await getUserAdminDetails(mockClient, "user-1");

      expect(result).toEqual(mockUser);
      expect(mockClient.from).toHaveBeenCalledWith("users");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("id", "user-1");
      expect(mockClient._queryBuilder.maybeSingle).toHaveBeenCalled();
    });

    it("should return null when user is not found", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getUserAdminDetails(mockClient, "nonexistent");

      expect(result).toBeNull();
    });

    it("should throw on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(getUserAdminDetails(mockClient, "user-1")).rejects.toThrow(
        "Database error"
      );
    });
  });

  // -----------------------------------------------------------------------
  // suspendUser
  // -----------------------------------------------------------------------

  describe("suspendUser", () => {
    it("should set is_locked to true and create audit log entry", async () => {
      const mockUser = {
        id: "user-1",
        username: "alice",
        email: "alice@example.com",
        is_locked: true,
      };

      const mockClient = createMockClient();

      // Mock update chain: .update().eq().select().single()
      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      };

      // Mock insert chain for audit log: .insert() -> resolves
      const mockInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockInsertChain);

      const result = await suspendUser(
        mockClient,
        "user-1",
        "admin-1",
        "Violated ToS"
      );

      expect(result).toEqual(mockUser);
      // First call: update users table
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "users");
      // Second call: insert audit_log
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "audit_log");
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.user_suspended",
          actor_user_id: "admin-1",
          metadata: expect.objectContaining({
            target_user_id: "user-1",
            target_username: "alice",
            reason: "Violated ToS",
          }),
        })
      );
    });

    it("should set reason to null when not provided", async () => {
      const mockUser = {
        id: "user-1",
        username: "alice",
        email: "alice@example.com",
        is_locked: true,
      };

      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      };

      const mockInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockInsertChain);

      await suspendUser(mockClient, "user-1", "admin-1");

      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            reason: null,
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
        suspendUser(mockClient, "user-1", "admin-1")
      ).rejects.toThrow("Update failed");
    });

    it("should log console error if audit insert fails but still return user", async () => {
      const mockUser = {
        id: "user-1",
        username: "alice",
        email: "alice@example.com",
        is_locked: true,
      };

      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      };

      const auditError = new Error("Audit insert failed");
      const mockInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: auditError }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockInsertChain);

      const result = await suspendUser(mockClient, "user-1", "admin-1");

      expect(result).toEqual(mockUser);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error inserting suspension audit log:",
        auditError
      );
    });
  });

  // -----------------------------------------------------------------------
  // unsuspendUser
  // -----------------------------------------------------------------------

  describe("unsuspendUser", () => {
    it("should set is_locked to false and create audit log entry", async () => {
      const mockUser = {
        id: "user-1",
        username: "alice",
        email: "alice@example.com",
        is_locked: false,
      };

      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      };

      const mockInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockInsertChain);

      const result = await unsuspendUser(mockClient, "user-1", "admin-1");

      expect(result).toEqual(mockUser);
      expect(mockClient.from).toHaveBeenNthCalledWith(1, "users");
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "audit_log");
      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.user_unsuspended",
          actor_user_id: "admin-1",
          metadata: expect.objectContaining({
            target_user_id: "user-1",
            target_username: "alice",
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
        unsuspendUser(mockClient, "user-1", "admin-1")
      ).rejects.toThrow("Update failed");
    });

    it("should log console error if audit insert fails but still return user", async () => {
      const mockUser = {
        id: "user-1",
        username: "alice",
        email: "alice@example.com",
        is_locked: false,
      };

      const mockClient = createMockClient();

      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      };

      const auditError = new Error("Audit insert failed");
      const mockInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: auditError }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockInsertChain);

      const result = await unsuspendUser(mockClient, "user-1", "admin-1");

      expect(result).toEqual(mockUser);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error inserting unsuspend audit log:",
        auditError
      );
    });
  });

  // -----------------------------------------------------------------------
  // startImpersonation
  // -----------------------------------------------------------------------

  describe("startImpersonation", () => {
    it("should insert impersonation session and audit log entry", async () => {
      const mockSession = {
        id: 1,
        admin_user_id: "admin-1",
        target_user_id: "user-1",
        reason: "Debugging issue",
        ip_address: "192.168.1.1",
        user_agent: "Mozilla/5.0",
      };

      const mockClient = createMockClient();

      // Mock insert chain for impersonation_sessions
      const mockSessionInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
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
        .mockReturnValueOnce(mockSessionInsertChain)
        .mockReturnValueOnce(mockAuditInsertChain);

      const result = await startImpersonation(
        mockClient,
        "admin-1",
        "user-1",
        "Debugging issue",
        "192.168.1.1",
        "Mozilla/5.0"
      );

      expect(result).toEqual(mockSession);
      expect(mockClient.from).toHaveBeenNthCalledWith(
        1,
        "impersonation_sessions"
      );
      expect(mockClient.from).toHaveBeenNthCalledWith(2, "audit_log");
      expect(mockSessionInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_user_id: "admin-1",
          target_user_id: "user-1",
          reason: "Debugging issue",
          ip_address: "192.168.1.1",
          user_agent: "Mozilla/5.0",
        })
      );
      expect(mockAuditInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.impersonation_started",
          actor_user_id: "admin-1",
          metadata: expect.objectContaining({
            session_id: 1,
            target_user_id: "user-1",
            reason: "Debugging issue",
          }),
        })
      );
    });

    it("should set optional fields to null when not provided", async () => {
      const mockSession = {
        id: 1,
        admin_user_id: "admin-1",
        target_user_id: "user-1",
        reason: null,
        ip_address: null,
        user_agent: null,
      };

      const mockClient = createMockClient();

      const mockSessionInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      const mockAuditInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockSessionInsertChain)
        .mockReturnValueOnce(mockAuditInsertChain);

      await startImpersonation(mockClient, "admin-1", "user-1");

      expect(mockSessionInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: null,
          ip_address: null,
          user_agent: null,
        })
      );
    });

    it("should throw on session insert error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Insert failed");

      const mockSessionInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(
        mockSessionInsertChain
      );

      await expect(
        startImpersonation(mockClient, "admin-1", "user-1")
      ).rejects.toThrow("Insert failed");
    });

    it("should log console error if audit insert fails but still return session", async () => {
      const mockSession = {
        id: 1,
        admin_user_id: "admin-1",
        target_user_id: "user-1",
      };

      const mockClient = createMockClient();

      const mockSessionInsertChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      const auditError = new Error("Audit failed");
      const mockAuditInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: auditError }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockSessionInsertChain)
        .mockReturnValueOnce(mockAuditInsertChain);

      const result = await startImpersonation(mockClient, "admin-1", "user-1");

      expect(result).toEqual(mockSession);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error inserting impersonation audit log:",
        auditError
      );
    });
  });

  // -----------------------------------------------------------------------
  // endImpersonation
  // -----------------------------------------------------------------------

  describe("endImpersonation", () => {
    it("should end active impersonation session and create audit log", async () => {
      const activeSession = {
        id: 1,
        admin_user_id: "admin-1",
        target_user_id: "user-1",
        started_at: "2024-01-01T12:00:00.000Z",
      };

      const endedSession = {
        ...activeSession,
        ended_at: expect.any(String),
      };

      const mockClient = createMockClient();

      // Mock Step 1: .from("impersonation_sessions").select("*").eq().is().order().limit().maybeSingle()
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: activeSession,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Mock Step 2: .from("impersonation_sessions").update().eq().select().single()
      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: endedSession,
              error: null,
            }),
          }),
        }),
      };

      // Mock Step 3: .from("audit_log").insert()
      const mockAuditInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockAuditInsertChain);

      const result = await endImpersonation(mockClient, "admin-1");

      expect(result).toEqual(endedSession);
      // First call: fetch active session from impersonation_sessions
      expect(mockClient.from).toHaveBeenNthCalledWith(
        1,
        "impersonation_sessions"
      );
      // Second call: update impersonation_sessions
      expect(mockClient.from).toHaveBeenNthCalledWith(
        2,
        "impersonation_sessions"
      );
      // Third call: insert audit_log
      expect(mockClient.from).toHaveBeenNthCalledWith(3, "audit_log");
      expect(mockAuditInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.impersonation_ended",
          actor_user_id: "admin-1",
          metadata: expect.objectContaining({
            session_id: 1,
            target_user_id: "user-1",
            duration_seconds: expect.any(Number),
          }),
        })
      );
    });

    it("should return null when no active session exists", async () => {
      const mockClient = createMockClient();

      // Mock Step 1: .from("impersonation_sessions") query returns null (no active session)
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockFetchChain);

      const result = await endImpersonation(mockClient, "admin-1");

      expect(result).toBeNull();
      // Should only call from() once (the fetch), not attempt update or audit
      expect(mockClient.from).toHaveBeenCalledTimes(1);
    });

    it("should return null when fetch returns null data", async () => {
      const mockClient = createMockClient();

      // Mock Step 1: maybeSingle returns null data
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockFetchChain);

      const result = await endImpersonation(mockClient, "admin-1");

      expect(result).toBeNull();
    });

    it("should throw on fetch error", async () => {
      const mockClient = createMockClient();
      const fetchError = new Error("Fetch failed");

      // Mock Step 1: fetch returns an error
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: fetchError,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      (mockClient.from as jest.Mock).mockReturnValueOnce(mockFetchChain);

      await expect(endImpersonation(mockClient, "admin-1")).rejects.toThrow(
        "Fetch failed"
      );
    });

    it("should throw on update error", async () => {
      const activeSession = {
        id: 1,
        admin_user_id: "admin-1",
        target_user_id: "user-1",
        started_at: "2024-01-01T12:00:00.000Z",
      };

      const mockClient = createMockClient();

      // Mock Step 1: fetch returns active session
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: activeSession,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Mock Step 2: update returns an error
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

      await expect(endImpersonation(mockClient, "admin-1")).rejects.toThrow(
        "Update failed"
      );
    });

    it("should log console error if audit insert fails but still return session", async () => {
      const activeSession = {
        id: 1,
        admin_user_id: "admin-1",
        target_user_id: "user-1",
        started_at: "2024-01-01T12:00:00.000Z",
      };

      const endedSession = {
        ...activeSession,
        ended_at: "2024-01-01T13:00:00.000Z",
      };

      const mockClient = createMockClient();

      // Mock Step 1: fetch returns active session
      const mockFetchChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: activeSession,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Mock Step 2: update succeeds
      const mockUpdateChain = {
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: endedSession,
              error: null,
            }),
          }),
        }),
      };

      // Mock Step 3: audit insert fails
      const auditError = new Error("Audit failed");
      const mockAuditInsertChain = {
        insert: jest.fn().mockResolvedValue({ data: null, error: auditError }),
      };

      (mockClient.from as jest.Mock)
        .mockReturnValueOnce(mockFetchChain)
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue(mockUpdateChain),
        })
        .mockReturnValueOnce(mockAuditInsertChain);

      const result = await endImpersonation(mockClient, "admin-1");

      expect(result).toEqual(endedSession);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error inserting impersonation-end audit log:",
        auditError
      );
    });
  });
});
