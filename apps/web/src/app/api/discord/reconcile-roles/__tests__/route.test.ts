/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockListAllEnabledRoleMappingsWithServer = jest.fn();
const mockGetDiscordIdsByUserIds = jest.fn();
const mockGetCommunityStaffUserIds = jest.fn();
const mockGetCommunityParticipantUserIds = jest.fn();
const mockGetCommunityWinnerUserIds = jest.fn();
const mockGetCommunityCurrentlyPlayingUserIds = jest.fn();
const mockGetCommunityMemberUserIds = jest.fn();
const mockEnqueueRoleSync = jest.fn();

jest.mock("@trainers/supabase", () => ({
  listAllEnabledRoleMappingsWithServer: (...args: unknown[]) =>
    mockListAllEnabledRoleMappingsWithServer(...args),
  getDiscordIdsByUserIds: (...args: unknown[]) =>
    mockGetDiscordIdsByUserIds(...args),
  getCommunityStaffUserIds: (...args: unknown[]) =>
    mockGetCommunityStaffUserIds(...args),
  getCommunityParticipantUserIds: (...args: unknown[]) =>
    mockGetCommunityParticipantUserIds(...args),
  getCommunityWinnerUserIds: (...args: unknown[]) =>
    mockGetCommunityWinnerUserIds(...args),
  getCommunityCurrentlyPlayingUserIds: (...args: unknown[]) =>
    mockGetCommunityCurrentlyPlayingUserIds(...args),
  getCommunityMemberUserIds: (...args: unknown[]) =>
    mockGetCommunityMemberUserIds(...args),
  enqueueRoleSync: (...args: unknown[]) => mockEnqueueRoleSync(...args),
}));

const mockCreateServiceRoleClient = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

const mockGetGuildMembersWithRole = jest.fn();
const mockGetErrorCode = jest.fn();

jest.mock("@/lib/discord/api", () => ({
  getGuildMembersWithRole: (...args: unknown[]) =>
    mockGetGuildMembersWithRole(...args),
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
  return new Request("http://localhost:3000/api/discord/reconcile-roles", {
    headers: authHeader !== undefined ? { authorization: authHeader } : {},
  });
}

type RoleType =
  | "staff"
  | "participant"
  | "winner"
  | "currently_playing"
  | "member";

function makeMapping(
  overrides: Partial<{
    id: number;
    discord_server_id: number;
    discord_role_id: string;
    role_type: RoleType;
    guild_id: string;
    community_id: number;
  }> = {}
) {
  return {
    id: overrides.id ?? 1,
    discord_server_id: overrides.discord_server_id ?? 10,
    discord_role_id: overrides.discord_role_id ?? "role-555",
    role_type: (overrides.role_type ?? "staff") as RoleType,
    guild_id: overrides.guild_id ?? "guild-999",
    community_id: overrides.community_id ?? 42,
  };
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
  mockListAllEnabledRoleMappingsWithServer.mockResolvedValue([]);
  mockGetGuildMembersWithRole.mockResolvedValue(new Set());
  mockGetDiscordIdsByUserIds.mockResolvedValue([]);
  mockGetCommunityStaffUserIds.mockResolvedValue([]);
  mockGetCommunityParticipantUserIds.mockResolvedValue([]);
  mockGetCommunityWinnerUserIds.mockResolvedValue([]);
  mockGetCommunityCurrentlyPlayingUserIds.mockResolvedValue([]);
  mockGetCommunityMemberUserIds.mockResolvedValue([]);
  mockEnqueueRoleSync.mockResolvedValue({ id: 1, created: true });
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
    const response = await GET(makeRequest("Bearer wrong-token"));
    expect(response.status).toBe(401);
  });

  it("proceeds when authorization matches Bearer CRON_SECRET", async () => {
    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    expect(response.status).toBe(200);
  });
});

// =============================================================================
// Diff logic — add and remove
// =============================================================================

