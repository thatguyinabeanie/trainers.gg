/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// =============================================================================
// Infrastructure mocks (must be before any imports)
// =============================================================================

// Mock bot detection
jest.mock("botid/server", () => ({
  checkBotId: jest.fn().mockResolvedValue({ isBot: false }),
}));

// Mock next/headers — rejectBots() reads the bypass header
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({
    get: jest.fn(() => null),
  })),
}));

// Mock Supabase client
const mockRpc = jest.fn();
const mockSupabase = {
  auth: { getUser: jest.fn() },
  from: jest.fn(),
  rpc: mockRpc,
};
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabase),
}));

// Mock next/cache
const mockUpdateTag = jest.fn();
const mockRevalidatePath = jest.fn();
jest.mock("next/cache", () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

// Mock getErrorMessage from @trainers/utils
jest.mock("@trainers/utils", () => ({
  getErrorMessage: jest.fn((_err: unknown, fallback: string) => fallback),
}));

// Mock cache-invalidation helper
const mockInvalidateCommunityPageCaches = jest.fn();
jest.mock("@/lib/cache-invalidation", () => ({
  invalidateCommunityPageCaches: (...args: unknown[]) =>
    mockInvalidateCommunityPageCaches(...args),
}));

// Mock install-state signing. Preserve verifyInstallState shape to match the
// global mock from test-setup — the override must provide the full module
// surface so transitive imports don't see `undefined` for verifyInstallState.
const mockSignInstallState = jest.fn();
const mockVerifyInstallState = jest
  .fn()
  .mockResolvedValue({ community_id: 1, user_id: "mock-user" });
jest.mock("@/lib/discord/install-state", () => ({
  signInstallState: (...args: unknown[]) => mockSignInstallState(...args),
  verifyInstallState: (...args: unknown[]) => mockVerifyInstallState(...args),
}));

// Mock @trainers/supabase
const mockGetDiscordServerByCommunityId = jest.fn();
const mockGetDiscordServerById = jest.fn();
const mockGetRoleMappingById = jest.fn();
const mockUpsertChannelMapping = jest.fn();
const mockDeleteChannelMapping = jest.fn();
const mockUpsertDmSetting = jest.fn();
const mockUpsertRoleMapping = jest.fn();
const mockToggleRoleMapping = jest.fn();
const mockSetDmPreference = jest.fn();
const mockDeleteDiscordServer = jest.fn();
const mockGetDeliveryFailure = jest.fn();
const mockListRecentFailures = jest.fn();
const mockStart = jest.fn();

jest.mock("workflow/api", () => ({
  start: (...args: unknown[]) => mockStart(...args),
  getRun: jest.fn(),
  resumeHook: jest.fn(),
}));

jest.mock("@trainers/supabase", () => ({
  ALL_DM_EVENT_TYPES: [
    "match_ready",
    "match_starting_soon",
    "match_result_to_confirm",
    "match_disputed",
    "team_sheet_needed",
    "team_sheet_approved",
    "team_sheet_rejected",
    "you_dropped",
    "top_cut_made",
    "tournament_starting",
    "tournament_cancelled",
  ],
  ALL_CHANNEL_EVENT_TYPES: [
    "tournament_created",
    "registration_opens",
    "tournament_ended",
    "match_result_reported",
  ],
  getDiscordServerByCommunityId: (...args: unknown[]) =>
    mockGetDiscordServerByCommunityId(...args),
  getDiscordServerById: (...args: unknown[]) =>
    mockGetDiscordServerById(...args),
  getRoleMappingById: (...args: unknown[]) => mockGetRoleMappingById(...args),
  upsertChannelMapping: (...args: unknown[]) =>
    mockUpsertChannelMapping(...args),
  deleteChannelMapping: (...args: unknown[]) =>
    mockDeleteChannelMapping(...args),
  upsertDmSetting: (...args: unknown[]) => mockUpsertDmSetting(...args),
  upsertRoleMapping: (...args: unknown[]) => mockUpsertRoleMapping(...args),
  toggleRoleMapping: (...args: unknown[]) => mockToggleRoleMapping(...args),
  setDmPreference: (...args: unknown[]) => mockSetDmPreference(...args),
  deleteDiscordServer: (...args: unknown[]) => mockDeleteDiscordServer(...args),
  getDeliveryFailure: (...args: unknown[]) => mockGetDeliveryFailure(...args),
  listRecentFailures: (...args: unknown[]) => mockListRecentFailures(...args),
}));

// Import actions under test — must come AFTER all jest.mock() calls
import {
  upsertChannelMappingAction,
  deleteChannelMappingAction,
  upsertDmSettingAction,
  toggleRoleMappingAction,
  upsertRoleMappingAction,
  setDmPreferenceAction,
  setShowDiscordPubliclyAction,
  refreshDiscordGuildCacheAction,
  disconnectDiscordServerAction,
  retryNotificationAction,
  listRecentFailuresAction,
  getDiscordInstallUrlAction,
} from "../discord-integration";

// =============================================================================
// Helpers
// =============================================================================

/** Simulate a permission RPC returning the given value. */
function mockPermission(allowed: boolean): void {
  mockRpc.mockResolvedValue({ data: allowed, error: null });
}

/** A fake discord_servers row for happy-path tests. */
const fakeServer = {
  id: 99,
  guild_id: "discord-guild-id",
  community_id: 1,
  installed_by: "user-uuid",
  settings: {},
  created_at: "2026-01-01T00:00:00Z",
};

// =============================================================================
// upsertChannelMappingAction
// =============================================================================

describe("upsertChannelMappingAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns FORBIDDEN when the caller lacks community.manage permission", async () => {
    mockPermission(false);

    const result = await upsertChannelMappingAction({
      communityId: 1,
      eventType: "tournament_created",
      channelId: "123456",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("calls upsertChannelMapping and revalidates the page on success", async () => {
    mockPermission(true);
    mockGetDiscordServerByCommunityId.mockResolvedValue(fakeServer);
    mockUpsertChannelMapping.mockResolvedValue(undefined);

    const result = await upsertChannelMappingAction({
      communityId: 1,
      eventType: "tournament_created",
      channelId: "123456",
    });

    expect(result).toEqual({ success: true, data: { id: 99 } });
    expect(mockUpsertChannelMapping).toHaveBeenCalledWith(mockSupabase, {
      discord_server_id: 99,
      event_type: "tournament_created",
      channel_id: "123456",
    });
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it("returns validation failure for an invalid eventType", async () => {
    const result = await upsertChannelMappingAction({
      communityId: 1,
      eventType: "not_a_real_event" as never,
      channelId: "123456",
    });

    expect(result.success).toBe(false);
  });

  it("returns an error when the Discord server is not installed", async () => {
    mockPermission(true);
    mockGetDiscordServerByCommunityId.mockResolvedValue(null);

    const result = await upsertChannelMappingAction({
      communityId: 1,
      eventType: "registration_opens",
      channelId: "999",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not installed/i);
    }
  });
});

// =============================================================================
// deleteChannelMappingAction
// =============================================================================

describe("deleteChannelMappingAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns FORBIDDEN when caller lacks permission", async () => {
    // from() returns a row with community_id
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 1,
          discord_server_id: 99,
          discord_servers: { community_id: 1 },
        },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);
    mockPermission(false);

    const result = await deleteChannelMappingAction(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("calls deleteChannelMapping and revalidates on success", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 5,
          discord_server_id: 99,
          discord_servers: { community_id: 1 },
        },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);
    mockPermission(true);
    mockDeleteChannelMapping.mockResolvedValue(undefined);

    const result = await deleteChannelMappingAction(5);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockDeleteChannelMapping).toHaveBeenCalledWith(mockSupabase, 5);
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it("returns error when mapping not found", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const result = await deleteChannelMappingAction(999);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not found/i);
    }
  });
});

