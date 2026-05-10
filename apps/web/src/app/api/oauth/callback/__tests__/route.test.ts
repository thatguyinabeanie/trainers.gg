/**
 * @jest-environment node
 */

import { GET } from "../../callback/route";

// Mock dependencies
const mockHandleAtprotoCallback = jest.fn();
const mockGetBlueskyProfile = jest.fn();
const mockFrom = jest.fn();
const mockGenerateLink = jest.fn();
const mockCreateUser = jest.fn();

jest.mock("@/lib/atproto/oauth-client", () => ({
  handleAtprotoCallback: (...args: unknown[]) => mockHandleAtprotoCallback(...args),
  getBlueskyProfile: (...args: unknown[]) => mockGetBlueskyProfile(...args),
  extractUsernameFromHandle: (handle: string) => handle.split(".")[0],
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({
    auth: {
      admin: {
        generateLink: mockGenerateLink,
        createUser: mockCreateUser,
      },
    },
  }),
  createAtprotoServiceClient: () => ({
    from: mockFrom,
  }),
}));

jest.mock("@/lib/url-safety", () => ({
  sanitizeReturnUrl: (url: string | null | undefined, fallback: string) => {
    if (!url) return fallback;
    if (!url.startsWith("/") || url.startsWith("//")) return fallback;
    return url;
  },
}));

describe("GET /api/oauth/callback - Link Mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://trainers.gg";
  });

  function createRequest(params: Record<string, string>) {
    const url = new URL("https://trainers.gg/api/oauth/callback");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return new Request(url.toString());
  }

  describe("link mode - success", () => {
    it("attaches DID to user and redirects to settings page", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:abc123",
        returnUrl: "/dashboard/settings/account",
        linkUserId: "user-456",
      });

      // No existing holder
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      // User's current pds_status
      const mockSingle = jest.fn().mockResolvedValue({ data: { pds_status: null }, error: null });
      const mockEqSingle = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelectSingle = jest.fn().mockReturnValue({ eq: mockEqSingle });

      // Update call
      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // First call: check existing holder
          return { select: mockSelect };
        } else if (fromCallCount === 2) {
          // Second call: get current user's pds_status
          return { select: mockSelectSingle };
        } else {
          // Third call: update
          return { update: mockUpdate };
        }
      });

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toBe("https://trainers.gg/dashboard/settings/account");
    });

    it("does not overwrite existing pds_status", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:abc123",
        returnUrl: "/dashboard/settings/account",
        linkUserId: "user-456",
      });

      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      // User already has pds_status = "active"
      const mockSingle = jest.fn().mockResolvedValue({ data: { pds_status: "active" }, error: null });
      const mockEqSingle = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelectSingle = jest.fn().mockReturnValue({ eq: mockEqSingle });

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return { select: mockSelect };
        if (fromCallCount === 2) return { select: mockSelectSingle };
        return { update: mockUpdate };
      });

      await GET(createRequest({ code: "test", state: "test" }));

      // Should only update did, NOT pds_status
      expect(mockUpdate).toHaveBeenCalledWith({ did: "did:plc:abc123" });
    });

    it("sets pds_status to pending when user has no existing pds_status", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:abc123",
        returnUrl: "/dashboard/settings/account",
        linkUserId: "user-456",
      });

      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      // User has no pds_status
      const mockSingle = jest.fn().mockResolvedValue({ data: { pds_status: null }, error: null });
      const mockEqSingle = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelectSingle = jest.fn().mockReturnValue({ eq: mockEqSingle });

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return { select: mockSelect };
        if (fromCallCount === 2) return { select: mockSelectSingle };
        return { update: mockUpdate };
      });

      await GET(createRequest({ code: "test", state: "test" }));

      expect(mockUpdate).toHaveBeenCalledWith({ did: "did:plc:abc123", pds_status: "pending" });
    });
  });

  describe("link mode - DID conflict", () => {
    it("redirects with error when DID belongs to another user", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:abc123",
        returnUrl: "/dashboard/settings/account",
        linkUserId: "user-456",
      });

      // DID belongs to a different user
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: "other-user-789" },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({ select: mockSelect });

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/dashboard/settings/account");
      expect(location).toContain("#error=link_failed");
      expect(location).toContain("error_code=identity_already_exists");
    });
  });

  describe("link mode - update failure", () => {
    it("redirects with error when DB update fails", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:abc123",
        returnUrl: "/dashboard/settings/account",
        linkUserId: "user-456",
      });

      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      const mockSingle = jest.fn().mockResolvedValue({ data: { pds_status: null }, error: null });
      const mockEqSingle = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelectSingle = jest.fn().mockReturnValue({ eq: mockEqSingle });

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: { message: "DB error" } });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return { select: mockSelect };
        if (fromCallCount === 2) return { select: mockSelectSingle };
        return { update: mockUpdate };
      });

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("#error=link_failed");
      expect(location).toContain("error_code=update_failed");
    });
  });
});
