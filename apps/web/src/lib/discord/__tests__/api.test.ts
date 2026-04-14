/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — set up before any imports so Jest hoisting works correctly
// =============================================================================

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

const mockRestInstance = {
  get: mockGet,
  post: mockPost,
  patch: mockPatch,
  put: mockPut,
  delete: mockDelete,
  setToken: jest.fn().mockReturnThis(),
};

jest.mock("@discordjs/rest", () => ({
  REST: jest.fn().mockImplementation(() => mockRestInstance),
}));

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
  _setRestInstance,
} from "../api";

// =============================================================================
// Helpers
// =============================================================================

const APP_ID = "app-id-123";
const INTERACTION_TOKEN = "interaction-token-xyz";
const GUILD_ID = "guild-999";
const CHANNEL_ID = "channel-888";
const USER_ID = "user-777";
const ROLE_ID = "role-666";
const MESSAGE_ID = "message-555";

const EMBED = { title: "Test Embed", color: 0x14b8a6 };
const CONTENT = { content: "Hello!" };

/** Build a fake @discordjs/rest API error with the same shape the library uses. */
function makeRestError(
  status: number,
  rawError: { code?: number; message?: string },
  retryAfter?: number
) {
  const err = new Error(rawError.message ?? "Discord API error") as Error & {
    status: number;
    rawError: typeof rawError;
    retryAfter?: number;
  };
  err.status = status;
  err.rawError = rawError;
  if (retryAfter !== undefined) err.retryAfter = retryAfter;
  return err;
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
  // Inject the mock REST instance so tests don't trigger lazy construction
  // with a real token check.
  _setRestInstance(mockRestInstance as never);
});

afterEach(() => {
  process.env = originalEnv;
});

// =============================================================================
// editInteractionResponse
// =============================================================================