// =============================================================================
// upsertDmSettingAction
// =============================================================================

describe("upsertDmSettingAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns FORBIDDEN when caller lacks permission", async () => {
    mockPermission(false);

    const result = await upsertDmSettingAction({
      communityId: 1,
      eventType: "match_ready",
      deliveryMode: "dm_only",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("saves delivery_mode and calls upsertDmSetting on success", async () => {
    mockPermission(true);
    mockGetDiscordServerByCommunityId.mockResolvedValue(fakeServer);
    mockUpsertDmSetting.mockResolvedValue(undefined);

    const result = await upsertDmSettingAction({
      communityId: 1,
      eventType: "match_ready",
      deliveryMode: "dm_only",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpsertDmSetting).toHaveBeenCalledWith(mockSupabase, {
      discord_server_id: 99,
      event_type: "match_ready",
      delivery_mode: "dm_only",
      fallback_channel_id: null,
    });
  });

  it("rejects dm_with_fallback mode when fallbackChannelId is missing", async () => {
    const result = await upsertDmSettingAction({
      communityId: 1,
      eventType: "match_ready",
      deliveryMode: "dm_with_fallback",
      // fallbackChannelId intentionally omitted
    });

    expect(result.success).toBe(false);
  });

  it("rejects dm_only mode when fallbackChannelId is provided", async () => {
    const result = await upsertDmSettingAction({
      communityId: 1,
      eventType: "match_ready",
      deliveryMode: "dm_only",
      fallbackChannelId: "channel-456",
    });

    expect(result.success).toBe(false);
  });

  it("saves dm_with_fallback with the provided fallback channel", async () => {
    mockPermission(true);
    mockGetDiscordServerByCommunityId.mockResolvedValue(fakeServer);
    mockUpsertDmSetting.mockResolvedValue(undefined);

    const result = await upsertDmSettingAction({
      communityId: 1,
      eventType: "match_ready",
      deliveryMode: "dm_with_fallback",
      fallbackChannelId: "channel-456",
    });

    expect(result.success).toBe(true);
    expect(mockUpsertDmSetting).toHaveBeenCalledWith(mockSupabase, {
      discord_server_id: 99,
      event_type: "match_ready",
      delivery_mode: "dm_with_fallback",
      fallback_channel_id: "channel-456",
    });
  });
});

// =============================================================================
// toggleRoleMappingAction
// =============================================================================

describe("toggleRoleMappingAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns FORBIDDEN when caller lacks permission", async () => {
    mockGetRoleMappingById.mockResolvedValue({
      id: 7,
      discord_server_id: 99,
      community_id: 1,
    });
    mockPermission(false);

    const result = await toggleRoleMappingAction(7, true);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("calls toggleRoleMapping with the correct arguments on success", async () => {
    mockGetRoleMappingById.mockResolvedValue({
      id: 7,
      discord_server_id: 99,
      community_id: 1,
    });
    mockPermission(true);
    mockToggleRoleMapping.mockResolvedValue(undefined);

    const result = await toggleRoleMappingAction(7, false);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockToggleRoleMapping).toHaveBeenCalledWith(mockSupabase, 7, false);
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it("returns error when mapping is not found", async () => {
    mockGetRoleMappingById.mockResolvedValue(null);

    const result = await toggleRoleMappingAction(999, true);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not found/i);
    }
  });
});

// =============================================================================
// upsertRoleMappingAction
// =============================================================================

describe("upsertRoleMappingAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns FORBIDDEN when caller lacks permission", async () => {
    mockPermission(false);

    const result = await upsertRoleMappingAction({
      communityId: 1,
      roleType: "member",
      discordRoleId: "role-123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("calls upsertRoleMapping with the correct payload on success", async () => {
    mockPermission(true);
    mockGetDiscordServerByCommunityId.mockResolvedValue(fakeServer);
    mockUpsertRoleMapping.mockResolvedValue(undefined);

    const result = await upsertRoleMappingAction({
      communityId: 1,
      roleType: "participant",
      discordRoleId: "role-789",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpsertRoleMapping).toHaveBeenCalledWith(mockSupabase, {
      discord_server_id: 99,
      role_type: "participant",
      discord_role_id: "role-789",
      enabled: true,
    });
  });

  it("returns validation failure for an invalid roleType", async () => {
    const result = await upsertRoleMappingAction({
      communityId: 1,
      roleType: "superstar" as never,
      discordRoleId: "role-123",
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// setDmPreferenceAction
// =============================================================================

describe("setDmPreferenceAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an error when the user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await setDmPreferenceAction({
      eventType: "match_ready",
      enabled: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not authenticated/i);
    }
  });

  it("calls setDmPreference with the current user ID on success", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-abc" } },
    });
    mockSetDmPreference.mockResolvedValue(undefined);

    const result = await setDmPreferenceAction({
      eventType: "match_ready",
      enabled: true,
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockSetDmPreference).toHaveBeenCalledWith(
      mockSupabase,
      "user-abc",
      "match_ready",
      true
    );
  });

  it("returns validation failure for an invalid eventType", async () => {
    const result = await setDmPreferenceAction({
      eventType: "invalid_event" as never,
      enabled: false,
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// setShowDiscordPubliclyAction
// =============================================================================

describe("setShowDiscordPubliclyAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an error when the user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await setShowDiscordPubliclyAction(true);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not authenticated/i);
    }
  });

  it("updates show_discord_publicly and invalidates the player cache", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-xyz" } },
    });

    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { username: "ash_ketchum" },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const result = await setShowDiscordPubliclyAction(true);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdateTag).toHaveBeenCalledWith("player:ash_ketchum");
  });

  it("succeeds without invalidating cache when username is null", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-xyz" } },
    });

    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { username: null },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const result = await setShowDiscordPubliclyAction(false);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });
});

