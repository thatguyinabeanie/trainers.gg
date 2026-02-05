import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

/**
 * Proxy (Next.js 16 request interception)
 *
 * Three layers of route protection:
 *
 * 1. Admin routes (role-based + sudo mode):
 *    - /admin/* requires BOTH:
 *      a) The `site_admin` role in the JWT `site_roles` claim
 *      b) Active sudo mode session (explicitly activated)
 *    - Unauthenticated users are redirected to /sign-in
 *    - Authenticated non-admins are rewritten to /forbidden (preserves URL)
 *    - Site admins without sudo mode are redirected to /admin/sudo-required
 *
 * 2. Protected routes (auth required, always enforced):
 *    - /dashboard (includes /dashboard/settings, /dashboard/alts)
 *    - /to-dashboard, /onboarding, /organizations/create, /feed
 *    - /tournaments/[slug]/matches/* (match pages contain chat, teams, game data)
 *    - Unauthenticated users are redirected to /sign-in?redirect=<path>
 *
 * 3. Private beta / maintenance mode (when NEXT_PUBLIC_MAINTENANCE_MODE=true):
 *    - Unauthenticated users requesting non-public routes are redirected to /waitlist
 *    - Public routes (sign-in, sign-up, forgot/reset-password, waitlist) remain accessible
 *    - Authenticated users can access all pages
 *    - /auth/*, /api/*, /_next/*, static files are always allowed
 */

// Maintenance mode is read inside the function at runtime.

// Admin routes — require site_admin JWT role (checked separately from PROTECTED_ROUTES)
const ADMIN_ROUTES = ["/admin"];

// Routes that require authentication (enforced regardless of maintenance mode)
const PROTECTED_ROUTES = [
  "/dashboard",
  "/to-dashboard",
  "/onboarding",
  "/organizations/create",
  "/feed",
];

// Dynamic route patterns that require authentication (checked via regex)
const PROTECTED_PATTERNS = [
  /^\/tournaments\/[^/]+\/matches(\/|$)/, // Match pages contain chat, teams, game data
];

// Routes that are always accessible (even in maintenance mode)
const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/waitlist",
  "/invite", // Beta invite acceptance (unauthenticated users need access)
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
  return (
    PROTECTED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    ) || PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname))
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

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files and Next.js internals
  if (isStaticFile(pathname) || isNextInternal(pathname)) {
    return NextResponse.next();
  }

  // Read maintenance mode at runtime
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  // E2E test bypass: if the request has the correct bypass header, mock the authenticated user
  // This allows Playwright E2E tests to bypass server-side auth checks
  const e2eBypassSecret = process.env.E2E_AUTH_BYPASS_SECRET;
  const e2eBypassHeader = request.headers.get("x-e2e-auth-bypass");
  const isE2ETest = e2eBypassSecret && e2eBypassHeader === e2eBypassSecret;

  // Create Supabase client and refresh session
  const { supabase, response } = createClient(request);

  let user = null;

  if (isE2ETest) {
    // Mock authenticated user for E2E tests
    // The test user details must match the seeded user from apps/web/e2e/fixtures/auth.ts
    user = {
      id: "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e", // Matches player@trainers.local from seed
      email: "player@trainers.local",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as User;

    // Set a cookie so both Server Components and Client Components know we're in E2E test mode
    // Note: httpOnly is false so AuthProvider can read it via document.cookie
    response.cookies.set("e2e-test-mode", "true", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  } else {
    // Get current user (this also refreshes the session)
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
  }

  // Admin routes require site_admin role in JWT AND active sudo mode
  if (isAdminRoute(pathname)) {
    // Allow sudo-required page without sudo check (would cause infinite redirect)
    if (pathname === "/admin/sudo-required") {
      return response;
    }

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

    // Check for active sudo mode (site_admin role alone is not sufficient)
    const cookieStore = await cookies();
    const sudoCookie = cookieStore.get("sudo_mode");
    const hasSudoCookie = !!sudoCookie?.value;

    if (!hasSudoCookie) {
      // Site admin without sudo mode - redirect to sudo required page
      const sudoUrl = new URL("/admin/sudo-required", request.url);
      sudoUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(sudoUrl);
    }

    // Verify sudo session is still valid in database
    // (This is checked via RPC in the sudo utilities, but we do a quick cookie check here)
    // Full validation happens in server components that call requireSudoMode()
  }

  // Protected routes always require authentication (redirect to sign-in)
  // In maintenance mode, unauthenticated users on protected routes go to /waitlist instead
  if (!user && isProtectedRoute(pathname)) {
    if (maintenanceMode) {
      const waitlistUrl = new URL("/waitlist", request.url);
      return NextResponse.redirect(waitlistUrl);
    }
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // === PRIVATE BETA / MAINTENANCE MODE ===
  // Redirect unauthenticated users on non-public routes to /waitlist
  if (maintenanceMode && !user && !isPublicRoute(pathname)) {
    const waitlistUrl = new URL("/waitlist", request.url);
    return NextResponse.redirect(waitlistUrl);
  }

  return response;
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
