/**
 * @jest-environment node
 */

import { POST, DELETE } from "../route";

// ============================================================================
// Mocks
// ============================================================================

const mockCreateUser = jest.fn();
const mockDeleteUser = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
      },
    },
  }),
}));

// ============================================================================
// Helpers
// ============================================================================

const VALID_SECRET = "test-secret-123";

function makePostRequest(): Request {
  return new Request("http://localhost:3000/api/e2e/temp-user", {
    method: "POST",
    headers: {
      "x-e2e-seed-secret": VALID_SECRET,
    },
  });
}

function makeDeleteRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/e2e/temp-user", {
    method: "DELETE",
    headers: {
      "x-e2e-seed-secret": VALID_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function getJsonResponse(
  handler: (request: Request) => Promise<Response>,
  request: Request
) {
  const response = await handler(request);
  const body = await response.json();
  return { status: response.status, body };
}

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("temp-user E2E API route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to a safe baseline: no VERCEL_ENV, development NODE_ENV
    process.env = { ...originalEnv };
    setEnv({
      VERCEL_ENV: undefined,
      NODE_ENV: "development",
      VERCEL_AUTOMATION_BYPASS_SECRET: VALID_SECRET,
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // --------------------------------------------------------------------------
  // Environment guard
  // --------------------------------------------------------------------------

  describe("environment guard", () => {
    it("returns 404 when VERCEL_ENV is production", async () => {
      setEnv({ VERCEL_ENV: "production" });

      const { status, body } = await getJsonResponse(POST, makePostRequest());

      expect(status).toBe(404);
      expect(body.error).toBe("Not found");
    });

    it.each(["development", "preview"])(
      "allows VERCEL_ENV=%s",
      async (vercelEnv) => {
        setEnv({ VERCEL_ENV: vercelEnv });
        // Mock successful creation so we get past the guards
        mockCreateUser.mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        });

        const { status } = await getJsonResponse(POST, makePostRequest());

        expect(status).not.toBe(404);
      }
    );

    it("allows local dev when VERCEL_ENV is unset and NODE_ENV is development", async () => {
      setEnv({ VERCEL_ENV: undefined, NODE_ENV: "development" });
      mockCreateUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const { status } = await getJsonResponse(POST, makePostRequest());

      expect(status).not.toBe(404);
    });

    it("returns 404 when VERCEL_ENV is unset and NODE_ENV is not development", async () => {
      setEnv({ VERCEL_ENV: undefined, NODE_ENV: "production" });

      const { status, body } = await getJsonResponse(POST, makePostRequest());

      expect(status).toBe(404);
      expect(body.error).toBe("Not found");
    });
  });

  // --------------------------------------------------------------------------
  // Secret validation
  // --------------------------------------------------------------------------

  describe("secret validation", () => {
    it("returns 401 when secret header is missing", async () => {
      const request = new Request("http://localhost:3000/api/e2e/temp-user", {
        method: "POST",
      });

      const { status, body } = await getJsonResponse(POST, request);

      expect(status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when secret does not match", async () => {
      const request = new Request("http://localhost:3000/api/e2e/temp-user", {
        method: "POST",
        headers: { "x-e2e-seed-secret": "wrong-secret" },
      });

      const { status, body } = await getJsonResponse(POST, request);

      expect(status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when VERCEL_AUTOMATION_BYPASS_SECRET is not set", async () => {
      setEnv({ VERCEL_AUTOMATION_BYPASS_SECRET: undefined });

      const { status, body } = await getJsonResponse(POST, makePostRequest());

      expect(status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });

  // --------------------------------------------------------------------------
  // POST (create user)
  // --------------------------------------------------------------------------

  describe("POST /api/e2e/temp-user", () => {
    it("returns 200 with user data on success", async () => {
      mockCreateUser.mockResolvedValue({
        data: { user: { id: "new-user-id" } },
        error: null,
      });

      const { status, body } = await getJsonResponse(POST, makePostRequest());

      expect(status).toBe(200);
      expect(body.userId).toBe("new-user-id");
      expect(body.email).toMatch(/^e2e-onboarding-\d+@trainers\.local$/);
      expect(body.password).toBe("Password123!");
      expect(body.username).toMatch(/^temp_[a-z0-9]+$/);
      expect(mockCreateUser).toHaveBeenCalledTimes(1);
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.stringMatching(/^e2e-onboarding-\d+@trainers\.local$/),
          password: "Password123!",
          email_confirm: true,
          user_metadata: expect.objectContaining({
            username: expect.stringMatching(/^temp_[a-z0-9]+$/),
          }),
        })
      );
    });

    it("returns 500 when Supabase createUser fails", async () => {
      mockCreateUser.mockResolvedValue({
        data: null,
        error: { message: "Internal server error" },
      });

      const { status, body } = await getJsonResponse(POST, makePostRequest());

      expect(status).toBe(500);
      expect(body.error).toBe("Internal server error");
    });
  });

  // --------------------------------------------------------------------------
  // DELETE (delete user)
  // --------------------------------------------------------------------------

  describe("DELETE /api/e2e/temp-user", () => {
    it("returns 200 on successful deletion", async () => {
      mockDeleteUser.mockResolvedValue({ error: null });

      const { status, body } = await getJsonResponse(
        DELETE,
        makeDeleteRequest({ userId: "user-to-delete" })
      );

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockDeleteUser).toHaveBeenCalledWith("user-to-delete");
    });

    it("returns 400 when userId is missing", async () => {
      const { status, body } = await getJsonResponse(
        DELETE,
        makeDeleteRequest({})
      );

      expect(status).toBe(400);
      expect(body.error).toBe("userId is required");
    });

    it("returns 400 when userId is not a string", async () => {
      const { status, body } = await getJsonResponse(
        DELETE,
        makeDeleteRequest({ userId: 12345 })
      );

      expect(status).toBe(400);
      expect(body.error).toBe("userId is required");
    });

    it("returns 500 when Supabase deleteUser fails", async () => {
      mockDeleteUser.mockResolvedValue({
        error: { message: "User not found" },
      });

      const { status, body } = await getJsonResponse(
        DELETE,
        makeDeleteRequest({ userId: "nonexistent-user" })
      );

      expect(status).toBe(500);
      expect(body.error).toBe("User not found");
    });
  });
});
