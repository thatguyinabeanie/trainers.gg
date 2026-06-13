/**
 * @jest-environment node
 */

// =============================================================================
// Mock setup — all jest.mock() calls must be hoisted above imports
// =============================================================================

const mockRpc = jest.fn();

const mockServiceRoleClient = {
  rpc: mockRpc,
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

/**
 * Stub the `check_rate_limit` RPC. The RPC returns a TABLE, so its `data` is an
 * array of decision rows; we model that here.
 */
function mockRpcDecision(
  decision: { allowed: boolean; reset_at: string } | null,
  error: { message: string } | null = null
) {
  mockRpc.mockResolvedValue({
    data: decision === null ? null : [decision],
    error,
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

  describe("RPC invocation", () => {
    it("calls check_rate_limit with the identifier, limit, and window", async () => {
      mockRpcDecision({
        allowed: true,
        reset_at: new Date().toISOString(),
      });

      await enforceRateLimit(baseOptions);

      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", {
        p_identifier: "user-abc",
        p_limit: 5,
        p_window_ms: 60_000,
      });
    });

    it("applies DEFAULT_API_LIMIT and DEFAULT_WINDOW_MS when omitted", async () => {
      mockRpcDecision({
        allowed: true,
        reset_at: new Date().toISOString(),
      });

      await enforceRateLimit({ identifier: "anon-1.2.3.4" });

      expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", {
        p_identifier: "anon-1.2.3.4",
        p_limit: DEFAULT_API_LIMIT,
        p_window_ms: DEFAULT_WINDOW_MS,
      });
    });
  });

  describe("allowed decision", () => {
    it("maps an allowed decision to allowed: true with remaining and resetAt", async () => {
      const resetAt = new Date(Date.now() + 30_000);
      mockRpcDecision({ allowed: true, reset_at: resetAt.toISOString() });

      const result = await enforceRateLimit(baseOptions);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(baseOptions.limit - 1);
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBe(resetAt.getTime());
    });
  });

  describe("denied decision (429 path)", () => {
    it("maps a denied decision to allowed: false with remaining 0", async () => {
      const resetAt = new Date(Date.now() + 45_000);
      mockRpcDecision({ allowed: false, reset_at: resetAt.toISOString() });

      const result = await enforceRateLimit(baseOptions);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      // resetAt is preserved so callers can build a Retry-After header.
      expect(result.resetAt.getTime()).toBe(resetAt.getTime());
    });
  });

  describe("error resilience (fail-open)", () => {
    it("fails open when the RPC returns an error", async () => {
      mockRpcDecision(null, { message: "connection refused" });

      const result = await enforceRateLimit(baseOptions);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(baseOptions.limit - 1);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it("fails open when the RPC returns no decision row", async () => {
      mockRpcDecision(null);

      const result = await enforceRateLimit(baseOptions);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(baseOptions.limit - 1);
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
