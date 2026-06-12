/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetTeamsForAlt = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getTeamsForAlt: (...args: unknown[]) => mockGetTeamsForAlt(...args),
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

const TEAMS = [
  {
    id: 1,
    name: "Team Alpha",
    createdBy: 10,
    isPublic: false,
    formatLegal: true,
    pokemonSpecies: ["pikachu", "charizard", "blastoise", "venusaur", "snorlax", "mewtwo"],
  },
  {
    id: 2,
    name: "Team Beta",
    createdBy: 10,
    isPublic: true,
    formatLegal: null,
    pokemonSpecies: ["eevee", "vaporeon"],
  },
];

// The identity-bound client from resolveApiAuth — the route hands it to
// getTeamsForAlt, which is mocked, so a sentinel object is enough.
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

function makeRequest(
  options: { token?: string; altId?: number | string } = {}
): NextRequest {
  const headers: Record<string, string> = {};
  if (options.token !== undefined) {
    headers["authorization"] = `Bearer ${options.token}`;
  }
  const url = new URL("http://localhost:3000/api/v1/me/teams");
  if (options.altId !== undefined) {
    url.searchParams.set("altId", String(options.altId));
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
  mockGetTeamsForAlt.mockResolvedValue(TEAMS);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: anonymous — tests that need auth must override this.
  mockResolveApiAuth.mockResolvedValue(null);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for an anonymous request (no cookie, no bearer)", async () => {
    const response = await GET(makeRequest({ altId: 10 }));

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({
      success: false,
      error: "Not authenticated",
    });
    expect(mockGetTeamsForAlt).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest({ altId: 10 }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetTeamsForAlt).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Input validation
// =============================================================================

describe("input validation", () => {
  it.each([
    ["missing altId", {}],
    ["altId=abc (non-numeric)", { altId: "abc" as string }],
    ["altId=0 (not positive)", { altId: 0 }],
    ["altId=-1 (negative)", { altId: -1 }],
  ])("returns 400 for %s", async (_label, params) => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    // Cast to allow testing edge-case inputs
    const response = await GET(makeRequest(params as { altId?: number | string }));

    expect(response.status).toBe(400);
    expect(await getJson(response)).toMatchObject({
      success: false,
      error: expect.stringContaining("altId"),
    });
    expect(mockGetTeamsForAlt).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Success — both auth modes
// =============================================================================

describe("success", () => {
  it("returns 200 + the caller's teams for a valid web cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest({ altId: 10 }));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: TEAMS,
    });
    // Reads through the identity-bound client (RLS as the caller), never
    // service-role or a static/anon client.
    expect(mockGetTeamsForAlt).toHaveBeenCalledWith(COOKIE_SUPABASE, 10);
  });

  it("returns 200 + the caller's teams for a valid mobile Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(makeRequest({ token: "valid-jwt", altId: 10 }));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: TEAMS,
    });
    expect(mockGetTeamsForAlt).toHaveBeenCalledWith(BEARER_SUPABASE, 10);
  });

  it("returns 200 with data:[] when the alt has no teams", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockGetTeamsForAlt.mockResolvedValue([]);

    const response = await GET(makeRequest({ altId: 99 }));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({ success: true, data: [] });
  });

  it("sets a private, no-store Cache-Control header on success", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest({ altId: 10 }));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("passes the correct altId to getTeamsForAlt", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ altId: 42 }));

    expect(mockGetTeamsForAlt).toHaveBeenCalledWith(COOKIE_SUPABASE, 42);
  });
});