// =============================================================================
// refreshDiscordGuildCacheAction
// =============================================================================

describe("refreshDiscordGuildCacheAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns FORBIDDEN when caller lacks permission", async () => {
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(false);

    const result = await refreshDiscordGuildCacheAction(99);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("calls updateTag with the server-scoped guild cache tag on success", async () => {
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(true);

    const result = await refreshDiscordGuildCacheAction(99);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdateTag).toHaveBeenCalledWith("discord-guild:99");
  });

  it("returns error when Discord server is not found", async () => {
    mockGetDiscordServerById.mockResolvedValue(null);

    const result = await refreshDiscordGuildCacheAction(999);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not found/i);
    }
  });
});

// =============================================================================
// disconnectDiscordServerAction
// =============================================================================

describe("disconnectDiscordServerAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns FORBIDDEN when caller lacks permission", async () => {
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    // from() for community lookup
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { slug: "team-rocket" },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);
    mockPermission(false);

    const result = await disconnectDiscordServerAction(99);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("deletes the server, invalidates community caches, and busts the guild cache", async () => {
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { slug: "team-rocket" },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);
    mockPermission(true);
    mockDeleteDiscordServer.mockResolvedValue(undefined);

    const result = await disconnectDiscordServerAction(99);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockDeleteDiscordServer).toHaveBeenCalledWith(mockSupabase, 99);
    expect(mockInvalidateCommunityPageCaches).toHaveBeenCalledWith(
      "team-rocket",
      1
    );
    expect(mockUpdateTag).toHaveBeenCalledWith("discord-guild:99");
  });
});

