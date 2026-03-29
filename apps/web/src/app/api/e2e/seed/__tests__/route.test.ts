/**
 * @jest-environment node
 */

import { POST } from "../route";

// ============================================================================
// Mocks
// ============================================================================

const mockCreateUser = jest.fn();
const mockUpsert = jest.fn();
const mockUpdate = jest.fn();
const mockSelect = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({
    from: jest.fn((table: string) => {
      if (table === "roles") {
        return {
          upsert: mockUpsert,
          select: mockSelect,
        };
      }
      if (table === "users") {
        return { update: mockUpdate };
      }
      if (table === "user_roles") {
        return { upsert: mockUpsert };
      }
      return {};
    }),
    auth: {
      admin: {
        createUser: mockCreateUser,
      },
    },
  }),
}));

// ============================================================================
// Helpers
// ============================================================================

const VALID_SECRET = "test-secret-123";

function makeRequest(): Request {
  return new Request("http://localhost:3000/api/e2e/seed", {
    method: "POST",
    headers: {
      "x-e2e-seed-secret": VALID_SECRET,
    },
  });
}

async function getJsonResponse(request: Request) {
  const response = await POST(request);
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

describe("POST /api/e2e/seed", () => {
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

      const { status, body } = await getJsonResponse(makeRequest());

      expect(status).toBe(404);
      expect(body.error).toBe("Not found");
    });

    it.each(["development", "preview"])(
      "allows VERCEL_ENV=%s",
      async (vercelEnv) => {
        setEnv({ VERCEL_ENV: vercelEnv });
        // Mock successful seeding so we get past the guards
        mockUpsert.mockResolvedValue({ error: null });
        mockCreateUser.mockResolvedValue({ error: null });
        mockUpdate.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });

        const { status } = await getJsonResponse(makeRequest());

        expect(status).not.toBe(404);
      }
    );

    it("allows local dev when VERCEL_ENV is unset and NODE_ENV is development", async () => {
      setEnv({ VERCEL_ENV: undefined, NODE_ENV: "development" });
      mockUpsert.mockResolvedValue({ error: null });
      mockCreateUser.mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const { status } = await getJsonResponse(makeRequest());

      expect(status).not.toBe(404);
    });

    it("returns 404 when VERCEL_ENV is unset and NODE_ENV is not development", async () => {
      setEnv({ VERCEL_ENV: undefined, NODE_ENV: "production" });

      const { status, body } = await getJsonResponse(makeRequest());

      expect(status).toBe(404);
      expect(body.error).toBe("Not found");
    });
  });

  // --------------------------------------------------------------------------
  // Secret validation
  // --------------------------------------------------------------------------

  describe("secret validation", () => {
    it("returns 401 when secret header is missing", async () => {
      const request = new Request("http://localhost:3000/api/e2e/seed", {
        method: "POST",
      });

      const { status, body } = await getJsonResponse(request);

      expect(status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when secret header does not match", async () => {
      const request = new Request("http://localhost:3000/api/e2e/seed", {
        method: "POST",
        headers: { "x-e2e-seed-secret": "wrong-secret" },
      });

      const { status, body } = await getJsonResponse(request);

      expect(status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when VERCEL_AUTOMATION_BYPASS_SECRET is not set", async () => {
      setEnv({ VERCEL_AUTOMATION_BYPASS_SECRET: undefined });

      const { status, body } = await getJsonResponse(makeRequest());

      expect(status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });

  // --------------------------------------------------------------------------
  // Seeding behavior
  // --------------------------------------------------------------------------

  describe("seeding", () => {
    beforeEach(() => {
      // Default: local dev environment that passes all guards
      setEnv({
        VERCEL_ENV: undefined,
        NODE_ENV: "development",
        VERCEL_AUTOMATION_BYPASS_SECRET: VALID_SECRET,
      });
    });

    it("returns 200 when all users are created successfully", async () => {
      mockUpsert.mockResolvedValue({ error: null });
      mockCreateUser.mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: { id: "role-1" }, error: null }),
          }),
        }),
      });

      const { status, body } = await getJsonResponse(makeRequest());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.results).toHaveLength(4);
      expect(mockCreateUser).toHaveBeenCalledTimes(4);
    });

    it("returns 500 when role upsert fails", async () => {
      mockUpsert.mockResolvedValue({
        error: { message: "DB error" },
      });

      const { status, body } = await getJsonResponse(makeRequest());

      expect(status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error).toContain("Failed to upsert site_admin role");
    });

    it("handles already-existing users gracefully", async () => {
      mockUpsert.mockResolvedValue({ error: null });
      mockCreateUser.mockResolvedValue({
        error: { code: "email_exists", message: "User already exists" },
      });
      mockUpdate.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const { status, body } = await getJsonResponse(makeRequest());

      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(
        body.results.every(
          (r: { status: string }) => r.status === "already_exists"
        )
      ).toBe(true);
    });

    it("returns 207 when some users fail", async () => {
      mockUpsert.mockResolvedValue({ error: null });
      mockCreateUser.mockResolvedValue({
        error: { code: "unexpected_error", message: "Something broke" },
      });

      const { status, body } = await getJsonResponse(makeRequest());

      expect(status).toBe(207);
      expect(body.success).toBe(false);
    });
  });
});
