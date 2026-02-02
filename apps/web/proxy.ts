import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

/**
 * Request Proxy (Next.js 16)
 *
 * Two layers of route protection:
 *
 * 1. Protected routes (always enforced):
 *    - /dashboard, /to-dashboard require authentication
 *    - Unauthenticated users are redirected to /sign-in?redirect=<path>
 *
 * 2. Maintenance mode (when MAINTENANCE_MODE=true):
 *    - Unauthenticated users requesting non-public routes are redirected to /sign-in
 *    - Routes in PUBLIC_ROUTES (sign-in, sign-up, forgot/reset-password) remain accessible
 *    - Authenticated users can access all pages
 *    - /auth/*, /api/*, /_next/*, static files are always allowed
 */

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";

// Routes that require authentication (enforced regardless of maintenance mode)
const PROTECTED_ROUTES = ["/dashboard", "/to-dashboard"];

// Routes that are always accessible (even in maintenance mode)
const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
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

    // AuthSessionMissingError is expected when user is not logged in - don't log it
    if (error && error.name !== "AuthSessionMissingError") {
      console.error("Failed to get user in proxy:", error);
    } else {
      user = authUser;
    }
  } catch (err) {
    console.error("Exception in proxy getUser():", err);
  }

  // Protected routes always require authentication
  if (!user && isProtectedRoute(pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If not in maintenance mode, just refresh session and continue
  if (!MAINTENANCE_MODE) {
    return response;
  }

  // === MAINTENANCE MODE LOGIC ===

  // If user is authenticated, allow access to everything
  if (user) {
    return response;
  }

  // User is not authenticated - check if route is allowed
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Redirect unauthenticated users to sign-in page
  const signInUrl = new URL("/sign-in", request.url);
  return NextResponse.redirect(signInUrl);
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
