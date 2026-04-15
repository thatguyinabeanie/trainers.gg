/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before any imports (Jest hoisting requirement)
// =============================================================================

// Mock signature verification so tests don't need real Ed25519 keys
const mockVerifyRequest = jest.fn();
jest.mock("@/lib/discord/verify", () => ({
  verifyRequest: (...args: unknown[]) => mockVerifyRequest(...args),
}));

// Mock rate limiter
const mockCheckRateLimit = jest.fn();
const mockResetRateLimit = jest.fn();
jest.mock("@/lib/discord/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  _resetRateLimit: () => mockResetRateLimit(),
}));

// Mock Discord REST API helpers
const mockEditInteractionResponse = jest.fn();
jest.mock("@/lib/discord/api", () => ({
  editInteractionResponse: (...args: unknown[]) =>
    mockEditInteractionResponse(...args),
}));

// Mock Supabase service role client
const mockServiceClient = {};
const mockCreateServiceRoleClient = jest.fn(() => mockServiceClient);
jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => mockCreateServiceRoleClient(),
}));

// Mock @trainers/supabase query functions
const mockGetDiscordServerByGuildId = jest.fn();
const mockGetCommunityById = jest.fn();
jest.mock("@trainers/supabase", () => ({
  getDiscordServerByGuildId: (...args: unknown[]) =>
    mockGetDiscordServerByGuildId(...args),
  getCommunityById: (...args: unknown[]) => mockGetCommunityById(...args),
}));

// Mock @vercel/functions waitUntil — capture the promise so tests can await it
let capturedWaitUntilPromise: Promise<unknown> | null = null;
const mockWaitUntil = jest.fn((p: Promise<unknown>) => {
  capturedWaitUntilPromise = p;
});
jest.mock("@vercel/functions", () => ({
  waitUntil: (p: Promise<unknown>) => mockWaitUntil(p),
}));

// =============================================================================
// Imports — after mocks
// =============================================================================

import {
  InteractionResponseType,
  InteractionType,
  MessageFlags,
} from "discord-api-types/v10";

import { POST } from "../route";
import { commandRegistry } from "@/lib/discord/commands";

// =============================================================================
// Test fixtures
// =============================================================================

const GUILD_ID = "guild-111";
const USER_ID = "user-222";
const TOKEN = "interaction-token-abc";
const COMMUNITY = { id: 7, slug: "my-community", name: "My Community" };
const DISCORD_SERVER = { id: 1, guild_id: GUILD_ID, community_id: 7 };

// =============================================================================
// Helpers
// =============================================================================

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/discord/interactions", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": "sig",
      "x-signature-timestamp": "ts",
    },
  });
}

function pingInteraction() {
  return { type: InteractionType.Ping };
}

function commandInteraction(
  commandName = "test",
  guildId: string | undefined = GUILD_ID
) {
  return {
    type: InteractionType.ApplicationCommand,
    id: "interaction-id",
    token: TOKEN,
    guild_id: guildId,
    member: { user: { id: USER_ID } },
    data: { id: "cmd-id", name: commandName, options: [] },
  };
}

function autocompleteInteraction(
  commandName = "test",
  focusedOptionName = "query",
  focusedOptionValue = "abc"
) {
  return {
    type: InteractionType.ApplicationCommandAutocomplete,
    id: "interaction-id",
    token: TOKEN,
    guild_id: GUILD_ID,
    member: { user: { id: USER_ID } },
    data: {
      id: "cmd-id",
      name: commandName,
      options: [
        { name: focusedOptionName, value: focusedOptionValue, focused: true },
      ],
    },
  };
}

async function parseJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

// =============================================================================
// Setup
// =============================================================================

const mockHandler = jest.fn();
const mockAutocomplete = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  capturedWaitUntilPromise = null;

  // Default: signature valid
  mockVerifyRequest.mockResolvedValue(true);

  // Default: rate limit allows all
  mockCheckRateLimit.mockReturnValue({ allowed: true });

  // Default: guild is linked
  mockGetDiscordServerByGuildId.mockResolvedValue(DISCORD_SERVER);
  mockGetCommunityById.mockResolvedValue(COMMUNITY);

  // Populate registry with test command
  commandRegistry.clear();
  commandRegistry.set("test", {
    name: "test",
    handler: mockHandler,
    autocomplete: mockAutocomplete,
  });

  mockHandler.mockResolvedValue(undefined);
  mockAutocomplete.mockResolvedValue([]);
});

// =============================================================================
// Signature verification
// =============================================================================

