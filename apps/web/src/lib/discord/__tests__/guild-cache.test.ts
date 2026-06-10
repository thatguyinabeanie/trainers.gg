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

// 'use cache' is a compile-time directive — inert under Jest.
// cacheTag / cacheLife are no-ops; the functions execute without caching.
jest.mock("next/cache", () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
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

  it("returns all text channels when the guild has only text channels", async () => {
    const textChannels = [
      { id: "ch-1", name: "general", type: 0 },
      { id: "ch-2", name: "announcements", type: 0 },
    ];
    mockGetGuildChannels.mockResolvedValue(textChannels);

    const result = await getCachedGuildChannels(GUILD_ID, SERVER_ID);

    expect(result).toEqual(textChannels);
  });
});

// =============================================================================
// getCachedGuildRoles
// =============================================================================

describe("getCachedGuildRoles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("returns all roles when none are managed", async () => {
    mockGetGuildRoles.mockResolvedValue([REGULAR_ROLE, EVERYONE_ROLE]);

    const result = await getCachedGuildRoles(GUILD_ID, SERVER_ID);

    expect(result).toEqual([REGULAR_ROLE, EVERYONE_ROLE]);
  });
});
