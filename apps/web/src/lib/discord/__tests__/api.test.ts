/**
 * @jest-environment node
 */

// =============================================================================
// Mocks
// =============================================================================

const mockFetch = jest.fn();
global.fetch = mockFetch;

// =============================================================================
// Imports (after mocks)
// =============================================================================

import {
  assignRole,
  deleteMessage,
  DiscordAPIError,
  DiscordDMBlockedError,
  DiscordRateLimitError,
  editInteractionResponse,
  getGuildChannels,
  getGuildRoles,
  registerGlobalCommands,
  registerGuildCommands,
  removeRole,
  sendChannelMessage,
  sendDM,
  sendFollowup,
} from "../api";

// =============================================================================
// Helpers
// =============================================================================

const BOT_TOKEN = "Bot test-token-abc";
const APP_ID = "app-id-123";
const INTERACTION_TOKEN = "interaction-token-xyz";
const GUILD_ID = "guild-999";
const CHANNEL_ID = "channel-888";
const USER_ID = "user-777";
const ROLE_ID = "role-666";
const MESSAGE_ID = "message-555";

const EMBED = { title: "Test Embed", color: 0x14b8a6 };
const CONTENT = { content: "Hello!" };

function makeOkResponse(body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
    json: async () => body,
  };
}

function makeErrorResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
) {
  return {
    ok: false,
    status,
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
    json: async () => body,
  };
}

// =============================================================================
// Setup
// =============================================================================

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...originalEnv,
    DISCORD_BOT_TOKEN: "test-token-abc",
    DISCORD_APP_ID: APP_ID,
  };
});

afterEach(() => {
  process.env = originalEnv;
});

// =============================================================================
// editInteractionResponse
// =============================================================================

describe("editInteractionResponse", () => {
  it("sends PATCH to /webhooks/{appId}/{token}/messages/@original with embed", async () => {
    mockFetch.mockResolvedValue(makeOkResponse({}));

    await editInteractionResponse(INTERACTION_TOKEN, { embed: EMBED });

    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/webhooks/${APP_ID}/${INTERACTION_TOKEN}/messages/@original`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          allowed_mentions: { parse: [] },
          embeds: [EMBED],
        }),
      })
    );
  });

  it("sends PATCH with content payload", async () => {
    mockFetch.mockResolvedValue(makeOkResponse({}));

    await editInteractionResponse(INTERACTION_TOKEN, CONTENT);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.content).toBe("Hello!");
    expect(callBody.embeds).toBeUndefined();
  });

  it("includes Authorization header with bot token", async () => {
    mockFetch.mockResolvedValue(makeOkResponse({}));

    await editInteractionResponse(INTERACTION_TOKEN, CONTENT);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe(BOT_TOKEN);
  });
});

// =============================================================================
// sendFollowup
// =============================================================================

describe("sendFollowup", () => {
  it("sends POST to /webhooks/{appId}/{token}", async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ id: "msg-1" }));

    await sendFollowup(INTERACTION_TOKEN, { embed: EMBED });

    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/webhooks/${APP_ID}/${INTERACTION_TOKEN}`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns the message from the response", async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ id: "msg-2", content: "" }));

    const msg = await sendFollowup(INTERACTION_TOKEN, CONTENT);

    expect(msg).toEqual({ id: "msg-2", content: "" });
  });
});

// =============================================================================
// sendChannelMessage
// =============================================================================

describe("sendChannelMessage", () => {
  it("sends POST to /channels/{channelId}/messages", async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ id: "msg-3" }));

    await sendChannelMessage(CHANNEL_ID, { embed: EMBED });

    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("includes allowed_mentions parse: [] to prevent accidental pings", async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ id: "msg-4" }));

    await sendChannelMessage(CHANNEL_ID, CONTENT);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });
});

// =============================================================================
// deleteMessage
// =============================================================================

describe("deleteMessage", () => {
  it("sends DELETE to /channels/{channelId}/messages/{messageId}", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(null));

    await deleteMessage(CHANNEL_ID, MESSAGE_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages/${MESSAGE_ID}`,
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

// =============================================================================
// sendDM
// =============================================================================

describe("sendDM", () => {
  it("opens DM channel then sends message", async () => {
    // First call: POST /users/@me/channels returns DM channel
    // Second call: POST /channels/{dmId}/messages
    mockFetch
      .mockResolvedValueOnce(makeOkResponse({ id: "dm-channel-1", type: 1 }))
      .mockResolvedValueOnce(makeOkResponse({ id: "msg-5" }));

    await sendDM(USER_ID, { embed: EMBED });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [firstUrl] = mockFetch.mock.calls[0];
    expect(firstUrl).toBe("https://discord.com/api/v10/users/@me/channels");

    const [secondUrl] = mockFetch.mock.calls[1];
    expect(secondUrl).toBe(
      "https://discord.com/api/v10/channels/dm-channel-1/messages"
    );
  });

  it("throws DiscordDMBlockedError when error code 50007 on channel open", async () => {
    mockFetch.mockResolvedValueOnce(
      makeErrorResponse(403, {
        code: 50007,
        message: "Cannot send messages to this user",
      })
    );

    await expect(sendDM(USER_ID, CONTENT)).rejects.toBeInstanceOf(
      DiscordDMBlockedError
    );
  });

  it("throws DiscordDMBlockedError when error code 50007 on message send", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse({ id: "dm-channel-1", type: 1 }))
      .mockResolvedValueOnce(
        makeErrorResponse(403, {
          code: 50007,
          message: "Cannot send messages to this user",
        })
      );

    await expect(sendDM(USER_ID, CONTENT)).rejects.toBeInstanceOf(
      DiscordDMBlockedError
    );
  });
});

// =============================================================================
// getGuildChannels
// =============================================================================

describe("getGuildChannels", () => {
  it("sends GET to /guilds/{guildId}/channels", async () => {
    const channels = [{ id: "ch-1", name: "general", type: 0 }];
    mockFetch.mockResolvedValue(makeOkResponse(channels));

    const result = await getGuildChannels(GUILD_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
      expect.objectContaining({ method: "GET" })
    );
    expect(result).toEqual(channels);
  });
});

// =============================================================================
// getGuildRoles
// =============================================================================

describe("getGuildRoles", () => {
  it("sends GET to /guilds/{guildId}/roles", async () => {
    const roles = [
      { id: "role-1", name: "Admin", color: 0, position: 1, managed: false },
    ];
    mockFetch.mockResolvedValue(makeOkResponse(roles));

    const result = await getGuildRoles(GUILD_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,
      expect.objectContaining({ method: "GET" })
    );
    expect(result).toEqual(roles);
  });
});

// =============================================================================
// assignRole / removeRole
// =============================================================================

describe("assignRole", () => {
  it("sends PUT to /guilds/{guildId}/members/{userId}/roles/{roleId}", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(null));

    await assignRole(GUILD_ID, USER_ID, ROLE_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${USER_ID}/roles/${ROLE_ID}`,
      expect.objectContaining({ method: "PUT" })
    );
  });
});

