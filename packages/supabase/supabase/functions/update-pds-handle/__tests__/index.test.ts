/**
 * Tests for update-pds-handle edge function
 * Verifies handle updates on existing PDS accounts when username changes
 */

// Mock Deno environment
const mockEnv = new Map<string, string>([
  ["SUPABASE_URL", "https://test.supabase.co"],
  ["SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key"],
  ["PDS_HOST", "https://pds.test.trainers.gg"],
]);

(globalThis as Record<string, unknown>).Deno = {
  env: {
    get: (key: string) => mockEnv.get(key) ?? undefined,
  },
  serve: jest.fn(),
};

// Mock dependencies
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockUpdateHandle = jest.fn();

jest.mock("jsr:@supabase/supabase-js@2", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

jest.mock("../../_shared/cors.ts", () => ({
  getCorsHeaders: jest.fn(() => ({ "Access-Control-Allow-Origin": "*" })),
}));

jest.mock("../../_shared/pds.ts", () => ({
  checkPdsHandleAvailable: jest.fn(),
  generateHandle: jest.fn((username: string) => `${username}.trainers.gg`),
  loginPdsAgent: jest.fn(),
}));

import { checkPdsHandleAvailable, loginPdsAgent } from "../../_shared/pds";

// Helper to create query builder mock
function createQueryBuilder(data: unknown = null, error: unknown = null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  };
}

// Helper to create mock request
function createMockRequest(
  method: string,
  body?: Record<string, unknown>
): Request {
  return {
    method,
    headers: new Map([["Authorization", "Bearer test-jwt-token"]]),
    json: async () => body || {},
  } as unknown as Request;
}

