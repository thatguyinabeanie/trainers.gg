/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetCachedTournamentStandings = jest.fn();

// Cookie-path client: createClientReadOnly().auth.getUser()
const mockCookieGetUser = jest.fn();
// Bearer-path client: createSupabaseClient(...).auth.getUser()
const mockBearerGetUser = jest.fn();

jest.mock("@/lib/data/standings-endpoint", () => ({
  getCachedTournamentStandings: (...args: unknown[]) =>
    mockGetCachedTournamentStandings(...args),
}));

jest.mock("@/lib/supabase/server", () => ({
  createClientReadOnly: jest.fn(() =>
    Promise.resolve({ auth: { getUser: mockCookieGetUser } })
  ),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({ auth: { getUser: mockBearerGetUser } })),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { NextRequest } from "next/server";

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const STANDINGS = [
  { id: 1, tournament_id: 42, rank: 1, alt: { id: 7, username: "ash" } },
  { id: 2, tournament_id: 42, rank: 2, alt: { id: 8, username: "gary" } },
];

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
  // Default: anonymous (both auth paths fail) unless a test overrides.
  mockCookieGetUser.mockResolvedValue({ data: { user: null } });
  mockBearerGetUser.mockResolvedValue({ data: { user: null } });
});

// =============================================================================
// Route-param validation
// =============================================================================

describe("param validation", () => {
  it("returns 404 when the id is non-numeric", async () => {
    const response = await GET(makeRequest({ token: "valid" }), makeParams("abc"));

    expect(response.status).toBe(404);
    expect(await getJson(response)).toEqual({ error: "Tournament not found" });
    // Never touches the DB on a bad id.
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

  it("returns 401 for an empty Bearer token", async () => {
    const response = await GET(makeRequest({ token: "" }), makeParams("42"));

    // The `Authorization: Bearer ` header (empty token) has its trailing space
    // stripped by the Headers normalizer, so it no longer matches the
    // "bearer " prefix and falls through to the cookie path — anonymous here.
    expect(response.status).toBe(401);
    expect(mockBearerGetUser).not.toHaveBeenCalled();
    expect(mockCookieGetUser).toHaveBeenCalled();
  });

  it("returns 401 when the Bearer token is invalid/expired", async () => {
    mockBearerGetUser.mockResolvedValue({ data: { user: null } });

    const response = await GET(
      makeRequest({ token: "bad-jwt" }),
      makeParams("42")
    );

    expect(response.status).toBe(401);
    expect(mockBearerGetUser).toHaveBeenCalled();
  });
});

// =============================================================================
// Success — both auth modes
// =============================================================================

describe("success", () => {
  it("returns 200 + standings JSON for a valid web cookie session", async () => {
    mockCookieGetUser.mockResolvedValue({
      data: { user: { id: "user-cookie-1" } },
    });

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(STANDINGS);
    expect(mockGetCachedTournamentStandings).toHaveBeenCalledWith(42);
  });

  it("returns 200 + standings JSON for a valid mobile Bearer token", async () => {
    mockBearerGetUser.mockResolvedValue({
      data: { user: { id: "user-bearer-1" } },
    });

    const response = await GET(
      makeRequest({ token: "valid-jwt" }),
      makeParams("42")
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual(STANDINGS);
    expect(mockGetCachedTournamentStandings).toHaveBeenCalledWith(42);
    // Bearer path validated the token; cookie path was never consulted.
    expect(mockBearerGetUser).toHaveBeenCalled();
    expect(mockCookieGetUser).not.toHaveBeenCalled();
  });

  it("sets the tag-invalidated Cache-Control header on success", async () => {
    mockCookieGetUser.mockResolvedValue({
      data: { user: { id: "user-cookie-2" } },
    });

    const response = await GET(makeRequest(), makeParams("42"));

    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=31536000, stale-while-revalidate=86400"
    );
  });
});