describe("removeRole", () => {
  it("sends DELETE to /guilds/{guildId}/members/{userId}/roles/{roleId}", async () => {
    mockFetch.mockResolvedValue(makeOkResponse(null));

    await removeRole(GUILD_ID, USER_ID, ROLE_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${USER_ID}/roles/${ROLE_ID}`,
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

// =============================================================================
// registerGlobalCommands / registerGuildCommands
// =============================================================================

describe("registerGlobalCommands", () => {
  it("sends PUT to /applications/{appId}/commands", async () => {
    mockFetch.mockResolvedValue(makeOkResponse([]));

    const defs = [{ name: "team", description: "View your team" }];
    await registerGlobalCommands(defs);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/applications/${APP_ID}/commands`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(defs),
      })
    );
  });
});

describe("registerGuildCommands", () => {
  it("sends PUT to /applications/{appId}/guilds/{guildId}/commands", async () => {
    mockFetch.mockResolvedValue(makeOkResponse([]));

    const defs = [{ name: "team", description: "View your team" }];
    await registerGuildCommands(GUILD_ID, defs);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(defs),
      })
    );
  });
});

// =============================================================================
// Rate limit + error handling
// =============================================================================

describe("rate limit (HTTP 429)", () => {
  it("throws DiscordRateLimitError with retryAfter seconds when 429 received", async () => {
    mockFetch.mockResolvedValue(
      makeErrorResponse(
        429,
        { message: "You are being rate limited." },
        { "Retry-After": "3.5" }
      )
    );

    await expect(
      sendChannelMessage(CHANNEL_ID, CONTENT)
    ).rejects.toBeInstanceOf(DiscordRateLimitError);

    try {
      await sendChannelMessage(CHANNEL_ID, CONTENT);
    } catch (err) {
      if (err instanceof DiscordRateLimitError) {
        expect(err.retryAfter).toBe(3.5);
        expect(err.status).toBe(429);
      }
    }
  });

  it("defaults retryAfter to 1 when Retry-After header is absent", async () => {
    mockFetch.mockResolvedValue(
      makeErrorResponse(429, { message: "Rate limited" })
    );

    try {
      await sendChannelMessage(CHANNEL_ID, CONTENT);
    } catch (err) {
      if (err instanceof DiscordRateLimitError) {
        expect(err.retryAfter).toBe(1);
      }
    }
  });
});

describe("non-429 errors", () => {
  it("throws DiscordAPIError with status code for other error responses", async () => {
    mockFetch.mockResolvedValue(
      makeErrorResponse(403, { code: 50013, message: "Missing Permissions" })
    );

    try {
      await sendChannelMessage(CHANNEL_ID, CONTENT);
    } catch (err) {
      expect(err).toBeInstanceOf(DiscordAPIError);
      if (err instanceof DiscordAPIError) {
        expect(err.status).toBe(403);
        expect(err.body.code).toBe(50013);
      }
    }
  });

  it("throws when DISCORD_BOT_TOKEN is not set", async () => {
    delete process.env.DISCORD_BOT_TOKEN;

    await expect(sendChannelMessage(CHANNEL_ID, CONTENT)).rejects.toThrow(
      "DISCORD_BOT_TOKEN is not set"
    );
  });

  it("throws when DISCORD_APP_ID is not set", async () => {
    delete process.env.DISCORD_APP_ID;

    await expect(
      editInteractionResponse(INTERACTION_TOKEN, CONTENT)
    ).rejects.toThrow("DISCORD_APP_ID is not set");
  });
});

// =============================================================================
// DiscordDMBlockedError properties
// =============================================================================

describe("DiscordDMBlockedError", () => {
  it("exposes discordUserId", () => {
    const err = new DiscordDMBlockedError(USER_ID, { code: 50007 });
    expect(err.discordUserId).toBe(USER_ID);
    expect(err.status).toBe(403);
    expect(err.name).toBe("DiscordDMBlockedError");
  });
});