describe("update-pds-handle edge function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authentication", () => {
    it("rejects requests without Authorization header", async () => {
      const handler = await import("../index.ts");
      const request = {
        method: "POST",
        headers: new Map(),
        json: async () => ({ username: "newuser" }),
      } as unknown as Request;

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("rejects requests with invalid JWT", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Invalid token"),
      });

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.code).toBe("UNAUTHORIZED");
    });
  });

  describe("username validation", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
    });

    it("rejects usernames shorter than 3 characters", async () => {
      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "ab" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_USERNAME");
    });

    it("rejects usernames longer than 20 characters", async () => {
      const handler = await import("../index.ts");
      const request = createMockRequest("POST", {
        username: "verylongusernamethatexceedstwentycharacters",
      });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_USERNAME");
    });

    it("rejects usernames with invalid characters", async () => {
      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "user name!" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe("INVALID_USERNAME");
    });

    it("accepts valid usernames", async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder(
          { id: "user-123", pds_status: "active", did: "did:plc:test123" },
          null
        )
      );
      (checkPdsHandleAvailable as jest.Mock).mockResolvedValue(true);
      mockRpc.mockResolvedValue({ data: "test-password", error: null });
      (loginPdsAgent as jest.Mock).mockResolvedValue({
        success: true,
        agent: {
          com: {
            atproto: {
              identity: {
                updateHandle: mockUpdateHandle,
              },
            },
          },
        },
      });

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "valid_user-123" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("PDS account status validation", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
    });

    it("rejects users without an active PDS account", async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder({ id: "user-123", pds_status: "pending" }, null)
      );

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe("NOT_PROVISIONED");
    });

    it("rejects users without a DID", async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder(
          { id: "user-123", pds_status: "active", did: null },
          null
        )
      );

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe("NOT_PROVISIONED");
    });

    it("accepts users with active PDS and DID", async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder(
          {
            id: "user-123",
            pds_status: "active",
            did: "did:plc:test123",
            pds_handle: "olduser.trainers.gg",
          },
          null
        )
      );
      (checkPdsHandleAvailable as jest.Mock).mockResolvedValue(true);
      mockRpc.mockResolvedValue({ data: "test-password", error: null });
      (loginPdsAgent as jest.Mock).mockResolvedValue({
        success: true,
        agent: {
          com: {
            atproto: {
              identity: {
                updateHandle: mockUpdateHandle,
              },
            },
          },
        },
      });

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("handle availability", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
      mockFrom.mockReturnValue(
        createQueryBuilder(
          {
            id: "user-123",
            pds_status: "active",
            did: "did:plc:test123",
            pds_handle: "olduser.trainers.gg",
          },
          null
        )
      );
    });

    it("rejects if handle is already taken", async () => {
      (checkPdsHandleAvailable as jest.Mock).mockResolvedValue(false);

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "takenuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.code).toBe("HANDLE_TAKEN");
    });

    it("skips update if handle is already current", async () => {
      mockFrom.mockReturnValue(
        createQueryBuilder(
          {
            id: "user-123",
            pds_status: "active",
            did: "did:plc:test123",
            pds_handle: "currentuser.trainers.gg",
          },
          null
        )
      );

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "currentuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRpc).not.toHaveBeenCalled(); // Should not retrieve password
      expect(loginPdsAgent).not.toHaveBeenCalled(); // Should not login
    });
  });

  describe("vault password retrieval", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
      mockFrom.mockReturnValue(
        createQueryBuilder(
          {
            id: "user-123",
            pds_status: "active",
            did: "did:plc:test123",
            pds_handle: "olduser.trainers.gg",
          },
          null
        )
      );
      (checkPdsHandleAvailable as jest.Mock).mockResolvedValue(true);
    });

    it("rejects if vault password retrieval fails", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: new Error("Vault error"),
      });

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe("VAULT_ERROR");
    });

    it("retrieves password from vault with correct secret name", async () => {
      mockRpc.mockResolvedValue({ data: "test-password", error: null });
      (loginPdsAgent as jest.Mock).mockResolvedValue({
        success: true,
        agent: {
          com: {
            atproto: {
              identity: {
                updateHandle: mockUpdateHandle,
              },
            },
          },
        },
      });

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      await handler.default(request);

      expect(mockRpc).toHaveBeenCalledWith("vault_read_secret", {
        secret_name: "pds_password_user-123",
      });
    });
  });

  describe("PDS agent login and handle update", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
      mockFrom.mockReturnValue(
        createQueryBuilder(
          {
            id: "user-123",
            pds_status: "active",
            did: "did:plc:test123",
            pds_handle: "olduser.trainers.gg",
          },
          null
        )
      );
      (checkPdsHandleAvailable as jest.Mock).mockResolvedValue(true);
      mockRpc.mockResolvedValue({ data: "test-password", error: null });
    });

    it("rejects if PDS agent login fails", async () => {
      (loginPdsAgent as jest.Mock).mockResolvedValue({
        success: false,
        error: "Authentication failed",
      });

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe("PDS_ERROR");
    });

    it("calls PDS updateHandle with correct handle", async () => {
      (loginPdsAgent as jest.Mock).mockResolvedValue({
        success: true,
        agent: {
          com: {
            atproto: {
              identity: {
                updateHandle: mockUpdateHandle,
              },
            },
          },
        },
      });

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      await handler.default(request);

      expect(mockUpdateHandle).toHaveBeenCalledWith({
        handle: "newuser.trainers.gg",
      });
    });

    it("rejects if PDS handle update fails", async () => {
      mockUpdateHandle.mockRejectedValue(new Error("PDS API error"));
      (loginPdsAgent as jest.Mock).mockResolvedValue({
        success: true,
        agent: {
          com: {
            atproto: {
              identity: {
                updateHandle: mockUpdateHandle,
              },
            },
          },
        },
      });

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe("PDS_ERROR");
    });
  });

  describe("database update", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
      (checkPdsHandleAvailable as jest.Mock).mockResolvedValue(true);
      mockRpc.mockResolvedValue({ data: "test-password", error: null });
      (loginPdsAgent as jest.Mock).mockResolvedValue({
        success: true,
        agent: {
          com: {
            atproto: {
              identity: {
                updateHandle: mockUpdateHandle,
              },
            },
          },
        },
      });
    });

    it("updates pds_handle in database after successful PDS update", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ error: null });

      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder(
            {
              id: "user-123",
              pds_status: "active",
              did: "did:plc:test123",
              pds_handle: "olduser.trainers.gg",
            },
            null
          )
        )
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
        });

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(mockUpdate).toHaveBeenCalledWith({
        pds_handle: "newuser.trainers.gg",
      });
      expect(mockEq).toHaveBeenCalledWith("id", "user-123");
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns error if database update fails", async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest
        .fn()
        .mockResolvedValue({ error: new Error("DB error") });

      mockFrom
        .mockReturnValueOnce(
          createQueryBuilder(
            {
              id: "user-123",
              pds_status: "active",
              did: "did:plc:test123",
              pds_handle: "olduser.trainers.gg",
            },
            null
          )
        )
        .mockReturnValueOnce({
          update: mockUpdate,
          eq: mockEq,
        });

      const handler = await import("../index.ts");
      const request = createMockRequest("POST", { username: "newuser" });

      const response = await handler.default(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe("DB_UPDATE_FAILED");
    });
  });

  describe("CORS", () => {
    it("handles OPTIONS preflight requests", async () => {
      const handler = await import("../index.ts");
      const request = createMockRequest("OPTIONS");

      const response = await handler.default(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });
});
