/**
 * @jest-environment node
 */

import { POST } from "../route";

// Mock dependencies
const mockGetUser = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();
const mockUpdate = jest.fn();
const mockFrom = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createAtprotoClient: jest.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({ delete: mockDelete })),
}));

jest.mock("botid/server", () => ({
  checkBotId: jest.fn(async () => ({ isBot: false })),
}));

describe("POST /api/oauth/link", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock chain for from().select().eq().maybeSingle()
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });

    // Setup default mock for update().eq()
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });

    // Setup default authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  describe("Regression: TGG-233 - pds_status should NOT be updated", () => {
    it("does not set pds_status to active when linking DID", async () => {
      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({ did: "did:plc:test123" }),
        headers: { "Content-Type": "application/json" },
      });

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      await POST(request);

      // Verify update was called with only the did field
      expect(mockUpdate).toHaveBeenCalledWith({ did: "did:plc:test123" });

      // Verify update was NOT called with pds_status
      expect(mockUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({ pds_status: expect.anything() })
      );

      // Verify the eq call was made with the correct user ID
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-123");
    });

    it("successfully links DID without touching pds_status field", async () => {
      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({ did: "did:plc:another-test" }),
        headers: { "Content-Type": "application/json" },
      });

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("users");
      expect(mockUpdate).toHaveBeenCalledTimes(1);

      // Verify the update payload contains exactly one field: did
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(Object.keys(updateCall)).toEqual(["did"]);
      expect(updateCall.did).toBe("did:plc:another-test");
    });
  });

  describe("Authentication validation", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({ did: "did:plc:test123" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Not authenticated");
    });

    it("returns 401 when auth check fails", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Auth error" },
      });

      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({ did: "did:plc:test123" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Not authenticated");
    });
  });

  describe("DID validation", () => {
    it("returns 400 when DID is missing", async () => {
      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    it("returns 400 when DID is not a string", async () => {
      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({ did: 123 }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });
  });

  describe("DID conflict detection", () => {
    it("returns 409 when DID is already linked to another user", async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: "other-user-456" },
        error: null,
      });

      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({ did: "did:plc:test123" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toBe(
        "This Bluesky account is already linked to another user"
      );
    });

    it("allows linking when DID is already linked to the same user", async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: "user-123" },
        error: null,
      });

      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({ did: "did:plc:test123" }),
        headers: { "Content-Type": "application/json" },
      });

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });

  describe("Database operations", () => {
    it("returns 500 when database update fails", async () => {
      const mockUpdateEq = jest
        .fn()
        .mockResolvedValue({ error: { message: "Database error" } });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({ did: "did:plc:test123" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Failed to link Bluesky account");
    });

    it("clears atproto_did cookie after successful link", async () => {
      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({ did: "did:plc:test123" }),
        headers: { "Content-Type": "application/json" },
      });

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockUpdateEq });

      await POST(request);

      expect(mockDelete).toHaveBeenCalledWith("atproto_did");
    });
  });

  describe("Bot detection", () => {
    it("returns 403 when request is from a bot", async () => {
      const { checkBotId } = await import("botid/server");
      (checkBotId as jest.Mock).mockResolvedValueOnce({ isBot: true });

      const request = new Request("http://localhost/api/oauth/link", {
        method: "POST",
        body: JSON.stringify({ did: "did:plc:test123" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Access denied");
    });
  });
});
