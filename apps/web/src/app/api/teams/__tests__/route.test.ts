/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST } from "../route";

const mockUser = { id: "user-123" };
const mockMaybeSingle = jest.fn(() =>
  Promise.resolve({ data: { id: 10 }, error: null })
);
const mockSupabase = {
  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({ data: { user: mockUser }, error: null })
    ),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    })),
  })),
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

const mockCreateTeam = jest.fn(() => Promise.resolve({ id: 42 }));
jest.mock("@trainers/supabase", () => ({
  createTeam: (...args: unknown[]) => mockCreateTeam(...args),
}));

jest.mock("@/lib/cache-invalidation", () => ({
  revalidateTeamDetailCache: jest.fn(),
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/teams", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

async function getJsonResponse(request: NextRequest) {
  const response = await POST(request);
  const body = await response.json();
  return { status: response.status, body };
}

describe("POST /api/teams", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid body", async () => {
    const { status, body } = await getJsonResponse(makeRequest({}));
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const { status, body } = await getJsonResponse(
      makeRequest({ altId: 10, name: "My Team", format: "gen9vgc2024regh" })
    );
    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("returns 403 when alt is not owned", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const { status, body } = await getJsonResponse(
      makeRequest({ altId: 10, name: "My Team", format: "gen9vgc2024regh" })
    );
    expect(status).toBe(403);
    expect(body.success).toBe(false);
  });

  it("returns 201 on success", async () => {
    const { status, body } = await getJsonResponse(
      makeRequest({ altId: 10, name: "My Team", format: "gen9vgc2024regh" })
    );
    expect(status).toBe(201);
    expect(body).toEqual({ success: true, data: { id: 42 } });
  });

  it("returns 500 on DB error", async () => {
    mockCreateTeam.mockRejectedValueOnce(new Error("DB down"));
    const { status, body } = await getJsonResponse(
      makeRequest({ altId: 10, name: "My Team", format: "gen9vgc2024regh" })
    );
    expect(status).toBe(500);
    expect(body.success).toBe(false);
  });
});
