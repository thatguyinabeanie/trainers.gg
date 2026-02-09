/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies before imports
const mockCreateClient = jest.fn();
const mockCookies = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  getAll: jest.fn(),
};

jest.mock("@/lib/supabase/middleware", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => mockCookies),
}));

const mockIsMaintenanceModeEnabled = jest.fn();
jest.mock("@/lib/maintenance", () => ({
  isMaintenanceModeEnabled: () => mockIsMaintenanceModeEnabled(),
}));

// Use actual proxy-routes (pure functions, no mocking needed)
jest.mock("@/lib/proxy-routes", () => jest.requireActual("@/lib/proxy-routes"));

import proxy from "../proxy";

// Helper to create a mock JWT token
function createMockJWT(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const signature = "mock-signature";
  return `${header}.${body}.${signature}`;
}

// Helper to create a NextRequest
function createRequest(
  path: string,
  base = "http://localhost:3000"
): NextRequest {
  return new NextRequest(new URL(path, base));
}

// Helper to create a mock Supabase client + response pair
function createMockSupabaseClient(options: {
  user?: { id: string; email: string } | null;
  session?: { access_token: string } | null;
  getUserError?: { name: string; message: string } | null;
}) {
  const mockResponse = NextResponse.next();
  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: options.user ?? null },
        error: options.getUserError ?? null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: options.session ?? null },
        error: null,
      }),
    },
  };

  mockCreateClient.mockReturnValue({
    supabase: mockSupabase,
    response: mockResponse,
  });

  return { mockSupabase, mockResponse };
}

describe("proxy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMaintenanceModeEnabled.mockReturnValue(false);
  });

  // ── Static files / Next.js internals ──────────────────────
  describe("static files and internals", () => {
    it("should pass through static files", async () => {
      const result = await proxy(createRequest("/favicon.ico"));
      // NextResponse.next() returns a response without redirect headers
      expect(result.headers.get("location")).toBeNull();
    });

    it("should pass through _next paths", async () => {
      const result = await proxy(createRequest("/_next/static/main.js"));
      expect(result.headers.get("location")).toBeNull();
    });
  });

  // ── Unauthenticated + protected route ─────────────────────
  describe("protected routes (unauthenticated)", () => {
    it("should redirect to /sign-in with redirect param", async () => {
      createMockSupabaseClient({ user: null });

      const result = await proxy(createRequest("/dashboard"));

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get("location")!);
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("redirect")).toBe("/dashboard");
    });

    it("should redirect to /waitlist in maintenance mode", async () => {
      mockIsMaintenanceModeEnabled.mockReturnValue(true);
      createMockSupabaseClient({ user: null });

      const result = await proxy(createRequest("/dashboard"));

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get("location")!);
      expect(location.pathname).toBe("/waitlist");
    });

    it("should redirect for dynamic tournament match routes", async () => {
      createMockSupabaseClient({ user: null });

      const result = await proxy(
        createRequest("/tournaments/summer-2025/matches/round-1")
      );

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get("location")!);
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("redirect")).toBe(
        "/tournaments/summer-2025/matches/round-1"
      );
    });
  });

  // ── Authenticated + protected route ───────────────────────
  describe("protected routes (authenticated)", () => {
    it("should pass through for authenticated users", async () => {
      createMockSupabaseClient({
        user: { id: "user-123", email: "test@test.com" },
      });

      const result = await proxy(createRequest("/dashboard"));

      expect(result.headers.get("location")).toBeNull();
    });
  });

  // ── Admin routes ──────────────────────────────────────────
  describe("admin routes", () => {
    it("should redirect unauthenticated users to /sign-in", async () => {
      createMockSupabaseClient({ user: null });

      const result = await proxy(createRequest("/admin/users"));

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get("location")!);
      expect(location.pathname).toBe("/sign-in");
    });

    it("should rewrite non-admin users to /forbidden", async () => {
      createMockSupabaseClient({
        user: { id: "user-123", email: "test@test.com" },
        session: {
          access_token: createMockJWT({ site_roles: [] }),
        },
      });

      const result = await proxy(createRequest("/admin/users"));

      // Rewrite doesn't change status but changes the URL internally
      expect(result.headers.get("x-middleware-rewrite")).toContain(
        "/forbidden"
      );
    });

    it("should redirect admin without sudo cookie to /admin/sudo-required", async () => {
      createMockSupabaseClient({
        user: { id: "admin-123", email: "admin@test.com" },
        session: {
          access_token: createMockJWT({ site_roles: ["site_admin"] }),
        },
      });
      mockCookies.get.mockReturnValue(undefined); // No sudo cookie

      const result = await proxy(createRequest("/admin/users"));

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get("location")!);
      expect(location.pathname).toBe("/admin/sudo-required");
      expect(location.searchParams.get("redirect")).toBe("/admin/users");
    });

    it("should pass through admin with sudo cookie", async () => {
      const { mockResponse } = createMockSupabaseClient({
        user: { id: "admin-123", email: "admin@test.com" },
        session: {
          access_token: createMockJWT({ site_roles: ["site_admin"] }),
        },
      });
      mockCookies.get.mockReturnValue({ value: "active" }); // Sudo cookie present

      const result = await proxy(createRequest("/admin/users"));

      // Should return the middleware response (pass-through)
      expect(result).toBe(mockResponse);
    });

    it("should always pass through /admin/sudo-required (no infinite redirect)", async () => {
      const { mockResponse } = createMockSupabaseClient({
        user: { id: "admin-123", email: "admin@test.com" },
      });

      const result = await proxy(createRequest("/admin/sudo-required"));

      expect(result).toBe(mockResponse);
    });
  });

  // ── Maintenance mode ──────────────────────────────────────
  describe("maintenance mode", () => {
    beforeEach(() => {
      mockIsMaintenanceModeEnabled.mockReturnValue(true);
    });

    it("should redirect unauthenticated users on non-public routes to /waitlist", async () => {
      createMockSupabaseClient({ user: null });

      const result = await proxy(createRequest("/some-page"));

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get("location")!);
      expect(location.pathname).toBe("/waitlist");
    });

    it("should pass through public routes", async () => {
      createMockSupabaseClient({ user: null });

      const result = await proxy(createRequest("/sign-in"));

      expect(result.headers.get("location")).toBeNull();
    });

    it("should treat home page (/) as public", async () => {
      createMockSupabaseClient({ user: null });

      const result = await proxy(createRequest("/"));

      expect(result.headers.get("location")).toBeNull();
    });

    it("should pass through for authenticated users", async () => {
      createMockSupabaseClient({
        user: { id: "user-123", email: "test@test.com" },
      });

      const result = await proxy(createRequest("/some-page"));

      expect(result.headers.get("location")).toBeNull();
    });
  });
});
