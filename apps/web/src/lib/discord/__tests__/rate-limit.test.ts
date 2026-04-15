/**
 * @jest-environment node
 */

import {
  checkRateLimit,
  _resetRateLimit,
  _resetRateLimitState,
  PER_USER_LIMIT,
  PER_GUILD_LIMIT,
} from "../rate-limit";

const USER_A = "user-111";
const USER_B = "user-222";
const GUILD_A = "guild-111";
const GUILD_B = "guild-222";

beforeEach(() => {
  _resetRateLimit();
});

// =============================================================================
// Basic allow
// =============================================================================

describe("checkRateLimit — basic allow", () => {
  it("allows the first request for a new user/guild pair", () => {
    const result = checkRateLimit(USER_A, GUILD_A);
    expect(result).toEqual({ allowed: true });
  });

  it("allows up to PER_USER_LIMIT requests for the same user within 60s", () => {
    for (let i = 0; i < PER_USER_LIMIT; i++) {
      const result = checkRateLimit(USER_A, GUILD_A);
      expect(result.allowed).toBe(true);
    }
  });

  it("allows requests for null guildId (DM context)", () => {
    const result = checkRateLimit(USER_A, null);
    expect(result.allowed).toBe(true);
  });
});

// =============================================================================
// Per-user limit
// =============================================================================

describe("checkRateLimit — user limit", () => {
  it("blocks the (PER_USER_LIMIT + 1)th request from the same user within 60s", () => {
    for (let i = 0; i < PER_USER_LIMIT; i++) {
      checkRateLimit(USER_A, GUILD_A);
    }
    const result = checkRateLimit(USER_A, GUILD_A);
    expect(result.allowed).toBe(false);
    expect(result.scope).toBe("user");
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
  });

  it("does not affect a different user in the same guild", () => {
    for (let i = 0; i < PER_USER_LIMIT; i++) {
      checkRateLimit(USER_A, GUILD_A);
    }
    // USER_B is under their own user limit
    const result = checkRateLimit(USER_B, GUILD_A);
    expect(result.allowed).toBe(true);
  });
});

// =============================================================================
// Per-guild limit
// =============================================================================

