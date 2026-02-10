import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  isSiteAdmin,
  getSiteRoles,
  getSiteAdmins,
  getUserSiteRoles,
  grantSiteRole,
  revokeSiteRole,
} from "../site-roles";
import type { TypedClient } from "../../client";

// Mock query builder
type MockQueryBuilder = {
  select: jest.Mock<() => MockQueryBuilder>;
  eq: jest.Mock<() => MockQueryBuilder>;
  order: jest.Mock<() => MockQueryBuilder>;
  maybeSingle: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  single: jest.Mock<() => Promise<{ data: unknown; error: unknown }>>;
  insert: jest.Mock<() => MockQueryBuilder>;
  delete: jest.Mock<() => MockQueryBuilder>;
  then: jest.Mock<
    (
      resolve: (value: { data: unknown; error: unknown }) => void
    ) => Promise<{ data: unknown; error: unknown }>
  >;
};

const createMockClient = () => {
  const mockQueryBuilder: MockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    }),
  };

  return {
    from: jest.fn().mockReturnValue(mockQueryBuilder),
    _queryBuilder: mockQueryBuilder,
  } as unknown as TypedClient & { _queryBuilder: MockQueryBuilder };
};

describe("site-roles queries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isSiteAdmin", () => {
    it("should return true when user has site_admin role", async () => {
      const mockRoleData = {
        role: { id: 1, name: "site_admin", scope: "site" },
      };

      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: mockRoleData,
        error: null,
      });

      const result = await isSiteAdmin(mockClient, "user-123");

      expect(result).toBe(true);
      expect(mockClient.from).toHaveBeenCalledWith("user_roles");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "user_id",
        "user-123"
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "roles.scope",
        "site"
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "roles.name",
        "site_admin"
      );
    });

    it("should return false when user does not have site_admin role", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await isSiteAdmin(mockClient, "user-123");

      expect(result).toBe(false);
    });

    it("should return false on database error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError,
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await isSiteAdmin(mockClient, "user-123");

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error checking site admin status:",
        dbError
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle different user IDs", async () => {
      const mockClient = createMockClient();

      await isSiteAdmin(mockClient, "user-1");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "user_id",
        "user-1"
      );

      jest.clearAllMocks();
      mockClient.from = jest.fn().mockReturnValue(mockClient._queryBuilder);

      await isSiteAdmin(mockClient, "user-2");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "user_id",
        "user-2"
      );
    });
  });

  describe("getSiteRoles", () => {
    it("should fetch all site-scoped roles", async () => {
      const mockRoles = [
        { id: 1, name: "site_admin", scope: "site", description: "Admin role" },
        {
          id: 2,
          name: "site_moderator",
          scope: "site",
          description: "Moderator role",
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockRoles, error: null }).then(resolve);
      });

      const result = await getSiteRoles(mockClient);

      expect(result).toEqual(mockRoles);
      expect(mockClient.from).toHaveBeenCalledWith("roles");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("scope", "site");
      expect(mockClient._queryBuilder.order).toHaveBeenCalledWith("name");
    });

    it("should return empty array when no site roles exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await getSiteRoles(mockClient);

      expect(result).toEqual([]);
    });

    it("should return empty array on error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await getSiteRoles(mockClient);

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching site roles:",
        dbError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getSiteAdmins", () => {
    it("should fetch all users with site admin role", async () => {
      const mockAdmins = [
        {
          id: 1,
          user: {
            id: "user-1",
            email: "admin1@example.com",
            username: "admin1",
          },
          role: { id: 1, name: "site_admin", scope: "site" },
        },
        {
          id: 2,
          user: {
            id: "user-2",
            email: "admin2@example.com",
            username: "admin2",
          },
          role: { id: 1, name: "site_admin", scope: "site" },
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockAdmins, error: null }).then(resolve);
      });

      const result = await getSiteAdmins(mockClient);

      expect(result).toEqual(mockAdmins);
      expect(mockClient.from).toHaveBeenCalledWith("user_roles");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "roles.scope",
        "site"
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "roles.name",
        "site_admin"
      );
    });

    it("should return empty array when no admins exist", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await getSiteAdmins(mockClient);

      expect(result).toEqual([]);
    });

    it("should return empty array on error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await getSiteAdmins(mockClient);

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getUserSiteRoles", () => {
    it("should fetch all site roles for a user", async () => {
      const mockUserRoles = [
        {
          id: 1,
          role: {
            id: 1,
            name: "site_admin",
            description: "Admin",
            scope: "site",
          },
        },
        {
          id: 2,
          role: {
            id: 2,
            name: "site_moderator",
            description: "Moderator",
            scope: "site",
          },
        },
      ];

      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: mockUserRoles, error: null }).then(
          resolve
        );
      });

      const result = await getUserSiteRoles(mockClient, "user-123");

      expect(result).toEqual(mockUserRoles);
      expect(mockClient.from).toHaveBeenCalledWith("user_roles");
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "user_id",
        "user-123"
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "roles.scope",
        "site"
      );
    });

    it("should return empty array when user has no site roles", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      });

      const result = await getUserSiteRoles(mockClient, "user-123");

      expect(result).toEqual([]);
    });

    it("should return empty array on error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Database error");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await getUserSiteRoles(mockClient, "user-123");

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("grantSiteRole", () => {
    it("should grant a site role to a user", async () => {
      const mockRole = { id: 1, scope: "site" };

      const mockClient = createMockClient();

      // Mock role verification
      mockClient._queryBuilder.single.mockResolvedValueOnce({
        data: mockRole,
        error: null,
      });

      // Mock existing role check
      mockClient._queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock insert
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      const result = await grantSiteRole(
        mockClient,
        "user-123",
        1,
        "admin-456"
      );

      expect(result.success).toBe(true);
      expect(mockClient._queryBuilder.insert).toHaveBeenCalledWith({
        user_id: "user-123",
        role_id: 1,
      });
    });

    it("should return error when role not found", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: null,
        error: new Error("Role not found"),
      });

      const result = await grantSiteRole(
        mockClient,
        "user-123",
        999,
        "admin-456"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Role not found");
    });

    it("should return error when role is not site-scoped", async () => {
      const mockRole = { id: 1, scope: "org" };

      const mockClient = createMockClient();
      mockClient._queryBuilder.single.mockResolvedValue({
        data: mockRole,
        error: null,
      });

      const result = await grantSiteRole(
        mockClient,
        "user-123",
        1,
        "admin-456"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot grant non-site role via this function");
    });

    it("should return error when user already has the role", async () => {
      const mockRole = { id: 1, scope: "site" };
      const mockExisting = { id: 1 };

      const mockClient = createMockClient();

      mockClient._queryBuilder.single.mockResolvedValueOnce({
        data: mockRole,
        error: null,
      });

      mockClient._queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: mockExisting,
        error: null,
      });

      const result = await grantSiteRole(
        mockClient,
        "user-123",
        1,
        "admin-456"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("User already has this role");
    });

    it("should handle database insert error", async () => {
      const mockRole = { id: 1, scope: "site" };

      const mockClient = createMockClient();

      mockClient._queryBuilder.single.mockResolvedValueOnce({
        data: mockRole,
        error: null,
      });

      mockClient._queryBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const dbError = new Error("Insert failed");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await grantSiteRole(
        mockClient,
        "user-123",
        1,
        "admin-456"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("revokeSiteRole", () => {
    it("should revoke a site role from a user", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      const result = await revokeSiteRole(
        mockClient,
        "user-123",
        1,
        "admin-456"
      );

      expect(result.success).toBe(true);
      expect(mockClient.from).toHaveBeenCalledWith("user_roles");
      expect(mockClient._queryBuilder.delete).toHaveBeenCalled();
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith(
        "user_id",
        "user-123"
      );
      expect(mockClient._queryBuilder.eq).toHaveBeenCalledWith("role_id", 1);
    });

    it("should handle database delete error", async () => {
      const mockClient = createMockClient();
      const dbError = new Error("Delete failed");
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: dbError }).then(resolve);
      });

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await revokeSiteRole(
        mockClient,
        "user-123",
        1,
        "admin-456"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error revoking site role:",
        dbError
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle revoking nonexistent role assignment gracefully", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      const result = await revokeSiteRole(
        mockClient,
        "user-123",
        999,
        "admin-456"
      );

      expect(result.success).toBe(true);
    });

    it("should handle multiple role revocations", async () => {
      const mockClient = createMockClient();
      mockClient._queryBuilder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      });

      const result1 = await revokeSiteRole(
        mockClient,
        "user-123",
        1,
        "admin-456"
      );
      const result2 = await revokeSiteRole(
        mockClient,
        "user-123",
        2,
        "admin-456"
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});