// =============================================================================
// retryNotificationAction
// =============================================================================

describe("retryNotificationAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "mock-run-id" });
  });

  const fakeChannelFailure = {
    id: 10,
    discord_server_id: 99,
    type: "channel",
    event_type: "tournament_created",
    target: "chan-discord-id",
    error_code: "50013",
    error_reason: "Missing permissions",
    payload: { embeds: [] },
    delivered_via_fallback: false,
    created_at: "2026-01-01T00:00:00Z",
  };

  const fakeDmFailure = {
    id: 20,
    discord_server_id: 99,
    type: "dm",
    event_type: "match_ready",
    target: "discord-user-123",
    error_code: "50007",
    error_reason: "dm_closed",
    payload: { content: "Your match is ready" },
    delivered_via_fallback: false,
    created_at: "2026-01-01T00:00:00Z",
  };

  it("returns FORBIDDEN when caller lacks permission", async () => {
    mockGetDeliveryFailure.mockResolvedValue(fakeChannelFailure);
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(false);

    const result = await retryNotificationAction(10);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("dispatches sendChannelNotificationWorkflow for channel failures", async () => {
    mockGetDeliveryFailure.mockResolvedValue(fakeChannelFailure);
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(true);

    const result = await retryNotificationAction(10);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it("dispatches sendDmWorkflow for DM failures", async () => {
    mockGetDeliveryFailure.mockResolvedValue(fakeDmFailure);
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(true);

    const result = await retryNotificationAction(20);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it("returns error when failure record is not found", async () => {
    mockGetDeliveryFailure.mockResolvedValue(null);

    const result = await retryNotificationAction(999);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not found/i);
    }
  });

  it("returns error when Discord server is not found", async () => {
    mockGetDeliveryFailure.mockResolvedValue(fakeChannelFailure);
    mockGetDiscordServerById.mockResolvedValue(null);

    const result = await retryNotificationAction(10);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not found/i);
    }
  });
});

