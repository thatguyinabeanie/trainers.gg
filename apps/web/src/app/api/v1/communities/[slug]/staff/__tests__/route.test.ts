/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedCommunityBySlug = jest.fn();
const mockGetCommunityStaff = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockCanManageCommunity = jest.fn();

jest.mock("@/lib/data/communities-endpoints", () => ({
  getCachedCommunityBySlug: (...args: unknown[]) =>
    mockGetCachedCommunityBySlug(...args),
  getCommunityStaff: (...args: unknown[]) => mockGetCommunityStaff(...args),
}));

jest.mock("@/lib/api/auth", () => ({
  resolveApiAuth: (...args: unknown[]) => mockResolveApiAuth(...args),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
}));

jest.mock("@trainers/supabase", () => ({
  canManageCommunity: (...args: unknown[]) => mockCanManageCommunity(...args),
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
    user: {
      id: "user-1",
      username: "ash",
      first_name: "Ash",
      last_name: "Ketchum",
      image: null,
      email: "ash@example.com",
    },
    group: null,
    role: null,
    isOwner: true,
  },
  {
    id: 2,
    user_id: "user-2",
    community_id: 1,
    created_at: "2026-01-02T00:00:00Z",
    user: {
      id: "user-2",
      username: "misty",
      first_name: "Misty",
      last_name: null,
      image: null,
      email: "misty@example.com",
    },
    group: { id: 10, name: "Judges" },
    role: { id: 20, name: "org_judge", description: "Handles disputes" },
    isOwner: false,
  },
];

// A request-scoped, RLS-bound client stand-in (asserted as the staff query arg).
const REQUEST_CLIENT = { __requestScoped: true };
const AUTHED_USER = {
  mode: "cookie" as const,
  userId: "user-1",
  supabase: REQUEST_CLIENT,
};
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
  mockGetCommunityStaff.mockResolvedValue(STAFF);
  mockResolveApiAuth.mockResolvedValue(AUTHED_USER);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  mockCanManageCommunity.mockResolvedValue(true);
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
    expect(mockGetCommunityStaff).not.toHaveBeenCalled();
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
    expect(mockGetCommunityStaff).not.toHaveBeenCalled();
  });

  it("clamps Retry-After to at least 1s when the reset time is in the past", async () => {
    // Clock drift / an already-elapsed window would otherwise produce 0 or negative.
    mockEnforceRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() - 5_000),
    });

    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("retry-after"))).toBeGreaterThanOrEqual(
      1
    );
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
    expect(mockCanManageCommunity).not.toHaveBeenCalled();
    expect(mockGetCommunityStaff).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Authorization — staff roster includes member emails (PII)
// =============================================================================

describe("authorization", () => {
  it("returns 403 when the caller does not manage the community", async () => {
    mockCanManageCommunity.mockResolvedValue(false);

    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(403);
    expect(await getJson(response)).toEqual({ error: "Forbidden" });
    // PII (staff emails) must NOT be fetched for an unauthorized caller.
    expect(mockGetCommunityStaff).not.toHaveBeenCalled();
  });

  it("verifies management with the request-scoped client + caller id", async () => {
    await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(mockCanManageCommunity).toHaveBeenCalledWith(
      REQUEST_CLIENT,
      COMMUNITY.id,
      AUTHED_USER.userId
    );
  });
});

// =============================================================================
// Success
// =============================================================================

describe("success", () => {
  it("returns 200 + staff array for an authorized caller", async () => {
    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(STAFF);
    // Must resolve community first to get the numeric ID.
    expect(mockGetCachedCommunityBySlug).toHaveBeenCalledWith("pallet-town-vgc");
    // Staff is read with the caller's request-scoped client (NOT a shared cache).
    expect(mockGetCommunityStaff).toHaveBeenCalledWith(
      REQUEST_CLIENT,
      COMMUNITY.id
    );
  });

  it("sets a private, no-store Cache-Control header (PII must not be cached)", async () => {
    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns an empty array when the community has no staff", async () => {
    mockGetCommunityStaff.mockResolvedValue([]);

    const response = await GET(makeRequest(), makeParams("pallet-town-vgc"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual([]);
  });
});
