/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockListDiscordServers = jest.fn();
const mockDeleteDiscordServer = jest.fn();

jest.mock("@trainers/supabase", () => ({
  listDiscordServers: (...args: unknown[]) => mockListDiscordServers(...args),
  deleteDiscordServer: (...args: unknown[]) => mockDeleteDiscordServer(...args),
}));

const mockCreateServiceRoleClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

const mockGetGuild = jest.fn();
const mockIsNotFoundError = jest.fn();
const mockIsMissingAccessError = jest.fn();
const mockGetErrorCode = jest.fn();

jest.mock("@/lib/discord/api", () => ({
  getGuild: (...args: unknown[]) => mockGetGuild(...args),
  isNotFoundError: (e: unknown) => mockIsNotFoundError(e),
  isMissingAccessError: (e: unknown) => mockIsMissingAccessError(e),
  getErrorCode: (e: unknown) => mockGetErrorCode(e),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

const CRON_SECRET = "super-secret-cron-token";

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost:3000/api/discord/uninstall-sweep", {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  });
}

function makeServer(overrides: { id?: number; guild_id?: string } = {}) {
  return { id: overrides.id ?? 1, guild_id: overrides.guild_id ?? "guild-111" };
}

// =============================================================================
// Setup
// =============================================================================

const originalEnv = process.env;
const FAKE_CLIENT = { _role: "service" };

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, CRON_SECRET };
  mockCreateServiceRoleClient.mockReturnValue(FAKE_CLIENT);
  mockListDiscordServers.mockResolvedValue([]);
  mockDeleteDiscordServer.mockResolvedValue(undefined);
  // By default, guild is still accessible
  mockGetGuild.mockResolvedValue({ id: "guild-111", name: "Test Guild" });
  mockIsNotFoundError.mockReturnValue(false);
  mockIsMissingAccessError.mockReturnValue(false);
  mockGetErrorCode.mockReturnValue("unknown");
});

afterEach(() => {
  process.env = originalEnv;
});

// =============================================================================
// Authorization
// =============================================================================

