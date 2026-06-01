import { describe, it, expect } from "@jest/globals";

import {
  ADMIN_ROUTES,
  PROTECTED_ROUTES,
  PROTECTED_PATTERNS,
  PUBLIC_ROUTES,
  STATIC_FILE_EXTENSIONS,
  isStaticFile,
  isPublicRoute,
  isProtectedRoute,
  isAdminRoute,
  isNextInternal,
  isOnboardingExempt,
  needsOnboarding,
} from "../proxy-routes";

describe("proxy-routes constants", () => {
  it("exports non-empty arrays", () => {
    expect(ADMIN_ROUTES.length).toBeGreaterThan(0);
    expect(PROTECTED_ROUTES.length).toBeGreaterThan(0);
    expect(PROTECTED_PATTERNS.length).toBeGreaterThan(0);
    expect(PUBLIC_ROUTES.length).toBeGreaterThan(0);
    expect(STATIC_FILE_EXTENSIONS.length).toBeGreaterThan(0);
  });
});

describe("isStaticFile", () => {
  it.each([
    "/favicon.ico",
    "/images/logo.png",
    "/assets/photo.jpg",
    "/assets/photo.jpeg",
    "/icon.svg",
    "/anim.gif",
    "/hero.webp",
    "/styles/main.css",
    "/bundle.js",
    "/fonts/inter.woff",
    "/fonts/inter.woff2",
    "/fonts/legacy.ttf",
    "/fonts/old.eot",
    "/manifest.json",
  ])("returns true for %s", (path) => {
    expect(isStaticFile(path)).toBe(true);
  });

  it.each(["/dashboard", "/sign-in", "/api/users", "/", "/.well-known/atproto-did"])(
    "returns false for %s",
    (path) => {
      expect(isStaticFile(path)).toBe(false);
    }
  );

  it("returns false for extension-like substrings mid-path", () => {
    expect(isStaticFile("/files.png/download")).toBe(false);
  });
});

describe("isPublicRoute", () => {
  it.each([
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/tournaments",
    "/tournaments/some-slug",
    "/tournaments/some-slug/details",
    "/communities",
    "/communities/my-community",
    "/organizations",
    "/organizations/legacy",
    "/players",
    "/players/rankings",
    "/user",
    "/user/ash_ketchum",
    "/alts",
    "/alts/some-alt",
    "/auth",
    "/auth/callback",
    "/api",
    "/api/webhooks/stripe",
    "/oauth",
    "/oauth/.well-known/jwks.json",
    "/.well-known",
    "/.well-known/atproto-did",
  ])("returns true for %s", (path) => {
    expect(isPublicRoute(path)).toBe(true);
  });

  // Special "/@" prefix — no "/" separator needed
  it("matches /@username without slash separator", () => {
    expect(isPublicRoute("/@ash_ketchum")).toBe(true);
    expect(isPublicRoute("/@someone/posts")).toBe(true);
  });

  it.each(["/dashboard", "/admin", "/", "/settings", "/dashboard/onboarding"])(
    "returns false for %s",
    (path) => {
      expect(isPublicRoute(path)).toBe(false);
    }
  );
});

describe("isProtectedRoute", () => {
  it.each([
    "/dashboard",
    "/dashboard/settings",
    "/dashboard/onboarding",
    "/communities/create",
    "/communities/create/step-2",
  ])("returns true for %s", (path) => {
    expect(isProtectedRoute(path)).toBe(true);
  });

  // Dynamic pattern: /tournaments/[slug]/r/[num]/t/[num]
  it.each([
    "/tournaments/worlds-2025/r/1/t/1",
    "/tournaments/worlds-2025/r/1/t/1/",
    "/tournaments/worlds-2025/r/12/t/99",
    "/tournaments/worlds-2025/r/1/t/1/chat",
  ])("returns true for match page pattern %s", (path) => {
    expect(isProtectedRoute(path)).toBe(true);
  });

  it.each([
    "/tournaments",
    "/tournaments/worlds-2025",
    "/tournaments/worlds-2025/r/1",
    "/tournaments/worlds-2025/r/abc/t/1",
    "/tournaments/worlds-2025/r/1/t/abc",
    "/sign-in",
    "/",
  ])("returns false for %s", (path) => {
    expect(isProtectedRoute(path)).toBe(false);
  });
});

describe("isAdminRoute", () => {
  it("returns true for /admin", () => {
    expect(isAdminRoute("/admin")).toBe(true);
  });

  it("returns true for /admin sub-paths", () => {
    expect(isAdminRoute("/admin/users")).toBe(true);
    expect(isAdminRoute("/admin/settings/advanced")).toBe(true);
  });

  it.each(["/dashboard", "/", "/administrator", "/sign-in"])(
    "returns false for %s",
    (path) => {
      expect(isAdminRoute(path)).toBe(false);
    }
  );
});

describe("isNextInternal", () => {
  it.each([
    "/_next/static/chunks/main.js",
    "/_next/data/build-id/page.json",
    "/__next/something",
  ])("returns true for %s", (path) => {
    expect(isNextInternal(path)).toBe(true);
  });

  it.each(["/next", "/dashboard", "/_notNext"])(
    "returns false for %s",
    (path) => {
      expect(isNextInternal(path)).toBe(false);
    }
  );
});

describe("isOnboardingExempt", () => {
  it("homepage / is exempt", () => {
    expect(isOnboardingExempt("/")).toBe(true);
  });

  it.each([
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/api/webhooks",
    "/oauth/.well-known/jwks.json",
    "/.well-known/atproto-did",
    "/dashboard/onboarding",
    "/dashboard/onboarding/step-2",
    "/players",
    "/players/rankings",
    "/user/ash_ketchum",
    "/@ash_ketchum",
    "/alts/my-alt",
    "/tournaments/worlds-2025",
    "/communities/my-community",
    "/organizations/legacy",
    "/builder",
    "/builder/team",
  ])("returns true for %s", (path) => {
    expect(isOnboardingExempt(path)).toBe(true);
  });

  it.each(["/dashboard", "/dashboard/settings"])(
    "returns false for %s (requires onboarding)",
    (path) => {
      expect(isOnboardingExempt(path)).toBe(false);
    }
  );
});

describe("needsOnboarding", () => {
  it.each(["temp_abc123", "temp_xyz", "user_abc123", "user_def456"])(
    "returns true for temp username %s",
    (username) => {
      expect(needsOnboarding(username)).toBe(true);
    }
  );

  it.each(["ash_ketchum", "admin_trainer", "misty", "brock123"])(
    "returns false for normal username %s",
    (username) => {
      expect(needsOnboarding(username)).toBe(false);
    }
  );

  it("returns false for non-string inputs", () => {
    expect(needsOnboarding(null)).toBe(false);
    expect(needsOnboarding(undefined)).toBe(false);
    expect(needsOnboarding(123)).toBe(false);
    expect(needsOnboarding({})).toBe(false);
    expect(needsOnboarding(true)).toBe(false);
  });
});
