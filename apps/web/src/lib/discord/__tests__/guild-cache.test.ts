/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — set up before any imports so Jest hoisting works correctly
// =============================================================================

const mockGetGuildChannels = jest.fn();
const mockGetGuildRoles = jest.fn();

jest.mock("../api", () => ({
  getGuildChannels: mockGetGuildChannels,
  getGuildRoles: mockGetGuildRoles,
}));

// unstable_cache: execute the cached function inline so we can assert on
// the key/options it was called with, and verify the delegate is invoked.
const mockUnstableCache = jest.fn(
  (
    fn: () => Promise<unknown>,
    _key: string[],
    _opts: { revalidate: number; tags: string[] }
  ) => fn
);

jest.mock("next/cache", () => ({
  unstable_cache: mockUnstableCache,
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { getCachedGuildChannels, getCachedGuildRoles } from "../guild-cache";

// =============================================================================
// Constants
// =============================================================================

const GUILD_ID = "guild-999";
const SERVER_ID = 42;
const DISCORD_GUILD_TAG = `discord-guild:${SERVER_ID}`;
const CACHE_TTL = 300;

// =============================================================================
// Fixtures
// =============================================================================

const TEXT_CHANNEL = { id: "ch-1", name: "general", type: 0 };
const VOICE_CHANNEL = { id: "ch-2", name: "voice", type: 2 };
const CATEGORY_CHANNEL = { id: "ch-3", name: "Category", type: 4 };

const REGULAR_ROLE = { id: "role-1", name: "Member", managed: false };
const BOT_ROLE = { id: "role-2", name: "BotRole", managed: true };
const EVERYONE_ROLE = { id: "role-3", name: "@everyone", managed: false };

// =============================================================================
// getCachedGuildChannels
// =============================================================================

describe("getCachedGuildChannels", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls unstable_cache with the correct key, TTL, and tag", async () => {
    mockGetGuildChannels.mockResolvedValue([TEXT_CHANNEL]);

    await getCachedGuildChannels(GUILD_ID, SERVER_ID);

    expect(mockUnstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["discord-guild-channels", GUILD_ID],
      { revalidate: CACHE_TTL, tags: [DISCORD_GUILD_TAG] }
    );
  });

  it("delegates to getGuildChannels and returns only text channels (type 0)", async () => {
    mockGetGuildChannels.mockResolvedValue([
      TEXT_CHANNEL,
      VOICE_CHANNEL,
      CATEGORY_CHANNEL,
    ]);

    const result = await getCachedGuildChannels(GUILD_ID, SERVER_ID);

    expect(mockGetGuildChannels).toHaveBeenCalledWith(GUILD_ID);
    expect(result).toEqual([TEXT_CHANNEL]);
  });

  it("returns an empty array when there are no text channels", async () => {
    mockGetGuildChannels.mockResolvedValue([VOICE_CHANNEL, CATEGORY_CHANNEL]);

    const result = await getCachedGuildChannels(GUILD_ID, SERVER_ID);

    expect(result).toEqual([]);
  });
});

// =============================================================================
// getCachedGuildRoles
// =============================================================================

describe("getCachedGuildRoles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls unstable_cache with the correct key, TTL, and tag", async () => {
    mockGetGuildRoles.mockResolvedValue([REGULAR_ROLE]);

    await getCachedGuildRoles(GUILD_ID, SERVER_ID);

    expect(mockUnstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["discord-guild-roles", GUILD_ID],
      { revalidate: CACHE_TTL, tags: [DISCORD_GUILD_TAG] }
    );
  });

  it("delegates to getGuildRoles and excludes managed roles", async () => {
    mockGetGuildRoles.mockResolvedValue([
      REGULAR_ROLE,
      BOT_ROLE,
      EVERYONE_ROLE,
    ]);

    const result = await getCachedGuildRoles(GUILD_ID, SERVER_ID);

    expect(mockGetGuildRoles).toHaveBeenCalledWith(GUILD_ID);
    expect(result).toEqual([REGULAR_ROLE, EVERYONE_ROLE]);
  });

  it("returns an empty array when all roles are managed", async () => {
    mockGetGuildRoles.mockResolvedValue([BOT_ROLE]);

    const result = await getCachedGuildRoles(GUILD_ID, SERVER_ID);

    expect(result).toEqual([]);
  });
});
