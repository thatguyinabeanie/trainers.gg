/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockGetAuditLog = jest.fn();
const mockGetPiiByUserIds = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolveApiAuth = jest.fn();
const mockIsSiteAdmin = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@trainers/supabase", () => ({
  getAuditLog: (...args: unknown[]) => mockGetAuditLog(...args),
  getPiiByUserIds: (...args: unknown[]) => mockGetPiiByUserIds(...args),
  isSiteAdmin: (...args: unknown[]) => mockIsSiteAdmin(...args),
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

/** Two audit log entries with actor data, no PII yet. */
const AUDIT_LOG_RESULT = {
  data: [
    {
      id: 1,
      action: "admin.role_granted",
      actor_user_id: "user-1",
      actor_user: {
        id: "user-1",
        username: "admin_trainer",
        image: null,
        first_name: null,
        last_name: null,
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
        first_name: null,
        last_name: null,
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

/** Same entries but with PII merged in. */
const AUDIT_LOG_RESULT_WITH_PII = {
  data: [
    {
      ...AUDIT_LOG_RESULT.data[0],
      actor_user: {
        ...AUDIT_LOG_RESULT.data[0]!.actor_user,
        first_name: "Admin",
        last_name: "Trainer",
      },
    },
    {
      ...AUDIT_LOG_RESULT.data[1],
      actor_user: {
        ...AUDIT_LOG_RESULT.data[1]!.actor_user,
        first_name: "Ash",
        last_name: "Ketchum",
      },
    },
  ],
  count: 2,
};

const PII_MAP = new Map([
  ["user-1", { first_name: "Admin", last_name: "Trainer" }],
  ["user-2", { first_name: "Ash", last_name: "Ketchum" }],
]);

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
  // First getAuditLog call (raw, no piiMap) returns raw result.
  // Second call (with piiMap) returns PII-enriched result.
  mockGetAuditLog
    .mockResolvedValueOnce(AUDIT_LOG_RESULT)
    .mockResolvedValueOnce(AUDIT_LOG_RESULT_WITH_PII);
  mockGetPiiByUserIds.mockResolvedValue(PII_MAP);
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
    expect(mockGetAuditLog).not.toHaveBeenCalled();
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
    expect(mockGetAuditLog).not.toHaveBeenCalled();
  });

  it("proceeds past the admin gate when isSiteAdmin returns true", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(mockGetAuditLog).toHaveBeenCalled();
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
    expect(mockGetAuditLog).not.toHaveBeenCalled();
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

  it("calls getAuditLog twice — first raw, then with piiMap populated", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest());

    // First call: no piiMap (raw fetch to collect actor IDs)
    expect(mockGetAuditLog).toHaveBeenCalledTimes(2);
    const firstCallOptions = (mockGetAuditLog.mock.calls[0] as unknown[])[1];
    expect(firstCallOptions).not.toHaveProperty("piiMap");

    // Second call: piiMap populated
    const secondCallOptions = (mockGetAuditLog.mock.calls[1] as unknown[])[1];
    expect(secondCallOptions).toHaveProperty("piiMap", PII_MAP);
  });

  it("calls getPiiByUserIds with the distinct actor IDs", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest());

    expect(mockGetPiiByUserIds).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.arrayContaining(["user-1", "user-2"])
    );
  });

  it("passes actions param as array to getAuditLog", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(
      makeRequest({
        actions: "admin.role_granted,admin.user_suspended",
      })
    );

    expect(mockGetAuditLog).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({
        actions: ["admin.role_granted", "admin.user_suspended"],
      })
    );
  });

  it("passes entityType param to getAuditLog", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ entityType: "tournament" }));

    expect(mockGetAuditLog).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ entityType: "tournament" })
    );
  });

  it("computes correct offset for page param", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ page: "2", limit: "10" }));

    expect(mockGetAuditLog).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ offset: 20, limit: 10 })
    );
  });

  it("clamps limit to MAX_LIMIT (200)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await GET(makeRequest({ limit: "9999" }));

    expect(mockGetAuditLog).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      expect.objectContaining({ limit: 200 })
    );
  });
});

// =============================================================================
// PII enrichment edge cases
// =============================================================================

describe("PII enrichment edge cases", () => {
  beforeEach(() => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);
  });

  it("skips the second getAuditLog call when there are no actor IDs", async () => {
    // Return a page with no actor_user references
    mockGetAuditLog.mockReset();
    mockGetAuditLog.mockResolvedValueOnce({ data: [], count: 0 });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    // Only called once (raw pass) — no second pass needed
    expect(mockGetAuditLog).toHaveBeenCalledTimes(1);
    expect(mockGetPiiByUserIds).not.toHaveBeenCalled();
  });

  it("falls back to raw result when getPiiByUserIds fails", async () => {
    mockGetPiiByUserIds.mockRejectedValueOnce(new Error("RPC error"));

    const response = await GET(makeRequest());

    // Should still return 200 with the raw (non-PII-enriched) data
    expect(response.status).toBe(200);
    const body = (await getJson(response)) as typeof AUDIT_LOG_RESULT;
    expect(body.count).toBe(2);
    // getAuditLog should only have been called once (the raw pass)
    expect(mockGetAuditLog).toHaveBeenCalledTimes(1);
  });

  it("deduplicates repeated actor IDs before calling getPiiByUserIds", async () => {
    // Return a log where the same actor appears twice
    const duplicateActorLog = {
      data: [
        {
          ...AUDIT_LOG_RESULT.data[0],
          id: 1,
          actor_user: {
            id: "user-1",
            username: "admin_trainer",
            image: null,
            first_name: null,
            last_name: null,
          },
        },
        {
          ...AUDIT_LOG_RESULT.data[0],
          id: 2,
          actor_user: {
            id: "user-1",
            username: "admin_trainer",
            image: null,
            first_name: null,
            last_name: null,
          },
        },
      ],
      count: 2,
    };
    mockGetAuditLog.mockReset();
    mockGetAuditLog
      .mockResolvedValueOnce(duplicateActorLog)
      .mockResolvedValueOnce(duplicateActorLog);

    await GET(makeRequest());

    // getPiiByUserIds should receive deduplicated IDs
    const calledIds = (
      mockGetPiiByUserIds.mock.calls[0] as unknown[]
    )[1] as string[];
    expect(calledIds).toHaveLength(1);
    expect(calledIds[0]).toBe("user-1");
  });
});