describe("Authorization", () => {
  it("returns 401 when the authorization header is missing", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("returns 401 when the bearer token does not match CRON_SECRET", async () => {
    const response = await GET(makeRequest("Bearer wrong-secret"));
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("returns 401 when the authorization value is CRON_SECRET without Bearer prefix", async () => {
    const response = await GET(makeRequest(CRON_SECRET));
    expect(response.status).toBe(401);
  });

  it("proceeds when authorization matches Bearer CRON_SECRET", async () => {
    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Server scanning
// =============================================================================

describe("Server scanning", () => {
  it("uses the service-role client for listDiscordServers", async () => {
    await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(mockListDiscordServers).toHaveBeenCalledWith(FAKE_CLIENT);
  });

  it("calls getGuild for each installed server", async () => {
    const servers = [
      makeServer({ id: 1, guild_id: "g-1" }),
      makeServer({ id: 2, guild_id: "g-2" }),
    ];
    mockListDiscordServers.mockResolvedValue(servers);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockGetGuild).toHaveBeenCalledTimes(2);
    expect(mockGetGuild).toHaveBeenCalledWith("g-1");
    expect(mockGetGuild).toHaveBeenCalledWith("g-2");
  });

  it("returns scanned count equal to the number of servers", async () => {
    const servers = [
      makeServer({ id: 1 }),
      makeServer({ id: 2 }),
      makeServer({ id: 3 }),
    ];
    mockListDiscordServers.mockResolvedValue(servers);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.scanned).toBe(3);
  });

  it("reports zero removed and zero errors when all servers are still accessible", async () => {
    const servers = [makeServer({ id: 1 }), makeServer({ id: 2 })];
    mockListDiscordServers.mockResolvedValue(servers);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.removed).toBe(0);
    expect(body.errors).toBe(0);
    expect(body.errorDetails).toEqual([]);
    expect(mockDeleteDiscordServer).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Removal on 404
// =============================================================================

describe("Removal — 404 Not Found", () => {
  it("deletes the discord_servers row when getGuild returns 404", async () => {
    const server = makeServer({ id: 7, guild_id: "g-404" });
    mockListDiscordServers.mockResolvedValue([server]);
    const err = new Error("Unknown Guild");
    mockGetGuild.mockRejectedValue(err);
    mockIsNotFoundError.mockReturnValue(true);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockDeleteDiscordServer).toHaveBeenCalledWith(FAKE_CLIENT, 7);
    expect(body.removed).toBe(1);
    expect(body.errors).toBe(0);
  });

  it("uses the service-role client to delete the row", async () => {
    const server = makeServer({ id: 10 });
    mockListDiscordServers.mockResolvedValue([server]);
    mockGetGuild.mockRejectedValue(new Error("Unknown Guild"));
    mockIsNotFoundError.mockReturnValue(true);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockDeleteDiscordServer).toHaveBeenCalledWith(
      FAKE_CLIENT,
      expect.any(Number)
    );
  });

  it("removes multiple servers that all return 404", async () => {
    const servers = [
      makeServer({ id: 1, guild_id: "g-1" }),
      makeServer({ id: 2, guild_id: "g-2" }),
    ];
    mockListDiscordServers.mockResolvedValue(servers);
    mockGetGuild.mockRejectedValue(new Error("Unknown Guild"));
    mockIsNotFoundError.mockReturnValue(true);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockDeleteDiscordServer).toHaveBeenCalledTimes(2);
    expect(body.removed).toBe(2);
    expect(body.scanned).toBe(2);
  });
});

// =============================================================================
// Removal on Missing Access (code 50001)
// =============================================================================

describe("Removal — 50001 Missing Access", () => {
  it("deletes the row when getGuild returns code 50001", async () => {
    const server = makeServer({ id: 5, guild_id: "g-50001" });
    mockListDiscordServers.mockResolvedValue([server]);
    const err = new Error("Missing Access");
    mockGetGuild.mockRejectedValue(err);
    // isNotFoundError returns false, isMissingAccessError returns true
    mockIsNotFoundError.mockReturnValue(false);
    mockIsMissingAccessError.mockReturnValue(true);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockDeleteDiscordServer).toHaveBeenCalledWith(FAKE_CLIENT, 5);
    expect(body.removed).toBe(1);
    expect(body.errors).toBe(0);
  });
});

// =============================================================================
// Transient errors — leave row intact
// =============================================================================

describe("Transient errors", () => {
  it("does not delete the row on a 5xx error", async () => {
    const server = makeServer({ id: 3, guild_id: "g-500" });
    mockListDiscordServers.mockResolvedValue([server]);
    const err = new Error("Internal Server Error");
    mockGetGuild.mockRejectedValue(err);
    mockIsNotFoundError.mockReturnValue(false);
    mockIsMissingAccessError.mockReturnValue(false);
    mockGetErrorCode.mockReturnValue(500);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockDeleteDiscordServer).not.toHaveBeenCalled();
    expect(body.errors).toBe(1);
    expect(body.removed).toBe(0);
  });

  it("does not delete the row on a 429 rate-limit error", async () => {
    const server = makeServer({ id: 4, guild_id: "g-429" });
    mockListDiscordServers.mockResolvedValue([server]);
    const err = new Error("Rate Limited");
    mockGetGuild.mockRejectedValue(err);
    mockIsNotFoundError.mockReturnValue(false);
    mockIsMissingAccessError.mockReturnValue(false);
    mockGetErrorCode.mockReturnValue(429);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(mockDeleteDiscordServer).not.toHaveBeenCalled();
    expect(body.errors).toBe(1);
  });

  it("includes error details for transient failures", async () => {
    const server = makeServer({ id: 6, guild_id: "g-err" });
    mockListDiscordServers.mockResolvedValue([server]);
    mockGetGuild.mockRejectedValue(new Error("Timeout"));
    mockIsNotFoundError.mockReturnValue(false);
    mockIsMissingAccessError.mockReturnValue(false);
    mockGetErrorCode.mockReturnValue(503);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.errorDetails).toEqual([{ guildId: "g-err", code: 503 }]);
  });

  it("accumulates multiple transient errors across servers", async () => {
    const servers = [
      makeServer({ id: 1, guild_id: "g-1" }),
      makeServer({ id: 2, guild_id: "g-2" }),
    ];
    mockListDiscordServers.mockResolvedValue(servers);
    mockGetGuild.mockRejectedValue(new Error("Network error"));
    mockIsNotFoundError.mockReturnValue(false);
    mockIsMissingAccessError.mockReturnValue(false);
    mockGetErrorCode.mockReturnValue("unknown");

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.errors).toBe(2);
    expect((body.errorDetails as unknown[]).length).toBe(2);
    expect(mockDeleteDiscordServer).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Mixed scenarios
// =============================================================================

describe("Mixed scenarios", () => {
  it("handles a mix of accessible, removed, and errored servers in one sweep", async () => {
    const servers = [
      makeServer({ id: 1, guild_id: "g-ok" }),
      makeServer({ id: 2, guild_id: "g-404" }),
      makeServer({ id: 3, guild_id: "g-err" }),
    ];
    mockListDiscordServers.mockResolvedValue(servers);

    const notFoundErr = new Error("Unknown Guild");
    const transientErr = new Error("5xx");

    mockGetGuild
      .mockResolvedValueOnce({ id: "g-ok", name: "Still Here" }) // server 1 — ok
      .mockRejectedValueOnce(notFoundErr) // server 2 — removed
      .mockRejectedValueOnce(transientErr); // server 3 — transient

    mockIsNotFoundError
      .mockReturnValueOnce(true) // for server 2
      .mockReturnValueOnce(false); // for server 3
    mockIsMissingAccessError.mockReturnValue(false);
    mockGetErrorCode.mockReturnValue(503);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.scanned).toBe(3);
    expect(body.removed).toBe(1);
    expect(body.errors).toBe(1);
    expect(mockDeleteDiscordServer).toHaveBeenCalledWith(FAKE_CLIENT, 2);
    expect(mockDeleteDiscordServer).not.toHaveBeenCalledWith(FAKE_CLIENT, 1);
    expect(mockDeleteDiscordServer).not.toHaveBeenCalledWith(FAKE_CLIENT, 3);
  });

  it("returns correct counts when no servers are installed", async () => {
    mockListDiscordServers.mockResolvedValue([]);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as Record<string, unknown>;

    expect(body.scanned).toBe(0);
    expect(body.removed).toBe(0);
    expect(body.errors).toBe(0);
    expect(body.errorDetails).toEqual([]);
    expect(mockGetGuild).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Response shape
// =============================================================================

describe("Response shape", () => {
  it("returns JSON with scanned, removed, errors, errorDetails fields", async () => {
    mockListDiscordServers.mockResolvedValue([makeServer({ id: 1 })]);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    const body = (await response.json()) as Record<string, unknown>;
    expect(typeof body.scanned).toBe("number");
    expect(typeof body.removed).toBe("number");
    expect(typeof body.errors).toBe("number");
    expect(Array.isArray(body.errorDetails)).toBe(true);
  });
});
