/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedCommunityBySlug = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockEnforceRateLimit = jest.fn();

jest.mock("@/lib/data/communities-endpoints", () => ({
  getCachedCommunityBySlug: (...args: unknown[]) =>
    mockGetCachedCommunityBySlug(...args),
}));

jest.mock("@/lib/api/auth", () => ({
  resolveApiAuth: (...args: unknown[]) => mockResolveApiAuth(...args),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { NextRequest } from "next/server";

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const COMMUNITY = {
  id: 1,
  slug: "pallet-town-vgc",
  name: "Pallet Town VGC",
  status: "active",
  description: "The premier VGC community",
};

const AUTHED_USER = { mode: "cookie" as const, userId: "user-1", supabase: {} };
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/communities/pallet-town-vgc");
}

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCachedCommunityBySlug.mockResolvedValue(COMMUNITY);
  mockResolveApiAuth.mockResolvedValue(AUTHED_USER);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for an anonymous request (resolveApiAuth returns null)", async () => {
    mockResolveApiAuth.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedCommunityBySlug).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when the rate limit is exceeded", async () => {
    mockEnforceRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(429);
    expect(await getJson(response)).toEqual({ error: "Too many requests" });
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect(mockGetCachedCommunityBySlug).not.toHaveBeenCalled();
  });

  it("sets Retry-After to at least 1 to guard against clock drift producing 0", async () => {
    // resetAt in the past (simulates extreme clock drift)
    mockEnforceRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() - 5_000),
    });

    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// Success
// =============================================================================

describe("success", () => {
  it("returns 200 + community JSON for a valid slug", async () => {
    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(COMMUNITY);
    expect(mockGetCachedCommunityBySlug).toHaveBeenCalledWith(
      "pallet-town-vgc"
    );
  });

  it("returns null JSON when the community does not exist", async () => {
    mockGetCachedCommunityBySlug.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams("nonexistent"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toBeNull();
  });

  it("sets private, no-store Cache-Control to prevent CDN caching of auth-gated responses", async () => {
    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
