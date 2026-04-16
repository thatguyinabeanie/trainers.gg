/**
 * @jest-environment node
 *
 * Tests for Discord autocomplete handlers and the in-memory LRU cache.
 *
 * Covers:
 * - autocomplete-cache: get/set, TTL expiry, LRU capacity eviction, reset
 * - autocomplete: cached() wrapper, cache hit/miss, different partials = different keys
 * - /tournament, /standings, /pairings autocomplete (tournament search)
 * - /drop autocomplete (user-scoped, unlinked = empty)
 * - /player and /team autocomplete (player search)
 */

// =============================================================================
// Mocks — must come before any imports from the mocked modules
// =============================================================================

const mockSearchTournamentsInCommunity = jest.fn();
const mockSearchUserActiveTournamentRegistrations = jest.fn();
const mockSearchPlayersInCommunity = jest.fn();
const mockGetUserByDiscordId = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  searchTournamentsInCommunity: mockSearchTournamentsInCommunity,
  searchUserActiveTournamentRegistrations:
    mockSearchUserActiveTournamentRegistrations,
  searchPlayersInCommunity: mockSearchPlayersInCommunity,
  getUserByDiscordId: mockGetUserByDiscordId,
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: mockCreateServiceRoleClient,
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import {
  getCached,
  setCached,
  _resetAutocompleteCache,
  _cacheSize,
} from "../shared/autocomplete-cache";
import { cached } from "../shared/autocomplete";
import type { TypedClient } from "@trainers/supabase";

// Importing the command files triggers registerCommand() as a side effect.
// We import them purely to get access to the registered autocomplete handlers
// through the registry.
import "../tournament";
import "../standings";
import "../pairings";
import "../drop";
import "../player";
import "../team";

import { commandRegistry } from "../registry";
import type { AutocompleteContext } from "../registry";

// =============================================================================
// Helpers
// =============================================================================

const MOCK_SUPABASE = {} as unknown as TypedClient;

function makeCtx(
  communityId: number,
  focusedName: string,
  focusedValue: string,
  userId = "discord-user-123"
): AutocompleteContext {
  return {
    interaction: {} as AutocompleteContext["interaction"],
    guildId: "guild-1",
    userId,
    communityId,
    communitySlug: "pallet-town",
    focusedOption: { name: focusedName, value: focusedValue },
  };
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  _resetAutocompleteCache();
  mockCreateServiceRoleClient.mockReturnValue(MOCK_SUPABASE);
});

// =============================================================================
// autocomplete-cache — unit tests
// =============================================================================

describe("autocomplete-cache", () => {
  describe("getCached", () => {
    it("returns null on a cold cache miss", () => {
      expect(getCached("missing-key")).toBeNull();
    });

    it("returns the stored value on a hit", () => {
      const choices = [{ name: "Spring Cup", value: "spring-cup" }];
      setCached("key1", choices);

      expect(getCached("key1")).toEqual(choices);
    });

    it("returns null after TTL expiry (fake timers)", () => {
      jest.useFakeTimers();

      const choices = [{ name: "Summer Slam", value: "summer-slam" }];
      setCached("key2", choices);

      // Advance past 60s TTL
      jest.advanceTimersByTime(61_000);

      expect(getCached("key2")).toBeNull();

      jest.useRealTimers();
    });

    it("returns value before TTL expiry", () => {
      jest.useFakeTimers();

      const choices = [{ name: "Autumn Open", value: "autumn-open" }];
      setCached("key3", choices);

      jest.advanceTimersByTime(59_000);

      expect(getCached("key3")).toEqual(choices);

      jest.useRealTimers();
    });

    it("removes expired entry from the cache on access", () => {
      jest.useFakeTimers();

      setCached("expiry-key", [{ name: "Old Cup", value: "old-cup" }]);
      expect(_cacheSize()).toBe(1);

      jest.advanceTimersByTime(61_000);
      getCached("expiry-key"); // triggers deletion

      expect(_cacheSize()).toBe(0);

      jest.useRealTimers();
    });
  });

  describe("setCached", () => {
    it("stores a value retrievable by the same key", () => {
      const choices = [{ name: "Winter Bowl", value: "winter-bowl" }];
      setCached("my-key", choices);

      expect(getCached("my-key")).toEqual(choices);
    });

    it("evicts the oldest entry when capacity (1000) is exceeded", () => {
      // Fill cache to capacity
      for (let i = 0; i < 1000; i++) {
        setCached(`key-${i}`, [{ name: `Item ${i}`, value: i }]);
      }
      expect(_cacheSize()).toBe(1000);

      // Adding one more should evict key-0 (oldest)
      setCached("overflow-key", [{ name: "New", value: "new" }]);

      expect(_cacheSize()).toBe(1000);
      expect(getCached("key-0")).toBeNull();
      expect(getCached("overflow-key")).not.toBeNull();
    });
  });

  describe("_resetAutocompleteCache", () => {
    it("clears all entries", () => {
      setCached("a", [{ name: "A", value: "a" }]);
      setCached("b", [{ name: "B", value: "b" }]);
      expect(_cacheSize()).toBe(2);

      _resetAutocompleteCache();

      expect(_cacheSize()).toBe(0);
    });
  });
});

