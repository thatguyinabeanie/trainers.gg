/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedCommunityBySlug = jest.fn();
const mockGetCachedCommunityTournaments = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockEnforceRateLimit = jest.fn();

jest.mock("@/lib/data/communities-endpoints", () => ({
  getCachedCommunityBySlug: (...args: unknown[]) =>
    mockGetCachedCommunityBySlug(...args),
  getCachedCommunityTournaments: (...args: unknown[]) =>
    mockGetCachedCommunityTournaments(...args),
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

const COMMUNITY = { id: 1, slug: "pallet-town-vgc", name: "Pallet Town VGC", status: "active" };

const TOURNAMENTS_RESULT = {
  tournaments: [
    { id: 10, name: "Spring Cup", status: "upcoming", registrationCount: 0 },
    { id: 11, name: "Summer Classic", status: "active", registrationCount: 32 },
  ],
  total: 2,
  hasMore: false,
};

const AUTHED_USER = { mode: "cookie" as const, userId: "user-1", supabase: {} };
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };

function makeRequest(query: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/communities/pallet-town-vgc/tournaments");
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
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
  mockGetCachedCommunityTournaments.mockResolvedValue(TOURNAMENTS_RESULT);
  mockResolveApiAuth.mockResolvedValue(AUTHED_USER);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for an anonymous request", async () => {
    mockResolveApiAuth.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockGetCachedCommunityTournaments).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit exceeded", async () => {
    mockEnforceRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(429);
    expect(mockGetCachedCommunityTournaments).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Community resolution
// =============================================================================

describe("community resolution", () => {
  it("returns 404 when the community does not exist", async () => {
    mockGetCachedCommunityBySlug.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams("nonexistent"));

    expect(response.status).toBe(404);
    expect(await getJson(response)).toEqual({ error: "Community not found" });
    expect(mockGetCachedCommunityTournaments).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Query parameter parsing
// =============================================================================

describe("query parameter parsing", () => {
  it("passes undefined status when status param is absent", async () => {
    await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(mockGetCachedCommunityTournaments).toHaveBeenCalledWith(
      COMMUNITY.id,
      "pallet-town-vgc",
      undefined, // no status filter
      50,        // default limit
      0          // default offset
    );
  });

  it("passes the status filter through for valid values", async () => {
    await GET(makeRequest({ status: "active" }), makeParams("pallet-town-vgc"));

    expect(mockGetCachedCommunityTournaments).toHaveBeenCalledWith(
      COMMUNITY.id,
      "pallet-town-vgc",
      "active",
      50,
      0
    );
  });

  it("ignores invalid status values (treats as undefined)", async () => {
    await GET(makeRequest({ status: "invalid" }), makeParams("pallet-town-vgc"));

    expect(mockGetCachedCommunityTournaments).toHaveBeenCalledWith(
      COMMUNITY.id,
      "pallet-town-vgc",
      undefined,
      50,
      0
    );
  });

  it("caps limit at MAX_LIMIT (100)", async () => {
    await GET(
      makeRequest({ limit: "9999" }),
      makeParams("pallet-town-vgc")
    );

    expect(mockGetCachedCommunityTournaments).toHaveBeenCalledWith(
      COMMUNITY.id,
      "pallet-town-vgc",
      undefined,
      100,
      0
    );
  });

  it("handles pagination offset", async () => {
    await GET(
      makeRequest({ limit: "10", offset: "20" }),
      makeParams("pallet-town-vgc")
    );

    expect(mockGetCachedCommunityTournaments).toHaveBeenCalledWith(
      COMMUNITY.id,
      "pallet-town-vgc",
      undefined,
      10,
      20
    );
  });
});

// =============================================================================
// Success
// =============================================================================

describe("success", () => {
  it("returns 200 + tournaments JSON for a valid community slug", async () => {
    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(TOURNAMENTS_RESULT);
  });

  it("sets the tag-invalidated Cache-Control header", async () => {
    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=31536000, stale-while-revalidate=86400"
    );
  });
});
