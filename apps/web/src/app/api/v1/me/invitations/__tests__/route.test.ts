/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetTournamentInvitationsReceived = jest.fn();
const mockGetTournamentInvitationsSent = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getTournamentInvitationsReceived: (...args: unknown[]) =>
    mockGetTournamentInvitationsReceived(...args),
  getTournamentInvitationsSent: (...args: unknown[]) =>
    mockGetTournamentInvitationsSent(...args),
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

const RECEIVED_INVITATIONS = [
  {
    id: 1,
    status: "pending",
    message: "Come play with us!",
    invited_alt_id: 10,
    invited_by_alt_id: 20,
    tournament_id: 5,
    invited_at: "2026-06-01T10:00:00Z",
    expires_at: null,
    responded_at: null,
    isExpired: false,
    invitedAt: 1748779200000,
    expiresAt: null,
    respondedAt: null,
    tournament: { id: 5, name: "Regionals", status: "upcoming", format: "vgc" },
    invitedBy: {
      id: 20,
      displayName: "Gary Oak",
      username: "gary_oak",
      avatarUrl: null,
    },
  },
];

const SENT_INVITATIONS = [
  {
    id: 2,
    status: "pending",
    message: null,
    invited_alt_id: 30,
    invited_by_alt_id: 20,
    tournament_id: 5,
    invited_at: "2026-06-02T10:00:00Z",
    expires_at: null,
    responded_at: null,
    invitedPlayer: {
      id: 30,
      username: "misty",
      displayName: "misty",
      avatarUrl: null,
    },
  },
];

// Sentinel identity-bound client objects — route passes these to query fns.
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

function makeRequest(options: {
  token?: string;
  tournamentId?: number | string;
} = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (options.token !== undefined) {
    headers["authorization"] = `Bearer ${options.token}`;
  }
  const url = new URL("http://localhost:3000/api/v1/me/invitations");
  if (options.tournamentId !== undefined) {
    url.searchParams.set("tournamentId", String(options.tournamentId));
  }
  return new NextRequest(url.toString(), { headers });
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTournamentInvitationsReceived.mockResolvedValue(RECEIVED_INVITATIONS);
  mockGetTournamentInvitationsSent.mockResolvedValue(SENT_INVITATIONS);
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
    expect(mockGetTournamentInvitationsReceived).not.toHaveBeenCalled();
    expect(mockGetTournamentInvitationsSent).not.toHaveBeenCalled();
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
    expect(mockGetTournamentInvitationsReceived).not.toHaveBeenCalled();
    expect(mockGetTournamentInvitationsSent).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Input validation
// =============================================================================

describe("input validation", () => {
  it("returns 400 for a non-numeric tournamentId", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest({ tournamentId: "abc" }));

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({
      success: false,
      error: "tournamentId must be a positive integer",
    });
  });

  it("returns 400 for a zero tournamentId", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest({ tournamentId: 0 }));

    expect(response.status).toBe(400);
    expect(await getJson(response)).toEqual({
      success: false,
      error: "tournamentId must be a positive integer",
    });
  });

  it("returns 400 for a negative tournamentId", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest({ tournamentId: -5 }));

    expect(response.status).toBe(400);
  });
});

// =============================================================================
// Success — received invitations (no tournamentId)
// =============================================================================

describe("received invitations (no tournamentId)", () => {
  it("returns 200 + received invitations for a valid web cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: RECEIVED_INVITATIONS,
    });
    // Uses the identity-bound client (RLS as the caller).
    expect(mockGetTournamentInvitationsReceived).toHaveBeenCalledWith(
      COOKIE_SUPABASE
    );
    expect(mockGetTournamentInvitationsSent).not.toHaveBeenCalled();
  });

  it("returns 200 + received invitations for a valid mobile Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(makeRequest({ token: "valid-jwt" }));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: RECEIVED_INVITATIONS,
    });
    expect(mockGetTournamentInvitationsReceived).toHaveBeenCalledWith(
      BEARER_SUPABASE
    );
    expect(mockGetTournamentInvitationsSent).not.toHaveBeenCalled();
  });

  it("sets a private, no-store Cache-Control header", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns 200 with empty array when no invitations", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockGetTournamentInvitationsReceived.mockResolvedValue([]);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({ success: true, data: [] });
  });
});

// =============================================================================
// Success — sent invitations (with tournamentId)
// =============================================================================

describe("sent invitations (with tournamentId)", () => {
  it("returns 200 + sent invitations for a valid cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest({ tournamentId: 5 }));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: SENT_INVITATIONS,
    });
    // Uses identity-bound client and passes the parsed tournamentId.
    expect(mockGetTournamentInvitationsSent).toHaveBeenCalledWith(
      COOKIE_SUPABASE,
      5
    );
    expect(mockGetTournamentInvitationsReceived).not.toHaveBeenCalled();
  });

  it("returns 200 + sent invitations for a valid Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(
      makeRequest({ token: "valid-jwt", tournamentId: 5 })
    );

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({
      success: true,
      data: SENT_INVITATIONS,
    });
    expect(mockGetTournamentInvitationsSent).toHaveBeenCalledWith(
      BEARER_SUPABASE,
      5
    );
  });

  it("sets a private, no-store Cache-Control header", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest({ tournamentId: 5 }));

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns 200 with empty array when no invitations were sent", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockGetTournamentInvitationsSent.mockResolvedValue([]);

    const response = await GET(makeRequest({ tournamentId: 5 }));

    expect(response.status).toBe(200);
    expect(await getJson(response)).toEqual({ success: true, data: [] });
  });
});
