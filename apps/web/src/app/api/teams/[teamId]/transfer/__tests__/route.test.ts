/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST } from "../route";

const mockUser = { id: "user-123" };
const mockMaybeSingle = jest.fn(() =>
  Promise.resolve({ data: { id: 20 }, error: null })
);
const mockSingle = jest.fn(() =>
  Promise.resolve({ data: { id: 42 }, error: null })
);
const mockSupabase = {
  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({ data: { user: mockUser }, error: null })
    ),
  },
  from: jest.fn((table: string) => {
    if (table === "alts") {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
          })),
        })),
      };
    }
    // teams table
    return {
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      })),
    };
  }),
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}));

jest.mock("@/lib/cache-invalidation", () => ({
  revalidateTeamDetailCache: jest.fn(),
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/teams/42/transfer", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/teams/:teamId/transfer", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 for invalid teamId", async () => {
    const params = Promise.resolve({ teamId: "abc" });
    const response = await POST(makeRequest({ targetAltId: 20 }), { params });
    expect(response.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });
    const params = Promise.resolve({ teamId: "42" });
    const response = await POST(makeRequest({ targetAltId: 20 }), { params });
    expect(response.status).toBe(401);
  });

  it("returns 403 when target alt not owned", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const params = Promise.resolve({ teamId: "42" });
    const response = await POST(makeRequest({ targetAltId: 20 }), { params });
    expect(response.status).toBe(403);
  });

  it("returns 404 when team update fails", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "not found" } });
    const params = Promise.resolve({ teamId: "42" });
    const response = await POST(makeRequest({ targetAltId: 20 }), { params });
    expect(response.status).toBe(404);
  });

  it("returns 200 on success", async () => {
    const params = Promise.resolve({ teamId: "42" });
    const response = await POST(makeRequest({ targetAltId: 20 }), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: undefined });
  });
});