// =============================================================================
// cached() wrapper — unit tests
// =============================================================================

describe("cached()", () => {
  it("calls the underlying query on a cache miss", async () => {
    const choices = [{ name: "Spring Cup", value: "spring-cup" }];
    const query = jest.fn().mockResolvedValue(choices);
    const wrapped = cached("name", query);

    const result = await wrapped(MOCK_SUPABASE, 42, "spring");

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(MOCK_SUPABASE, 42, "spring");
    expect(result).toEqual(choices);
  });

  it("returns cached result and does not re-query on second call with same key", async () => {
    const choices = [{ name: "Spring Cup", value: "spring-cup" }];
    const query = jest.fn().mockResolvedValue(choices);
    const wrapped = cached("name", query);

    await wrapped(MOCK_SUPABASE, 42, "spring");
    const second = await wrapped(MOCK_SUPABASE, 42, "spring");

    expect(query).toHaveBeenCalledTimes(1);
    expect(second).toEqual(choices);
  });

  it("uses different cache keys for different partial inputs", async () => {
    const choices1 = [{ name: "Spring Cup", value: "spring-cup" }];
    const choices2 = [{ name: "Summer Slam", value: "summer-slam" }];
    const query = jest
      .fn()
      .mockResolvedValueOnce(choices1)
      .mockResolvedValueOnce(choices2);
    const wrapped = cached("name", query);

    const r1 = await wrapped(MOCK_SUPABASE, 42, "spring");
    const r2 = await wrapped(MOCK_SUPABASE, 42, "summer");

    expect(query).toHaveBeenCalledTimes(2);
    expect(r1).toEqual(choices1);
    expect(r2).toEqual(choices2);
  });

  it("treats partial inputs case-insensitively for cache keys", async () => {
    const choices = [{ name: "Spring Cup", value: "spring-cup" }];
    const query = jest.fn().mockResolvedValue(choices);
    const wrapped = cached("name", query);

    await wrapped(MOCK_SUPABASE, 42, "Spring");
    await wrapped(MOCK_SUPABASE, 42, "spring");

    // Both "Spring" and "spring" should hit the same cache entry
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("re-queries after TTL expiry (fake timers)", async () => {
    jest.useFakeTimers();

    const choices = [{ name: "Cup", value: "cup" }];
    const query = jest.fn().mockResolvedValue(choices);
    const wrapped = cached("name", query);

    await wrapped(MOCK_SUPABASE, 42, "cup");
    jest.advanceTimersByTime(61_000);
    await wrapped(MOCK_SUPABASE, 42, "cup");

    expect(query).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it("caps results at 25 choices", async () => {
    const manyChoices = Array.from({ length: 30 }, (_, i) => ({
      name: `Tournament ${i}`,
      value: `tournament-${i}`,
    }));
    const query = jest.fn().mockResolvedValue(manyChoices);
    const wrapped = cached("name", query);

    const result = await wrapped(MOCK_SUPABASE, 42, "");

    expect(result).toHaveLength(25);
  });
});

// =============================================================================
// /tournament autocomplete
// =============================================================================

describe("/tournament autocomplete", () => {
  const tournamentCmd = commandRegistry.get("tournament");

  it("is registered with an autocomplete handler", () => {
    expect(tournamentCmd?.autocomplete).toBeDefined();
  });

  it("returns tournament name/slug choices", async () => {
    mockSearchTournamentsInCommunity.mockResolvedValue([
      { name: "Spring Cup 2026", slug: "spring-cup-2026" },
      { name: "Spring Open", slug: "spring-open" },
    ]);

    const ctx = makeCtx(42, "name", "spring");
    const result = await tournamentCmd!.autocomplete!(ctx);

    expect(result).toEqual([
      { name: "Spring Cup 2026", value: "spring-cup-2026" },
      { name: "Spring Open", value: "spring-open" },
    ]);
    expect(mockSearchTournamentsInCommunity).toHaveBeenCalledWith(
      MOCK_SUPABASE,
      42,
      "spring",
      { limit: 25 }
    );
  });

  it("returns results for empty partial (top recent tournaments)", async () => {
    mockSearchTournamentsInCommunity.mockResolvedValue([
      { name: "Latest Cup", slug: "latest-cup" },
    ]);

    const ctx = makeCtx(42, "name", "");
    const result = await tournamentCmd!.autocomplete!(ctx);

    expect(result).toHaveLength(1);
    expect(mockSearchTournamentsInCommunity).toHaveBeenCalledWith(
      MOCK_SUPABASE,
      42,
      "",
      { limit: 25 }
    );
  });

  it("uses the cache on a second call with same key", async () => {
    mockSearchTournamentsInCommunity.mockResolvedValue([
      { name: "Spring Cup", slug: "spring-cup" },
    ]);

    const ctx = makeCtx(42, "name", "unique-partial-tournament");

    await tournamentCmd!.autocomplete!(ctx);
    await tournamentCmd!.autocomplete!(ctx);

    // Should only hit DB once thanks to cache
    expect(mockSearchTournamentsInCommunity).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// /standings autocomplete
// =============================================================================

describe("/standings autocomplete", () => {
  const standingsCmd = commandRegistry.get("standings");

  it("is registered with an autocomplete handler", () => {
    expect(standingsCmd?.autocomplete).toBeDefined();
  });

  it("returns tournament choices for the standings option", async () => {
    mockSearchTournamentsInCommunity.mockResolvedValue([
      { name: "League Finals", slug: "league-finals" },
    ]);

    const ctx = makeCtx(10, "tournament", "league");
    const result = await standingsCmd!.autocomplete!(ctx);

    expect(result).toEqual([{ name: "League Finals", value: "league-finals" }]);
  });
});

// =============================================================================
// /pairings autocomplete
// =============================================================================

describe("/pairings autocomplete", () => {
  const pairingsCmd = commandRegistry.get("pairings");

  it("is registered with an autocomplete handler", () => {
    expect(pairingsCmd?.autocomplete).toBeDefined();
  });

  it("returns tournament choices for the pairings option", async () => {
    mockSearchTournamentsInCommunity.mockResolvedValue([
      { name: "Round Robin", slug: "round-robin" },
    ]);

    const ctx = makeCtx(5, "tournament", "round");
    const result = await pairingsCmd!.autocomplete!(ctx);

    expect(result).toEqual([{ name: "Round Robin", value: "round-robin" }]);
  });
});

// =============================================================================
// /drop autocomplete
// =============================================================================

describe("/drop autocomplete", () => {
  const dropCmd = commandRegistry.get("drop");

  it("is registered with an autocomplete handler", () => {
    expect(dropCmd?.autocomplete).toBeDefined();
  });

  it("returns empty array when Discord account is not linked", async () => {
    mockGetUserByDiscordId.mockResolvedValue(null);

    const ctx = makeCtx(42, "tournament", "spring", "unlinked-discord-id");
    const result = await dropCmd!.autocomplete!(ctx);

    expect(result).toEqual([]);
    expect(mockSearchUserActiveTournamentRegistrations).not.toHaveBeenCalled();
  });

  it("returns user's active tournament registrations when linked", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-uuid-123" });
    mockSearchUserActiveTournamentRegistrations.mockResolvedValue([
      { name: "Spring Cup", slug: "spring-cup" },
      { name: "Spring League", slug: "spring-league" },
    ]);

    const ctx = makeCtx(42, "tournament", "spring", "linked-discord-id");
    const result = await dropCmd!.autocomplete!(ctx);

    expect(result).toEqual([
      { name: "Spring Cup", value: "spring-cup" },
      { name: "Spring League", value: "spring-league" },
    ]);
    expect(mockGetUserByDiscordId).toHaveBeenCalledWith(
      MOCK_SUPABASE,
      "linked-discord-id"
    );
    expect(mockSearchUserActiveTournamentRegistrations).toHaveBeenCalledWith(
      MOCK_SUPABASE,
      "user-uuid-123",
      42,
      "spring",
      { limit: 25 }
    );
  });

  it("returns empty array when linked user has no active registrations", async () => {
    mockGetUserByDiscordId.mockResolvedValue({ user_id: "user-uuid-456" });
    mockSearchUserActiveTournamentRegistrations.mockResolvedValue([]);

    const ctx = makeCtx(42, "tournament", "", "linked-discord-id");
    const result = await dropCmd!.autocomplete!(ctx);

    expect(result).toEqual([]);
  });
});

// =============================================================================
// /player autocomplete
// =============================================================================

describe("/player autocomplete", () => {
  const playerCmd = commandRegistry.get("player");

  it("is registered with an autocomplete handler", () => {
    expect(playerCmd?.autocomplete).toBeDefined();
  });

  it("maps username → { name: username, value: username }", async () => {
    mockSearchPlayersInCommunity.mockResolvedValue([
      { username: "ash_ketchum" },
      { username: "ash_trainer" },
    ]);

    const ctx = makeCtx(42, "username", "ash");
    const result = await playerCmd!.autocomplete!(ctx);

    expect(result).toEqual([
      { name: "ash_ketchum", value: "ash_ketchum" },
      { name: "ash_trainer", value: "ash_trainer" },
    ]);
    expect(mockSearchPlayersInCommunity).toHaveBeenCalledWith(
      MOCK_SUPABASE,
      42,
      "ash",
      { limit: 25 }
    );
  });

  it("returns empty array when no players match the partial", async () => {
    mockSearchPlayersInCommunity.mockResolvedValue([]);

    const ctx = makeCtx(42, "username", "zzz");
    const result = await playerCmd!.autocomplete!(ctx);

    expect(result).toEqual([]);
  });

  it("uses the cache on a second call with same key", async () => {
    mockSearchPlayersInCommunity.mockResolvedValue([
      { username: "misty_waterflower" },
    ]);

    const ctx = makeCtx(42, "username", "unique-partial-player");

    await playerCmd!.autocomplete!(ctx);
    await playerCmd!.autocomplete!(ctx);

    expect(mockSearchPlayersInCommunity).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// /team autocomplete
// =============================================================================

describe("/team autocomplete", () => {
  const teamCmd = commandRegistry.get("team");

  it("is registered with an autocomplete handler", () => {
    expect(teamCmd?.autocomplete).toBeDefined();
  });

  it("maps username → { name: username, value: username }", async () => {
    mockSearchPlayersInCommunity.mockResolvedValue([
      { username: "brock_pewter" },
    ]);

    const ctx = makeCtx(10, "player", "brock");
    const result = await teamCmd!.autocomplete!(ctx);

    expect(result).toEqual([{ name: "brock_pewter", value: "brock_pewter" }]);
    expect(mockSearchPlayersInCommunity).toHaveBeenCalledWith(
      MOCK_SUPABASE,
      10,
      "brock",
      { limit: 25 }
    );
  });

  it("returns top players on empty partial", async () => {
    mockSearchPlayersInCommunity.mockResolvedValue([
      { username: "alpha_player" },
      { username: "beta_player" },
    ]);

    const ctx = makeCtx(10, "player", "");
    const result = await teamCmd!.autocomplete!(ctx);

    expect(result).toHaveLength(2);
  });
});
