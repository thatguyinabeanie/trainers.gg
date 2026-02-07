/**
 * Cache utilities tests
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import { getCacheHeaders, CACHE_TTL } from "../cache.ts";

Deno.test("getCacheHeaders - returns public headers for public data", () => {
  const headers = getCacheHeaders(60, 30, true);

  assertExists(headers["Cache-Control"]);
  assertEquals(
    headers["Cache-Control"],
    "public, max-age=60, s-maxage=60, stale-while-revalidate=30"
  );
  // Public data should not have Vary header
  assertEquals(headers["Vary"], undefined);
});

Deno.test(
  "getCacheHeaders - returns private headers for user-specific data",
  () => {
    const headers = getCacheHeaders(60, 30, false);

    assertExists(headers["Cache-Control"]);
    assertEquals(
      headers["Cache-Control"],
      "private, max-age=60, stale-while-revalidate=30"
    );
    // Private data should have Vary: Authorization header
    assertEquals(headers["Vary"], "Authorization");
  }
);

Deno.test(
  "getCacheHeaders - uses default values when called with no arguments",
  () => {
    const headers = getCacheHeaders();

    assertExists(headers["Cache-Control"]);
    assertEquals(
      headers["Cache-Control"],
      "private, max-age=60, stale-while-revalidate=30"
    );
    assertEquals(headers["Vary"], "Authorization");
  }
);

Deno.test("getCacheHeaders - respects custom TTL values", () => {
  const headers = getCacheHeaders(300, 60, true);

  assertEquals(
    headers["Cache-Control"],
    "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
  );
});

Deno.test("getCacheHeaders - handles zero TTL", () => {
  const headers = getCacheHeaders(0, 0, true);

  assertEquals(
    headers["Cache-Control"],
    "public, max-age=0, s-maxage=0, stale-while-revalidate=0"
  );
});

Deno.test(
  "getCacheHeaders - private data defaults to false (isPublic parameter)",
  () => {
    const headersExplicitFalse = getCacheHeaders(60, 30, false);
    const headersDefaultFalse = getCacheHeaders(60, 30);

    assertEquals(
      headersExplicitFalse["Cache-Control"],
      headersDefaultFalse["Cache-Control"]
    );
    assertEquals(headersExplicitFalse["Vary"], headersDefaultFalse["Vary"]);
  }
);

Deno.test("CACHE_TTL - constants are defined and are numbers", () => {
  assertExists(CACHE_TTL);
  assertEquals(typeof CACHE_TTL.TOURNAMENT, "number");
  assertEquals(typeof CACHE_TTL.MATCH, "number");
  assertEquals(typeof CACHE_TTL.STANDINGS, "number");
  assertEquals(typeof CACHE_TTL.ALT, "number");
  assertEquals(typeof CACHE_TTL.ORGANIZATION, "number");
  assertEquals(typeof CACHE_TTL.NOTIFICATION, "number");
  assertEquals(typeof CACHE_TTL.STATIC, "number");
});

Deno.test("CACHE_TTL - constants have expected values", () => {
  assertEquals(CACHE_TTL.TOURNAMENT, 60);
  assertEquals(CACHE_TTL.MATCH, 30);
  assertEquals(CACHE_TTL.STANDINGS, 30);
  assertEquals(CACHE_TTL.ALT, 300);
  assertEquals(CACHE_TTL.ORGANIZATION, 300);
  assertEquals(CACHE_TTL.NOTIFICATION, 10);
  assertEquals(CACHE_TTL.STATIC, 900);
});

Deno.test(
  "CACHE_TTL - notification TTL is shortest (most frequently updated)",
  () => {
    const values = Object.values(CACHE_TTL);
    const minValue = Math.min(...values);
    assertEquals(minValue, CACHE_TTL.NOTIFICATION);
  }
);

Deno.test(
  "CACHE_TTL - static TTL is longest (least frequently updated)",
  () => {
    const values = Object.values(CACHE_TTL);
    const maxValue = Math.max(...values);
    assertEquals(maxValue, CACHE_TTL.STATIC);
  }
);

Deno.test("getCacheHeaders - large TTL values work correctly", () => {
  const headers = getCacheHeaders(86400, 3600, true); // 1 day, 1 hour

  assertEquals(
    headers["Cache-Control"],
    "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600"
  );
});

Deno.test("getCacheHeaders - returns object with correct structure", () => {
  const publicHeaders = getCacheHeaders(60, 30, true);
  const privateHeaders = getCacheHeaders(60, 30, false);

  // Public headers should only have Cache-Control
  assertEquals(Object.keys(publicHeaders).length, 1);
  assertExists(publicHeaders["Cache-Control"]);

  // Private headers should have both Cache-Control and Vary
  assertEquals(Object.keys(privateHeaders).length, 2);
  assertExists(privateHeaders["Cache-Control"]);
  assertExists(privateHeaders["Vary"]);
});
