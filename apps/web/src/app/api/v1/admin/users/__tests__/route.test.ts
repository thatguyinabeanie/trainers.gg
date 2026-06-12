/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockListUsersAdmin = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockIsSiteAdmin = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  listUsersAdmin: (...args: unknown[]) => mockListUsersAdmin(...args),
  // Re-export the type only — no runtime value needed.
}));

jest.mock("@/lib/api/auth", () => ({
  resolveApiAuth: (...args: unknown[]) => mockResolveApiAuth(...args),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  extractRequestIp: jest.fn(() => "127.0.0.1"),
  DEFAULT_API_LIMIT: 120,
  DEFAULT_WINDOW_MS: 60_000,
}));

jest.mock("@/lib/sudo/server", () => ({
  isSiteAdmin: (...args: unknown[]) => mockIsSiteAdmin(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { NextRequest } from "next/server";

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const ADMIN_USERS_RESULT = {
  data: [
    {
      id: "user-1",
      email: "admin@trainers.local",
      username: "admin_trainer",
      is_locked: false,
      created_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "user-2",
      email: "player@trainers.local",
      username: "ash_ketchum",
      is_locked: false,
      created_at: "2025-01-02T00:00:00Z",
    },
  ],
  count: 2,
};

const AUTHED_COOKIE = {
  mode: "cookie" as const,
  userId: "admin-user-1",
  supabase: {},
};
const AUTHED_BEARER = {
  mode: "bearer" as const,
  userId: "admin-user-bearer-1",
  supabase: {},
};
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = {
  allowed: false,
  remaining: 0,
  resetAt: new Date("2030-01-01"),
};

// Stub service-role client — listUsersAdmin receives this object.
const SERVICE_ROLE_CLIENT = { __serviceRole: true };

function makeRequest(options: {
  token?: string;
  search?: string;
  status?: string;
  page?: string;
  limit?: string;
} = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (options.token !== undefined) {
    headers["authorization"] = `Bearer ${options.token}`;
  }

  const url = new URL("http://localhost:3000/api/v1/admin/users");
  if (options.search) url.searchParams.set("search", options.search);
  if (options.status) url.searchParams.set("status", options.status);
  if (options.page) url.searchParams.set("page", options.page);
  if (options.limit) url.searchParams.set("limit", options.limit);

  return new NextRequest(url.toString(), { headers });
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateServiceRoleClient.mockReturnValue(SERVICE_ROLE_CLIENT);
  mockListUsersAdmin.mockResolvedValue(ADMIN_USERS_RESULT);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: anonymous — tests that need auth must override.
  mockResolveApiAuth.mockResolvedValue(null);
  // Default: not admin — tests that need admin must override.
  mockIsSiteAdmin.mockResolvedValue(false);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for an anonymous request (no cookie, no bearer)", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
    expect(mockListUsersAdmin).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Admin gate
// =============================================================================

describe("admin gate", () => {
  it("returns 403 when the authenticated user is not a site admin", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(false);

    const response = await GET(makeRequest());

    expect(response.status).toBe(403);
    expect(await getJson(response)).toEqual({ error: "Forbidden" });
    expect(mockListUsersAdmin).not.toHaveBeenCalled();
  });

  it("proceeds past the admin gate when isSiteAdmin returns true", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(mockListUsersAdmin).toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockListUsersAdmin).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Success — both auth modes
// =============================================================================

describe("success", () => {
  beforeEach(() => {
    mockIsSiteAdmin.mockResolvedValue(true);
  });

  it("returns 200 + user list for a valid web cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(ADMIN_USERS_RESULT);
    expect(mockListUsersAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ limit: 25, offset: 0 })
    );
  });

  it("returns 200 + user list for a valid mobile Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(makeRequest({ token: "valid-jwt" }));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(ADMIN_USERS_RESULT);
  });

  it("sets Cache-Control: private, no-store on success", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("passes search param to listUsersAdmin", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ search: "ash" }));

    expect(mockListUsersAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ search: "ash" })
    );
  });

  it("passes isLocked=false for status=active", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ status: "active" }));

    expect(mockListUsersAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ isLocked: false })
    );
  });

  it("passes isLocked=true for status=suspended", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ status: "suspended" }));

    expect(mockListUsersAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ isLocked: true })
    );
  });

  it("passes isLocked=undefined for status=all", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ status: "all" }));

    expect(mockListUsersAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ isLocked: undefined })
    );
  });

  it("computes correct offset for page param", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ page: "2", limit: "10" }));

    expect(mockListUsersAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ offset: 20, limit: 10 })
    );
  });

  it("clamps limit to MAX_LIMIT (100)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ limit: "9999" }));

    expect(mockListUsersAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ limit: 100 })
    );
  });
});
