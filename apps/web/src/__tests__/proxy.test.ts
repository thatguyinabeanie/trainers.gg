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

// Use actual proxy-routes (pure functions, no mocking needed)
jest.mock("@/lib/proxy-routes", () => jest.requireActual("@/lib/proxy-routes"));

import proxy from "../proxy";

// Helper to create a mock JWT token
function createMockJWT(payload: object): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = "mock-signature";
  return `${header}.${body}.${signature}`;
}

// Helper to create a NextRequest
function createRequest(
  path: string,
  base = "http://localhost:3000",
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest(new URL(path, base), { headers });
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

    it("should redirect for dynamic tournament match routes", async () => {
      createMockSupabaseClient({ user: null });

      const result = await proxy(
        createRequest("/tournaments/summer-2025/r/1/t/5")
      );

      expect(result.status).toBe(307);
      const location = new URL(result.headers.get("location")!);
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("redirect")).toBe(
        "/tournaments/summer-2025/r/1/t/5"
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

  // ── Public routes ─────────────────────────────────────────
  describe("public routes", () => {
    it("should pass through public routes for unauthenticated users", async () => {
      createMockSupabaseClient({ user: null });

      const result = await proxy(createRequest("/sign-in"));

      expect(result.headers.get("location")).toBeNull();
    });
  });

  // ── Subdomain rewrites ────────────────────────────────────
  describe("subdomain rewrites", () => {
    it("should rewrite dashboard.trainers.gg/ to /dashboard for authenticated users", async () => {
      createMockSupabaseClient({
        user: { id: "user-1", email: "u@test.com" },
      });

      const result = await proxy(
        createRequest("/", "http://dashboard.trainers.gg", {
          host: "dashboard.trainers.gg",
        })
      );

      const rewriteUrl = result.headers.get("x-middleware-rewrite");
      expect(rewriteUrl).toContain("/dashboard");
    });

    it("should rewrite dashboard.trainers.gg/overview to /dashboard/overview", async () => {
      createMockSupabaseClient({
        user: { id: "user-1", email: "u@test.com" },
      });

      const result = await proxy(
        createRequest("/overview", "http://dashboard.trainers.gg", {
          host: "dashboard.trainers.gg",
        })
      );

      const rewriteUrl = result.headers.get("x-middleware-rewrite");
      expect(rewriteUrl).toContain("/dashboard/overview");
    });

    it("should strip port suffix from host header for matching", async () => {
      createMockSupabaseClient({
        user: { id: "user-1", email: "u@test.com" },
      });

      const result = await proxy(
        createRequest("/", "http://builder.trainers.gg:3000", {
          host: "builder.trainers.gg:3000",
        })
      );

      const rewriteUrl = result.headers.get("x-middleware-rewrite");
      expect(rewriteUrl).toContain("/builder");
    });

    it("should NOT rewrite for non-mapped hostnames", async () => {
      const { mockResponse } = createMockSupabaseClient({
        user: { id: "user-1", email: "u@test.com" },
      });

      const result = await proxy(
        createRequest("/", "http://unknown.trainers.gg", {
          host: "unknown.trainers.gg",
        })
      );

      // No rewrite — returns the standard middleware response
      expect(result).toBe(mockResponse);
    });

    it("should enforce auth on subdomain protected routes", async () => {
      createMockSupabaseClient({ user: null });

      const result = await proxy(
        createRequest("/", "http://dashboard.trainers.gg", {
          host: "dashboard.trainers.gg",
        })
      );

      // dashboard.trainers.gg/ maps to /dashboard which is protected
      expect(result.status).toBe(307);
      const location = new URL(result.headers.get("location")!);
      expect(location.pathname).toBe("/sign-in");
      expect(location.searchParams.get("redirect")).toBe("/dashboard");
    });

    it("should carry session cookies on rewrite response", async () => {
      const { mockResponse } = createMockSupabaseClient({
        user: { id: "user-1", email: "u@test.com" },
      });
      // Simulate a session-refresh cookie on the middleware response
      mockResponse.cookies.set("sb-access-token", "refreshed-value");

      const result = await proxy(
        createRequest("/", "http://dashboard.trainers.gg", {
          host: "dashboard.trainers.gg",
        })
      );

      // The rewrite response should carry the session cookie
      const cookie = result.cookies.get("sb-access-token");
      expect(cookie?.value).toBe("refreshed-value");
    });
  });
});
