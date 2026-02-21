import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";
import { cookies } from "next/headers";
import { isMaintenanceModeEnabled } from "@/lib/maintenance";
import { isMaintenanceModeEnabledAsync } from "@/lib/maintenance-server";
import {
  isStaticFile,
  isPublicRouteDuringMaintenance,
  isProtectedRoute,
  isAdminRoute,
  isNextInternal,
} from "@/lib/proxy-routes";

/**
 * Proxy (Next.js 16 request interception)
 *
 * Four layers of route protection:
 *
 * 1. Admin routes (role-based + sudo mode):
 *    - /admin/* requires BOTH:
 *      a) The `site_admin` role in the JWT `site_roles` claim
 *      b) Active sudo mode session (explicitly activated)
 *    - Unauthenticated users are redirected to /sign-in
 *    - Authenticated non-admins are rewritten to /forbidden (preserves URL)
 *    - Site admins without sudo mode are redirected to /admin/sudo-required
 *    - Admin routes always use the admin's real identity (impersonation is ignored)
 *
 * 2. Impersonation (admin acting as another user):
 *    - When impersonation cookie is set AND not on admin routes,
 *      the `x-impersonation-target` header is set so downstream
 *      code can optionally swap the effective user context
 *    - Impersonation requires an active sudo session
 *
 * 3. Protected routes (auth required, always enforced):
 *    - /dashboard, /to-dashboard, /organizations/create, /feed
 *    - /tournaments/[slug]/r/[round]/t/[table]
 *    - Unauthenticated users are redirected to /sign-in?redirect=<path>
 *
 * 4. Private beta / maintenance mode:
 *    - Checks NEXT_PUBLIC_MAINTENANCE_MODE env var (sync, fast)
 *    - Also checks `maintenance_mode` feature flag in Supabase (async)
 *    - Unauthenticated users on non-public routes redirected to /waitlist
 */

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files and Next.js internals
  if (isStaticFile(pathname) || isNextInternal(pathname)) {
    return NextResponse.next();
  }

  // Fast sync check for maintenance mode (env var override)
  let maintenanceMode = isMaintenanceModeEnabled();

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

  // If env var didn't activate maintenance mode, check the DB feature flag
  if (!maintenanceMode) {
    try {
      maintenanceMode = await isMaintenanceModeEnabledAsync();
    } catch (err) {
      console.error("[proxy] Failed to check maintenance mode flag:", err);
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
    } catch (error) {
      console.error("[proxy] Failed to decode admin role from JWT:", error);
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

    // Admin routes always use the admin's real identity — no impersonation header
    return response;
  }

  // === IMPERSONATION ===
  // For non-admin routes, check if admin is impersonating another user.
  // Set a response header as a debugging aid (visible in DevTools).
  // The actual impersonation detection uses cookie-based DB lookups via
  // getImpersonationTarget(), not this header.
  // Only set the header if the user has the site_admin role (defense-in-depth).
  if (user) {
    const impersonationCookie = request.cookies.get("impersonation_mode");
    if (impersonationCookie?.value) {
      // Verify the user is a site admin before propagating impersonation info
      let isAdmin = false;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          const payload = JSON.parse(
            atob(session.access_token.split(".")[1]!)
          ) as { site_roles?: string[] };
          isAdmin = payload?.site_roles?.includes("site_admin") ?? false;
        }
      } catch {
        // If JWT parsing fails, don't propagate impersonation
      }

      if (isAdmin) {
        response.headers.set(
          "x-impersonation-session",
          impersonationCookie.value
        );
      }
    }
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
  // During maintenance mode, home page (/) is treated as public to display waitlist
  if (maintenanceMode && !user && !isPublicRouteDuringMaintenance(pathname)) {
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
