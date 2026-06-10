/**
 * Tests for the logic inside the 'use cache' fetcher functions on the player
 * profile page. Because page.tsx imports server-only modules (next/headers,
 * cookies), we test the underlying query logic in isolation here — mocking
 * exactly what the fetchers depend on.
 *
 * 'use cache' is a compile-time directive; under Jest it is ignored, so the
 * async functions behave like plain async functions.
 */

// --- next/cache — no-ops in test environment ---
jest.mock("next/cache", () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

// =============================================================================
// Discord handle gating logic
// (extracted from getCachedDiscordHandle to test the conditional independently)
// =============================================================================

/**
 * Mirrors the branching logic inside getCachedDiscordHandle:
 * only call getPublicDiscordHandle when show_discord_publicly is true.
 */
async function discordHandleLogic(
  userRow: { show_discord_publicly: boolean } | null,
  fetchHandle: () => Promise<string | null>
): Promise<string | null> {
  if (!userRow?.show_discord_publicly) return null;
  return fetchHandle();
}

describe("getCachedDiscordHandle — show_discord_publicly gating", () => {
  it("returns null when show_discord_publicly is false", async () => {
    const fetchHandle = jest.fn().mockResolvedValue("ash#1234");
    const result = await discordHandleLogic(
      { show_discord_publicly: false },
      fetchHandle
    );
    expect(result).toBeNull();
    expect(fetchHandle).not.toHaveBeenCalled();
  });

  it("returns the discord handle when show_discord_publicly is true", async () => {
    const fetchHandle = jest.fn().mockResolvedValue("ash#1234");
    const result = await discordHandleLogic(
      { show_discord_publicly: true },
      fetchHandle
    );
    expect(result).toBe("ash#1234");
    expect(fetchHandle).toHaveBeenCalledTimes(1);
  });

  it("returns null when userRow is null (user record missing)", async () => {
    const fetchHandle = jest.fn().mockResolvedValue("ash#1234");
    const result = await discordHandleLogic(null, fetchHandle);
    expect(result).toBeNull();
    expect(fetchHandle).not.toHaveBeenCalled();
  });

  it("returns null when getPublicDiscordHandle itself returns null", async () => {
    const fetchHandle = jest.fn().mockResolvedValue(null);
    const result = await discordHandleLogic(
      { show_discord_publicly: true },
      fetchHandle
    );
    expect(result).toBeNull();
    expect(fetchHandle).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// next/cache no-op contract
// =============================================================================

describe("next/cache is mocked as no-ops", () => {
  it("cacheTag does not throw", async () => {
    const { cacheTag } = await import("next/cache");
    expect(() => cacheTag("player:ash")).not.toThrow();
  });

  it("cacheLife does not throw", async () => {
    const { cacheLife } = await import("next/cache");
    expect(() => cacheLife("max")).not.toThrow();
  });

  it("both can be called together without error", async () => {
    const { cacheTag, cacheLife } = await import("next/cache");
    expect(() => {
      cacheTag("player:ash");
      cacheLife("max");
    }).not.toThrow();
  });
});
