import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

/**
 * Request Proxy (Next.js 16)
 *
 * Three layers of route protection:
 *
 * 1. Admin routes (role-based):
 *    - /admin/* requires the `site_admin` role in the JWT `site_roles` claim
 *    - Unauthenticated users are redirected to /sign-in
 *    - Authenticated non-admins are rewritten to /forbidden (preserves URL)
 *
 * 2. Protected routes (auth required, always enforced):
 *    - /dashboard, /to-dashboard, /settings, /onboarding, /organizations/create, /feed
 *    - Unauthenticated users are redirected to /sign-in?redirect=<path>
 *
 * 3. Private beta / maintenance mode (when MAINTENANCE_MODE=true):
 *    - Unauthenticated users requesting non-public routes are redirected to /maintenance
 *    - Public routes (sign-in, sign-up, forgot/reset-password, maintenance) remain accessible
 *    - Authenticated users can access all pages
 *    - /auth/*, /api/*, /_next/*, static files are always allowed
 */

// Maintenance mode is read at runtime inside the proxy function
// to avoid build-time inlining issues with the Edge Runtime bundler.

// Admin routes — require site_admin JWT role (checked separately from PROTECTED_ROUTES)
const ADMIN_ROUTES = ["/admin"];

// Routes that require authentication (enforced regardless of maintenance mode)
const PROTECTED_ROUTES = [
  "/dashboard",
  "/to-dashboard",
  "/settings",
  "/onboarding",
  "/organizations/create",
  "/feed",
];

// Routes that are always accessible (even in maintenance mode)
const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/maintenance",
  "/auth",
  "/api",
  "/oauth", // OAuth JWKS and well-known files (AT Protocol requires no redirects)
  "/.well-known", // AT Protocol well-known paths (handle resolution)
];

// Static file extensions to skip
const STATIC_FILE_EXTENSIONS = [
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

function isStaticFile(pathname: string): boolean {
  return STATIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

function isPublicRoute(pathname: string): boolean {
  // Check exact matches and prefix matches
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isNextInternal(pathname: string): boolean {
  return pathname.startsWith("/_next") || pathname.startsWith("/__next");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files and Next.js internals
  if (isStaticFile(pathname) || isNextInternal(pathname)) {
    return NextResponse.next();
  }

  // Create Supabase client and refresh session
  const { supabase, response } = createClient(request);

  // Get current user (this also refreshes the session)
  let user = null;
  try {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    // AuthSessionMissingError is expected when user is not logged in — don't log it
    if (error && error.name !== "AuthSessionMissingError") {
      console.error("Failed to get user in proxy:", error);
    } else {
      user = authUser;
    }
  } catch (err) {
    console.error("Exception in proxy getUser():", err);
  }

  // Admin routes require site_admin role in JWT
  if (isAdminRoute(pathname)) {
    if (!user) {
      const signInUrl = new URL("/sign-in", request.url);
      return NextResponse.redirect(signInUrl);
    }

    // Decode JWT to check site_roles claim
    let isSiteAdmin = false;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const payload = JSON.parse(
          atob(session.access_token.split(".")[1]!)
        ) as { site_roles?: string[] };
        isSiteAdmin = payload?.site_roles?.includes("site_admin") ?? false;
      }
    } catch {
      isSiteAdmin = false;
    }

    if (!isSiteAdmin) {
      // Rewrite to /forbidden — preserves URL in browser
      const url = request.nextUrl.clone();
      url.pathname = "/forbidden";
      return NextResponse.rewrite(url);
    }
  }

  // Protected routes always require authentication
  if (!user && isProtectedRoute(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Read maintenance mode at runtime (not module scope) to avoid
  // build-time inlining issues with the Edge Runtime bundler
  const maintenanceMode =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true" ||
    process.env.MAINTENANCE_MODE === "true";

  // If not in maintenance mode, just refresh session and continue
  if (!maintenanceMode) {
    return response;
  }

  // === PRIVATE BETA / MAINTENANCE MODE LOGIC ===

  // If user is authenticated, allow access to everything
  if (user) {
    return response;
  }

  // User is not authenticated — check if route is allowed
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Redirect unauthenticated users to the maintenance landing page
  const maintenanceUrl = new URL("/maintenance", request.url);
  return NextResponse.redirect(maintenanceUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Static assets (svg, png, jpg, json, etc.)
     *
     * Note: /api routes are included so Supabase session refresh runs.
     * Maintenance mode exclusions are handled in the proxy function.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)",
  ],
};
