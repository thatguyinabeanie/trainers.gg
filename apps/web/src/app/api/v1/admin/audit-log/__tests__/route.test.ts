/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetAuditLogWithPii = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockIsSiteAdmin = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getAuditLogWithPii: (...args: unknown[]) => mockGetAuditLogWithPii(...args),
  isSiteAdmin: (...args: unknown[]) => mockIsSiteAdmin(...args),
  // Runtime enum allowlist the route validates the `actions` param against.
  Constants: {
    public: {
      Enums: {
        audit_action: [
          "admin.role_granted",
          "admin.user_suspended",
          "tournament.started",
          "registration.dropped",
        ],
      },
    },
  },
}));

jest.mock("@/lib/api/auth", () => ({
  resolveApiAuth: (...args: unknown[]) => mockResolveApiAuth(...args),
}));

jest.mock("@/lib/api/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mockEnforceRateLimit(...args),
  extractRequestIp: jest.fn(() => "127.0.0.1"),
  DEFAULT_API_LIMIT: 120,
  DEFAULT_WINDOW_MS: 60_000,
}));

jest.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: (...args: unknown[]) =>
    mockCreateServiceRoleClient(...args),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { NextRequest } from "next/server";

import { GET } from "../route";

// =============================================================================
// Helpers
// =============================================================================

/** Two audit log entries with PII merged in (single-fetch result). */
const AUDIT_LOG_RESULT_WITH_PII = {
  data: [
    {
      id: 1,
      action: "admin.role_granted",
      actor_user_id: "user-1",
      actor_user: {
        id: "user-1",
        username: "admin_trainer",
        image: null,
        first_name: "Admin",
        last_name: "Trainer",
      },
      created_at: "2025-01-01T00:00:00Z",
      tournament_id: null,
      match_id: null,
      community_id: null,
      metadata: {},
    },
    {
      id: 2,
      action: "tournament.started",
      actor_user_id: "user-2",
      actor_user: {
        id: "user-2",
        username: "ash_ketchum",
        image: null,
        first_name: "Ash",
        last_name: "Ketchum",
      },
      created_at: "2025-01-02T00:00:00Z",
      tournament_id: 99,
      match_id: null,
      community_id: null,
      metadata: {},
    },
  ],
  count: 2,
};

const AUTHED_COOKIE = {
  mode: "cookie" as const,
  userId: "admin-user-1",
  supabase: {},
};
const AUTHED_BEARER = {
  mode: "bearer" as const,
  userId: "admin-user-bearer-1",
  supabase: {},
};
const RATE_LIMIT_OK = { allowed: true, remaining: 119, resetAt: new Date() };
const RATE_LIMIT_DENIED = {
  allowed: false,
  remaining: 0,
  resetAt: new Date("2030-01-01"),
};

/** Stub service-role client — queries receive this object. */
const SERVICE_ROLE_CLIENT = { __serviceRole: true };

function makeRequest(
  options: {
    token?: string;
    actions?: string;
    entityType?: string;
    page?: string;
    limit?: string;
  } = {}
): NextRequest {
  const headers: Record<string, string> = {};
  if (options.token !== undefined) {
    headers["authorization"] = `Bearer ${options.token}`;
  }

  const url = new URL("http://localhost:3000/api/v1/admin/audit-log");
  if (options.actions) url.searchParams.set("actions", options.actions);
  if (options.entityType)
    url.searchParams.set("entityType", options.entityType);
  if (options.page) url.searchParams.set("page", options.page);
  if (options.limit) url.searchParams.set("limit", options.limit);

  return new NextRequest(url.toString(), { headers });
}

async function getJson(response: Response) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateServiceRoleClient.mockReturnValue(SERVICE_ROLE_CLIENT);
  // Single-fetch helper returns PII-enriched result directly.
  mockGetAuditLogWithPii.mockResolvedValue(AUDIT_LOG_RESULT_WITH_PII);
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
  // Default: anonymous — tests that need auth must override.
  mockResolveApiAuth.mockResolvedValue(null);
  // Default: not admin — tests that need admin must override.
  mockIsSiteAdmin.mockResolvedValue(false);
});

