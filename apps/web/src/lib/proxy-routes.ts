/**
 * Route classification helpers for proxy.ts
 *
 * Extracted for testability. All functions are pure — no side effects, no I/O.
 */

// Admin routes — require site_admin JWT role (checked separately from PROTECTED_ROUTES)
export const ADMIN_ROUTES = ["/admin"];

// Routes that require authentication
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/to-dashboard",
  "/communities/create",
  "/onboarding",
];

// Dynamic route patterns that require authentication (checked via regex)
export const PROTECTED_PATTERNS = [
  /^\/tournaments\/[^/]+\/r\/\d+\/t\/\d+(\/|$)/, // Match pages contain chat, teams, game data
];

// Routes that are always accessible without authentication
export const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/tournaments", // Browse tournaments (public directory)
  "/communities", // Browse communities (public directory)
  "/organizations", // Legacy redirect — redirects to /communities
  "/players", // Player directory (public)
  "/u", // Player profiles (public)
  "/auth",
  "/api",
  "/oauth", // OAuth JWKS and well-known files (AT Protocol requires no redirects)
  "/.well-known", // AT Protocol well-known paths (handle resolution)
];

// Static file extensions to skip
export const STATIC_FILE_EXTENSIONS = [
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".gif",
  ".webp",
  ".css",
  ".js",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".json", // Include JSON for OAuth JWKS and other static config files
];

export function isStaticFile(pathname: string): boolean {
  return STATIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return (
    PROTECTED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    ) || PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname))
  );
}

export function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function isNextInternal(pathname: string): boolean {
  return pathname.startsWith("/_next") || pathname.startsWith("/__next");
}

/**
 * Returns true when a username indicates the user still needs to complete
 * onboarding. OAuth sign-ups generate temporary usernames with "temp_" or
 * "user_" prefixes that must be replaced before the user can proceed.
 */
export function needsOnboarding(username: string | undefined): boolean {
  if (!username) return false;
  return username.startsWith("temp_") || username.startsWith("user_");
}
