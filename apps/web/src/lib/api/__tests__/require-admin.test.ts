/**
 * @jest-environment node
 */

// =============================================================================
// Mocks — declared before imports so Jest hoisting works correctly
// =============================================================================

const mockResolveApiAuth = jest.fn();
const mockIsSiteAdmin = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockCreateServiceRoleClient = jest.fn();

jest.mock("@/lib/api/auth", () => ({
  resolveApiAuth: (...args: unknown[]) => mockResolveApiAuth(...args),
}));

jest.mock("@trainers/supabase", () => ({
  isSiteAdmin: (...args: unknown[]) => mockIsSiteAdmin(...args),
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

import { NextRequest, NextResponse } from "next/server";

import { requireApiAdmin } from "../require-admin";

// =============================================================================
// Fixtures
// =============================================================================

const SERVICE_ROLE_CLIENT = { __serviceRole: true };

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

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token !== undefined) {
    headers["authorization"] = `Bearer ${token}`;
  }
  return new NextRequest("http://localhost:3000/api/v1/admin/whatever", {
    headers,
  });
}

async function getJson(response: NextResponse) {
  return (await response.json()) as unknown;
}

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateServiceRoleClient.mockReturnValue(SERVICE_ROLE_CLIENT);
  mockResolveApiAuth.mockResolvedValue(null); // default: anonymous
  mockIsSiteAdmin.mockResolvedValue(false); // default: not admin
  mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_OK);
});

// =============================================================================
// 401 — anonymous request
// =============================================================================

describe("401 — anonymous / unauthenticated request", () => {
  it("returns a NextResponse with status 401 when resolveApiAuth returns null", async () => {
    const result = await requireApiAdmin(makeRequest());

    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(res.status).toBe(401);
    expect(await getJson(res)).toEqual({ error: "Not authenticated" });
  });

  it("does not call isSiteAdmin or enforceRateLimit when unauthenticated", async () => {
    await requireApiAdmin(makeRequest());

    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
    expect(mockEnforceRateLimit).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 403 — authenticated but not admin
// =============================================================================

describe("403 — authenticated but not a site admin", () => {
  it("returns a NextResponse with status 403 when isSiteAdmin returns false", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(false);

    const result = await requireApiAdmin(makeRequest());

    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(res.status).toBe(403);
    expect(await getJson(res)).toEqual({ error: "Forbidden" });
  });

  it("calls enforceRateLimit before the admin check (rate-limit precedes the DB read)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(false);

    await requireApiAdmin(makeRequest());

    expect(mockEnforceRateLimit).toHaveBeenCalled();
  });

  it("calls isSiteAdmin with the service-role client and the userId", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);

    await requireApiAdmin(makeRequest());

    expect(mockIsSiteAdmin).toHaveBeenCalledWith(
      SERVICE_ROLE_CLIENT,
      AUTHED_COOKIE.userId
    );
  });
});

// =============================================================================
// 429 — rate limit exceeded
// =============================================================================

describe("429 — rate limit exceeded", () => {
  it("returns a NextResponse with status 429 and Retry-After header", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    const result = await requireApiAdmin(makeRequest());

    expect(result).toBeInstanceOf(NextResponse);
    const res = result as NextResponse;
    expect(res.status).toBe(429);
    expect(await getJson(res)).toEqual({ error: "Too many requests" });
    expect(res.headers.get("retry-after")).toBeTruthy();
  });
});

// =============================================================================
// Success — returns AdminGateSuccess
// =============================================================================

describe("success — returns { serviceRole, userId }", () => {
  it("returns the service-role client and userId for a valid cookie session", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);

    const result = await requireApiAdmin(makeRequest());

    expect(result).not.toBeInstanceOf(NextResponse);
    const gate = result as { serviceRole: unknown; userId: string };
    expect(gate.serviceRole).toBe(SERVICE_ROLE_CLIENT);
    expect(gate.userId).toBe(AUTHED_COOKIE.userId);
  });

  it("returns the service-role client and userId for a valid Bearer token", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_BEARER);
    mockIsSiteAdmin.mockResolvedValue(true);

    const result = await requireApiAdmin(makeRequest("valid-jwt"));

    expect(result).not.toBeInstanceOf(NextResponse);
    const gate = result as { serviceRole: unknown; userId: string };
    expect(gate.serviceRole).toBe(SERVICE_ROLE_CLIENT);
    expect(gate.userId).toBe(AUTHED_BEARER.userId);
  });

  it("creates the service-role client exactly once (reused for isSiteAdmin + caller)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);

    await requireApiAdmin(makeRequest());

    expect(mockCreateServiceRoleClient).toHaveBeenCalledTimes(1);
  });

  it("uses userId as the rate-limit identifier when authed", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockIsSiteAdmin.mockResolvedValue(true);

    await requireApiAdmin(makeRequest());

    expect(mockEnforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: AUTHED_COOKIE.userId })
    );
  });
});

// =============================================================================
// Gate order — verify the sequence auth → rate-limit → admin
// =============================================================================

describe("gate ordering", () => {
  it("checks auth before admin (isSiteAdmin not called on anon)", async () => {
    mockResolveApiAuth.mockResolvedValue(null);

    await requireApiAdmin(makeRequest());

    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
  });

  it("checks rate-limit before admin (isSiteAdmin not called when rate-limited)", async () => {
    mockResolveApiAuth.mockResolvedValue(AUTHED_COOKIE);
    mockEnforceRateLimit.mockResolvedValue(RATE_LIMIT_DENIED);

    await requireApiAdmin(makeRequest());

    expect(mockIsSiteAdmin).not.toHaveBeenCalled();
  });
});
