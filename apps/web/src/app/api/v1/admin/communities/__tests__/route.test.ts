/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockListCommunitiesAdmin = jest.fn();
const mockListOrgRequestsAdmin = jest.fn();
const mockIsSiteAdmin = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  listCommunitiesAdmin: (...args: unknown[]) =>
    mockListCommunitiesAdmin(...args),
  listOrgRequestsAdmin: (...args: unknown[]) =>
    mockListOrgRequestsAdmin(...args),
  isSiteAdmin: (...args: unknown[]) => mockIsSiteAdmin(...args),
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

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { NextRequest } from "next/server";

import { GET } from "../route";

// =============================================================================
// Test data
// =============================================================================

const COMMUNITIES_RESULT = {
  data: [
    {
      id: 1,
      name: "Pallet Town VGC",
      slug: "pallet-town-vgc",
      status: "active",
      tier: null,
      is_featured: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      owner: {
        id: "user-1",
        username: "ash_ketchum",
        first_name: "Ash",
        last_name: "Ketchum",
        image: null,
      },
      community_admin_notes: null,
    },
  ],
  count: 1,
};

const REQUESTS_RESULT = {
  data: [
    {
      id: 10,
      name: "Cerulean City VGC",
      slug: "cerulean-city-vgc",
      status: "pending",
      created_at: "2024-01-05T00:00:00Z",
      updated_at: "2024-01-05T00:00:00Z",
      requester: {
        id: "user-2",
        username: "misty",
        first_name: "Misty",
        last_name: null,
        image: null,
        email: "misty@trainers.local",
      },
    },
  ],
  count: 1,
};

const SERVICE_ROLE_CLIENT = { __client: "service-role" };
const AUTHED_COOKIE = {
  mode: "cookie" as const,
  userId: "admin-user-1",
  supabase: { __client: "cookie" },
};
const AUTHED_BEARER = {
  mode: "bearer" as const,
  userId: "admin-user-1",
  supabase: { __client: "bearer" },
};
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = {
  allowed: false,
  remaining: 0,
  resetAt: new Date("2030-01-01"),
};

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(
  options: { token?: string; searchParams?: Record<string, string> } = {}
): NextRequest {
  const headers: Record<string, string> = {};
  if (options.token !== undefined) {
    headers["authorization"] = `Bearer ${options.token}`;
  }
  const url = new URL("http://localhost:3000/api/v1/admin/communities");
  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url, { headers });
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
  mockListCommunitiesAdmin.mockResolvedValue(COMMUNITIES_RESULT);
  mockListOrgRequestsAdmin.mockResolvedValue(REQUESTS_RESULT);
  mockIsSiteAdmin.mockResolvedValue(true);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: anonymous — tests that need auth must override this.
  mockResolveApiAuth.mockResolvedValue(null);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for an anonymous request (no cookie, no bearer)", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({
      error: "Not authenticated",
    });
    expect(mockListCommunitiesAdmin).not.toHaveBeenCalled();
    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Authorization (admin check)
// =============================================================================

describe("authorization", () => {
  it("returns 403 when the authenticated user is not a site admin", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(false);

    const response = await GET(makeRequest());

    expect(response.status).toBe(403);
    expect(await getJson(response)).toEqual({
      error: "Forbidden",
    });
    expect(mockListCommunitiesAdmin).not.toHaveBeenCalled();
  });

  it("uses the service-role client for the admin check (bypasses RLS)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest());

    // isSiteAdmin is called with the service-role client and the authed userId
    expect(mockIsSiteAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      AUTHED_COOKIE.userId
    );
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockListCommunitiesAdmin).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Success — communities (default type)
// =============================================================================

describe("success — communities", () => {
  it("returns 200 + communities data for a valid web cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: COMMUNITIES_RESULT,
    });
    expect(mockListCommunitiesAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ limit: 25, offset: 0 })
    );
    expect(mockListOrgRequestsAdmin).not.toHaveBeenCalled();
  });

  it("returns 200 + communities data for a valid mobile Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(makeRequest({ token: "valid-jwt" }));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: COMMUNITIES_RESULT,
    });
    expect(mockListCommunitiesAdmin).toHaveBeenCalled();
  });

  it("forwards search, status, limit, and offset query params", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(
      makeRequest({
        searchParams: {
          search: "pallet",
          status: "active",
          limit: "10",
          offset: "50",
        },
      })
    );

    expect(mockListCommunitiesAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({
        search: "pallet",
        status: "active",
        limit: 10,
        offset: 50,
      })
    );
  });

  it("clamps limit to MAX_PAGE_SIZE (100)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ searchParams: { limit: "999" } }));

    expect(mockListCommunitiesAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ limit: 100 })
    );
  });

  it("sets private, no-store Cache-Control header on success", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});

// =============================================================================
// Success — requests (type=requests)
// =============================================================================

describe("success — requests", () => {
  it("returns 200 + requests data when type=requests", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(
      makeRequest({ searchParams: { type: "requests" } })
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: REQUESTS_RESULT,
    });
    expect(mockListOrgRequestsAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ limit: 25, offset: 0 })
    );
    expect(mockListCommunitiesAdmin).not.toHaveBeenCalled();
  });

  it("forwards search and status to the requests query", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(
      makeRequest({
        searchParams: {
          type: "requests",
          search: "cerulean",
          status: "pending",
        },
      })
    );

    expect(mockListOrgRequestsAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ search: "cerulean", status: "pending" })
    );
  });

  it("sets private, no-store Cache-Control header for requests", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(
      makeRequest({ searchParams: { type: "requests" } })
    );

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