// =============================================================================
// listRecentFailuresAction
// =============================================================================

describe("listRecentFailuresAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns FORBIDDEN when caller lacks community.manage permission", async () => {
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(false);

    const result = await listRecentFailuresAction(99);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("returns error when Discord server is not found", async () => {
    mockGetDiscordServerById.mockResolvedValue(null);

    const result = await listRecentFailuresAction(999);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not found/i);
    }
  });

  it("returns structured failure data on success", async () => {
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(true);
    mockListRecentFailures.mockResolvedValue({
      channels: [{ id: 1, event_type: "tournament_created" }],
      dms: [{ id: 2, event_type: "match_ready" }],
      roleSyncs: [],
    });

    const result = await listRecentFailuresAction(99);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channelFailures).toHaveLength(1);
      expect(result.data.dmFailures).toHaveLength(1);
      expect(result.data.roleSyncFailures).toHaveLength(0);
    }
  });

  it("returns empty arrays when no failures exist", async () => {
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(true);
    mockListRecentFailures.mockResolvedValue({
      channels: [],
      dms: [],
      roleSyncs: [],
    });

    const result = await listRecentFailuresAction(99);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channelFailures).toEqual([]);
      expect(result.data.dmFailures).toEqual([]);
      expect(result.data.roleSyncFailures).toEqual([]);
    }
  });

  it("returns an error when listRecentFailures throws", async () => {
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(true);
    mockListRecentFailures.mockRejectedValue(new Error("DB error"));

    const result = await listRecentFailuresAction(99);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to load failure details");
    }
  });
});

// =============================================================================
// getDiscordInstallUrlAction
// =============================================================================

describe("getDiscordInstallUrlAction", () => {
  const originalAppId = process.env.DISCORD_APPLICATION_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DISCORD_APPLICATION_ID = "test-app-id-123";
    mockSignInstallState.mockResolvedValue("signed-state-token");
  });

  afterEach(() => {
    process.env.DISCORD_APPLICATION_ID = originalAppId;
  });

  it("returns an error when the user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await getDiscordInstallUrlAction(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Not authenticated");
    }
  });

  it("returns an error when DISCORD_APPLICATION_ID is not set", async () => {
    delete process.env.DISCORD_APPLICATION_ID;
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-abc" } },
    });

    const result = await getDiscordInstallUrlAction(1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Discord application is not configured");
    }
  });

  it("returns a signed Discord OAuth2 URL with required parameters", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-abc" } },
    });

    const result = await getDiscordInstallUrlAction(42);

    expect(result.success).toBe(true);
    if (result.success) {
      const { url } = result.data;
      expect(url).toContain("discord.com/api/oauth2/authorize");
      expect(url).toContain("client_id=test-app-id-123");
      expect(url).toContain("redirect_uri=");
      expect(url).toContain("install-callback");
      // scope "bot applications.commands" is URL-encoded in the query string
      expect(url).toContain("scope=");
      expect(url).toContain("bot");
      expect(url).toContain("state=signed-state-token");
    }
  });

  it("signs the state token with the correct communityId and userId", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-xyz" } },
    });

    await getDiscordInstallUrlAction(7);

    expect(mockSignInstallState).toHaveBeenCalledWith({
      community_id: 7,
      user_id: "user-xyz",
    });
  });
});

// =============================================================================
// retryNotificationAction — role_sync branch and unknown type
// =============================================================================

