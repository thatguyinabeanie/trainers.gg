/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockListCoaches = jest.fn();
const mockIsSiteAdmin = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  listCoaches: (...args: unknown[]) => mockListCoaches(...args),
  isSiteAdmin: (...args: unknown[]) => mockIsSiteAdmin(...args),
}));

jest.mock("@/lib/api/auth", () => ({
  resolveApiAuth: (...args: unknown[]) => mockResolveApiAuth(...args),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
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
// Fixtures
// =============================================================================

const SERVICE_ROLE_CLIENT = { __client: "service-role" };

/** Sample coach rows matching the `listCoaches` return shape. */
const COACHES = [
  {
    id: "user-1",
    username: "misty",
    name: "Misty",
    image: null,
    is_coach: true,
    main_alt_id: 1,
  },
  {
    id: "user-2",
    username: "brock",
    name: "Brock",
    image: "https://example.com/brock.png",
    is_coach: true,
    main_alt_id: 2,
  },
];

const AUTHED_ADMIN = {
  mode: "cookie" as const,
  userId: "admin-user-1",
  supabase: { __client: "cookie" },
};

const AUTHED_NON_ADMIN = {
  mode: "cookie" as const,
  userId: "regular-user-1",
  supabase: { __client: "cookie" },
};

const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = {
  allowed: false,
  remaining: 0,
  resetAt: new Date("2030-01-01"),
};

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/admin/coaches");
}

async function getJson(response: Response): Promise<unknown> {
  return response.json() as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  // Default: service-role client sentinel
  mockCreateServiceRoleClient.mockReturnValue(SERVICE_ROLE_CLIENT);
  // Default: anonymous — tests that need auth must override this.
  mockResolveApiAuth.mockResolvedValue(null);
  // Default: site admin — override in non-admin tests.
  mockIsSiteAdmin.mockResolvedValue(true);
  // Default: rate limit OK.
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: empty coach list.
  mockListCoaches.mockResolvedValue([]);
});

// =============================================================================
// Authentication (401)
// =============================================================================

describe("authentication", () => {
  it("returns 401 for an anonymous request (no cookie, no bearer)", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    // Should not proceed to admin check or data fetch
    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
    expect(mockListCoaches).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Authorization (403)
// =============================================================================

describe("authorization", () => {
  it("returns 403 when the authenticated caller is not a site admin", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_NON_ADMIN);
    mockIsSiteAdmin.mockResolvedValue(false);

    const response = await GET(makeRequest());

    expect(response.status).toBe(403);
    expect(await getJson(response)).toEqual({ error: "Forbidden" });
    // Must check admin with the service-role client + resolved userId
    expect(mockIsSiteAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      AUTHED_NON_ADMIN.userId
    );
    // Should not reach data fetch
    expect(mockListCoaches).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting (429)
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_ADMIN);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockListCoaches).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Success (200)
// =============================================================================

describe("success", () => {
  it("returns 200 with the coaches list for a site admin", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_ADMIN);
    mockListCoaches.mockResolvedValue(COACHES);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: COACHES,
    });
  });

  it("returns 200 with an empty array when there are no coaches", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_ADMIN);
    mockListCoaches.mockResolvedValue([]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({ success: true, data: [] });
  });

  it("calls listCoaches with the service-role client", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_ADMIN);
    mockListCoaches.mockResolvedValue(COACHES);

    await GET(makeRequest());

    // Service-role bypasses RLS — ensures read survives Phase 2 anon revoke
    expect(mockListCoaches).toHaveBeenCalledWith(SERVICE_ROLE_CLIENT);
  });

  it("sets Cache-Control: private, no-store on a successful response", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_ADMIN);
    mockListCoaches.mockResolvedValue(COACHES);

    const response = await GET(makeRequest());

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("sets Cache-Control: private, no-store even when the coach list is empty", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_ADMIN);
    mockListCoaches.mockResolvedValue([]);

    const response = await GET(makeRequest());

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});

// =============================================================================
// Admin check wiring
// =============================================================================

describe("admin check wiring", () => {
  it("uses service-role client for the isSiteAdmin call", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_ADMIN);
    mockListCoaches.mockResolvedValue([]);

    await GET(makeRequest());

    expect(mockIsSiteAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      AUTHED_ADMIN.userId
    );
  });

  it("rate-limits before the admin check (isSiteAdmin not called when rate-limited)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_ADMIN);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest());

    // Rate limit runs before the admin DB read, so isSiteAdmin is never reached.
    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
    expect(response.status).toBe(429);
  });
});
