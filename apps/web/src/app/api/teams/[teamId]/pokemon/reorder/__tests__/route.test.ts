/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { PATCH } from "../route";

const mockUser = { id: "user-123" };
const mockSupabase = {
  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({ data: { user: mockUser }, error: null })
    ),
  },
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

const mockReorderTeamPokemon = jest.fn(() => Promise.resolve());
jest.mock("@trainers/supabase", () => ({
  reorderTeamPokemon: (...args: unknown[]) => mockReorderTeamPokemon(...args),
}));

jest.mock("@/lib/cache-invalidation", () => ({
  revalidateTeamDetailCache: jest.fn(),
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/teams/42/pokemon/reorder",
    {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

describe("PATCH /api/teams/:teamId/pokemon/reorder", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid teamId", async () => {
    const params = Promise.resolve({ teamId: "abc" });
    const response = await PATCH(
      makeRequest({ positions: [{ pokemonId: 1, position: 1 }] }),
      { params }
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid positions", async () => {
    const params = Promise.resolve({ teamId: "42" });
    const response = await PATCH(makeRequest({ positions: "invalid" }), {
      params,
    });
    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const params = Promise.resolve({ teamId: "42" });
    const response = await PATCH(
      makeRequest({ positions: [{ pokemonId: 1, position: 1 }] }),
      { params }
    );
    expect(response.status).toBe(401);
  });

  it("returns 200 on success", async () => {
    const params = Promise.resolve({ teamId: "42" });
    const response = await PATCH(
      makeRequest({
        positions: [
          { pokemonId: 1, position: 1 },
          { pokemonId: 2, position: 2 },
        ],
      }),
      { params }
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: undefined });
  });

  it("returns 500 on error", async () => {
    mockReorderTeamPokemon.mockRejectedValueOnce(new Error("fail"));
    const params = Promise.resolve({ teamId: "42" });
    const response = await PATCH(
      makeRequest({
        positions: [{ pokemonId: 1, position: 1 }],
      }),
      { params }
    );
    expect(response.status).toBe(500);
  });
});