describe("signature verification", () => {
  it("returns 401 when signature verification fails", async () => {
    mockVerifyRequest.mockResolvedValue(false);

    const response = await POST(makeRequest(pingInteraction()));

    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text).toBe("Bad signature");
  });

  it("returns 401 when verifyRequest returns false (missing headers)", async () => {
    mockVerifyRequest.mockResolvedValue(false);

    const req = new Request("http://localhost:3000/api/discord/interactions", {
      method: "POST",
      body: JSON.stringify(pingInteraction()),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });
});

// =============================================================================
// PING
// =============================================================================

describe("PING interaction", () => {
  it("responds with type 1 (Pong)", async () => {
    const response = await POST(makeRequest(pingInteraction()));
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body).toEqual({ type: InteractionResponseType.Pong });
  });

  it("does not touch the database on PING", async () => {
    await POST(makeRequest(pingInteraction()));

    expect(mockGetDiscordServerByGuildId).not.toHaveBeenCalled();
    expect(mockGetCommunityById).not.toHaveBeenCalled();
  });

  it("does not call waitUntil on PING", async () => {
    await POST(makeRequest(pingInteraction()));
    expect(mockWaitUntil).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Unknown interaction type
// =============================================================================

describe("unknown interaction type", () => {
  it("responds with ephemeral 'not supported' message", async () => {
    const interaction = { type: 99 }; // Not a real type
    const response = await POST(makeRequest(interaction));
    const body = await parseJson(response);

    expect(body.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    expect((body.data as Record<string, unknown>).flags).toBe(
      MessageFlags.Ephemeral
    );
    const content = (body.data as Record<string, unknown>).content as string;
    expect(content).toContain("supported");
  });
});

// =============================================================================
// Command dispatch
// =============================================================================

describe("command dispatch", () => {
  it("returns type 5 (deferred) for a known command", async () => {
    const response = await POST(makeRequest(commandInteraction("test")));
    const body = await parseJson(response);

    expect(body.type).toBe(
      InteractionResponseType.DeferredChannelMessageWithSource
    );
  });

  it("calls waitUntil with the handler promise", async () => {
    await POST(makeRequest(commandInteraction("test")));
    expect(mockWaitUntil).toHaveBeenCalledTimes(1);
  });

  it("calls the command handler with the correct context", async () => {
    await POST(makeRequest(commandInteraction("test")));

    // Await the scheduled work
    await capturedWaitUntilPromise;

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: GUILD_ID,
        userId: USER_ID,
        communityId: COMMUNITY.id,
        communitySlug: COMMUNITY.slug,
      })
    );
  });

  it("returns ephemeral error for unknown command", async () => {
    const response = await POST(makeRequest(commandInteraction("nonexistent")));
    const body = await parseJson(response);

    expect(body.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    expect((body.data as Record<string, unknown>).flags).toBe(
      MessageFlags.Ephemeral
    );
    const content = (body.data as Record<string, unknown>).content as string;
    expect(content).toContain("nonexistent");
  });

  it("returns ephemeral error when guild is not in discord_servers", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(null);

    const response = await POST(makeRequest(commandInteraction("test")));
    const body = await parseJson(response);

    expect(body.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    const content = (body.data as Record<string, unknown>).content as string;
    expect(content).toContain("linked to a trainers.gg community");
    expect(mockWaitUntil).not.toHaveBeenCalled();
  });

  it("returns ephemeral error when community lookup returns null", async () => {
    mockGetCommunityById.mockResolvedValue(null);

    const response = await POST(makeRequest(commandInteraction("test")));
    const body = await parseJson(response);

    expect(body.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    const content = (body.data as Record<string, unknown>).content as string;
    expect(content).toContain("Community link is broken");
    expect(mockWaitUntil).not.toHaveBeenCalled();
  });

  it("deferred response includes ephemeral flag when command.ephemeral=true", async () => {
    commandRegistry.set("secret", {
      name: "secret",
      handler: mockHandler,
      ephemeral: true,
    });

    const response = await POST(makeRequest(commandInteraction("secret")));
    const body = await parseJson(response);

    expect(body.type).toBe(
      InteractionResponseType.DeferredChannelMessageWithSource
    );
    expect((body.data as Record<string, unknown>).flags).toBe(
      MessageFlags.Ephemeral
    );
  });

  it("deferred response has no flags when command.ephemeral is not set", async () => {
    const response = await POST(makeRequest(commandInteraction("test")));
    const body = await parseJson(response);

    expect(body.data as Record<string, unknown> | undefined).toBeUndefined();
  });
});

// =============================================================================
// Unscoped commands
// =============================================================================

describe("unscoped commands", () => {
  beforeEach(() => {
    commandRegistry.set("help", {
      name: "help",
      handler: mockHandler,
      unscoped: true,
    });
  });

  it("bypasses community resolution for unscoped commands", async () => {
    // No guild_id at all
    const interaction = commandInteraction("help", undefined);
    await POST(makeRequest(interaction));

    expect(mockGetDiscordServerByGuildId).not.toHaveBeenCalled();
    expect(mockGetCommunityById).not.toHaveBeenCalled();
  });

  it("calls waitUntil even without a guild_id for unscoped commands", async () => {
    const interaction = commandInteraction("help", undefined);
    await POST(makeRequest(interaction));

    expect(mockWaitUntil).toHaveBeenCalledTimes(1);
  });

  it("passes empty communityId/communitySlug for unscoped commands", async () => {
    const interaction = commandInteraction("help", undefined);
    await POST(makeRequest(interaction));
    await capturedWaitUntilPromise;

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        communityId: 0,
        communitySlug: "",
      })
    );
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns type 4 (immediate) with ephemeral flag for per-user rate limit", async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      scope: "user",
      retryAfter: 30,
    });

    const response = await POST(makeRequest(commandInteraction("test")));
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    expect((body.data as Record<string, unknown>).flags).toBe(
      MessageFlags.Ephemeral
    );
    expect(mockWaitUntil).not.toHaveBeenCalled();
  });

  it("returns the spec-exact user rate limit message", async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      scope: "user",
      retryAfter: 30,
    });

    const response = await POST(makeRequest(commandInteraction("test")));
    const body = await parseJson(response);

    const content = (body.data as Record<string, unknown>).content as string;
    expect(content).toBe("Slow down! Try again in a few seconds.");
  });

  it("returns type 4 (immediate) with ephemeral flag for per-guild rate limit", async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      scope: "guild",
      retryAfter: 15,
    });

    const response = await POST(makeRequest(commandInteraction("test")));
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    expect((body.data as Record<string, unknown>).flags).toBe(
      MessageFlags.Ephemeral
    );
    expect(mockWaitUntil).not.toHaveBeenCalled();
  });

  it("returns the spec-exact guild rate limit message", async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      scope: "guild",
      retryAfter: 15,
    });

    const response = await POST(makeRequest(commandInteraction("test")));
    const body = await parseJson(response);

    const content = (body.data as Record<string, unknown>).content as string;
    expect(content).toBe(
      "This server has hit the command rate limit — try again in a minute."
    );
  });

  it("rate-limited response does not call any command handler", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, scope: "user" });

    await POST(makeRequest(commandInteraction("test")));

    expect(mockHandler).not.toHaveBeenCalled();
    expect(mockWaitUntil).not.toHaveBeenCalled();
  });

  it("does NOT call checkRateLimit for PING interactions (type 1)", async () => {
    await POST(makeRequest(pingInteraction()));

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("does NOT call checkRateLimit for autocomplete interactions (type 4)", async () => {
    await POST(makeRequest(autocompleteInteraction("test")));

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Error fallback
// =============================================================================

describe("command handler error fallback", () => {
  it("calls editInteractionResponse with fallback message when handler throws", async () => {
    mockHandler.mockRejectedValue(new Error("DB unavailable"));
    mockEditInteractionResponse.mockResolvedValue(undefined);

    await POST(makeRequest(commandInteraction("test")));

    // Await the scheduled work including catch handler
    await capturedWaitUntilPromise;

    expect(mockEditInteractionResponse).toHaveBeenCalledWith(
      TOKEN,
      expect.objectContaining({
        content: expect.stringContaining("Something went wrong"),
      })
    );
  });

  it("logs the error when handler throws", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockHandler.mockRejectedValue(new Error("Explosion"));
    mockEditInteractionResponse.mockResolvedValue(undefined);

    await POST(makeRequest(commandInteraction("test")));
    await capturedWaitUntilPromise;

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Command /test failed"),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("does not throw when editInteractionResponse also fails", async () => {
    mockHandler.mockRejectedValue(new Error("Primary error"));
    mockEditInteractionResponse.mockRejectedValue(
      new Error("Edit also failed")
    );

    await POST(makeRequest(commandInteraction("test")));

    // Should resolve without throwing
    await expect(capturedWaitUntilPromise).resolves.toBeUndefined();
  });
});

// =============================================================================
// Autocomplete
// =============================================================================

describe("autocomplete", () => {
  it("returns empty choices for unknown command", async () => {
    const response = await POST(
      makeRequest(autocompleteInteraction("nonexistent"))
    );
    const body = await parseJson(response);

    expect(body.type).toBe(
      InteractionResponseType.ApplicationCommandAutocompleteResult
    );
    expect((body.data as Record<string, unknown>).choices).toEqual([]);
  });

  it("returns empty choices when command has no autocomplete handler", async () => {
    commandRegistry.set("noac", {
      name: "noac",
      handler: mockHandler,
      // no autocomplete field
    });

    const response = await POST(makeRequest(autocompleteInteraction("noac")));
    const body = await parseJson(response);

    expect((body.data as Record<string, unknown>).choices).toEqual([]);
  });

  it("returns empty choices when there is no focused option", async () => {
    const interaction = {
      type: InteractionType.ApplicationCommandAutocomplete,
      id: "id",
      token: TOKEN,
      guild_id: GUILD_ID,
      member: { user: { id: USER_ID } },
      data: {
        id: "cmd-id",
        name: "test",
        options: [
          // No focused:true on any option
          { name: "query", value: "abc" },
        ],
      },
    };

    const response = await POST(makeRequest(interaction));
    const body = await parseJson(response);

    expect((body.data as Record<string, unknown>).choices).toEqual([]);
  });

  it("returns empty choices when guild is not linked", async () => {
    mockGetDiscordServerByGuildId.mockResolvedValue(null);

    const response = await POST(makeRequest(autocompleteInteraction("test")));
    const body = await parseJson(response);

    expect((body.data as Record<string, unknown>).choices).toEqual([]);
  });

  it("calls the autocomplete handler with the correct context", async () => {
    mockAutocomplete.mockResolvedValue([{ name: "Option A", value: "a" }]);

    await POST(makeRequest(autocompleteInteraction("test", "query", "abc")));

    expect(mockAutocomplete).toHaveBeenCalledWith(
      expect.objectContaining({
        guildId: GUILD_ID,
        userId: USER_ID,
        communityId: COMMUNITY.id,
        communitySlug: COMMUNITY.slug,
        focusedOption: { name: "query", value: "abc" },
      })
    );
  });

  it("caps autocomplete choices at 25", async () => {
    const manyChoices = Array.from({ length: 30 }, (_, i) => ({
      name: `Option ${i}`,
      value: i,
    }));
    mockAutocomplete.mockResolvedValue(manyChoices);

    const response = await POST(makeRequest(autocompleteInteraction("test")));
    const body = await parseJson(response);

    expect(
      (body.data as Record<string, unknown>).choices as unknown[]
    ).toHaveLength(25);
  });

  it("returns autocomplete choices from the handler", async () => {
    mockAutocomplete.mockResolvedValue([
      { name: "Winter Cup", value: "winter-cup" },
      { name: "Spring Open", value: "spring-open" },
    ]);

    const response = await POST(makeRequest(autocompleteInteraction("test")));
    const body = await parseJson(response);

    expect((body.data as Record<string, unknown>).choices).toEqual([
      { name: "Winter Cup", value: "winter-cup" },
      { name: "Spring Open", value: "spring-open" },
    ]);
  });

  it("handles nested focused options (subcommand groups)", async () => {
    mockAutocomplete.mockResolvedValue([{ name: "Nested", value: "nested" }]);

    const interaction = {
      type: InteractionType.ApplicationCommandAutocomplete,
      id: "id",
      token: TOKEN,
      guild_id: GUILD_ID,
      member: { user: { id: USER_ID } },
      data: {
        id: "cmd-id",
        name: "test",
        options: [
          {
            name: "subgroup",
            options: [
              {
                name: "subcommand",
                options: [
                  {
                    name: "deep-option",
                    value: "deep",
                    focused: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const response = await POST(makeRequest(interaction));
    const body = await parseJson(response);

    expect(mockAutocomplete).toHaveBeenCalledWith(
      expect.objectContaining({
        focusedOption: { name: "deep-option", value: "deep" },
      })
    );
    expect((body.data as Record<string, unknown>).choices).toEqual([
      { name: "Nested", value: "nested" },
    ]);
  });
});

// =============================================================================
// User ID resolution edge cases
// =============================================================================

describe("user ID resolution", () => {
  it("resolves userId from interaction.user when member is absent (DM context)", async () => {
    const interaction = {
      type: InteractionType.ApplicationCommand,
      id: "interaction-id",
      token: TOKEN,
      // No guild_id, no member — DM command scenario with unscoped command
      user: { id: "dm-user-id" },
      data: { id: "cmd-id", name: "help", options: [] },
    };

    commandRegistry.set("help", {
      name: "help",
      handler: mockHandler,
      unscoped: true,
    });

    await POST(makeRequest(interaction));
    await capturedWaitUntilPromise;

    expect(mockHandler).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "dm-user-id" })
    );
  });

  it("returns ephemeral error when neither member nor user is present", async () => {
    const interaction = {
      type: InteractionType.ApplicationCommand,
      id: "interaction-id",
      token: TOKEN,
      guild_id: GUILD_ID,
      // no member, no user
      data: { id: "cmd-id", name: "test", options: [] },
    };

    const response = await POST(makeRequest(interaction));
    const body = await parseJson(response);

    expect(body.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    const content = (body.data as Record<string, unknown>).content as string;
    expect(content).toContain("Couldn't identify user");
  });
});
