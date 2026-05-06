/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST } from "../route";

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

const mockAddPokemonToTeam = jest.fn(() =>
  Promise.resolve({ pokemonId: 99 })
);
const mockGetTeamWithPokemon = jest.fn(() =>
  Promise.resolve({ format: "gen9vgc2024regh", team_pokemon: [] })
);
jest.mock("@trainers/supabase", () => ({
  addPokemonToTeam: (...args: unknown[]) => mockAddPokemonToTeam(...args),
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

const validPokemon = {
  species: "Pikachu",
  ability: "Static",
  tera_type: "Electric",
  nature: "Timid",
  held_item: "Light Ball",
  move_1: "Thunderbolt",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/teams/42/pokemon", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/teams/:teamId/pokemon", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid teamId", async () => {
    const params = Promise.resolve({ teamId: "abc" });
    const response = await POST(
      makeRequest({ position: 1, pokemon: validPokemon }),
      { params }
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid position", async () => {
    const params = Promise.resolve({ teamId: "42" });
    const response = await POST(
      makeRequest({ position: 99, pokemon: validPokemon }),
      { params }
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const params = Promise.resolve({ teamId: "42" });
    const response = await POST(
      makeRequest({ position: 1, pokemon: validPokemon }),
      { params }
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when team not found", async () => {
    mockGetTeamWithPokemon.mockResolvedValueOnce(null);
    const params = Promise.resolve({ teamId: "42" });
    const response = await POST(
      makeRequest({ position: 1, pokemon: validPokemon }),
      { params }
    );
    expect(response.status).toBe(404);
  });

  it("returns 422 on legality violation", async () => {
    mockFindLegalityViolation.mockReturnValueOnce("Species not legal");
    const params = Promise.resolve({ teamId: "42" });
    const response = await POST(
      makeRequest({ position: 1, pokemon: validPokemon }),
      { params }
    );
    expect(response.status).toBe(422);
  });

  it("returns 201 on success", async () => {
    const params = Promise.resolve({ teamId: "42" });
    const response = await POST(
      makeRequest({ position: 1, pokemon: validPokemon }),
      { params }
    );
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true, data: { pokemonId: 99 } });
  });
});
