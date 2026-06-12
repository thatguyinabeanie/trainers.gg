/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedTournamentStandings = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@/lib/data/standings-endpoint", () => ({
  getCachedTournamentStandings: (...args: unknown[]) =>
    mockGetCachedTournamentStandings(...args),
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

import { publicStandingFactory } from "@trainers/test-utils/factories";

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const STANDINGS = [
  publicStandingFactory.build({
    id: 1,
    tournament_id: 42,
    rank: 1,
    alt: { id: 7, username: "ash", avatar_url: null },
  }),
  publicStandingFactory.build({
    id: 2,
    tournament_id: 42,
    rank: 2,
    alt: { id: 8, username: "gary", avatar_url: null },
  }),
];

const AUTHED_COOKIE = { mode: "cookie" as const, userId: "user-cookie-1", supabase: {} };
const AUTHED_BEARER = { mode: "bearer" as const, userId: "user-bearer-1", supabase: {} };
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = { allowed: false, remaining: 0, resetAt: new Date("2030-01-01") };

function makeRequest(options: { token?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (options.token !== undefined) {
    headers["authorization"] = `Bearer ${options.token}`;
  }
  return new NextRequest("http://localhost:3000/api/v1/tournaments/42/standings", {
    headers,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCachedTournamentStandings.mockResolvedValue(STANDINGS);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: anonymous — tests that need auth must override this.
  mockResolveApiAuth.mockResolvedValue(null);
});

// =============================================================================
// Route-param validation
// =============================================================================

describe("param validation", () => {
  it("returns 404 when the id is non-numeric", async () => {
    const response = await GET(makeRequest({ token: "valid" }), makeParams("abc"));

    expect(response.status).toBe(404);
    expect(await getJson(response)).toEqual({ error: "Tournament not found" });
    // Never touches auth or DB on a bad id.
    expect(mockResolveApiAuth).not.toHaveBeenCalled();
    expect(mockGetCachedTournamentStandings).not.toHaveBeenCalled();
  });

  it("validates the param before auth (bad id short-circuits even when anonymous)", async () => {
    const response = await GET(makeRequest(), makeParams("not-a-number"));

    expect(response.status).toBe(404);
  });
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for an anonymous request (no cookie, no bearer)", async () => {
    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedTournamentStandings).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetCachedTournamentStandings).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Success — both auth modes
// =============================================================================

describe("success", () => {
  it("returns 200 + standings JSON for a valid web cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(STANDINGS);
    expect(mockGetCachedTournamentStandings).toHaveBeenCalledWith(42);
  });

  it("returns 200 + standings JSON for a valid mobile Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(
      makeRequest({ token: "valid-jwt" }),
      makeParams("42")
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(STANDINGS);
    expect(mockGetCachedTournamentStandings).toHaveBeenCalledWith(42);
  });

  it("sets the tag-invalidated Cache-Control header on success", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=31536000, stale-while-revalidate=86400"
    );
  });
});