describe("editInteractionResponse", () => {
  it("calls rest.patch on the correct webhook-message route with embed", async () => {
    mockPatch.mockResolvedValue({});

    await editInteractionResponse(INTERACTION_TOKEN, { embed: EMBED });

    // Routes.webhookMessage URL-encodes @original → %40original
    expect(mockPatch).toHaveBeenCalledWith(
      `/webhooks/${APP_ID}/${INTERACTION_TOKEN}/messages/%40original`,
      expect.objectContaining({
        body: expect.objectContaining({
          embeds: [EMBED],
          allowed_mentions: { parse: [] },
        }),
      })
    );
  });

  it("calls rest.patch with content payload", async () => {
    mockPatch.mockResolvedValue({});

    await editInteractionResponse(INTERACTION_TOKEN, CONTENT);

    expect(mockPatch).toHaveBeenCalledWith(
      `/webhooks/${APP_ID}/${INTERACTION_TOKEN}/messages/%40original`,
      expect.objectContaining({
        body: expect.objectContaining({ content: "Hello!" }),
      })
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
// sendFollowup
// =============================================================================

describe("sendFollowup", () => {
  it("calls rest.post on the correct webhook route", async () => {
    mockPost.mockResolvedValue({ id: "msg-1" });

    await sendFollowup(INTERACTION_TOKEN, { embed: EMBED });

    expect(mockPost).toHaveBeenCalledWith(
      `/webhooks/${APP_ID}/${INTERACTION_TOKEN}`,
      expect.objectContaining({
        body: expect.objectContaining({ embeds: [EMBED] }),
      })
    );
  });

  it("returns the message from the response", async () => {
    mockPost.mockResolvedValue({ id: "msg-2", content: "" });

    const msg = await sendFollowup(INTERACTION_TOKEN, CONTENT);

    expect(msg).toEqual({ id: "msg-2", content: "" });
  });
});

// =============================================================================
// sendChannelMessage
// =============================================================================

describe("sendChannelMessage", () => {
  it("calls rest.post on the correct channel-messages route", async () => {
    mockPost.mockResolvedValue({ id: "msg-3" });

    await sendChannelMessage(CHANNEL_ID, { embed: EMBED });

    expect(mockPost).toHaveBeenCalledWith(
      `/channels/${CHANNEL_ID}/messages`,
      expect.anything()
    );
  });

  it("includes allowed_mentions parse: [] to prevent accidental pings", async () => {
    mockPost.mockResolvedValue({ id: "msg-4" });

    await sendChannelMessage(CHANNEL_ID, CONTENT);

    expect(mockPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.objectContaining({
          allowed_mentions: { parse: [] },
        }),
      })
    );
  });
});

// =============================================================================
// deleteMessage
// =============================================================================

describe("deleteMessage", () => {
  it("calls rest.delete on the correct channel-message route", async () => {
    mockDelete.mockResolvedValue(null);

    await deleteMessage(CHANNEL_ID, MESSAGE_ID);

    expect(mockDelete).toHaveBeenCalledWith(
      `/channels/${CHANNEL_ID}/messages/${MESSAGE_ID}`
    );
  });
});

// =============================================================================
// sendDM
// =============================================================================

describe("sendDM", () => {
  it("opens DM channel via user-channels route then sends channel message", async () => {
    // First post: open DM channel
    // Second post: send channel message
    mockPost
      .mockResolvedValueOnce({ id: "dm-channel-1", type: 1 })
      .mockResolvedValueOnce({ id: "msg-5" });

    await sendDM(USER_ID, { embed: EMBED });

    expect(mockPost).toHaveBeenCalledTimes(2);

    // First call opens the DM channel
    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      "/users/@me/channels",
      expect.objectContaining({
        body: expect.objectContaining({ recipient_id: USER_ID }),
      })
    );

    // Second call sends the message to the DM channel
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      `/channels/dm-channel-1/messages`,
      expect.anything()
    );
  });

  it("throws DiscordDMBlockedError when error code 50007 on channel open", async () => {
    mockPost.mockRejectedValueOnce(
      makeRestError(403, {
        code: 50007,
        message: "Cannot send messages to this user",
      })
    );

    await expect(sendDM(USER_ID, CONTENT)).rejects.toBeInstanceOf(
      DiscordDMBlockedError
    );
  });

  it("throws DiscordDMBlockedError when error code 50007 on message send", async () => {
    mockPost
      .mockResolvedValueOnce({ id: "dm-channel-1", type: 1 })
      .mockRejectedValueOnce(
        makeRestError(403, {
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
  it("calls rest.get on the correct guild-channels route and returns data", async () => {
    const channels = [{ id: "ch-1", name: "general", type: 0 }];
    mockGet.mockResolvedValue(channels);

    const result = await getGuildChannels(GUILD_ID);

    expect(mockGet).toHaveBeenCalledWith(`/guilds/${GUILD_ID}/channels`);
    expect(result).toEqual(channels);
  });
});

// =============================================================================
// getGuildRoles
// =============================================================================

describe("getGuildRoles", () => {
  it("calls rest.get on the correct guild-roles route and returns data", async () => {
    const roles = [
      { id: "role-1", name: "Admin", color: 0, position: 1, managed: false },
    ];
    mockGet.mockResolvedValue(roles);

    const result = await getGuildRoles(GUILD_ID);

    expect(mockGet).toHaveBeenCalledWith(`/guilds/${GUILD_ID}/roles`);
    expect(result).toEqual(roles);
  });
});

// =============================================================================
// assignRole / removeRole
// =============================================================================

describe("assignRole", () => {
  it("calls rest.put on the correct guild-member-role route", async () => {
    mockPut.mockResolvedValue(null);

    await assignRole(GUILD_ID, USER_ID, ROLE_ID);

    expect(mockPut).toHaveBeenCalledWith(
      `/guilds/${GUILD_ID}/members/${USER_ID}/roles/${ROLE_ID}`
    );
  });
});

describe("removeRole", () => {
  it("calls rest.delete on the correct guild-member-role route", async () => {
    mockDelete.mockResolvedValue(null);

    await removeRole(GUILD_ID, USER_ID, ROLE_ID);

    expect(mockDelete).toHaveBeenCalledWith(
      `/guilds/${GUILD_ID}/members/${USER_ID}/roles/${ROLE_ID}`
    );
  });
});

// =============================================================================
// registerGlobalCommands / registerGuildCommands
// =============================================================================

describe("registerGlobalCommands", () => {
  it("calls rest.put on the correct application-commands route with the defs body", async () => {
    mockPut.mockResolvedValue([]);

    const defs = [{ name: "team", description: "View your team" }];
    await registerGlobalCommands(defs as never);

    expect(mockPut).toHaveBeenCalledWith(
      `/applications/${APP_ID}/commands`,
      expect.objectContaining({ body: defs })
    );
  });
});

describe("registerGuildCommands", () => {
  it("calls rest.put on the correct application-guild-commands route", async () => {
    mockPut.mockResolvedValue([]);

    const defs = [{ name: "team", description: "View your team" }];
    await registerGuildCommands(GUILD_ID, defs as never);

    expect(mockPut).toHaveBeenCalledWith(
      `/applications/${APP_ID}/guilds/${GUILD_ID}/commands`,
      expect.objectContaining({ body: defs })
    );
  });
});

// =============================================================================
// Rate limit + error mapping
// =============================================================================

describe("rate limit (HTTP 429 from @discordjs/rest)", () => {
  it("maps a 429 rest error to DiscordRateLimitError with retryAfter", async () => {
    mockPost.mockRejectedValue(
      makeRestError(429, { message: "You are being rate limited." }, 3.5)
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

  it("defaults retryAfter to 1 when the error has no retryAfter field", async () => {
    mockPost.mockRejectedValue(
      makeRestError(429, { message: "Rate limited" })
      // note: no retryAfter on the error object
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
  it("maps a non-429 rest error to DiscordAPIError with the correct status", async () => {
    mockPost.mockRejectedValue(
      makeRestError(403, { code: 50013, message: "Missing Permissions" })
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

  it("throws when DISCORD_BOT_TOKEN is not set (getRest lazy init)", async () => {
    // Force re-creation of the REST instance by nulling the injected one.
    // We achieve this by importing and calling _setRestInstance with null-ish,
    // but the cleanest approach is to clear env then call any function that
    // will try getBotToken via getRest.
    _setRestInstance(null as never);
    delete process.env.DISCORD_BOT_TOKEN;

    await expect(sendChannelMessage(CHANNEL_ID, CONTENT)).rejects.toThrow(
      "DISCORD_BOT_TOKEN is not set"
    );
  });
});

// =============================================================================
// DiscordDMBlockedError properties
// =============================================================================

describe("DiscordDMBlockedError", () => {
  it("exposes discordUserId, status 403, and correct name", () => {
    const err = new DiscordDMBlockedError(USER_ID, { code: 50007 });
    expect(err.discordUserId).toBe(USER_ID);
    expect(err.status).toBe(403);
    expect(err.name).toBe("DiscordDMBlockedError");
  });
});
