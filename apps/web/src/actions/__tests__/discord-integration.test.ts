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
const mockResetNotificationForRetry = jest.fn();
const mockResetDmForRetry = jest.fn();

jest.mock("@trainers/supabase", () => ({
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
  resetNotificationForRetry: (...args: unknown[]) =>
    mockResetNotificationForRetry(...args),
  resetDmForRetry: (...args: unknown[]) => mockResetDmForRetry(...args),
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
  retryDmNotificationAction,
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
  });

  /**
   * The action makes two from() calls:
   *   1. discord_notification_queue — fetch id + channel_id
   *   2. discord_channels — join to discord_servers for community_id
   */
  function mockNotifLookup(
    notifData: { id: number; channel_id: string } | null,
    channelData: {
      discord_server_id: number;
      discord_servers: { community_id: number };
    } | null
  ) {
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: notification lookup
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest
            .fn()
            .mockResolvedValue({ data: notifData, error: null }),
        };
      }
      // Second call: channel lookup
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: channelData, error: null }),
      };
    });
  }

  it("returns FORBIDDEN when caller lacks permission", async () => {
    mockNotifLookup(
      { id: 10, channel_id: "chan-1" },
      { discord_server_id: 99, discord_servers: { community_id: 1 } }
    );
    mockPermission(false);

    const result = await retryNotificationAction(10);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("resets the notification and revalidates the page on success", async () => {
    mockNotifLookup(
      { id: 10, channel_id: "chan-1" },
      { discord_server_id: 99, discord_servers: { community_id: 1 } }
    );
    mockPermission(true);
    mockResetNotificationForRetry.mockResolvedValue(undefined);

    const result = await retryNotificationAction(10);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockResetNotificationForRetry).toHaveBeenCalledWith(
      mockSupabase,
      10
    );
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it("returns error when notification is not found", async () => {
    // First from() returns null (notification not found)
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await retryNotificationAction(999);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not found/i);
    }
  });
});

// =============================================================================
// retryDmNotificationAction
// =============================================================================

describe("retryDmNotificationAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns FORBIDDEN when caller lacks permission", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 20, community_id: 1 },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);
    mockPermission(false);

    const result = await retryDmNotificationAction(20);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("resets the DM queue item and revalidates the page on success", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 20, community_id: 1 },
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue(mockChain);
    mockPermission(true);
    mockResetDmForRetry.mockResolvedValue(undefined);

    const result = await retryDmNotificationAction(20);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockResetDmForRetry).toHaveBeenCalledWith(mockSupabase, 20);
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it("returns error when DM queue item is not found", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(mockChain);

    const result = await retryDmNotificationAction(999);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not found/i);
    }
  });
});