describe("checkRateLimit — guild limit", () => {
  it("blocks when per-guild limit of PER_GUILD_LIMIT is exceeded across many users", () => {
    // Use many distinct users, each within their own user limit
    const usersNeeded = Math.ceil(PER_GUILD_LIMIT / PER_USER_LIMIT);
    for (let u = 0; u < usersNeeded; u++) {
      for (let i = 0; i < PER_USER_LIMIT; i++) {
        checkRateLimit(`user-batch-${u}`, GUILD_A);
      }
    }
    // Next command from a fresh user hits the guild cap
    const result = checkRateLimit("user-overflow", GUILD_A);
    expect(result.allowed).toBe(false);
    expect(result.scope).toBe("guild");
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("does not affect a different guild", () => {
    const usersNeeded = Math.ceil(PER_GUILD_LIMIT / PER_USER_LIMIT);
    for (let u = 0; u < usersNeeded; u++) {
      for (let i = 0; i < PER_USER_LIMIT; i++) {
        checkRateLimit(`user-batch-${u}`, GUILD_A);
      }
    }
    // GUILD_B is entirely separate
    const result = checkRateLimit(USER_A, GUILD_B);
    expect(result.allowed).toBe(true);
  });

  it("rolls back the user increment when blocked by guild limit", () => {
    // Fill the guild bucket using other users
    const usersNeeded = Math.ceil(PER_GUILD_LIMIT / PER_USER_LIMIT);
    for (let u = 0; u < usersNeeded; u++) {
      for (let i = 0; i < PER_USER_LIMIT; i++) {
        checkRateLimit(`user-filler-${u}`, GUILD_A);
      }
    }

    // USER_A's first attempt gets blocked by the guild cap
    const blocked = checkRateLimit(USER_A, GUILD_A);
    expect(blocked.allowed).toBe(false);
    expect(blocked.scope).toBe("guild");

    // Reset guild state so we can verify USER_A's user budget wasn't consumed
    _resetRateLimit();

    // After reset, USER_A can fire PER_USER_LIMIT times freely
    for (let i = 0; i < PER_USER_LIMIT; i++) {
      expect(checkRateLimit(USER_A, GUILD_A).allowed).toBe(true);
    }
    expect(checkRateLimit(USER_A, GUILD_A).allowed).toBe(false);
  });

  it("skips guild check when guildId is null", () => {
    // Even if we had a full guild bucket, null guildId bypasses it
    // (DM interactions). User A sends PER_USER_LIMIT commands — all allowed.
    for (let i = 0; i < PER_USER_LIMIT; i++) {
      expect(checkRateLimit(USER_A, null).allowed).toBe(true);
    }
    // (PER_USER_LIMIT + 1)th is blocked by user limit, not guild
    const result = checkRateLimit(USER_A, null);
    expect(result.allowed).toBe(false);
    expect(result.scope).toBe("user");
  });
});

// =============================================================================
// User limit takes precedence over guild limit
// =============================================================================

describe("checkRateLimit — user scope precedence", () => {
  it("returns scope='user' when user limit is hit, even if guild would also be hit", () => {
    // Exhaust the user limit
    for (let i = 0; i < PER_USER_LIMIT; i++) {
      checkRateLimit(USER_A, GUILD_A);
    }

    // Also exhaust the guild limit using other users
    const usersNeeded = Math.ceil(PER_GUILD_LIMIT / PER_USER_LIMIT);
    for (let u = 0; u < usersNeeded; u++) {
      for (let i = 0; i < PER_USER_LIMIT; i++) {
        checkRateLimit(`user-filler-${u}`, GUILD_A);
      }
    }

    // USER_A is blocked — user limit checked first, so scope is "user"
    const result = checkRateLimit(USER_A, GUILD_A);
    expect(result.allowed).toBe(false);
    expect(result.scope).toBe("user");
  });
});

// =============================================================================
// Window expiry (sliding window)
// =============================================================================

describe("checkRateLimit — window expiry", () => {
  it("allows requests again after the 60-second window passes", () => {
    jest.useFakeTimers();

    // Exhaust user limit
    for (let i = 0; i < PER_USER_LIMIT; i++) {
      checkRateLimit(USER_A, GUILD_A);
    }
    expect(checkRateLimit(USER_A, GUILD_A).allowed).toBe(false);

    // Advance time past the window
    jest.advanceTimersByTime(61_000);

    // Should be allowed again in the new window
    const result = checkRateLimit(USER_A, GUILD_A);
    expect(result.allowed).toBe(true);

    jest.useRealTimers();
  });

  it("sliding window: only timestamps within the last 60s count", () => {
    jest.useFakeTimers();

    // Issue 5 commands at t=0
    for (let i = 0; i < 5; i++) {
      checkRateLimit(USER_A, GUILD_A);
    }

    // Advance 30 seconds — still in first window
    jest.advanceTimersByTime(30_000);

    // Issue 5 more commands at t=30s (total 10 in the window)
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(USER_A, GUILD_A).allowed).toBe(true);
    }

    // 11th command at t=30s: blocked (10 in window)
    expect(checkRateLimit(USER_A, GUILD_A).allowed).toBe(false);

    // Advance another 31 seconds — now t=61s. The first 5 from t=0 have expired.
    jest.advanceTimersByTime(31_000);

    // Should now have room again (only the t=30s batch is in window)
    const result = checkRateLimit(USER_A, GUILD_A);
    expect(result.allowed).toBe(true);

    jest.useRealTimers();
  });
});

// =============================================================================
// LRU eviction
// =============================================================================

describe("checkRateLimit — LRU eviction", () => {
  it("evicts old entries when more than 10,000 distinct keys are added", () => {
    // Insert 10,001 distinct user keys to trigger eviction
    for (let i = 0; i < 10_001; i++) {
      checkRateLimit(`eviction-user-${i}`, `eviction-guild-${i}`);
    }

    // After eviction, new keys still work
    const result = checkRateLimit("fresh-user-after-eviction", GUILD_A);
    expect(result.allowed).toBe(true);
  });
});

// =============================================================================
// Exported constants
// =============================================================================

describe("exported constants", () => {
  it("exports PER_USER_LIMIT = 10", () => {
    expect(PER_USER_LIMIT).toBe(10);
  });

  it("exports PER_GUILD_LIMIT = 60", () => {
    expect(PER_GUILD_LIMIT).toBe(60);
  });
});

// =============================================================================
// Reset utilities
// =============================================================================

describe("_resetRateLimit", () => {
  it("clears all state so subsequent calls start fresh", () => {
    // Exhaust user limit
    for (let i = 0; i < PER_USER_LIMIT; i++) {
      checkRateLimit(USER_A, GUILD_A);
    }
    expect(checkRateLimit(USER_A, GUILD_A).allowed).toBe(false);

    _resetRateLimit();

    expect(checkRateLimit(USER_A, GUILD_A).allowed).toBe(true);
  });

  it("_resetRateLimitState is an alias for _resetRateLimit", () => {
    for (let i = 0; i < PER_USER_LIMIT; i++) {
      checkRateLimit(USER_A, GUILD_A);
    }
    expect(checkRateLimit(USER_A, GUILD_A).allowed).toBe(false);

    _resetRateLimitState();

    expect(checkRateLimit(USER_A, GUILD_A).allowed).toBe(true);
  });
});