// =============================================================================
// Authentication
// =============================================================================

describe("authentication", () => {
  it("returns 401 for an anonymous request (no cookie, no bearer)", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(await getJson(response)).toEqual({ error: "Not authenticated" });
    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
    expect(mockGetAuditLogWithPii).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Admin gate
// =============================================================================

describe("admin gate", () => {
  it("returns 403 when the authenticated user is not a site admin", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(false);

    const response = await GET(makeRequest());

    expect(response.status).toBe(403);
    expect(await getJson(response)).toEqual({ error: "Forbidden" });
    expect(mockGetAuditLogWithPii).not.toHaveBeenCalled();
  });

  it("proceeds past the admin gate when isSiteAdmin returns true", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(mockGetAuditLogWithPii).toHaveBeenCalled();
  });
});

// =============================================================================
// Rate limiting
// =============================================================================

describe("rate limiting", () => {
  it("returns 429 when rate limit is exceeded", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const response = await GET(makeRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
    expect(mockGetAuditLogWithPii).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Success — response shape and PII enrichment
// =============================================================================

describe("success", () => {
  beforeEach(() => {
    mockIsSiteAdmin.mockResolvedValue(true);
  });

  it("returns 200 + enriched audit log for a valid web cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await getJson(response);
    expect(body).toEqual(AUDIT_LOG_RESULT_WITH_PII);
  });

  it("returns 200 + enriched audit log for a valid mobile Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);

    const response = await GET(makeRequest({ token: "valid-jwt" }));

    expect(response.status).toBe(200);
    const body = (await getJson(response)) as typeof AUDIT_LOG_RESULT_WITH_PII;
    expect(body.data).toHaveLength(2);
  });

  it("sets Cache-Control: private, no-store on success", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    const response = await GET(makeRequest());

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("calls getAuditLogWithPii exactly once — no double-fetch", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest());

    // Single round-trip: the helper handles PII enrichment internally.
    expect(mockGetAuditLogWithPii).toHaveBeenCalledTimes(1);
  });

  it("passes actions param as array to getAuditLogWithPii", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(
      makeRequest({
        actions: "admin.role_granted,admin.user_suspended",
      })
    );

    expect(mockGetAuditLogWithPii).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({
        actions: ["admin.role_granted", "admin.user_suspended"],
      })
    );
  });

  it("drops unknown action values before querying (enum allowlist)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ actions: "admin.role_granted,not_a_real_action" }));

    expect(mockGetAuditLogWithPii).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ actions: ["admin.role_granted"] })
    );
  });

  it("applies no action filter when every requested action is invalid", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ actions: "bogus,also_bogus" }));

    const opts = (mockGetAuditLogWithPii.mock.calls[0] as unknown[])[1] as {
      actions?: unknown;
    };
    expect(opts.actions).toBeUndefined();
  });

  it("passes entityType param to getAuditLogWithPii", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ entityType: "tournament" }));

    expect(mockGetAuditLogWithPii).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ entityType: "tournament" })
    );
  });

  it("computes correct offset for page param", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ page: "2", limit: "10" }));

    expect(mockGetAuditLogWithPii).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ offset: 20, limit: 10 })
    );
  });

  it("clamps limit to MAX_LIMIT (200)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ limit: "9999" }));

    expect(mockGetAuditLogWithPii).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ limit: 200 })
    );
  });
});

// =============================================================================
// Empty result
// =============================================================================

describe("empty result", () => {
  beforeEach(() => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);
  });

  it("returns 200 with empty data when there are no log entries", async () => {
    mockGetAuditLogWithPii.mockResolvedValueOnce({ data: [], count: 0 });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = (await getJson(response)) as {
      data: unknown[];
      count: number;
    };
    expect(body.data).toHaveLength(0);
    expect(body.count).toBe(0);
    // Still only one call — even for empty pages.
    expect(mockGetAuditLogWithPii).toHaveBeenCalledTimes(1);
  });
});
