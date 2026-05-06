/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { PATCH, DELETE } from "../route";

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

const mockUpdatePokemon = jest.fn(() => Promise.resolve());
const mockRemovePokemonFromTeam = jest.fn(() => Promise.resolve());
const mockGetTeamWithPokemon = jest.fn(() =>
  Promise.resolve({
    format: "gen9vgc2024regh",
    team_pokemon: [
      {
        pokemon_id: 5,
        pokemon: { species: "Pikachu", ability: "Static", nature: "Timid" },
      },
    ],
  })
);
jest.mock("@trainers/supabase", () => ({
  updatePokemon: (...args: unknown[]) => mockUpdatePokemon(...args),
  removePokemonFromTeam: (...args: unknown[]) =>
    mockRemovePokemonFromTeam(...args),
  getTeamWithPokemon: (...args: unknown[]) => mockGetTeamWithPokemon(...args),
}));

jest.mock("@/lib/cache-invalidation", () => ({
  revalidateTeamDetailCache: jest.fn(),
}));

const mockFindLegalityViolation = jest.fn(() => null);
jest.mock("@/actions/_legality", () => ({
  findLegalityViolation: (...args: unknown[]) =>
    mockFindLegalityViolation(...args),
}));

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/teams/42/pokemon/5", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/teams/:teamId/pokemon/:pokemonId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid ids", async () => {
    const params = Promise.resolve({ teamId: "abc", pokemonId: "5" });
    const response = await PATCH(makePatchRequest({ species: "Raichu" }), {
      params,
    });
    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const params = Promise.resolve({ teamId: "42", pokemonId: "5" });
    const response = await PATCH(makePatchRequest({ species: "Raichu" }), {
      params,
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 when team not found", async () => {
    mockGetTeamWithPokemon.mockResolvedValueOnce(null);
    const params = Promise.resolve({ teamId: "42", pokemonId: "5" });
    const response = await PATCH(makePatchRequest({ species: "Raichu" }), {
      params,
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 when pokemon not on team", async () => {
    mockGetTeamWithPokemon.mockResolvedValueOnce({
      format: "gen9vgc2024regh",
      team_pokemon: [],
    });
    const params = Promise.resolve({ teamId: "42", pokemonId: "5" });
    const response = await PATCH(makePatchRequest({ species: "Raichu" }), {
      params,
    });
    expect(response.status).toBe(404);
  });

  it("returns 422 on legality violation", async () => {
    mockFindLegalityViolation.mockReturnValueOnce("Not legal");
    const params = Promise.resolve({ teamId: "42", pokemonId: "5" });
    const response = await PATCH(makePatchRequest({ species: "Raichu" }), {
      params,
    });
    expect(response.status).toBe(422);
  });

  it("returns 200 on success", async () => {
    const params = Promise.resolve({ teamId: "42", pokemonId: "5" });
    const response = await PATCH(makePatchRequest({ species: "Raichu" }), {
      params,
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: undefined });
  });
});

describe("DELETE /api/teams/:teamId/pokemon/:pokemonId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid ids", async () => {
    const params = Promise.resolve({ teamId: "abc", pokemonId: "5" });
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/abc/pokemon/5", {
        method: "DELETE",
      }),
      { params }
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const params = Promise.resolve({ teamId: "42", pokemonId: "5" });
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/42/pokemon/5", {
        method: "DELETE",
      }),
      { params }
    );
    expect(response.status).toBe(401);
  });

  it("returns 200 on success", async () => {
    const params = Promise.resolve({ teamId: "42", pokemonId: "5" });
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/42/pokemon/5", {
        method: "DELETE",
      }),
      { params }
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: undefined });
  });

  it("returns 500 on error", async () => {
    mockRemovePokemonFromTeam.mockRejectedValueOnce(new Error("fail"));
    const params = Promise.resolve({ teamId: "42", pokemonId: "5" });
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/42/pokemon/5", {
        method: "DELETE",
      }),
      { params }
    );
    expect(response.status).toBe(500);
  });
});
