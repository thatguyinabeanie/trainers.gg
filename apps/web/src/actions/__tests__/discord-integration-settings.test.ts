/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// =============================================================================
// Infrastructure mocks (must be before any imports)
// =============================================================================

jest.mock("botid/server", () => ({
  checkBotId: jest.fn().mockResolvedValue({ isBot: false }),
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({
    get: jest.fn(() => null),
  })),
}));

const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockSupabase = {
  auth: { getUser: jest.fn() },
  from: mockFrom,
  rpc: mockRpc,
};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabase),
}));

const mockRevalidatePath = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock("@trainers/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

jest.mock("@/lib/cache-invalidation", () => ({
  invalidateCommunityPageCaches: jest.fn(),
}));

jest.mock("@/lib/discord/install-state", () => ({
  signInstallState: jest.fn(),
  verifyInstallState: jest
    .fn()
    .mockResolvedValue({ community_id: 1, user_id: "mock-user" }),
}));

const mockStart = jest.fn();
jest.mock("workflow/api", () => ({
  start: (...args: unknown[]) => mockStart(...args),
  getRun: jest.fn(),
  resumeHook: jest.fn(),
}));

const mockGetDiscordServerById = jest.fn();
const mockUpsertRoleMapping = jest.fn();
const mockToggleRoleMapping = jest.fn();

jest.mock("@trainers/supabase", () => ({
  ALL_DM_EVENT_TYPES: [],
  ALL_CHANNEL_EVENT_TYPES: [],
  getDiscordServerByCommunityId: jest.fn(),
  getDiscordServerById: (...args: unknown[]) =>
    mockGetDiscordServerById(...args),
  getRoleMappingById: jest.fn(),
  upsertChannelMapping: jest.fn(),
  deleteChannelMapping: jest.fn(),
  upsertDmSetting: jest.fn(),
  upsertRoleMapping: (...args: unknown[]) => mockUpsertRoleMapping(...args),
  toggleRoleMapping: (...args: unknown[]) => mockToggleRoleMapping(...args),
  setDmPreference: jest.fn(),
  deleteDiscordServer: jest.fn(),
  getDeliveryFailure: jest.fn(),
  listRecentFailures: jest.fn(),
}));

jest.mock("@/workflows/send-channel-notification", () => ({
  sendChannelNotificationWorkflow: "send-channel-notification-workflow",
}));
jest.mock("@/workflows/send-dm", () => ({
  sendDmWorkflow: "send-dm-workflow",
}));
jest.mock("@/workflows/sync-role", () => ({
  syncRoleWorkflow: "sync-role-workflow",
}));

// Import actions under test
import {
  updateServerSettingsAction,
  updateChannelPingRoleAction,
  updateVerifiedRoleAction,
  sendTestNotificationAction,
  getDeliveryStatsAction,
  getActivityFeedAction,
} from "../discord-integration";

// =============================================================================
// Helpers
// =============================================================================

function mockPermission(allowed: boolean): void {
  mockRpc.mockResolvedValue({ data: allowed, error: null });
}

const fakeServer = {
  id: 99,
  guild_id: "discord-guild-id",
  community_id: 1,
  installed_by: "user-uuid",
  settings: { embed_color: "#FF0000" },
  created_at: "2026-01-01T00:00:00Z",
};

/** Helper to mock a chained query builder (from().select().eq()...) */
function mockQueryChain(result: {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: undefined as unknown,
  };
  // Make the chain itself thenable so `await supabase.from(...).select(...)...` resolves
  Object.defineProperty(chain, "then", {
    value: (resolve: (v: unknown) => void) => resolve(result),
    configurable: true,
    writable: true,
  });
  return chain;
}

// =============================================================================
// updateServerSettingsAction
// =============================================================================

describe("updateServerSettingsAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns FORBIDDEN when caller lacks permission", async () => {
    mockPermission(false);
    const result = await updateServerSettingsAction({
      serverId: 99,
      communityId: 1,
      settings: { embed_color: "#00FF00" },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/forbidden|permission/i);
  });

  it("returns error when server not found", async () => {
    mockPermission(true);
    mockGetDiscordServerById.mockResolvedValue(null);
    const result = await updateServerSettingsAction({
      serverId: 99,
      communityId: 1,
      settings: { embed_color: "#00FF00" },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Discord server not found");
  });

  it("returns error when server does not belong to community", async () => {
    mockPermission(true);
    mockGetDiscordServerById.mockResolvedValue({
      ...fakeServer,
      community_id: 999,
    });
    const result = await updateServerSettingsAction({
      serverId: 99,
      communityId: 1,
      settings: { embed_color: "#00FF00" },
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toBe("Server does not belong to this community");
  });

  it("merges settings and returns success", async () => {
    mockPermission(true);
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    const chain = mockQueryChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await updateServerSettingsAction({
      serverId: 99,
      communityId: 1,
      settings: { embed_color: "#00FF00" },
    });
    expect(result.success).toBe(true);
    expect(chain.update).toHaveBeenCalledWith({
      settings: { embed_color: "#00FF00" },
    });
    expect(mockRevalidatePath).toHaveBeenCalled();
  });
});

// =============================================================================
// updateChannelPingRoleAction
// =============================================================================

describe("updateChannelPingRoleAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns FORBIDDEN when caller lacks permission", async () => {
    mockPermission(false);
    const result = await updateChannelPingRoleAction({
      mappingId: 1,
      pingRoleId: "role-123",
      communityId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("returns error when mapping not found", async () => {
    mockPermission(true);
    const chain = mockQueryChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await updateChannelPingRoleAction({
      mappingId: 1,
      pingRoleId: "role-123",
      communityId: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Channel mapping not found");
  });

  it("returns error when mapping belongs to different community", async () => {
    mockPermission(true);
    const chain = mockQueryChain({
      data: {
        id: 1,
        discord_server_id: 99,
        discord_servers: { community_id: 999 },
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    const result = await updateChannelPingRoleAction({
      mappingId: 1,
      pingRoleId: "role-123",
      communityId: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toBe("Mapping does not belong to this community");
  });

  it("updates ping role and returns success", async () => {
    mockPermission(true);
    // First call: select mapping, second call: update
    const selectChain = mockQueryChain({
      data: {
        id: 1,
        discord_server_id: 99,
        discord_servers: { community_id: 1 },
      },
      error: null,
    });
    const updateChain = mockQueryChain({ data: null, error: null });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const result = await updateChannelPingRoleAction({
      mappingId: 1,
      pingRoleId: "role-123",
      communityId: 1,
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// updateVerifiedRoleAction
// =============================================================================

describe("updateVerifiedRoleAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns FORBIDDEN when caller lacks permission", async () => {
    mockPermission(false);
    const result = await updateVerifiedRoleAction({
      serverId: 99,
      communityId: 1,
      enabled: true,
      roleId: "role-456",
    });
    expect(result.success).toBe(false);
  });

  it("upserts and enables role mapping when enabled with roleId", async () => {
    mockPermission(true);
    mockUpsertRoleMapping.mockResolvedValue(undefined);
    const chain = mockQueryChain({ data: { id: 5 }, error: null });
    mockFrom.mockReturnValue(chain);
    mockToggleRoleMapping.mockResolvedValue(undefined);

    const result = await updateVerifiedRoleAction({
      serverId: 99,
      communityId: 1,
      enabled: true,
      roleId: "role-456",
    });
    expect(result.success).toBe(true);
    expect(mockUpsertRoleMapping).toHaveBeenCalled();
    expect(mockToggleRoleMapping).toHaveBeenCalledWith(
      expect.anything(),
      5,
      true
    );
  });

  it("disables role mapping when not enabled", async () => {
    mockPermission(true);
    const chain = mockQueryChain({ data: { id: 5 }, error: null });
    mockFrom.mockReturnValue(chain);
    mockToggleRoleMapping.mockResolvedValue(undefined);

    const result = await updateVerifiedRoleAction({
      serverId: 99,
      communityId: 1,
      enabled: false,
      roleId: null,
    });
    expect(result.success).toBe(true);
    expect(mockToggleRoleMapping).toHaveBeenCalledWith(
      expect.anything(),
      5,
      false
    );
  });
});

// =============================================================================
// sendTestNotificationAction
// =============================================================================

describe("sendTestNotificationAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when server not found", async () => {
    mockPermission(true);
    mockGetDiscordServerById.mockResolvedValue(null);
    const result = await sendTestNotificationAction({
      serverId: 99,
      channelId: "ch-1",
      eventType: "tournament_created",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Discord server not found");
  });

  it("dispatches workflow and returns success", async () => {
    mockPermission(true);
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockStart.mockResolvedValue(undefined);

    const result = await sendTestNotificationAction({
      serverId: 99,
      channelId: "ch-1",
      eventType: "tournament_created",
    });
    expect(result.success).toBe(true);
    expect(mockStart).toHaveBeenCalledWith(
      "send-channel-notification-workflow",
      [
        "ch-1",
        "tournament_created",
        expect.objectContaining({ __test: true }),
        99,
      ]
    );
  });
});

// =============================================================================
// getDeliveryStatsAction
// =============================================================================

describe("getDeliveryStatsAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when server not found", async () => {
    mockGetDiscordServerById.mockResolvedValue(null);
    const result = await getDeliveryStatsAction(99);
    expect(result.success).toBe(false);
  });

  it("returns aggregated stats", async () => {
    mockPermission(true);
    mockGetDiscordServerById.mockResolvedValue(fakeServer);

    // The action runs 4 parallel head-count queries
    const channelChain = mockQueryChain({ data: null, error: null, count: 2 });
    const dmChain = mockQueryChain({ data: null, error: null, count: 1 });
    const roleChain = mockQueryChain({ data: null, error: null, count: 1 });
    const failuresChain = mockQueryChain({ data: null, error: null, count: 2 });
    mockFrom
      .mockReturnValueOnce(channelChain)
      .mockReturnValueOnce(dmChain)
      .mockReturnValueOnce(roleChain)
      .mockReturnValueOnce(failuresChain);

    const result = await getDeliveryStatsAction(99);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channelMessages).toBe(2);
      expect(result.data.dmsDelivered).toBe(1);
      expect(result.data.roleSyncs).toBe(1);
      expect(result.data.failures).toBe(2);
      expect(result.data.period).toBe("Last 24 hours");
    }
  });
});

// =============================================================================
// getActivityFeedAction
// =============================================================================

describe("getActivityFeedAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns error when server not found", async () => {
    mockGetDiscordServerById.mockResolvedValue(null);
    const result = await getActivityFeedAction(99);
    expect(result.success).toBe(false);
  });

  it("returns mapped activity items", async () => {
    mockPermission(true);
    mockGetDiscordServerById.mockResolvedValue(fakeServer);

    const logs = [
      {
        id: 1,
        type: "channel",
        event_type: "tournament_created",
        target: "general",
        metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const chain = mockQueryChain({ data: logs, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getActivityFeedAction(99);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 1,
        type: "channel",
        eventType: "tournament_created",
        target: "general",
      });
    }
  });
});


