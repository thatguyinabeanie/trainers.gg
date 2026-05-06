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

const mockUpdateTeam = jest.fn(() => Promise.resolve());
const mockDeleteTeam = jest.fn(() => Promise.resolve());
const mockGetTeamWithPokemon = jest.fn();
jest.mock("@trainers/supabase", () => ({
  updateTeam: (...args: unknown[]) => mockUpdateTeam(...args),
  deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args),
  getTeamWithPokemon: (...args: unknown[]) => mockGetTeamWithPokemon(...args),
}));

jest.mock("@/lib/cache-invalidation", () => ({
  revalidateTeamDetailCache: jest.fn(),
}));

const mockCheckFormatChangeLegality = jest.fn(() => ({
  ok: true,
  illegal: [],
}));
jest.mock("@/actions/format-legality-guard", () => ({
  checkFormatChangeLegality: (...args: unknown[]) =>
    mockCheckFormatChangeLegality(...args),
}));

function makeRequest(body: unknown, method = "PATCH"): NextRequest {
  return new NextRequest("http://localhost:3000/api/teams/42", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/teams/:teamId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid teamId", async () => {
    const params = Promise.resolve({ teamId: "abc" });
    const response = await PATCH(makeRequest({ name: "x" }), { params });
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid body", async () => {
    const params = Promise.resolve({ teamId: "42" });
    const response = await PATCH(makeRequest({ name: "" }), { params });
    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const params = Promise.resolve({ teamId: "42" });
    const response = await PATCH(makeRequest({ name: "New Name" }), { params });
    expect(response.status).toBe(401);
  });

  it("returns 422 when format change has illegal pokemon", async () => {
    mockGetTeamWithPokemon.mockResolvedValueOnce({
      format: "gen9vgc2024regh",
      team_pokemon: [],
    });
    mockCheckFormatChangeLegality.mockReturnValueOnce({
      ok: false,
      illegal: ["Koraidon"],
    });
    const params = Promise.resolve({ teamId: "42" });
    const response = await PATCH(makeRequest({ format: "gen9vgc2024regf" }), {
      params,
    });
    expect(response.status).toBe(422);
  });

  it("returns 200 on success", async () => {
    const params = Promise.resolve({ teamId: "42" });
    const response = await PATCH(makeRequest({ name: "New Name" }), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: undefined });
  });
});

describe("DELETE /api/teams/:teamId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid teamId", async () => {
    const params = Promise.resolve({ teamId: "abc" });
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/abc", {
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
    const params = Promise.resolve({ teamId: "42" });
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/42", {
        method: "DELETE",
      }),
      { params }
    );
    expect(response.status).toBe(401);
  });

  it("returns 200 on success", async () => {
    const params = Promise.resolve({ teamId: "42" });
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/42", {
        method: "DELETE",
      }),
      { params }
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: undefined });
  });

  it("returns 500 on DB error", async () => {
    mockDeleteTeam.mockRejectedValueOnce(new Error("DB down"));
    const params = Promise.resolve({ teamId: "42" });
    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/teams/42", {
        method: "DELETE",
      }),
      { params }
    );
    expect(response.status).toBe(500);
  });
});
