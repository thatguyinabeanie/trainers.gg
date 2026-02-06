/**
 * Tests for cache utilities
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { getCacheHeaders, CACHE_TTL } from "../cache";

describe("getCacheHeaders", () => {
  it("returns public cache headers when isPublic is true", () => {
    const headers = getCacheHeaders(60, 30, true);

    expect(headers).toEqual({
      "Cache-Control":
        "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
    });
    expect(headers).not.toHaveProperty("Vary");
  });

  it("returns private cache headers when isPublic is false", () => {
    const headers = getCacheHeaders(60, 30, false);

    expect(headers).toEqual({
      "Cache-Control": "private, max-age=60, stale-while-revalidate=30",
      Vary: "Authorization",
    });
  });

  it("returns private cache headers when isPublic is omitted (default)", () => {
    const headers = getCacheHeaders(60, 30);

    expect(headers).toEqual({
      "Cache-Control": "private, max-age=60, stale-while-revalidate=30",
      Vary: "Authorization",
    });
  });

  it("uses default values when only called with no arguments", () => {
    const headers = getCacheHeaders();

    expect(headers).toEqual({
      "Cache-Control": "private, max-age=60, stale-while-revalidate=30",
      Vary: "Authorization",
    });
  });

  it("formats cache headers correctly with custom values", () => {
    const headers = getCacheHeaders(120, 60, true);

    expect(headers).toEqual({
      "Cache-Control":
        "public, max-age=120, s-maxage=120, stale-while-revalidate=60",
    });
  });
});

describe("CACHE_TTL", () => {
  it("defines TTL constants for different data types", () => {
    expect(CACHE_TTL.TOURNAMENT).toBe(60);
    expect(CACHE_TTL.MATCH).toBe(30);
    expect(CACHE_TTL.STANDINGS).toBe(30);
    expect(CACHE_TTL.ALT).toBe(300);
    expect(CACHE_TTL.ORGANIZATION).toBe(300);
    expect(CACHE_TTL.NOTIFICATION).toBe(10);
    expect(CACHE_TTL.STATIC).toBe(900);
  });

  it("TTL values are in seconds", () => {
    // Verify values make sense
    expect(CACHE_TTL.TOURNAMENT).toBeGreaterThan(0);
    expect(CACHE_TTL.MATCH).toBeGreaterThan(0);
    expect(CACHE_TTL.NOTIFICATION).toBeLessThan(CACHE_TTL.TOURNAMENT);
    expect(CACHE_TTL.ALT).toBeGreaterThan(CACHE_TTL.TOURNAMENT);
    expect(CACHE_TTL.STATIC).toBeGreaterThan(CACHE_TTL.ORGANIZATION);
  });
});

/**
 * Note: withCache and invalidateCache tests require Redis client setup
 * and are difficult to test in a unit test environment without mocking.
 * These functions are tested in integration tests or manually.
 *
 * Key behaviors to test manually/integration:
 * - withCache returns cached value on cache hit
 * - withCache executes function and caches result on cache miss
 * - withCache falls back to executing function when Redis is disabled
 * - withCache handles errors gracefully (logs and executes function)
 * - invalidateCache deletes single key
 * - invalidateCache uses cursor-based SCAN for patterns
 * - invalidateCache handles Redis errors gracefully
 */
