import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

/**
 * Maintenance Mode Proxy (Next.js 16)
 *
 * When MAINTENANCE_MODE=true:
 * - Unauthenticated users are redirected to /maintenance
 * - Sign-up page shows waitlist form instead
 * - Sign-in page remains accessible
 * - Authenticated users can access all pages
 *
 * Allowed routes in maintenance mode (unauthenticated):
 * - /maintenance - maintenance landing page
 * - /sign-in - allow login
 * - /sign-up - shows waitlist form
 * - /forgot-password - allow password reset
 * - /reset-password - allow password reset
 * - /auth/* - OAuth callbacks
 * - /api/* - API routes (for waitlist submission, etc.)
 * - /_next/* - Next.js internals
 * - Static files
 */

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";

// Routes that are always accessible (even in maintenance mode)
const PUBLIC_ROUTES = [
  "/maintenance",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/api",
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // Redirect unauthenticated users to maintenance page
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
     * - Static assets (svg, png, jpg, etc.)
     *
     * Note: /api routes are included so Supabase session refresh runs.
     * Maintenance mode exclusions are handled in the proxy function.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
