/**
 * @jest-environment node
 */

import { GET } from "../route";

// Mock dependencies
// createServiceRoleClient is used (Phase 2 Step-4: anon SELECT on revoke-set
// tables is revoked; service-role bypasses that grant).
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => ({})),
}));

const mockEnforceRateLimit = jest.fn();
jest.mock("@/lib/api/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  extractRequestIp: jest.fn(() => "127.0.0.1"),
  DEFAULT_API_LIMIT: 120,
  DEFAULT_WINDOW_MS: 60_000,
}));

const mockSearchPlayers = jest.fn();
jest.mock("@trainers/supabase/queries", () => ({
  searchPlayers: (...args: unknown[]) => mockSearchPlayers(...args),
  // The route enriches results with coach badges. Pass players through
  // unchanged so existing assertions (player count, response shape) hold.
  attachCoachBadges: (_supabase: unknown, players: unknown) => players,
}));

// ============================================================================
// Helpers
// ============================================================================

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/players/search");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

async function getJsonResponse(request: Request) {
  const response = await GET(request);
  const body = await response.json();
  return { status: response.status, body };
}

// ============================================================================
// Tests
// ============================================================================

describe("GET /api/players/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnforceRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 119,
      resetAt: new Date(),
    });
  });

  it("returns search results for valid params", async () => {
    const mockResult = {
      players: [
        {
          userId: "u1",
          username: "ash",
          avatarUrl: null,
          country: "US",
          tournamentCount: 5,
          winRate: 75,
          totalWins: 15,
          totalLosses: 5,
        },
      ],
      totalCount: 1,
      page: 1,
    };
    mockSearchPlayers.mockResolvedValue(mockResult);

    const { status, body } = await getJsonResponse(
      makeRequest({ q: "ash", sort: "tournaments" })
    );

    expect(status).toBe(200);
    expect(body.players).toHaveLength(1);
    expect(body.totalCount).toBe(1);
    // Verify searchPlayers was called with correct filter shape
    expect(mockSearchPlayers).toHaveBeenCalledWith(
      expect.anything(), // supabase client
      {
        query: "ash",
        country: undefined,
        format: undefined,
        sort: "tournaments",
      },
      1
    );
  });

  it("returns 400 for invalid sort value", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ sort: "invalid_sort" })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 for invalid page number", async () => {
    const { status, body } = await getJsonResponse(makeRequest({ page: "0" }));

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 for page exceeding max", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ page: "101" })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 for country code with wrong length", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ country: "USA" })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 for query exceeding max length", async () => {
    const longQuery = "a".repeat(101);
    const { status, body } = await getJsonResponse(
      makeRequest({ q: longQuery })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("handles missing optional params gracefully", async () => {
    const mockResult = { players: [], totalCount: 0, page: 1 };
    mockSearchPlayers.mockResolvedValue(mockResult);

    const { status, body } = await getJsonResponse(makeRequest());

    expect(status).toBe(200);
    expect(body).toEqual(mockResult);
    expect(mockSearchPlayers).toHaveBeenCalledWith(
      expect.anything(),
      {
        query: undefined,
        country: undefined,
        format: undefined,
        sort: undefined,
      },
      1
    );
  });

  it("returns 500 when searchPlayers throws", async () => {
    mockSearchPlayers.mockRejectedValue(new Error("DB connection failed"));

    const { status, body } = await getJsonResponse(makeRequest({ q: "ash" }));

    expect(status).toBe(500);
    expect(body.error).toBe("Failed to search players");
  });

  it("passes page parameter correctly", async () => {
    const mockResult = { players: [], totalCount: 50, page: 3 };
    mockSearchPlayers.mockResolvedValue(mockResult);

    const { status, body } = await getJsonResponse(makeRequest({ page: "3" }));

    expect(status).toBe(200);
    expect(body.page).toBe(3);
    expect(mockSearchPlayers).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      3
    );
  });
});
