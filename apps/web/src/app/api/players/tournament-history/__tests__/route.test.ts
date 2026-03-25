/**
 * @jest-environment node
 */

import { GET } from "../route";

// Mock dependencies
jest.mock("@/lib/supabase/server", () => ({
  createStaticClient: jest.fn(() => ({})),
}));

const mockGetPlayerTournamentHistoryFull = jest.fn();
jest.mock("@trainers/supabase/queries", () => ({
  getPlayerTournamentHistoryFull: (...args: unknown[]) =>
    mockGetPlayerTournamentHistoryFull(...args),
}));

// ============================================================================
// Helpers
// ============================================================================

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/players/tournament-history");
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

describe("GET /api/players/tournament-history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with tournament history for valid altIds", async () => {
    const mockResult = {
      data: [
        {
          id: 1,
          tournamentId: 10,
          tournamentName: "VGC Regional",
          tournamentSlug: "vgc-regional",
          startDate: "2026-03-15",
          status: "completed",
          format: "VGC",
          organizationName: "Pokemon League",
          organizationSlug: "pokemon-league",
          placement: 1,
          wins: 7,
          losses: 1,
        },
      ],
      totalCount: 1,
      page: 1,
    };
    mockGetPlayerTournamentHistoryFull.mockResolvedValue(mockResult);

    const { status, body } = await getJsonResponse(
      makeRequest({ altIds: "1,2,3" })
    );

    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.totalCount).toBe(1);
    expect(mockGetPlayerTournamentHistoryFull).toHaveBeenCalledWith(
      expect.anything(), // supabase client
      [1, 2, 3], // parsed altIds
      {
        format: undefined,
        year: undefined,
        status: undefined,
      },
      1 // default page
    );
  });

  it("returns 400 when altIds is missing", async () => {
    const { status, body } = await getJsonResponse(makeRequest());

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 when altIds is empty string", async () => {
    const { status, body } = await getJsonResponse(makeRequest({ altIds: "" }));

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 when altIds contains non-numeric values", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ altIds: "abc,def" })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 when altIds contains negative numbers", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ altIds: "-1,2" })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 when page is 0", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ altIds: "1", page: "0" })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 400 when page exceeds max", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ altIds: "1", page: "101" })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
  });

  it("returns 500 when the query function throws", async () => {
    mockGetPlayerTournamentHistoryFull.mockRejectedValue(
      new Error("Database connection failed")
    );

    const { status, body } = await getJsonResponse(
      makeRequest({ altIds: "1" })
    );

    expect(status).toBe(500);
    expect(body.error).toBe("Failed to fetch tournament history");
  });

  it("passes optional filters correctly", async () => {
    const mockResult = { data: [], totalCount: 0, page: 2 };
    mockGetPlayerTournamentHistoryFull.mockResolvedValue(mockResult);

    const { status } = await getJsonResponse(
      makeRequest({
        altIds: "5,10",
        format: "VGC",
        year: "2026",
        status: "completed",
        page: "2",
      })
    );

    expect(status).toBe(200);
    expect(mockGetPlayerTournamentHistoryFull).toHaveBeenCalledWith(
      expect.anything(),
      [5, 10],
      {
        format: "VGC",
        year: 2026,
        status: "completed",
      },
      2
    );
  });

  it("handles a single altId correctly", async () => {
    const mockResult = { data: [], totalCount: 0, page: 1 };
    mockGetPlayerTournamentHistoryFull.mockResolvedValue(mockResult);

    const { status } = await getJsonResponse(makeRequest({ altIds: "42" }));

    expect(status).toBe(200);
    expect(mockGetPlayerTournamentHistoryFull).toHaveBeenCalledWith(
      expect.anything(),
      [42],
      expect.anything(),
      1
    );
  });
});
