/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockListMyCommunities = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@trainers/supabase", () => ({
  listMyCommunities: (...args: unknown[]) => mockListMyCommunities(...args),
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

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { NextRequest } from "next/server";

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const MY_COMMUNITIES = [
  {
    id: 1,
    name: "Pallet Town PoGo",
    slug: "pallet-town-pogo",
    owner_user_id: "user-cookie-1",
    isOwner: true,
  },
  {
    id: 2,
    name: "Kanto League",
    slug: "kanto-league",
    owner_user_id: "user-other",
    isOwner: false,
  },
];

const COOKIE_SUPABASE = { __client: "cookie" };
const BEARER_SUPABASE = { __client: "bearer" };

const AUTHED_COOKIE = {
  mode: "cookie" as const,
  userId: "user-cookie-1",
  supabase: COOKIE_SUPABASE,
};
const AUTHED_BEARER = {
  mode: "bearer" as const,
  userId: "user-bearer-1",
  supabase: BEARER_SUPABASE,
};
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = {
  allowed: false,
  remaining: 0,
  resetAt: new Date("2030-01-01"),
};

function makeRequest(options: { token?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (options.token !== undefined) {
    headers["authorization"] = `Bearer ${options.token}`;
  }
  return new NextRequest("http://localhost:3000/api/v1/me/communities", {
    headers,
  });
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockListMyCommunities.mockResolvedValue(MY_COMMUNITIES);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: anonymous — tests that need auth must override.
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
      success: false,
      error: "Not authenticated",
    });
    expect(mockListMyCommunities).not.toHaveBeenCalled();
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
    expect(mockListMyCommunities).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Success — both auth modes
// =============================================================================

describe("success", () => {
  it("returns 200 + the caller's communities for a valid web cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: MY_COMMUNITIES,
    });
    // Reads through the identity-bound client (RLS as the caller).
    expect(mockListMyCommunities).toHaveBeenCalledWith(
      COOKIE_SUPABASE,
      "user-cookie-1"
    );
  });

  it("returns 200 + the caller's communities for a valid mobile Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(makeRequest({ token: "valid-jwt" }));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: MY_COMMUNITIES,
    });
    expect(mockListMyCommunities).toHaveBeenCalledWith(
      BEARER_SUPABASE,
      "user-bearer-1"
    );
  });

  it("returns 200 with an empty array when user has no communities", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockListMyCommunities.mockResolvedValue([]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({ success: true, data: [] });
  });

  it("sets a private, no-store Cache-Control header on success", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