describe("Diff logic — staff role", () => {
  it("enqueues add(A) and remove(C) for trainers={A,B} discord={B,C}", async () => {
    const mapping = makeMapping({ role_type: "staff" });
    mockListAllEnabledRoleMappingsWithServer.mockResolvedValue([mapping]);

    // trainers.gg side: users A and B have the staff role
    mockGetCommunityStaffUserIds.mockResolvedValue(["user-A", "user-B"]);
    mockGetDiscordIdsByUserIds.mockResolvedValue(["discord-A", "discord-B"]);

    // Discord side: B and C currently hold the role
    mockGetGuildMembersWithRole.mockResolvedValue(
      new Set(["discord-B", "discord-C"])
    );

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    // discord-A is missing from Discord → enqueue add
    expect(mockEnqueueRoleSync).toHaveBeenCalledWith(
      FAKE_CLIENT,
      expect.objectContaining({ discord_user_id: "discord-A", action: "add" })
    );

    // discord-C is not in trainers side → enqueue remove
    expect(mockEnqueueRoleSync).toHaveBeenCalledWith(
      FAKE_CLIENT,
      expect.objectContaining({
        discord_user_id: "discord-C",
        action: "remove",
      })
    );

    // discord-B is in both sets → no action
    const calls = mockEnqueueRoleSync.mock.calls as Array<
      [unknown, { discord_user_id: string }]
    >;
    const involvedUsers = calls.map((c) => c[1].discord_user_id);
    expect(involvedUsers).not.toContain("discord-B");
  });

  it("passes source_event=reconcile and correct role/server IDs to enqueueRoleSync", async () => {
    const mapping = makeMapping({
      discord_server_id: 99,
      discord_role_id: "role-XYZ",
      role_type: "staff",
    });
    mockListAllEnabledRoleMappingsWithServer.mockResolvedValue([mapping]);
    mockGetCommunityStaffUserIds.mockResolvedValue(["u1"]);
    mockGetDiscordIdsByUserIds.mockResolvedValue(["d1"]);
    mockGetGuildMembersWithRole.mockResolvedValue(new Set());

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockEnqueueRoleSync).toHaveBeenCalledWith(FAKE_CLIENT, {
      discord_server_id: 99,
      discord_user_id: "d1",
      discord_role_id: "role-XYZ",
      action: "add",
      source_event: "reconcile",
    });
  });
});

// =============================================================================
// Winner role — removes suppressed
// =============================================================================

describe("Winner role — honorific, removes suppressed", () => {
  it("enqueues add(A) but NOT remove(C) for winner role", async () => {
    const mapping = makeMapping({ role_type: "winner" });
    mockListAllEnabledRoleMappingsWithServer.mockResolvedValue([mapping]);

    mockGetCommunityWinnerUserIds.mockResolvedValue(["user-A", "user-B"]);
    mockGetDiscordIdsByUserIds.mockResolvedValue(["discord-A", "discord-B"]);
    mockGetGuildMembersWithRole.mockResolvedValue(
      new Set(["discord-B", "discord-C"])
    );

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    // add discord-A — they should have the winner role but don't
    expect(mockEnqueueRoleSync).toHaveBeenCalledWith(
      FAKE_CLIENT,
      expect.objectContaining({ discord_user_id: "discord-A", action: "add" })
    );

    // discord-C should NOT be removed — winner roles are honorific
    const calls = mockEnqueueRoleSync.mock.calls as Array<
      [unknown, { discord_user_id: string; action: string }]
    >;
    const removeCalls = calls.filter(
      (c) => c[1].discord_user_id === "discord-C" && c[1].action === "remove"
    );
    expect(removeCalls).toHaveLength(0);
  });
});

// =============================================================================
// MAPPING_BATCH cap (20)
// =============================================================================

