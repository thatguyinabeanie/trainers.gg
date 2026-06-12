/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedCommunityBySlug = jest.fn();
const mockGetCachedCommunityStaff = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockEnforceRateLimit = jest.fn();

jest.mock("@/lib/data/communities-endpoints", () => ({
  getCachedCommunityBySlug: (...args: unknown[]) =>
    mockGetCachedCommunityBySlug(...args),
  getCachedCommunityStaff: (...args: unknown[]) =>
    mockGetCachedCommunityStaff(...args),
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
};

const STAFF = [
  {
    id: 1,
    user_id: "user-1",
    community_id: 1,
    created_at: "2026-01-01T00:00:00Z",
    user: { id: "user-1", username: "ash", first_name: "Ash", last_name: "Ketchum", image: null, email: null },
    group: null,
    role: null,
    isOwner: true,
  },
  {
    id: 2,
    user_id: "user-2",
    community_id: 1,
    created_at: "2026-01-02T00:00:00Z",
    user: { id: "user-2", username: "misty", first_name: "Misty", last_name: null, image: null, email: null },
    group: { id: 10, name: "Judges" },
    role: { id: 20, name: "org_judge", description: "Handles disputes" },
    isOwner: false,
  },
];

const AUTHED_USER = { mode: "cookie" as const, userId: "user-1", supabase: {} };
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };

function makeRequest(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/v1/communities/pallet-town-vgc/staff"
  );
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
  mockGetCachedCommunityStaff.mockResolvedValue(STAFF);
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
    expect(mockGetCachedCommunityStaff).not.toHaveBeenCalled();
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
    expect(mockGetCachedCommunityStaff).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Not found (community resolution)
// =============================================================================

describe("community resolution", () => {
  it("returns 404 when the community does not exist", async () => {
    mockGetCachedCommunityBySlug.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams("nonexistent"));

    expect(response.status).toBe(404);
    expect(await getJson(response)).toEqual({ error: "Community not found" });
    expect(mockGetCachedCommunityStaff).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Success
// =============================================================================

describe("success", () => {
  it("returns 200 + staff array for a valid community slug", async () => {
    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(STAFF);
    // Must resolve community first to get the numeric ID.
    expect(mockGetCachedCommunityBySlug).toHaveBeenCalledWith("pallet-town-vgc");
    expect(mockGetCachedCommunityStaff).toHaveBeenCalledWith(
      COMMUNITY.id,
      "pallet-town-vgc"
    );
  });

  it("sets the tag-invalidated Cache-Control header", async () => {
    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=31536000, stale-while-revalidate=86400"
    );
  });

  it("returns an empty array when the community has no staff", async () => {
    mockGetCachedCommunityStaff.mockResolvedValue([]);

    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual([]);
  });
});
