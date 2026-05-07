/**
 * @jest-environment node
 */

import { GET } from "../route";

// =============================================================================
// Module mocks
// =============================================================================

// Mock install-state so we can control token verification in tests
const mockVerifyInstallState = jest.fn();
jest.mock("@/lib/discord/install-state", () => ({
  verifyInstallState: (...args: unknown[]) => mockVerifyInstallState(...args),
}));

// Mock Supabase clients
const mockGetUser = jest.fn();
const mockAuthClient = { auth: { getUser: mockGetUser } };
const mockCreateClient = jest.fn(async () => mockAuthClient);
const mockCreateServiceRoleClient = jest.fn(() => ({}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

// Mock @trainers/supabase query/mutation functions
const mockHasCommunityAccess = jest.fn();
const mockGetCommunityById = jest.fn();
const mockCreateDiscordServer = jest.fn();
const mockHasCommunityFeatureAccess = jest.fn();

jest.mock("@trainers/supabase", () => ({
  hasCommunityAccess: (...args: unknown[]) => mockHasCommunityAccess(...args),
  getCommunityById: (...args: unknown[]) => mockGetCommunityById(...args),
  createDiscordServer: (...args: unknown[]) => mockCreateDiscordServer(...args),
  hasCommunityFeatureAccess: (...args: unknown[]) =>
    mockHasCommunityFeatureAccess(...args),
}));

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/discord/install-callback");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

function getRedirectLocation(response: Response): string {
  return response.headers.get("location") ?? "";
}

/** Standard valid params for the happy path. */
const VALID_PARAMS = {
  code: "discord-oauth-code",
  guild_id: "987654321098765432",
  state: "valid-signed-state-token",
};

const VERIFIED_STATE = { community_id: 42, user_id: "user-uuid-123" };
const AUTHED_USER = { id: "user-uuid-123" };
const COMMUNITY = { id: 42, slug: "my-community" };

// =============================================================================
// Tests
// =============================================================================

describe("GET /api/discord/install-callback", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: happy path
    mockVerifyInstallState.mockResolvedValue(VERIFIED_STATE);
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER }, error: null });
    mockHasCommunityAccess.mockResolvedValue(true);
    mockHasCommunityFeatureAccess.mockResolvedValue({ access: true });
    mockCreateDiscordServer.mockResolvedValue(undefined);
    mockGetCommunityById.mockResolvedValue(COMMUNITY);
  });

  // ---------------------------------------------------------------------------
  // Discord-side errors (user denied, etc.)
  // ---------------------------------------------------------------------------

  describe("Discord OAuth errors", () => {
    it("redirects with error code when Discord returns an error param", async () => {
      const response = await GET(
        makeRequest({
          error: "access_denied",
          error_description: "User cancelled",
        })
      );

      expect(response.status).toBe(303);
      expect(getRedirectLocation(response)).toContain(
        "discord_install_error=access_denied"
      );
    });

    it("redirects with error code when Discord returns a different error", async () => {
      const response = await GET(makeRequest({ error: "server_error" }));

      expect(response.status).toBe(303);
      expect(getRedirectLocation(response)).toContain(
        "discord_install_error=server_error"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Missing params
  // ---------------------------------------------------------------------------

  describe("Missing required params", () => {
    it.each([
      ["code", { guild_id: "123", state: "tok" }],
      ["guild_id", { code: "abc", state: "tok" }],
      ["state", { code: "abc", guild_id: "123" }],
      ["all", {}],
    ])(
      "redirects with missing_params when %s is absent",
      async (_label, params) => {
        const response = await GET(makeRequest(params));

        expect(response.status).toBe(303);
        expect(getRedirectLocation(response)).toContain(
          "discord_install_error=missing_params"
        );
      }
    );
  });

  // ---------------------------------------------------------------------------
  // State token verification
  // ---------------------------------------------------------------------------

  describe("State token verification", () => {
    it("redirects with invalid_state when verifyInstallState returns null", async () => {
      mockVerifyInstallState.mockResolvedValue(null);

      const response = await GET(makeRequest(VALID_PARAMS));

      expect(response.status).toBe(303);
      expect(getRedirectLocation(response)).toContain(
        "discord_install_error=invalid_state"
      );
    });

    it("calls verifyInstallState with the state param", async () => {
      await GET(makeRequest(VALID_PARAMS));

      expect(mockVerifyInstallState).toHaveBeenCalledWith(VALID_PARAMS.state);
    });
  });

  // ---------------------------------------------------------------------------
  // Auth checks
  // ---------------------------------------------------------------------------

  describe("Authentication checks", () => {
    it("redirects with auth_mismatch when no user session exists", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const response = await GET(makeRequest(VALID_PARAMS));

      expect(response.status).toBe(303);
      expect(getRedirectLocation(response)).toContain(
        "discord_install_error=auth_mismatch"
      );
    });

    it("redirects with auth_mismatch when session user differs from state user", async () => {
      // State says user A, session is user B
      mockGetUser.mockResolvedValue({
        data: { user: { id: "different-user-uuid" } },
        error: null,
      });

      const response = await GET(makeRequest(VALID_PARAMS));

      expect(response.status).toBe(303);
      expect(getRedirectLocation(response)).toContain(
        "discord_install_error=auth_mismatch"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Community access checks
  // ---------------------------------------------------------------------------

  describe("Community access check", () => {
    it("redirects with not_authorized when user is no longer a community leader", async () => {
      mockHasCommunityAccess.mockResolvedValue(false);

      const response = await GET(makeRequest(VALID_PARAMS));

      expect(response.status).toBe(303);
      expect(getRedirectLocation(response)).toContain(
        "discord_install_error=not_authorized"
      );
    });

    it("calls hasCommunityAccess with the community_id and user_id from state", async () => {
      await GET(makeRequest(VALID_PARAMS));

      expect(mockHasCommunityAccess).toHaveBeenCalledWith(
        mockAuthClient,
        VERIFIED_STATE.community_id,
        VERIFIED_STATE.user_id
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Feature flag check
  // ---------------------------------------------------------------------------

  describe("Feature flag check", () => {
    it("redirects with feature_disabled when Discord integration is not enabled", async () => {
      mockHasCommunityFeatureAccess.mockResolvedValue({ access: false });

      const response = await GET(makeRequest(VALID_PARAMS));

      expect(response.status).toBe(303);
      expect(getRedirectLocation(response)).toContain(
        "discord_install_error=feature_disabled"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Discord server creation
  // ---------------------------------------------------------------------------

  describe("Discord server creation", () => {
    it("redirects with already_installed on unique constraint violation", async () => {
      const uniqueError = Object.assign(new Error("Duplicate"), {
        code: "23505",
      });
      mockCreateDiscordServer.mockRejectedValue(uniqueError);

      const response = await GET(makeRequest(VALID_PARAMS));

      expect(response.status).toBe(303);
      expect(getRedirectLocation(response)).toContain(
        "discord_install_error=already_installed"
      );
    });

    it("rethrows unexpected DB errors (not unique constraint)", async () => {
      mockCreateDiscordServer.mockRejectedValue(
        new Error("Connection refused")
      );

      await expect(GET(makeRequest(VALID_PARAMS))).rejects.toThrow(
        "Connection refused"
      );
    });

    it("calls createDiscordServer with guild_id, community_id, installed_by", async () => {
      await GET(makeRequest(VALID_PARAMS));

      expect(mockCreateDiscordServer).toHaveBeenCalledWith(
        expect.anything(), // service role client
        {
          guild_id: VALID_PARAMS.guild_id,
          community_id: VERIFIED_STATE.community_id,
          installed_by: AUTHED_USER.id,
        }
      );
    });

    it("uses the service role client (not the user client) for DB write", async () => {
      const serviceClient = { _role: "service" };
      mockCreateServiceRoleClient.mockReturnValue(serviceClient);

      await GET(makeRequest(VALID_PARAMS));

      // First arg to createDiscordServer should be the service role client
      expect(mockCreateDiscordServer).toHaveBeenCalledWith(
        serviceClient,
        expect.anything()
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Success path
  // ---------------------------------------------------------------------------

  describe("Success path", () => {
    it("redirects to the community integration page with installed=true", async () => {
      const response = await GET(makeRequest(VALID_PARAMS));

      expect(response.status).toBe(303);
      const location = getRedirectLocation(response);
      expect(location).toContain(
        "/dashboard/community/my-community/settings/integrations/discord"
      );
      expect(location).toContain("installed=true");
      expect(location).toContain(`guild=${VALID_PARAMS.guild_id}`);
    });

    it("redirects with community_not_found when community lookup returns null", async () => {
      mockGetCommunityById.mockResolvedValue(null);

      const response = await GET(makeRequest(VALID_PARAMS));

      expect(response.status).toBe(303);
      expect(getRedirectLocation(response)).toContain(
        "discord_install_error=community_not_found"
      );
    });

    it("uses 303 (not 302) so browser converts redirect to GET", async () => {
      const response = await GET(makeRequest(VALID_PARAMS));

      expect(response.status).toBe(303);
    });

    it("does not attempt token exchange (no DISCORD_CLIENT_SECRET needed)", async () => {
      // Verify the route completes successfully without DISCORD_CLIENT_SECRET
      // being present — token exchange is intentionally skipped
      delete process.env.DISCORD_CLIENT_SECRET;

      const response = await GET(makeRequest(VALID_PARAMS));
      expect(response.status).toBe(303);
    });
  });
});