describe("retryNotificationAction — role_sync and unknown type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStart.mockResolvedValue({ runId: "mock-run-id" });
  });

  const fakeRoleSyncFailure = {
    id: 30,
    discord_server_id: 99,
    type: "role_sync",
    event_type: "member_joined",
    target: "discord-user-456",
    error_code: "50013",
    error_reason: "Missing permissions",
    payload: { role_id: "discord-role-abc" },
    delivered_via_fallback: false,
    created_at: "2026-01-01T00:00:00Z",
  };

  it("dispatches syncRoleWorkflow with the role_id from the payload", async () => {
    mockGetDeliveryFailure.mockResolvedValue(fakeRoleSyncFailure);
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(true);

    const result = await retryNotificationAction(30);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockStart).toHaveBeenCalledTimes(1);
    // Verify syncRoleWorkflow was called with the role_id from the payload
    const [, args] = mockStart.mock.calls[0] as [unknown, unknown[]];
    expect(args).toContain("discord-role-abc");
    expect(args).toContain(fakeServer.guild_id);
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it("returns an error for an unknown failure type", async () => {
    const unknownTypeFailure = {
      ...fakeRoleSyncFailure,
      id: 40,
      type: "webhook" as string,
    };
    mockGetDeliveryFailure.mockResolvedValue(unknownTypeFailure);
    mockGetDiscordServerById.mockResolvedValue(fakeServer);
    mockPermission(true);

    const result = await retryNotificationAction(40);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/unknown failure type/i);
    }
  });
});

// =============================================================================
// upsertDmSettingAction — channel_only delivery mode
// =============================================================================

describe("upsertDmSettingAction — channel_only mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves channel_only mode with a required fallbackChannelId", async () => {
    mockPermission(true);
    mockGetDiscordServerByCommunityId.mockResolvedValue(fakeServer);
    mockUpsertDmSetting.mockResolvedValue(undefined);

    const result = await upsertDmSettingAction({
      communityId: 1,
      eventType: "match_ready",
      deliveryMode: "channel_only",
      fallbackChannelId: "channel-789",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpsertDmSetting).toHaveBeenCalledWith(mockSupabase, {
      discord_server_id: 99,
      event_type: "match_ready",
      delivery_mode: "channel_only",
      fallback_channel_id: "channel-789",
    });
  });

  it("rejects channel_only mode when fallbackChannelId is missing", async () => {
    const result = await upsertDmSettingAction({
      communityId: 1,
      eventType: "match_ready",
      deliveryMode: "channel_only",
      // fallbackChannelId intentionally omitted
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// deleteChannelMappingAction — array branch for discord_servers
// =============================================================================

describe("deleteChannelMappingAction — discord_servers returned as array", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("picks the first element when discord_servers is an array and deletes the mapping", async () => {
    // Simulate Supabase returning discord_servers as an array
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 5,
          discord_server_id: 99,
          discord_servers: [{ community_id: 1 }, { community_id: 2 }],
        },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);
    mockPermission(true);
    mockDeleteChannelMapping.mockResolvedValue(undefined);

    const result = await deleteChannelMappingAction(5);

    expect(result).toEqual({ success: true, data: undefined });
    // community_id 1 (first element) was used for the permission check
    expect(mockRpc).toHaveBeenCalledWith("has_community_permission", {
      p_community_id: 1,
      permission_key: "community.manage",
    });
    expect(mockDeleteChannelMapping).toHaveBeenCalledWith(mockSupabase, 5);
  });
});

// =============================================================================
// upsertChannelMappingAction — throw path after permission passes
// =============================================================================

describe("upsertChannelMappingAction — upsertChannelMapping throws", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a user-facing error when upsertChannelMapping throws", async () => {
    mockPermission(true);
    mockGetDiscordServerByCommunityId.mockResolvedValue(fakeServer);
    mockUpsertChannelMapping.mockRejectedValue(new Error("DB write failed"));

    const result = await upsertChannelMappingAction({
      communityId: 1,
      eventType: "tournament_created",
      channelId: "123456",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // getErrorMessage returns the fallback string in tests (mocked above)
      expect(result.error).toBe("Failed to save channel mapping");
    }
  });
});
