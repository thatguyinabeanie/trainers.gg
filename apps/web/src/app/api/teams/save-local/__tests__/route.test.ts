/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST } from "../route";

const mockUser = { id: "user-123" };
const mockMaybeSingle = jest.fn(() =>
  Promise.resolve({ data: { id: 10, username: "ash_ketchum" }, error: null })
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

const mockCreateTeam = jest.fn(() => Promise.resolve({ id: 77 }));
const mockAddPokemonToTeam = jest.fn(() =>
  Promise.resolve({ pokemonId: 1 })
);
jest.mock("@trainers/supabase", () => ({
  createTeam: (...args: unknown[]) => mockCreateTeam(...args),
  addPokemonToTeam: (...args: unknown[]) => mockAddPokemonToTeam(...args),
}));

jest.mock("@/lib/cache-invalidation", () => ({
  revalidateTeamDetailCache: jest.fn(),
}));

const validBody = {
  altId: 10,
  name: "My Team",
  format: "gen9vgc2024regh",
  pokemon: [
    {
      species: "Pikachu",
      ability: "Static",
      tera_type: "Electric",
      nature: "Timid",
      held_item: "Light Ball",
      move_1: "Thunderbolt",
    },
  ],
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/teams/save-local", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/teams/save-local", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid body", async () => {
    const response = await POST(makeRequest({}));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(401);
  });

  it("returns 403 when alt not owned", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(403);
  });

  it("returns 201 on success with correct redirectUrl", async () => {
    const response = await POST(makeRequest(validBody));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      data: {
        teamId: 77,
        redirectUrl: "/builder/t/acct-77",
      },
    });
  });

  it("returns 500 on DB error", async () => {
    mockCreateTeam.mockRejectedValueOnce(new Error("DB down"));
    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(500);
  });
});
