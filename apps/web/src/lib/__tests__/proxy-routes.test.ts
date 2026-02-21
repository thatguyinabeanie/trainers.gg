/**
 * @jest-environment node
 */

import { describe, it, expect } from "@jest/globals";
import {
  isStaticFile,
  isPublicRoute,
  isPublicRouteDuringMaintenance,
  isProtectedRoute,
  isAdminRoute,
  isNextInternal,
  ADMIN_ROUTES,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  STATIC_FILE_EXTENSIONS,
} from "../proxy-routes";

describe("proxy-routes", () => {
  describe("isStaticFile", () => {
    it("should match common static file extensions", () => {
      expect(isStaticFile("/favicon.ico")).toBe(true);
      expect(isStaticFile("/images/logo.png")).toBe(true);
      expect(isStaticFile("/fonts/inter.woff2")).toBe(true);
      expect(isStaticFile("/oauth/jwks.json")).toBe(true);
      expect(isStaticFile("/styles/main.css")).toBe(true);
    });

    it("should not match route paths", () => {
      expect(isStaticFile("/dashboard")).toBe(false);
      expect(isStaticFile("/sign-in")).toBe(false);
      expect(isStaticFile("/api/health")).toBe(false);
    });

    it("should cover all declared extensions", () => {
      for (const ext of STATIC_FILE_EXTENSIONS) {
        expect(isStaticFile(`/file${ext}`)).toBe(true);
      }
    });
  });

  describe("isPublicRoute", () => {
    it("should match exact public routes", () => {
      expect(isPublicRoute("/sign-in")).toBe(true);
      expect(isPublicRoute("/sign-up")).toBe(true);
      expect(isPublicRoute("/forgot-password")).toBe(true);
      expect(isPublicRoute("/reset-password")).toBe(true);
      expect(isPublicRoute("/waitlist")).toBe(true);
      expect(isPublicRoute("/invite")).toBe(true);
      expect(isPublicRoute("/tournaments")).toBe(true);
      expect(isPublicRoute("/organizations")).toBe(true);
      expect(isPublicRoute("/auth")).toBe(true);
      expect(isPublicRoute("/api")).toBe(true);
      expect(isPublicRoute("/oauth")).toBe(true);
      expect(isPublicRoute("/.well-known")).toBe(true);
    });

    it("should match public route prefixes", () => {
      expect(isPublicRoute("/auth/callback")).toBe(true);
      expect(isPublicRoute("/api/health")).toBe(true);
      expect(isPublicRoute("/tournaments/summer-2025")).toBe(true);
      expect(isPublicRoute("/organizations/smogon")).toBe(true);
      expect(isPublicRoute("/.well-known/atproto-did")).toBe(true);
    });

    it("should not match non-public routes", () => {
      expect(isPublicRoute("/dashboard")).toBe(false);
      expect(isPublicRoute("/admin")).toBe(false);
      expect(isPublicRoute("/")).toBe(false);
      expect(isPublicRoute("/dashboard/settings")).toBe(false);
      expect(isPublicRoute("/feed")).toBe(false);
    });

    it("should cover all declared public routes", () => {
      for (const route of PUBLIC_ROUTES) {
        expect(isPublicRoute(route)).toBe(true);
        expect(isPublicRoute(`${route}/sub`)).toBe(true);
      }
    });
  });

  describe("isPublicRouteDuringMaintenance", () => {
    it("should treat home page as public during maintenance", () => {
      expect(isPublicRouteDuringMaintenance("/")).toBe(true);
    });

    it("should include all regular public routes", () => {
      expect(isPublicRouteDuringMaintenance("/sign-in")).toBe(true);
      expect(isPublicRouteDuringMaintenance("/waitlist")).toBe(true);
    });

    it("should not include protected routes", () => {
      expect(isPublicRouteDuringMaintenance("/dashboard")).toBe(false);
      expect(isPublicRouteDuringMaintenance("/admin")).toBe(false);
    });
  });

  describe("isProtectedRoute", () => {
    it("should match exact protected routes", () => {
      expect(isProtectedRoute("/dashboard")).toBe(true);
      expect(isProtectedRoute("/to-dashboard")).toBe(true);
      expect(isProtectedRoute("/organizations/create")).toBe(true);
      expect(isProtectedRoute("/feed")).toBe(true);
    });

    it("should match protected route prefixes", () => {
      expect(isProtectedRoute("/dashboard/settings")).toBe(true);
      expect(isProtectedRoute("/dashboard/alts")).toBe(true);
    });

    it("should match dynamic tournament match patterns", () => {
      expect(isProtectedRoute("/tournaments/abc/r/1/t/1")).toBe(true);
      expect(isProtectedRoute("/tournaments/abc/r/3/t/12")).toBe(true);
      expect(isProtectedRoute("/tournaments/summer-2025/r/1/t/5")).toBe(true);
    });

    it("should not match tournament routes without /r/.../t/...", () => {
      expect(isProtectedRoute("/tournaments/abc")).toBe(false);
      expect(isProtectedRoute("/tournaments")).toBe(false);
      expect(isProtectedRoute("/tournaments/abc/standings")).toBe(false);
      expect(isProtectedRoute("/tournaments/abc/matches")).toBe(false);
      expect(isProtectedRoute("/tournaments/abc/matches/1")).toBe(false);
    });

    it("should not match public or admin routes", () => {
      expect(isProtectedRoute("/sign-in")).toBe(false);
      expect(isProtectedRoute("/admin")).toBe(false);
      expect(isProtectedRoute("/")).toBe(false);
    });

    it("should cover all declared protected routes", () => {
      for (const route of PROTECTED_ROUTES) {
        expect(isProtectedRoute(route)).toBe(true);
      }
    });
  });

  describe("isAdminRoute", () => {
    it("should match /admin exactly", () => {
      expect(isAdminRoute("/admin")).toBe(true);
    });

    it("should match /admin sub-routes", () => {
      expect(isAdminRoute("/admin/users")).toBe(true);
      expect(isAdminRoute("/admin/sudo-required")).toBe(true);
    });

    it("should not match non-admin routes", () => {
      expect(isAdminRoute("/dashboard")).toBe(false);
      expect(isAdminRoute("/administrator")).toBe(false);
      expect(isAdminRoute("/")).toBe(false);
    });

    it("should cover all declared admin routes", () => {
      for (const route of ADMIN_ROUTES) {
        expect(isAdminRoute(route)).toBe(true);
        expect(isAdminRoute(`${route}/sub`)).toBe(true);
      }
    });
  });

  describe("isNextInternal", () => {
    it("should match _next paths", () => {
      expect(isNextInternal("/_next/static/chunks/main.js")).toBe(true);
      expect(isNextInternal("/_next/image?url=foo")).toBe(true);
      expect(isNextInternal("/_next/data/build-id/page.json")).toBe(true);
    });

    it("should match __next paths", () => {
      expect(isNextInternal("/__next/something")).toBe(true);
    });

    it("should not match regular routes", () => {
      expect(isNextInternal("/dashboard")).toBe(false);
      expect(isNextInternal("/next")).toBe(false);
      expect(isNextInternal("/about-next")).toBe(false);
    });
  });
});
