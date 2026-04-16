import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getDiscordServerByGuildId,
  getDiscordServerByCommunityId,
  listDiscordServers,
  listChannelMappings,
  getChannelMappingsForEvent,
  getDmSetting,
  getDmPreference,
  isDmEnabledForUser,
  listRoleMappings,
  getRoleMapping,
  getEnabledRoleMappings,
  getChannelFailureCount,
  getUserByDiscordId,
  searchTournamentsInCommunity,
  searchUserActiveTournamentRegistrations,
  searchPlayersInCommunity,
  getDiscordIntegrationOverview,
  listRecentFailures,
  getPublicDiscordHandle,
} from "../discord";
import type { TypedClient } from "../../client";
import { createMockClient } from "@trainers/test-utils/mocks";

describe("discord queries", () => {
  let mockClient: TypedClient;

  beforeEach(() => {
    mockClient = createMockClient() as unknown as TypedClient;
    jest.clearAllMocks();
  });

  // ===========================================================================
  // getDiscordServerByGuildId
  // ===========================================================================

  describe("getDiscordServerByGuildId", () => {
    it("returns the server row when found", async () => {
      const server = { id: 1, guild_id: "123456", community_id: 42 };
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: server, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getDiscordServerByGuildId(mockClient, "123456");

      expect(result).toEqual(server);
      expect(fromSpy).toHaveBeenCalledWith("discord_servers");
    });

    it("returns null when the guild is not found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getDiscordServerByGuildId(mockClient, "unknown");

      expect(result).toBeNull();
    });

    it("throws a descriptive error on DB failure", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: "db error" } }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await expect(
        getDiscordServerByGuildId(mockClient, "123")
      ).rejects.toThrow("Failed to get Discord server by guild ID");
    });
  });

  // ===========================================================================
  // getDiscordServerByCommunityId
  // ===========================================================================

  describe("getDiscordServerByCommunityId", () => {
    it("returns null when no server is linked", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getDiscordServerByCommunityId(mockClient, 99);

      expect(result).toBeNull();
    });

    it("returns the server row when found", async () => {
      const server = { id: 2, guild_id: "789", community_id: 99 };
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: server, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getDiscordServerByCommunityId(mockClient, 99);

      expect(result).toEqual(server);
    });
  });

  // ===========================================================================
  // listDiscordServers
  // ===========================================================================

  describe("listDiscordServers", () => {
    it("returns an array of server rows", async () => {
      const servers = [{ id: 1 }, { id: 2 }];
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: servers, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await listDiscordServers(mockClient);

      expect(result).toEqual(servers);
    });

    it("applies a limit of 500", async () => {
      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
      } as unknown as ReturnType<TypedClient["from"]>);

      await listDiscordServers(mockClient);

      expect(limitMock).toHaveBeenCalledWith(500);
    });
  });

  // ===========================================================================
  // getChannelMappingsForEvent
  // ===========================================================================

  describe("getChannelMappingsForEvent", () => {
    it("returns all channels mapped to the event type", async () => {
      const mappings = [
        {
          id: 1,
          discord_server_id: 1,
          channel_id: "ch1",
          event_type: "match_ready",
        },
        {
          id: 2,
          discord_server_id: 1,
          channel_id: "ch2",
          event_type: "match_ready",
        },
      ];
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementation((resolve: (v: unknown) => void) =>
            Promise.resolve({ data: mappings, error: null }).then(resolve)
          ),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getChannelMappingsForEvent(
        mockClient,
        1,
        "match_ready"
      );

      expect(result).toEqual(mappings);
      expect(fromSpy).toHaveBeenCalledWith("discord_channels");
    });

    it("returns empty array when no channels configured for event", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest
          .fn()
          .mockImplementation((resolve: (v: unknown) => void) =>
            Promise.resolve({ data: [], error: null }).then(resolve)
          ),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getChannelMappingsForEvent(
        mockClient,
        1,
        "match_ready"
      );

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // isDmEnabledForUser — key behavioral test
  // ===========================================================================

  describe("isDmEnabledForUser", () => {
    it("returns false when no preference row exists (opt-in default)", async () => {
      // Two calls: getDmPreference internally calls maybeSingle
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await isDmEnabledForUser(
        mockClient,
        "user-123",
        "match_ready"
      );

      expect(result).toBe(false);
    });

    it("returns true when preference row has enabled=true", async () => {
      const preference = {
        user_id: "user-123",
        event_type: "match_ready",
        enabled: true,
      };
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: preference, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await isDmEnabledForUser(
        mockClient,
        "user-123",
        "match_ready"
      );

      expect(result).toBe(true);
    });

    it("returns false when preference row has enabled=false", async () => {
      const preference = {
        user_id: "user-123",
        event_type: "match_ready",
        enabled: false,
      };
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: preference, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await isDmEnabledForUser(
        mockClient,
        "user-123",
        "match_ready"
      );

      expect(result).toBe(false);
    });

    it("propagates errors from getDmPreference", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "db error" },
        }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await expect(
        isDmEnabledForUser(mockClient, "user-123", "match_ready")
      ).rejects.toThrow("Failed to get DM preference");
    });
  });

  // ===========================================================================
  // getDmPreference
  // ===========================================================================

  describe("getDmPreference", () => {
    it("returns null when no preference exists", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getDmPreference(
        mockClient,
        "user-123",
        "match_ready"
      );

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // getEnabledRoleMappings
  // ===========================================================================

  describe("getEnabledRoleMappings", () => {
    it("only returns enabled=true mappings", async () => {
      const enabledMappings = [
        {
          id: 1,
          discord_server_id: 1,
          role_type: "member",
          discord_role_id: "role1",
          enabled: true,
        },
      ];
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest
        .fn()
        .mockResolvedValue({ data: enabledMappings, error: null });
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        order: orderMock,
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getEnabledRoleMappings(mockClient, 1);

      expect(result).toEqual(enabledMappings);
      // Verify enabled=true filter was applied
      expect(eqMock).toHaveBeenCalledWith("enabled", true);
    });
  });

  // ===========================================================================
  // getRoleMapping
  // ===========================================================================

  describe("getRoleMapping", () => {
    it("returns null when no mapping is configured for the role type", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getRoleMapping(mockClient, 1, "member");

      expect(result).toBeNull();
    });

    it("returns the mapping when found", async () => {
      const mapping = {
        id: 1,
        discord_server_id: 1,
        role_type: "member",
        discord_role_id: "role1",
        enabled: true,
      };
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: mapping, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getRoleMapping(mockClient, 1, "member");

      expect(result).toEqual(mapping);
    });
  });

  // ===========================================================================
  // getChannelFailureCount
  // ===========================================================================

  describe("getChannelFailureCount", () => {
    it("returns 0 when no failure record exists for the channel", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getChannelFailureCount(mockClient, 1, "ch-123");

      expect(result).toBe(0);
    });

    it("returns the consecutive_failures count when a record exists", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { consecutive_failures: 7 },
          error: null,
        }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getChannelFailureCount(mockClient, 1, "ch-123");

      expect(result).toBe(7);
    });

    it("throws on DB failure", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "connection failed" },
        }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await expect(
        getChannelFailureCount(mockClient, 1, "ch-123")
      ).rejects.toThrow("Failed to get channel failure count");
    });
  });

  // ===========================================================================
  // getUserByDiscordId — identity resolution
  // ===========================================================================

  describe("getUserByDiscordId", () => {
    it("returns user_id when Discord account is linked", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { user_id: "uuid-123" }, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getUserByDiscordId(
        mockClient,
        "discord-snowflake-123"
      );

      expect(result).toEqual({ user_id: "uuid-123" });
    });

    it("returns null when no linked account is found", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getUserByDiscordId(mockClient, "unlinked-snowflake");

      expect(result).toBeNull();
    });

    it("queries auth.identities with provider=discord", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      const eqMock = jest.fn().mockReturnThis();
      // Terminal eq call returns the resolved value
      eqMock.mockReturnValueOnce({
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { user_id: "uuid-abc" }, error: null }),
      });
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { user_id: "uuid-abc" }, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await getUserByDiscordId(mockClient, "snowflake-456");

      expect(fromSpy).toHaveBeenCalledWith("auth.identities");
    });

    it("throws a descriptive error on DB failure", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "permission denied" },
        }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await expect(getUserByDiscordId(mockClient, "snowflake")).rejects.toThrow(
        "Failed to resolve Discord user ID"
      );
    });
  });

  // ===========================================================================
  // getDmSetting
  // ===========================================================================

  describe("getDmSetting", () => {
    it("returns null when no setting is configured", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getDmSetting(mockClient, 1, "match_ready");

      expect(result).toBeNull();
    });

    it("returns the setting row when found", async () => {
      const setting = {
        id: 1,
        discord_server_id: 1,
        event_type: "match_ready",
        delivery_mode: "dm_with_fallback",
        fallback_channel_id: "ch-fallback",
      };
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: setting, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getDmSetting(mockClient, 1, "match_ready");

      expect(result).toEqual(setting);
    });
  });

  // ===========================================================================
  // listChannelMappings
  // ===========================================================================

  describe("listChannelMappings", () => {
    it("queries discord_channels for the given server", async () => {
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        order: orderMock,
      } as unknown as ReturnType<TypedClient["from"]>);

      await listChannelMappings(mockClient, 42);

      expect(fromSpy).toHaveBeenCalledWith("discord_channels");
      expect(eqMock).toHaveBeenCalledWith("discord_server_id", 42);
    });

    it("returns empty array when no mappings exist", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await listChannelMappings(mockClient, 42);

      expect(result).toEqual([]);
    });
  });

  // ===========================================================================
  // listRoleMappings
  // ===========================================================================

  describe("listRoleMappings", () => {
    it("queries discord_role_mappings for the given server", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await listRoleMappings(mockClient, 5);

      expect(fromSpy).toHaveBeenCalledWith("discord_role_mappings");
    });
  });

  // ===========================================================================
  // searchTournamentsInCommunity
  // ===========================================================================

  describe("searchTournamentsInCommunity", () => {
    it("returns matching tournaments for a partial input", async () => {
      const rows = [
        { name: "Spring Cup 2026", slug: "spring-cup-2026" },
        { name: "Spring Open", slug: "spring-open" },
      ];
      const limitMock = jest
        .fn()
        .mockResolvedValue({ data: rows, error: null });
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
        ilike: jest.fn().mockReturnThis(),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await searchTournamentsInCommunity(
        mockClient,
        42,
        "spring"
      );

      expect(fromSpy).toHaveBeenCalledWith("tournaments");
      expect(limitMock).toHaveBeenCalledWith(25);
      expect(result).toEqual(rows);
    });

    it("does not apply ilike filter for empty partial", async () => {
      const rows = [{ name: "Latest Cup", slug: "latest-cup" }];
      const ilikeMock = jest.fn().mockReturnThis();
      const limitMock = jest
        .fn()
        .mockResolvedValue({ data: rows, error: null });
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
        ilike: ilikeMock,
      } as unknown as ReturnType<TypedClient["from"]>);

      await searchTournamentsInCommunity(mockClient, 42, "");

      // ilike should not have been called for empty partial
      expect(ilikeMock).not.toHaveBeenCalled();
      expect(limitMock).toHaveBeenCalledWith(25);
    });

    it("applies a custom limit", async () => {
      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
      } as unknown as ReturnType<TypedClient["from"]>);

      await searchTournamentsInCommunity(mockClient, 42, "", { limit: 10 });

      expect(limitMock).toHaveBeenCalledWith(10);
    });

    it("returns empty array on no results", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await searchTournamentsInCommunity(mockClient, 42, "xyz");

      expect(result).toEqual([]);
    });

    it("throws a descriptive error on DB failure", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "connection failed" },
        }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await expect(
        searchTournamentsInCommunity(mockClient, 42, "spring")
      ).rejects.toThrow("Failed to search tournaments in community");
    });
  });

  // ===========================================================================
  // searchUserActiveTournamentRegistrations
  // ===========================================================================

  describe("searchUserActiveTournamentRegistrations", () => {
    it("returns empty array when user has no alts", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      // First call: alts query
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await searchUserActiveTournamentRegistrations(
        mockClient,
        "user-uuid",
        42,
        "spring"
      );

      expect(result).toEqual([]);
    });

    it("returns active registration tournament names when user has alts", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      // First call: alts query
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 10 }, { id: 11 }],
          error: null,
        }),
      } as unknown as ReturnType<TypedClient["from"]>);

      // Second call: registrations query
      const limitMock = jest.fn().mockResolvedValue({
        data: [
          {
            tournament: { name: "Spring Cup", slug: "spring-cup" },
          },
        ],
        error: null,
      });
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        limit: limitMock,
        ilike: jest.fn().mockReturnThis(),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await searchUserActiveTournamentRegistrations(
        mockClient,
        "user-uuid",
        42,
        "spring"
      );

      expect(result).toEqual([{ name: "Spring Cup", slug: "spring-cup" }]);
    });

    it("filters null tournament entries from results", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [{ id: 10 }],
          error: null,
        }),
      } as unknown as ReturnType<TypedClient["from"]>);

      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ tournament: null }],
          error: null,
        }),
        ilike: jest.fn().mockReturnThis(),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await searchUserActiveTournamentRegistrations(
        mockClient,
        "user-uuid",
        42,
        ""
      );

      expect(result).toEqual([]);
    });

    it("throws a descriptive error when alts query fails", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "alts failed" },
        }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await expect(
        searchUserActiveTournamentRegistrations(
          mockClient,
          "user-uuid",
          42,
          "spring"
        )
      ).rejects.toThrow("Failed to get alts for autocomplete");
    });
  });

  // ===========================================================================
  // searchPlayersInCommunity
  // ===========================================================================

  describe("searchPlayersInCommunity", () => {
    it("returns matching player usernames", async () => {
      const rows = [
        {
          username: "ash_ketchum",
          tournament_registrations: [{ tournament: { community_id: 42 } }],
        },
        {
          username: "ash_trainer",
          tournament_registrations: [{ tournament: { community_id: 42 } }],
        },
      ];
      const limitMock = jest
        .fn()
        .mockResolvedValue({ data: rows, error: null });
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
        ilike: jest.fn().mockReturnThis(),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await searchPlayersInCommunity(mockClient, 42, "ash");

      expect(result).toEqual([
        { username: "ash_ketchum" },
        { username: "ash_trainer" },
      ]);
      expect(fromSpy).toHaveBeenCalledWith("alts");
    });

    it("deduplicates usernames when a player has multiple registrations", async () => {
      const rows = [
        {
          username: "ash_ketchum",
          tournament_registrations: [{ tournament: { community_id: 42 } }],
        },
        {
          // Same player returned twice due to multiple registrations
          username: "ash_ketchum",
          tournament_registrations: [{ tournament: { community_id: 42 } }],
        },
      ];
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: rows, error: null }),
        ilike: jest.fn().mockReturnThis(),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await searchPlayersInCommunity(mockClient, 42, "ash");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ username: "ash_ketchum" });
    });

    it("does not apply ilike for empty partial", async () => {
      const ilikeMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
        ilike: ilikeMock,
      } as unknown as ReturnType<TypedClient["from"]>);

      await searchPlayersInCommunity(mockClient, 42, "");

      expect(ilikeMock).not.toHaveBeenCalled();
    });

    it("returns empty array on no results", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error: null }),
        ilike: jest.fn().mockReturnThis(),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await searchPlayersInCommunity(mockClient, 42, "zzz");

      expect(result).toEqual([]);
    });

    it("throws a descriptive error on DB failure", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "db failure" },
        }),
        ilike: jest.fn().mockReturnThis(),
      } as unknown as ReturnType<TypedClient["from"]>);

      await expect(
        searchPlayersInCommunity(mockClient, 42, "ash")
      ).rejects.toThrow("Failed to search players in community");
    });
  });

  // ===========================================================================
  // getDiscordIntegrationOverview
  // ===========================================================================

  describe("getDiscordIntegrationOverview", () => {
    it("returns null when no server is linked for the community", async () => {
      // getDiscordServerByCommunityId returns null
      jest.spyOn(mockClient, "from").mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getDiscordIntegrationOverview(mockClient, 99);

      expect(result).toBeNull();
    });

    it("returns the populated overview shape when server and child rows exist", async () => {
      const server = {
        id: 1,
        guild_id: "guild-1",
        community_id: 42,
        installed_by: "user-uuid",
        settings: {},
        created_at: "2026-01-01T00:00:00Z",
      };
      const channelMappings = [
        {
          id: 10,
          discord_server_id: 1,
          channel_id: "ch1",
          event_type: "match_ready",
          created_at: "2026-01-01T00:00:00Z",
        },
      ];
      const dmSettings = [
        {
          id: 20,
          discord_server_id: 1,
          event_type: "match_ready",
          delivery_mode: "channel_only",
          fallback_channel_id: null,
        },
      ];
      const roleMappings = [
        {
          id: 30,
          discord_server_id: 1,
          role_type: "member",
          discord_role_id: "role-1",
          enabled: true,
          created_at: "2026-01-01T00:00:00Z",
        },
      ];
      const channelFailures = [
        {
          id: 40,
          discord_server_id: 1,
          channel_id: "ch1",
          consecutive_failures: 3,
          last_failed_at: "2026-01-01T01:00:00Z",
          email_sent_at: null,
        },
        {
          id: 41,
          discord_server_id: 1,
          channel_id: "ch2",
          consecutive_failures: 1,
          last_failed_at: "2026-01-01T02:00:00Z",
          email_sent_at: null,
        },
      ];

      const fromSpy = jest.spyOn(mockClient, "from");

      // Call 1: getDiscordServerByCommunityId
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: server, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      // Calls 2-5: listChannelMappings, listDmSettings, listRoleMappings, listChannelFailures (parallel)
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest
          .fn()
          .mockResolvedValue({ data: channelMappings, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: dmSettings, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: roleMappings, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);
      fromSpy.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest
          .fn()
          .mockResolvedValue({ data: channelFailures, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getDiscordIntegrationOverview(mockClient, 42);

      expect(result).not.toBeNull();
      expect(result?.server).toEqual(server);
      expect(result?.channelMappings).toEqual(channelMappings);
      expect(result?.dmSettings).toEqual(dmSettings);
      expect(result?.roleMappings).toEqual(roleMappings);
      // recentFailureCount = number of channel failure rows returned
      expect(result?.recentFailureCount).toBe(2);
    });

    it("throws a descriptive error when the server lookup fails", async () => {
      jest.spyOn(mockClient, "from").mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: "db error" } }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await expect(
        getDiscordIntegrationOverview(mockClient, 42)
      ).rejects.toThrow("Failed to get Discord server by community ID");
    });
  });

  // ===========================================================================
  // listRecentFailures
  // ===========================================================================

  describe("listRecentFailures", () => {
    // Helper: builds the mock chain for the single discord_delivery_failures
    // query: .select("*").eq().gte().order().limit()
    function mockDeliveryFailures(
      rows: unknown[],
      error: unknown = null
    ): ReturnType<TypedClient["from"]> {
      const limitMock = jest.fn().mockResolvedValue({ data: rows, error });
      const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
      const gteMock = jest.fn().mockReturnValue({ order: orderMock });
      const eqMock = jest.fn().mockReturnValue({ gte: gteMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqMock });
      return { select: selectMock } as unknown as ReturnType<
        TypedClient["from"]
      >;
    }

    it("returns empty arrays when no failures exist", async () => {
      jest
        .spyOn(mockClient, "from")
        .mockReturnValueOnce(mockDeliveryFailures([]));

      const result = await listRecentFailures(mockClient, 1);

      expect(result.channels).toEqual([]);
      expect(result.dms).toEqual([]);
      expect(result.roleSyncs).toEqual([]);
    });

    it("queries discord_delivery_failures table with server filter", async () => {
      const fromSpy = jest.spyOn(mockClient, "from");
      fromSpy.mockReturnValueOnce(mockDeliveryFailures([]));

      await listRecentFailures(mockClient, 42);

      expect(fromSpy).toHaveBeenCalledWith("discord_delivery_failures");
    });

    it("partitions channel rows into channels array", async () => {
      const channelRow = {
        id: 1,
        type: "channel",
        target: "ch-999",
        event_type: "match_ready",
        error_code: null,
        error_reason: null,
        delivered_via_fallback: false,
        created_at: "2026-04-14T10:00:00Z",
      };
      jest
        .spyOn(mockClient, "from")
        .mockReturnValueOnce(mockDeliveryFailures([channelRow]));

      const result = await listRecentFailures(mockClient, 1);

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0]).toMatchObject({
        id: 1,
        channel_id: "ch-999",
        event_type: "match_ready",
        consecutive_failures: 0,
        last_error_code: null,
        last_error_reason: null,
        last_attempt_at: "2026-04-14T10:00:00Z",
        mapping_id: null,
      });
      expect(result.dms).toEqual([]);
      expect(result.roleSyncs).toEqual([]);
    });

    it("partitions dm rows into dms array", async () => {
      const dmRow = {
        id: 2,
        type: "dm",
        target: "discord-123",
        event_type: "match_ready",
        error_code: null,
        error_reason: "rate_limited",
        delivered_via_fallback: false,
        created_at: "2026-04-14T09:00:00Z",
      };
      jest
        .spyOn(mockClient, "from")
        .mockReturnValueOnce(mockDeliveryFailures([dmRow]));

      const result = await listRecentFailures(mockClient, 1);

      expect(result.dms).toHaveLength(1);
      expect(result.dms[0]).toMatchObject({
        id: 2,
        discord_user_id: "discord-123",
        event_type: "match_ready",
        error_code: null,
        error_reason: "rate_limited",
        delivered_via_fallback: false,
        failed_at: "2026-04-14T09:00:00Z",
        username: null,
      });
      expect(result.channels).toEqual([]);
      expect(result.roleSyncs).toEqual([]);
    });

    it("partitions role sync rows into roleSyncs array", async () => {
      const roleSyncRow = {
        id: 3,
        type: "role_sync",
        target: "discord-456",
        event_type: null,
        error_code: null,
        error_reason: "missing_permissions",
        delivered_via_fallback: false,
        created_at: "2026-04-14T08:00:00Z",
      };
      jest
        .spyOn(mockClient, "from")
        .mockReturnValueOnce(mockDeliveryFailures([roleSyncRow]));

      const result = await listRecentFailures(mockClient, 1);

      expect(result.roleSyncs).toHaveLength(1);
      expect(result.roleSyncs[0]).toMatchObject({
        id: 3,
        discord_user_id: "discord-456",
        failed_reason: "missing_permissions",
        failed_at: "2026-04-14T08:00:00Z",
      });
      expect(result.channels).toEqual([]);
      expect(result.dms).toEqual([]);
    });

    it("handles mixed row types in a single query result", async () => {
      const rows = [
        {
          id: 1,
          type: "channel",
          target: "ch-1",
          event_type: null,
          error_code: null,
          error_reason: null,
          delivered_via_fallback: false,
          created_at: "2026-04-14T10:00:00Z",
        },
        {
          id: 2,
          type: "dm",
          target: "discord-1",
          event_type: "match_ready",
          error_code: null,
          error_reason: null,
          delivered_via_fallback: false,
          created_at: "2026-04-14T09:00:00Z",
        },
        {
          id: 3,
          type: "role_sync",
          target: "discord-2",
          event_type: null,
          error_code: null,
          error_reason: "missing_permissions",
          delivered_via_fallback: false,
          created_at: "2026-04-14T08:00:00Z",
        },
      ];
      jest
        .spyOn(mockClient, "from")
        .mockReturnValueOnce(mockDeliveryFailures(rows));

      const result = await listRecentFailures(mockClient, 1);

      expect(result.channels).toHaveLength(1);
      expect(result.dms).toHaveLength(1);
      expect(result.roleSyncs).toHaveLength(1);
    });

    it("throws a descriptive error when the query fails", async () => {
      jest
        .spyOn(mockClient, "from")
        .mockReturnValueOnce(
          mockDeliveryFailures([], { message: "query failed" })
        );

      await expect(listRecentFailures(mockClient, 1)).rejects.toThrow(
        "Failed to list recent failures"
      );
    });
  });

  // ===========================================================================
  // getPublicDiscordHandle
  // ===========================================================================

  describe("getPublicDiscordHandle", () => {
    it("returns null when the user has no linked Discord account", async () => {
      jest.spyOn(mockClient, "from").mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getPublicDiscordHandle(mockClient, "user-123");

      expect(result).toBeNull();
    });

    it("returns global_name when present in identity_data", async () => {
      const identityRow = {
        identity_data: { global_name: "Ash Ketchum", username: "ash_ketchum" },
      };
      jest.spyOn(mockClient, "from").mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: identityRow, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getPublicDiscordHandle(mockClient, "user-123");

      expect(result).toBe("Ash Ketchum");
    });

    it("falls back to username when global_name is absent", async () => {
      const identityRow = {
        identity_data: { username: "ash_ketchum" },
      };
      jest.spyOn(mockClient, "from").mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: identityRow, error: null }),
      } as unknown as ReturnType<TypedClient["from"]>);

      const result = await getPublicDiscordHandle(mockClient, "user-123");

      expect(result).toBe("ash_ketchum");
    });

    it("throws a descriptive error on DB failure", async () => {
      jest.spyOn(mockClient, "from").mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "access denied" },
        }),
      } as unknown as ReturnType<TypedClient["from"]>);

      await expect(
        getPublicDiscordHandle(mockClient, "user-123")
      ).rejects.toThrow("Failed to get public Discord handle");
    });
  });
});
