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

describe("GET /api/oauth/callback", () => {
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

  // ===========================================================================
  // Sign-In Mode
  // ===========================================================================

  describe("sign-in mode - existing user by DID", () => {
    it("generates magic link and redirects to auth callback for existing user", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:existing123",
        returnUrl: "/dashboard",
        linkUserId: undefined,
      });

      // User found by DID
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: "user-existing", email: "did_plc_existing123@bluesky.trainers.gg", did: "did:plc:existing123" },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      // Magic link generation
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_abc123" } },
        error: null,
      });

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/auth/callback");
      expect(location).toContain("token_hash=token_abc123");
      expect(location).toContain("type=magiclink");
      expect(location).toContain("next=%2Fdashboard");
    });
  });

  describe("sign-in mode - existing user by email (legacy)", () => {
    it("finds legacy user by email when DID lookup fails", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:legacy456",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // First lookup: DID not found
      const mockMaybeSingleDid = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEqDid = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingleDid });

      // Second lookup: found by email
      const mockMaybeSingleEmail = jest.fn().mockResolvedValue({
        data: { id: "user-legacy", email: "did_plc_legacy456@bluesky.trainers.gg", did: null },
        error: null,
      });
      const mockEqEmail = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingleEmail });

      // Update call for setting DID on legacy user
      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // DID lookup
          return { select: jest.fn().mockReturnValue({ eq: mockEqDid }) };
        } else if (fromCallCount === 2) {
          // Email lookup
          return { select: jest.fn().mockReturnValue({ eq: mockEqEmail }) };
        } else {
          // Update DID on legacy user
          return { update: mockUpdate };
        }
      });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_legacy" } },
        error: null,
      });

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/auth/callback");
      expect(location).toContain("token_hash=token_legacy");
      // Should update DID on legacy user
      expect(mockUpdate).toHaveBeenCalledWith({ did: "did:plc:legacy456", pds_status: "pending" });
    });
  });

  describe("sign-in mode - new user", () => {
    it("creates new user from Bluesky profile and redirects", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:newuser789",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // DID lookup: not found
      const mockMaybeSingleDid = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEqDid = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingleDid });

      // Email lookup: not found
      const mockMaybeSingleEmail = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEqEmail = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingleEmail });

      // Update after user creation
      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return { select: jest.fn().mockReturnValue({ eq: mockEqDid }) };
        } else if (fromCallCount === 2) {
          return { select: jest.fn().mockReturnValue({ eq: mockEqEmail }) };
        } else {
          return { update: mockUpdate };
        }
      });

      // Bluesky profile
      mockGetBlueskyProfile.mockResolvedValue({
        handle: "pikachu.bsky.social",
        displayName: "Pikachu",
        avatar: "https://cdn.bsky.social/avatar.jpg",
      });

      // Create user success
      mockCreateUser.mockResolvedValue({
        data: { user: { id: "new-user-id" } },
        error: null,
      });

      // Magic link generation
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_new" } },
        error: null,
      });

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/auth/callback");
      expect(location).toContain("token_hash=token_new");

      // Verify user was created with correct metadata
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: expect.stringContaining("bluesky.trainers.gg"),
          email_confirm: true,
          user_metadata: expect.objectContaining({
            username: "pikachu",
            display_name: "Pikachu",
            did: "did:plc:newuser789",
            auth_provider: "bluesky",
          }),
        })
      );
    });

    it("handles 'already registered' error by updating existing auth user", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:conflict",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // DID lookup: not found
      const mockMaybeSingleDid = jest.fn().mockResolvedValue({ data: null, error: null });
      // Email lookup: not found
      const mockMaybeSingleEmail = jest.fn().mockResolvedValue({ data: null, error: null });

      // After "already registered" error - lookup by email (ilike)
      const mockMaybeSingleIlike = jest.fn().mockResolvedValue({
        data: { id: "existing-auth-user" },
        error: null,
      });
      const mockIlike = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingleIlike });

      // Update call
      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingleDid }) }) };
        } else if (fromCallCount === 2) {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingleEmail }) }) };
        } else if (fromCallCount === 3) {
          return { select: jest.fn().mockReturnValue({ ilike: mockIlike }) };
        } else {
          return { update: mockUpdate };
        }
      });

      mockGetBlueskyProfile.mockResolvedValue({
        handle: "duplicate.bsky.social",
        displayName: "Duplicate",
        avatar: "https://cdn.bsky.social/dup.jpg",
      });

      // Create user fails with "already registered"
      mockCreateUser.mockResolvedValue({
        data: null,
        error: { message: "A user with this email address has already been registered" },
      });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_dup" } },
        error: null,
      });

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("token_hash=token_dup");
    });
  });

  describe("sign-in mode - error handling", () => {
    it("redirects to sign-in with error when callback throws", async () => {
      mockHandleAtprotoCallback.mockRejectedValue(new Error("Token exchange failed"));

      const response = await GET(createRequest({ code: "bad", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/sign-in");
      expect(location).toContain("error=bluesky_auth_failed");
      expect(location).toContain("Token+exchange+failed");
    });

    it("redirects to sign-in when magic link generation fails", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:existing",
        returnUrl: "/",
        linkUserId: undefined,
      });

      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: "user-1", email: "test@bluesky.trainers.gg", did: "did:plc:existing" },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: null } },
        error: { message: "rate limited" },
      });

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/sign-in");
      expect(location).toContain("error=bluesky_auth_failed");
    });

    it("redirects to sign-in when Bluesky profile cannot be fetched", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:noprofile",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // DID not found, email not found
      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) });

      mockGetBlueskyProfile.mockResolvedValue(null);

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/sign-in");
      expect(location).toContain("error=bluesky_auth_failed");
    });

    it("uses NEXT_PUBLIC_SITE_URL for baseUrl when available", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://custom.trainers.gg";
      mockHandleAtprotoCallback.mockRejectedValue(new Error("fail"));

      const response = await GET(createRequest({ code: "test", state: "test" }));

      const location = response.headers.get("location")!;
      expect(location).toMatch(/^https:\/\/custom\.trainers\.gg\/sign-in/);
    });

    it("falls back to request origin when NEXT_PUBLIC_SITE_URL is not set", async () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      mockHandleAtprotoCallback.mockRejectedValue(new Error("fail"));

      const response = await GET(createRequest({ code: "test", state: "test" }));

      const location = response.headers.get("location")!;
      expect(location).toMatch(/^https:\/\/trainers\.gg\/sign-in/);
    });
  });

  describe("sign-in mode - DID update on legacy user", () => {
    it("updates DID on legacy user that was found by email", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:legacy",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // DID lookup: not found
      const mockMaybeSingleDid = jest.fn().mockResolvedValue({ data: null, error: null });
      // Email lookup: found, but no DID set (legacy)
      const mockMaybeSingleEmail = jest.fn().mockResolvedValue({
        data: { id: "user-legacy", email: "did_plc_legacy@bluesky.trainers.gg", did: null },
        error: null,
      });

      // Update call for setting DID
      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingleDid }) }) };
        } else if (fromCallCount === 2) {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingleEmail }) }) };
        } else {
          return { update: mockUpdate };
        }
      });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_legacy_update" } },
        error: null,
      });

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      expect(mockUpdate).toHaveBeenCalledWith({ did: "did:plc:legacy", pds_status: "pending" });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-legacy");
    });

    it("does not update DID if user already has it set", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:hasdid",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // User found by DID with DID already set
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: "user-existing", email: "did_plc_hasdid@bluesky.trainers.gg", did: "did:plc:hasdid" },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockUpdate = jest.fn();

      mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_existing" } },
        error: null,
      });

      await GET(createRequest({ code: "test", state: "test" }));

      // Should NOT call update since user already has DID
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("sign-in mode - user creation failures", () => {
    it("throws for non-duplicate creation errors", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:fail",
        returnUrl: "/",
        linkUserId: undefined,
      });

      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) });

      mockGetBlueskyProfile.mockResolvedValue({
        handle: "fail.bsky.social",
        displayName: "Fail",
        avatar: null,
      });

      // Create user fails with unexpected error
      mockCreateUser.mockResolvedValue({
        data: null,
        error: { message: "Internal server error" },
      });

      const response = await GET(createRequest({ code: "test", state: "test" }));

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/sign-in");
      expect(location).toContain("error=bluesky_auth_failed");
      expect(location).toContain("Internal+server+error");
    });

    it("handles short handle usernames with user_ prefix", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:short",
        returnUrl: "/",
        linkUserId: undefined,
      });

      const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: mockEq }),
        update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      });

      // Handle that extracts to a very short name (e.g., "ab")
      mockGetBlueskyProfile.mockResolvedValue({
        handle: "ab.bsky.social",
        displayName: "AB",
        avatar: null,
      });

      mockCreateUser.mockResolvedValue({
        data: { user: { id: "new-short-user" } },
        error: null,
      });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_short" } },
        error: null,
      });

      await GET(createRequest({ code: "test", state: "test" }));

      // Username should be prefixed with user_ since "ab" is < 3 chars
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            username: "user_ab",
          }),
        })
      );
    });
  });

  describe("link mode - same user already owns DID", () => {
    it("proceeds with update when user already has this DID", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:mine",
        returnUrl: "/dashboard/settings/account",
        linkUserId: "user-same",
      });

      // DID already belongs to the same user
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: "user-same" },
        error: null,
      });
      const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

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

      const response = await GET(createRequest({ code: "test", state: "test" }));

      // Should succeed (not error), even though DID is "already linked"
      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toBe("https://trainers.gg/dashboard/settings/account");
      // Should only update did (not pds_status since it's already "active")
      expect(mockUpdate).toHaveBeenCalledWith({ did: "did:plc:mine" });
    });
  });
});
