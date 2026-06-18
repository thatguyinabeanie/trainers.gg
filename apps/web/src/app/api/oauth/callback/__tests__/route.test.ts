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
const mockGetUserById = jest.fn();
const mockListUsers = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/atproto/oauth-client", () => ({
  handleAtprotoCallback: (...args: unknown[]) =>
    mockHandleAtprotoCallback(...args),
  getBlueskyProfile: (...args: unknown[]) => mockGetBlueskyProfile(...args),
  extractUsernameFromHandle: (handle: string) => handle.split(".")[0],
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({
    auth: {
      admin: {
        generateLink: mockGenerateLink,
        createUser: mockCreateUser,
        getUserById: (...args: unknown[]) => mockGetUserById(...args),
        listUsers: (...args: unknown[]) => mockListUsers(...args),
      },
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
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
    // Default auth admin mock defaults — individual tests override as needed
    mockGetUserById.mockResolvedValue({ data: { user: null }, error: null });
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
    // Default rpc mock — returns null (no user found) for get_user_id_by_email
    mockRpc.mockResolvedValue({ data: null, error: null });
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
      const mockMaybeSingle = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      // Update call
      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // First call: check existing holder
          return { select: mockSelect };
        } else {
          // Second call: update
          return { update: mockUpdate };
        }
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toBe("https://trainers.gg/dashboard/settings/account");
    });

    it("only updates did field — never touches pds_status", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:abc123",
        returnUrl: "/dashboard/settings/account",
        linkUserId: "user-456",
      });

      const mockMaybeSingle = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return { select: mockSelect };
        return { update: mockUpdate };
      });

      await GET(createRequest({ code: "test", state: "test" }));

      // Should ONLY update did — pds_status must never be touched in link mode
      expect(mockUpdate).toHaveBeenCalledWith({ did: "did:plc:abc123" });
      expect(mockUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({ pds_status: expect.anything() })
      );
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
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({ select: mockSelect });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/dashboard/settings/account");
      expect(location).toContain("#error=link_failed");
      expect(location).toContain("error_code=identity_already_exists");
    });

    it("redirects with error when DID lookup query fails", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:abc123",
        returnUrl: "/dashboard/settings/account",
        linkUserId: "user-456",
      });

      // DB error on lookup
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "connection timeout" },
      });
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValue({ select: mockSelect });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("#error=link_failed");
      expect(location).toContain("error_code=update_failed");
    });
  });

  describe("link mode - update failure", () => {
    it("redirects with error when DB update fails", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:abc123",
        returnUrl: "/dashboard/settings/account",
        linkUserId: "user-456",
      });

      const mockMaybeSingle = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      const mockUpdateEq = jest
        .fn()
        .mockResolvedValue({ error: { message: "DB error" } });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return { select: mockSelect };
        return { update: mockUpdate };
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

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

      // User found by DID — no email in public.users (moved to auth.users)
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: "user-existing", did: "did:plc:existing123" },
        error: null,
      });
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      // getUserById fetches email from auth.users (canonical source)
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: "user-existing",
            email: "did_plc_existing123@bluesky.trainers.gg",
          },
        },
        error: null,
      });

      // Magic link generation
      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_abc123" } },
        error: null,
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

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

      // rpc('get_user_id_by_email') finds the legacy auth user's UUID
      mockRpc.mockResolvedValue({ data: "user-legacy", error: null });

      // getUserById fetches email from auth.users (canonical source)
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: "user-legacy",
            email: "did_plc_legacy456@bluesky.trainers.gg",
          },
        },
        error: null,
      });

      // Update call for setting DID on legacy user
      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // DID lookup — not found
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        } else if (fromCallCount === 2) {
          // Public users row lookup by legacyAuthUser.id
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: "user-legacy", did: null },
                  error: null,
                }),
              }),
            }),
          };
        } else {
          // Update DID on legacy user
          return { update: mockUpdate };
        }
      });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_legacy" } },
        error: null,
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/auth/callback");
      expect(location).toContain("token_hash=token_legacy");
      // Should update DID on legacy user
      expect(mockUpdate).toHaveBeenCalledWith({
        did: "did:plc:legacy456",
        pds_status: "pending",
      });
    });
  });

  describe("sign-in mode - new user", () => {
    it("creates new user from Bluesky profile and redirects", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:newuser789",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // rpc('get_user_id_by_email') returns null — no legacy user found
      // (default mockRpc already returns { data: null, error: null })

      // Update after user creation — chain is .update().eq().select("id")
      const mockUpdateSelectId = jest
        .fn()
        .mockResolvedValue({ data: [{ id: "new-user-id" }], error: null });
      const mockUpdateEq = jest
        .fn()
        .mockReturnValue({ select: mockUpdateSelectId });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // DID lookup — not found
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        } else {
          // Update new user's public.users row with did/pds_status/image
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

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

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

      // Update call — chain is .update().eq().select("id")
      const mockUpdateSelectId = jest
        .fn()
        .mockResolvedValue({
          data: [{ id: "existing-auth-user" }],
          error: null,
        });
      const mockUpdateEq = jest
        .fn()
        .mockReturnValue({ select: mockUpdateSelectId });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      // DID lookup returns null
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: mockUpdate,
      }));

      // rpc('get_user_id_by_email') is called twice:
      // 1st call (legacy fallback during initial lookup): no user found
      // 2nd call (conflict lookup after "already registered" error): finds existing auth user
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: "existing-auth-user", error: null });

      mockGetBlueskyProfile.mockResolvedValue({
        handle: "duplicate.bsky.social",
        displayName: "Duplicate",
        avatar: "https://cdn.bsky.social/dup.jpg",
      });

      // Create user fails with "already registered"
      mockCreateUser.mockResolvedValue({
        data: null,
        error: {
          message: "A user with this email address has already been registered",
        },
      });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_dup" } },
        error: null,
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("token_hash=token_dup");
    });
  });

  describe("sign-in mode - legacy lookup error", () => {
    it("redirects to sign-in when get_user_id_by_email (legacy) returns a DB error", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:legacyerr",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // DID lookup — not found
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      // Legacy email lookup fails with a DB error
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "connection timeout" },
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/sign-in");
      expect(location).toContain("error=bluesky_auth_failed");
      // Must NOT attempt to create a new user
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("does not redirect to new-user creation on legacy lookup error", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:legacyerr2",
        returnUrl: "/dashboard",
        linkUserId: undefined,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "permission denied" },
      });

      await GET(createRequest({ code: "test", state: "test" }));

      // User creation must be skipped entirely
      expect(mockCreateUser).not.toHaveBeenCalled();
      expect(mockGetBlueskyProfile).not.toHaveBeenCalled();
    });
  });

  describe("sign-in mode - conflict lookup error", () => {
    it("redirects to sign-in when get_user_id_by_email (conflict) returns a DB error", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:conflerr",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // DID lookup — not found; rpc 1st call (legacy) succeeds with null
      // rpc 2nd call (conflict) fails with an error
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "connection timeout" },
        });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: jest
          .fn()
          .mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
      });

      mockGetBlueskyProfile.mockResolvedValue({
        handle: "conflerr.bsky.social",
        displayName: "ConflErrUser",
        avatar: null,
      });

      // createUser fails with "already registered" to trigger the conflict path
      mockCreateUser.mockResolvedValue({
        data: null,
        error: {
          message: "A user with this email address has already been registered",
        },
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/sign-in");
      expect(location).toContain("error=bluesky_auth_failed");
    });

    it("does not generate a magic link on conflict lookup error", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:nolink",
        returnUrl: "/",
        linkUserId: undefined,
      });

      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "DB failure" },
        });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: jest
          .fn()
          .mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
      });

      mockGetBlueskyProfile.mockResolvedValue({
        handle: "nolink.bsky.social",
        displayName: "NoLink",
        avatar: null,
      });

      mockCreateUser.mockResolvedValue({
        data: null,
        error: {
          message: "A user with this email address has already been registered",
        },
      });

      await GET(createRequest({ code: "test", state: "test" }));

      // Magic link must NOT be generated when the conflict lookup fails
      expect(mockGenerateLink).not.toHaveBeenCalled();
    });
  });

  describe("sign-in mode - error handling", () => {
    it("redirects to sign-in with error when callback throws", async () => {
      mockHandleAtprotoCallback.mockRejectedValue(
        new Error("Token exchange failed")
      );

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
        data: {
          id: "user-1",
          email: "test@bluesky.trainers.gg",
          did: "did:plc:existing",
        },
        error: null,
      });
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: mockEq }),
      });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: null } },
        error: { message: "rate limited" },
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

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
      const mockMaybeSingle = jest
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({ eq: mockEq }),
      });

      mockGetBlueskyProfile.mockResolvedValue(null);

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/sign-in");
      expect(location).toContain("error=bluesky_auth_failed");
    });

    it("uses NEXT_PUBLIC_SITE_URL for baseUrl when available", async () => {
      process.env.NEXT_PUBLIC_SITE_URL = "https://custom.trainers.gg";
      mockHandleAtprotoCallback.mockRejectedValue(new Error("fail"));

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      const location = response.headers.get("location")!;
      expect(location).toMatch(/^https:\/\/custom\.trainers\.gg\/sign-in/);
    });

    it("falls back to request origin when NEXT_PUBLIC_SITE_URL is not set", async () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      mockHandleAtprotoCallback.mockRejectedValue(new Error("fail"));

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

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

      // rpc('get_user_id_by_email') finds the legacy user's UUID
      mockRpc.mockResolvedValue({ data: "user-legacy", error: null });

      // getUserById returns the legacy user's email (canonical source)
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: "user-legacy",
            email: "did_plc_legacy@bluesky.trainers.gg",
          },
        },
        error: null,
      });

      // Update call for setting DID
      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // DID lookup — not found
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        } else if (fromCallCount === 2) {
          // Public users row lookup by legacyAuthUser.id — found with no DID
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: "user-legacy", did: null },
                  error: null,
                }),
              }),
            }),
          };
        } else {
          // Update DID on legacy user
          return { update: mockUpdate };
        }
      });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_legacy_update" } },
        error: null,
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      expect(mockUpdate).toHaveBeenCalledWith({
        did: "did:plc:legacy",
        pds_status: "pending",
      });
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
        data: {
          id: "user-existing",
          email: "did_plc_hasdid@bluesky.trainers.gg",
          did: "did:plc:hasdid",
        },
        error: null,
      });
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
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

      // DID lookup returns null; rpc returns null (no legacy user)
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
      // default mockRpc already returns { data: null, error: null }

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

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

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

      // DID lookup returns null; rpc returns null (no legacy user)
      // Update chain: .update().eq().select("id")
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest
              .fn()
              .mockResolvedValue({
                data: [{ id: "new-short-user" }],
                error: null,
              }),
          }),
        }),
      });
      // default mockRpc already returns { data: null, error: null }

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

  // ===========================================================================
  // A2: getUserById error → account_lookup_failed redirect
  // ===========================================================================

  describe("sign-in mode - getUserById transient failure (A2)", () => {
    it("redirects with account_lookup_failed when getUserById returns an error", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:existing123",
        returnUrl: "/dashboard",
        linkUserId: undefined,
      });

      // User found by DID
      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: "user-existing", did: "did:plc:existing123" },
        error: null,
      });
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      // getUserById fails with a transient error
      mockGetUserById.mockResolvedValue({
        data: null,
        error: { message: "service unavailable" },
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/sign-in");
      expect(location).toContain("error=account_lookup_failed");
      // Must NOT fall through to magic link generation
      expect(mockGenerateLink).not.toHaveBeenCalled();
    });

    it("does not redirect with bluesky_auth_failed on getUserById error — uses retryable message", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:existing456",
        returnUrl: "/",
        linkUserId: undefined,
      });

      const mockMaybeSingle = jest.fn().mockResolvedValue({
        data: { id: "user-456", did: "did:plc:existing456" },
        error: null,
      });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
        }),
      });

      mockGetUserById.mockResolvedValue({
        data: null,
        error: { message: "connection reset" },
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      const location = response.headers.get("location")!;
      // Must use account_lookup_failed, NOT bluesky_auth_failed
      expect(location).toContain("error=account_lookup_failed");
      expect(location).not.toContain("error=bluesky_auth_failed");
    });
  });

  // ===========================================================================
  // A3: 0-row update → bluesky_auth_failed redirect (profile missing)
  // ===========================================================================

  describe("sign-in mode - 0-row update on conflict branch (A3)", () => {
    it("redirects with bluesky_auth_failed when conflict-branch update touches 0 rows", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:conflictempty",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // rpc: 1st (legacy) = null, 2nd (conflict) = foundId
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: "orphan-auth-user", error: null });

      // Update returns empty rows (public.users row missing)
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }));

      mockGetBlueskyProfile.mockResolvedValue({
        handle: "orphan.bsky.social",
        displayName: "Orphan",
        avatar: null,
      });

      mockCreateUser.mockResolvedValue({
        data: null,
        error: {
          message: "A user with this email address has already been registered",
        },
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/sign-in");
      expect(location).toContain("error=bluesky_auth_failed");
      // Must NOT generate a magic link — profile row is missing
      expect(mockGenerateLink).not.toHaveBeenCalled();
    });
  });

  describe("sign-in mode - 0-row update on new-user branch (A3)", () => {
    it("redirects with bluesky_auth_failed when new-user update touches 0 rows", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:neworphan",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // DID not found, no legacy user
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            // 0-row update — auth trigger never ran
            select: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      mockGetBlueskyProfile.mockResolvedValue({
        handle: "neworphan.bsky.social",
        displayName: "NewOrphan",
        avatar: null,
      });

      mockCreateUser.mockResolvedValue({
        data: { user: { id: "neworphan-id" } },
        error: null,
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/sign-in");
      expect(location).toContain("error=bluesky_auth_failed");
      expect(mockGenerateLink).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // A5: email_exists structured code triggers the conflict lookup path
  // ===========================================================================

  describe("sign-in mode - email_exists structured error code (A5)", () => {
    it("treats authError.code=email_exists the same as 'already registered' message", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:emailexists",
        returnUrl: "/",
        linkUserId: undefined,
      });

      // DID not found; no legacy user
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null }) // legacy lookup
        .mockResolvedValueOnce({ data: "conflict-user-id", error: null }); // conflict lookup

      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ id: "conflict-user-id" }],
              error: null,
            }),
          }),
        }),
      }));

      mockGetBlueskyProfile.mockResolvedValue({
        handle: "emailexists.bsky.social",
        displayName: "EmailExists",
        avatar: null,
      });

      // createUser returns the structured code (no message text)
      mockCreateUser.mockResolvedValue({
        data: null,
        error: { code: "email_exists", message: "" },
      });

      mockGenerateLink.mockResolvedValue({
        data: { properties: { hashed_token: "token_emailexists" } },
        error: null,
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      // Should follow the conflict path and generate a magic link
      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("/auth/callback");
      expect(location).toContain("token_hash=token_emailexists");
    });

    it("does NOT treat a different error code as a conflict (falls through to auth_failed)", async () => {
      mockHandleAtprotoCallback.mockResolvedValue({
        did: "did:plc:othererr",
        returnUrl: "/",
        linkUserId: undefined,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      mockGetBlueskyProfile.mockResolvedValue({
        handle: "othererr.bsky.social",
        displayName: "OtherErr",
        avatar: null,
      });

      // Some other structured error code
      mockCreateUser.mockResolvedValue({
        data: null,
        error: { code: "unexpected_failure", message: "Some other problem" },
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      expect(response.status).toBe(307);
      const location = response.headers.get("location")!;
      expect(location).toContain("error=bluesky_auth_failed");
      expect(mockGenerateLink).not.toHaveBeenCalled();
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
      const mockEq = jest
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

      let fromCallCount = 0;
      mockFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) return { select: mockSelect };
        return { update: mockUpdate };
      });

      const response = await GET(
        createRequest({ code: "test", state: "test" })
      );

      // Should succeed (not error), even though DID is "already linked"
      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toBe("https://trainers.gg/dashboard/settings/account");
      // Should only update did — pds_status is never touched in link mode
      expect(mockUpdate).toHaveBeenCalledWith({ did: "did:plc:mine" });
    });
  });
});
