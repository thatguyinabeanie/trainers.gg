/**
 * @jest-environment node
 */

import { GET } from "../route";

jest.mock("@/lib/supabase/server", () => ({
  createStaticClient: jest.fn(() => ({})),
}));

const mockGetPlayerRating = jest.fn();
jest.mock("@trainers/supabase/queries", () => ({
  getPlayerRating: (...args: unknown[]) => mockGetPlayerRating(...args),
}));

// ============================================================================
// Helpers
// ============================================================================

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/players/rating");
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

describe("GET /api/players/rating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when altId is missing", async () => {
    const { status, body } = await getJsonResponse(makeRequest());

    expect(status).toBe(400);
    expect(body.error).toBe("Missing altId parameter");
  });

  it("returns 400 when altId is not a number", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ altId: "notanumber" })
    );

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid altId parameter");
  });

  it("returns the rating when found", async () => {
    const mockRating = {
      altId: 42,
      format: "overall",
      rating: 1450,
      peakRating: 1500,
      gamesPlayed: 15,
      skillBracket: "intermediate",
      globalRank: 7,
    };
    mockGetPlayerRating.mockResolvedValue(mockRating);

    const { status, body } = await getJsonResponse(
      makeRequest({ altId: "42" })
    );

    expect(status).toBe(200);
    expect(body).toEqual(mockRating);
    expect(mockGetPlayerRating).toHaveBeenCalledWith(
      expect.anything(),
      42,
      "overall"
    );
  });

  it("returns null when player has no rating", async () => {
    mockGetPlayerRating.mockResolvedValue(null);

    const { status, body } = await getJsonResponse(
      makeRequest({ altId: "99" })
    );

    expect(status).toBe(200);
    expect(body).toBeNull();
  });

  it("passes the format parameter through to getPlayerRating", async () => {
    mockGetPlayerRating.mockResolvedValue(null);

    await getJsonResponse(makeRequest({ altId: "1", format: "VGC" }));

    expect(mockGetPlayerRating).toHaveBeenCalledWith(
      expect.anything(),
      1,
      "VGC"
    );
  });

  it("defaults to overall format when format is not provided", async () => {
    mockGetPlayerRating.mockResolvedValue(null);

    await getJsonResponse(makeRequest({ altId: "1" }));

    expect(mockGetPlayerRating).toHaveBeenCalledWith(
      expect.anything(),
      1,
      "overall"
    );
  });

  it("returns 500 when getPlayerRating throws", async () => {
    mockGetPlayerRating.mockRejectedValue(new Error("DB failure"));

    const { status, body } = await getJsonResponse(makeRequest({ altId: "1" }));

    expect(status).toBe(500);
    expect(body.error).toBe("Failed to fetch player rating");
  });
});
