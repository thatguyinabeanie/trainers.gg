/**
 * @jest-environment node
 */

// =============================================================================
// Mock setup — all jest.mock() calls must be hoisted above imports
// =============================================================================

// Chainable Supabase query builder
const mockMaybeSingle = jest.fn();
const mockUpsert = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

const mockServiceRoleClient = {
  from: mockFrom,
};

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: jest.fn(() => mockServiceRoleClient),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "../rate-limit";

// =============================================================================
// Helpers
// =============================================================================

function buildQueryChain(selectResult: unknown, upsertResult: unknown) {
  mockMaybeSingle.mockResolvedValue(selectResult);
  mockUpsert.mockResolvedValue(upsertResult);
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockImplementation((table: string) => {
    if (table === "rate_limits") {
      return {
        select: mockSelect,
        upsert: mockUpsert,
      };
    }
    return {};
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// Constants
// =============================================================================

describe("rate-limit constants", () => {
  it("exports DEFAULT_API_LIMIT = 120", () => {
    expect(DEFAULT_API_LIMIT).toBe(120);
  });

  it("exports DEFAULT_WINDOW_MS = 60_000", () => {
    expect(DEFAULT_WINDOW_MS).toBe(60_000);
  });
});

// =============================================================================
// enforceRateLimit
// =============================================================================

describe("enforceRateLimit", () => {
  const baseOptions = {
    identifier: "user-abc",
    limit: 5,
    windowMs: 60_000,
  };

  describe("under-limit behaviour", () => {
    it("allows the request and decrements remaining when below limit", async () => {
      // Two recent timestamps inside the window
      const now = Date.now();
      const inWindowTs = [
        new Date(now - 10_000).toISOString(),
        new Date(now - 5_000).toISOString(),
      ];

      buildQueryChain(
        { data: { request_timestamps: inWindowTs }, error: null },
        { error: null }
      );

      const result = await enforceRateLimit(baseOptions);

      expect(result.allowed).toBe(true);
      // 2 in-window + 1 appended now = 3 used → 5 - 3 = 2 remaining
      expect(result.remaining).toBe(2);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it("allows when no prior row exists (first request)", async () => {
      buildQueryChain(
        { data: null, error: null },
        { error: null }
      );

      const result = await enforceRateLimit(baseOptions);

      expect(result.allowed).toBe(true);
      // 0 in-window + 1 appended = 1 used → 5 - 1 = 4 remaining
      expect(result.remaining).toBe(4);
    });

    it("upserts the new timestamp list when allowed", async () => {
      const now = Date.now();
      const inWindowTs = [new Date(now - 1_000).toISOString()];

      buildQueryChain(
        { data: { request_timestamps: inWindowTs }, error: null },
        { error: null }
      );

      await enforceRateLimit(baseOptions);

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      const [upsertPayload] = mockUpsert.mock.calls[0] as [{ request_timestamps: string[] }, unknown];
      // Should include the original in-window timestamp plus the newly appended one
      expect(upsertPayload.request_timestamps).toHaveLength(2);
      expect(upsertPayload.identifier).toBe("user-abc");
    });
  });

  describe("over-limit behaviour", () => {
    it("denies the request when at the limit", async () => {
      const now = Date.now();
      // Exactly `limit` (5) timestamps inside the window
      const inWindowTs = [
        new Date(now - 50_000).toISOString(),
        new Date(now - 40_000).toISOString(),
        new Date(now - 30_000).toISOString(),
        new Date(now - 20_000).toISOString(),
        new Date(now - 10_000).toISOString(),
      ];

      buildQueryChain(
        { data: { request_timestamps: inWindowTs }, error: null },
        { error: null }
      );

      const result = await enforceRateLimit(baseOptions);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("does NOT append a new timestamp when denied", async () => {
      const now = Date.now();
      const inWindowTs = Array.from({ length: 5 }, (_, i) =>
        new Date(now - (50_000 - i * 5_000)).toISOString()
      );

      buildQueryChain(
        { data: { request_timestamps: inWindowTs }, error: null },
        { error: null }
      );

      await enforceRateLimit(baseOptions);

      const [upsertPayload] = mockUpsert.mock.calls[0] as [{ request_timestamps: string[] }, unknown];
      // Should still be 5 — no new timestamp appended on denial
      expect(upsertPayload.request_timestamps).toHaveLength(5);
    });
  });

  describe("window expiry / pruning", () => {
    it("prunes stale timestamps and resets available capacity", async () => {
      const now = Date.now();
      // 3 old timestamps (outside window) + 1 recent (inside window)
      const timestamps = [
        new Date(now - 120_000).toISOString(), // 2 min ago — outside 1-min window
        new Date(now - 90_000).toISOString(),  // 1.5 min ago — outside
        new Date(now - 75_000).toISOString(),  // 1.25 min ago — outside
        new Date(now - 5_000).toISOString(),   // 5 sec ago — inside
      ];

      buildQueryChain(
        { data: { request_timestamps: timestamps }, error: null },
        { error: null }
      );

      const result = await enforceRateLimit(baseOptions);

      // Only 1 in-window timestamp, so after appending now: 2 used → 3 remaining
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it("allows a full limit's worth of requests after the window fully expires", async () => {
      const now = Date.now();
      // All timestamps older than windowMs — effectively expired
      const expiredTimestamps = Array.from({ length: 5 }, (_, i) =>
        new Date(now - (120_000 + i * 1_000)).toISOString()
      );

      buildQueryChain(
        { data: { request_timestamps: expiredTimestamps }, error: null },
        { error: null }
      );

      const result = await enforceRateLimit(baseOptions);

      // All pruned → 0 in-window → 1 appended now → 4 remaining
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("sets resetAt to when the oldest in-window timestamp leaves the window", async () => {
      const now = Date.now();
      const oldestInWindow = new Date(now - 30_000); // 30 sec ago
      const inWindowTs = [oldestInWindow.toISOString()];

      buildQueryChain(
        { data: { request_timestamps: inWindowTs }, error: null },
        { error: null }
      );

      const result = await enforceRateLimit(baseOptions);

      // resetAt should be approximately oldestInWindow + windowMs (30 sec from now)
      const expectedResetAt = new Date(
        oldestInWindow.getTime() + baseOptions.windowMs
      );
      expect(result.resetAt.getTime()).toBeCloseTo(expectedResetAt.getTime(), -2);
    });
  });

  describe("error resilience (fail-open)", () => {
    it("fails open on a fetch error", async () => {
      buildQueryChain(
        { data: null, error: { message: "connection refused" } },
        { error: null }
      );

      const result = await enforceRateLimit(baseOptions);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(baseOptions.limit - 1);
    });

    it("still returns allowed on an upsert error after a successful fetch", async () => {
      const now = Date.now();
      const inWindowTs = [new Date(now - 5_000).toISOString()];

      buildQueryChain(
        { data: { request_timestamps: inWindowTs }, error: null },
        { error: { message: "deadlock detected" } }
      );

      const result = await enforceRateLimit(baseOptions);

      // The rate-limit calculation already completed; the upsert failure does not
      // flip the allow/deny decision — we fail open to avoid blocking traffic.
      expect(result.allowed).toBe(true);
    });
  });
});

// =============================================================================
// extractRequestIp
// =============================================================================

describe("extractRequestIp", () => {
  function makeRequest(headers: Record<string, string>): Request {
    return new Request("https://example.com/api/test", { headers });
  }

  it("returns the first hop of x-forwarded-for", () => {
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4, 10.0.0.1, 10.0.0.2",
    });
    expect(extractRequestIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace from the IP", () => {
    const req = makeRequest({ "x-forwarded-for": "  5.6.7.8  , proxy" });
    expect(extractRequestIp(req)).toBe("5.6.7.8");
  });

  it("returns the single IP when there is no comma", () => {
    const req = makeRequest({ "x-forwarded-for": "9.10.11.12" });
    expect(extractRequestIp(req)).toBe("9.10.11.12");
  });

  it("falls back to 'unknown' when the header is absent", () => {
    const req = makeRequest({});
    expect(extractRequestIp(req)).toBe("unknown");
  });
});