describe("Mapping batch cap", () => {
  it("calls listAllEnabledRoleMappingsWithServer with limit=20", async () => {
    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(mockListAllEnabledRoleMappingsWithServer).toHaveBeenCalledWith(
      FAKE_CLIENT,
      20
    );
  });

  it("only processes mappings returned by the query (respects 20-mapping cap)", async () => {
    // Return exactly 20 mappings (simulating DB already capping to 20)
    const mappings = Array.from({ length: 20 }, (_, i) =>
      makeMapping({ id: i + 1, role_type: "staff" })
    );
    mockListAllEnabledRoleMappingsWithServer.mockResolvedValue(mappings);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as { mappings: number };

    expect(body.mappings).toBe(20);
  });
});

// =============================================================================
// Error resilience — one mapping fails, loop continues
// =============================================================================

describe("Error resilience", () => {
  it("continues processing remaining mappings when one throws", async () => {
    const m1 = makeMapping({ id: 1, role_type: "staff" });
    const m2 = makeMapping({ id: 2, role_type: "participant" });
    mockListAllEnabledRoleMappingsWithServer.mockResolvedValue([m1, m2]);

    // m1 throws, m2 should still be processed
    mockGetCommunityStaffUserIds.mockRejectedValue(new Error("DB timeout"));
    mockGetCommunityParticipantUserIds.mockResolvedValue(["u1"]);
    mockGetDiscordIdsByUserIds.mockResolvedValue(["d1"]);
    mockGetGuildMembersWithRole.mockResolvedValue(new Set());
    mockGetErrorCode.mockReturnValue("unknown");

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as {
      errors: Array<{ mappingId: number }>;
      mappings: number;
    };

    // m1 errored — logged in errors
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]?.mappingId).toBe(1);

    // Total mappings processed is still 2 (both iterated)
    expect(body.mappings).toBe(2);
  });

  it("includes the error code in the errors array", async () => {
    const mapping = makeMapping({ id: 5 });
    mockListAllEnabledRoleMappingsWithServer.mockResolvedValue([mapping]);
    mockGetCommunityStaffUserIds.mockRejectedValue(new Error("Network error"));
    mockGetErrorCode.mockReturnValue(503);

    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
    const body = (await response.json()) as {
      errors: Array<{ mappingId: number; code: number | string }>;
    };

    expect(body.errors[0]?.code).toBe(503);
  });
});

// =============================================================================
// Role type → correct helper called
// =============================================================================

describe("Role type helper routing", () => {
  it.each([
    ["staff", "getCommunityStaffUserIds"] as const,
    ["participant", "getCommunityParticipantUserIds"] as const,
    ["winner", "getCommunityWinnerUserIds"] as const,
    ["currently_playing", "getCommunityCurrentlyPlayingUserIds"] as const,
    ["member", "getCommunityMemberUserIds"] as const,
  ])("calls %s helper for role_type='%s'", async (roleType, _helperName) => {
    const mapping = makeMapping({ role_type: roleType, community_id: 42 });
    mockListAllEnabledRoleMappingsWithServer.mockResolvedValue([mapping]);

    await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    const helperMocks: Record<RoleType, jest.Mock> = {
      staff: mockGetCommunityStaffUserIds,
      participant: mockGetCommunityParticipantUserIds,
      winner: mockGetCommunityWinnerUserIds,
      currently_playing: mockGetCommunityCurrentlyPlayingUserIds,
      member: mockGetCommunityMemberUserIds,
    };

    expect(helperMocks[roleType]).toHaveBeenCalledWith(FAKE_CLIENT, 42);

    // All other helpers should NOT have been called
    for (const [type, mock] of Object.entries(helperMocks)) {
      if (type !== roleType) {
        expect(mock).not.toHaveBeenCalled();
      }
    }
  });
});

// =============================================================================
// Response shape
// =============================================================================

describe("Response shape", () => {
  it("returns JSON with mappings, adds, removes, errors fields", async () => {
    const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));

    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    const body = (await response.json()) as Record<string, unknown>;
    expect(typeof body.mappings).toBe("number");
    expect(typeof body.adds).toBe("number");
    expect(typeof body.removes).toBe("number");
    expect(Array.isArray(body.errors)).toBe(true);
  });
});
