/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

// Cookie-path client: createClientReadOnly().auth.getUser()
const mockCookieGetUser = jest.fn();
// Bearer-path client: createSupabaseClient(...).auth.getUser()
const mockBearerGetUser = jest.fn();
// Sentinel objects so we can assert which client is returned.
const mockCookieClient = { auth: { getUser: mockCookieGetUser } };
const mockBearerClient = { auth: { getUser: mockBearerGetUser } };

const mockCreateSupabaseClient = jest.fn(() => mockBearerClient);

jest.mock("@/lib/supabase/server", () => ({
  createClientReadOnly: jest.fn(() => Promise.resolve(mockCookieClient)),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateSupabaseClient(...args),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { resolveApiAuth } from "../auth";

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }
  return new Request("http://localhost:3000/api/v1/anything", { headers });
}

/**
 * A minimal `Request`-shaped stub whose `Authorization` header value is returned
 * verbatim (no `Headers` whitespace normalization). Used to exercise the empty-
 * token guard, which a real `Headers` instance can't reach because it strips the
 * trailing space off `"Bearer "`.
 */
function makeRawRequest(rawAuthHeader: string): Request {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? rawAuthHeader : null,
    },
  } as unknown as Request;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateSupabaseClient.mockReturnValue(mockBearerClient);
  // Default: both paths anonymous unless a test overrides.
  mockCookieGetUser.mockResolvedValue({ data: { user: null } });
  mockBearerGetUser.mockResolvedValue({ data: { user: null } });
});

// =============================================================================
// Bearer path (mobile)
// =============================================================================

describe("resolveApiAuth — bearer path", () => {
  it("returns mode 'bearer' + userId + bound client for a valid token", async () => {
    mockBearerGetUser.mockResolvedValue({
      data: { user: { id: "user-bearer-1" } },
    });

    const result = await resolveApiAuth(makeRequest("Bearer valid-jwt"));

    expect(result).toEqual({
      mode: "bearer",
      userId: "user-bearer-1",
      supabase: mockBearerClient,
    });
    // The cookie path is never consulted when a Bearer token validates.
    expect(mockCookieGetUser).not.toHaveBeenCalled();
  });

  it("matches the scheme case-insensitively and forwards the token to the client", async () => {
    mockBearerGetUser.mockResolvedValue({
      data: { user: { id: "user-bearer-2" } },
    });

    const result = await resolveApiAuth(makeRequest("bEaReR my-token"));

    expect(result?.mode).toBe("bearer");
    // Token is bound to the anon client via the global Authorization header.
    // (The URL/anon-key positional args come from env and aren't asserted here.)
    const lastCall = mockCreateSupabaseClient.mock.calls.at(-1);
    expect(lastCall?.[2]).toEqual({
      global: { headers: { Authorization: "Bearer my-token" } },
    });
  });

  it("returns null for an invalid/expired token (getUser returns no user)", async () => {
    mockBearerGetUser.mockResolvedValue({ data: { user: null } });

    const result = await resolveApiAuth(makeRequest("Bearer bad-jwt"));

    expect(result).toBeNull();
    expect(mockBearerGetUser).toHaveBeenCalled();
    // Does NOT fall through to the cookie path on an invalid Bearer token.
    expect(mockCookieGetUser).not.toHaveBeenCalled();
  });

  it("falls through to the cookie path for a whitespace-only token (Headers strips the trailing space, so the 'bearer ' prefix no longer matches)", async () => {
    // The `Headers` normalizer trims `"Bearer    "` to `"Bearer"` (no trailing
    // space), so `.startsWith("bearer ")` is false and we never enter the Bearer
    // branch — the request is treated as cookie-path anonymous here.
    const result = await resolveApiAuth(makeRequest("Bearer    "));

    expect(result).toBeNull();
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
    expect(mockBearerGetUser).not.toHaveBeenCalled();
    expect(mockCookieGetUser).toHaveBeenCalled();
  });

  it("returns null without building a client when the token is empty after trimming (defensive guard)", async () => {
    // `"Bearer "` keeps its trailing space here (raw stub), so we DO enter the
    // Bearer branch — and the empty-token guard short-circuits to null.
    const result = await resolveApiAuth(makeRawRequest("Bearer "));

    expect(result).toBeNull();
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
    expect(mockBearerGetUser).not.toHaveBeenCalled();
    expect(mockCookieGetUser).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Cookie path (web)
// =============================================================================

describe("resolveApiAuth — cookie path", () => {
  it("falls back to the cookie path when no Authorization header is present", async () => {
    mockCookieGetUser.mockResolvedValue({
      data: { user: { id: "user-cookie-1" } },
    });

    const result = await resolveApiAuth(makeRequest());

    expect(result).toEqual({
      mode: "cookie",
      userId: "user-cookie-1",
      supabase: mockCookieClient,
    });
    // No Bearer header → the JWT client is never constructed.
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });

  it("uses the cookie path for a non-Bearer Authorization scheme", async () => {
    mockCookieGetUser.mockResolvedValue({
      data: { user: { id: "user-cookie-2" } },
    });

    const result = await resolveApiAuth(makeRequest("Basic abc123"));

    expect(result?.mode).toBe("cookie");
    expect(mockCreateSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns null when the cookie session is anonymous", async () => {
    mockCookieGetUser.mockResolvedValue({ data: { user: null } });

    const result = await resolveApiAuth(makeRequest());

    expect(result).toBeNull();
    expect(mockCookieGetUser).toHaveBeenCalled();
  });
});
