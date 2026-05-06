import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";
import { cookies } from "next/headers";
import {
  isStaticFile,
  isProtectedRoute,
  isAdminRoute,
  isNextInternal,
  needsOnboarding,
  isOnboardingExempt,
} from "@/lib/proxy-routes";

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
 *    - Admin routes always use the admin's real identity (impersonation is ignored)
 *
 * 2. Impersonation (admin acting as another user):
 *    - When impersonation cookie is set AND not on admin routes,
 *      the `x-impersonation-target` header is set so downstream
 *      code can optionally swap the effective user context
 *    - Impersonation requires an active sudo session
 *
 * 3. Protected routes (auth required, always enforced):
 *    - /dashboard/*, /communities/create
 *    - /tournaments/[slug]/r/[round]/t/[table]
 *    - See PROTECTED_ROUTES and PROTECTED_PATTERNS in proxy-routes.ts
 *    - Unauthenticated users are redirected to /sign-in?redirect=<path>
 *
 * 4. Onboarding gate (username required, always enforced):
 *    - ALL authenticated routes except auth flows, API, AT Protocol, and the onboarding page
 *    - Users with temp_/user_ usernames are redirected to /dashboard/onboarding
 *    - See isOnboardingExempt() in proxy-routes.ts for the exemption list
 */

// Auth/onboarding/admin checks run against the effective (rewritten) path,
// so subdomain requests receive the same protection as direct path access.
const subdomainRewriteMap: Record<string, string> = {
  "builder.trainers.gg": "/builder",
  "dashboard.trainers.gg": "/dashboard",
};

/** Paths that bypass subdomain rewriting — served as root-level routes even on subdomains. */
const SUBDOMAIN_EXEMPT_PATHS = ["/sign-in", "/sign-up"];

function isSubdomainExempt(pathname: string): boolean {
  return SUBDOMAIN_EXEMPT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * Create a redirect URL that accounts for subdomain rewriting.
 * When on a subdomain, strips the rewrite base prefix from the target path
 * so the subdomain rewrite doesn't double-prefix it.
 */
function createSubdomainAwareUrl(
  request: NextRequest,
  targetPath: string,
  rewriteBase: string | undefined
): URL {
  if (rewriteBase && targetPath.startsWith(rewriteBase)) {
    const stripped = targetPath.slice(rewriteBase.length) || "/";
    return new URL(stripped, request.url);
  }
  return new URL(targetPath, request.url);
}

/**
 * If the request came in on a mapped subdomain, rewrite the response to the
 * effective path and copy session-refresh cookies from the auth response.
 * Otherwise, return the auth response as-is.
 */
function applyRewrite(
  request: NextRequest,
  rewriteBase: string | undefined,
  pathname: string,
  response: NextResponse
): NextResponse {
  if (!rewriteBase) return response;

  const url = request.nextUrl.clone();
  url.pathname = `${rewriteBase}${pathname === "/" ? "" : pathname}`;
  const rewrite = NextResponse.rewrite(url);

  // Carry session-refresh cookies from the Supabase middleware response
  for (const cookie of response.cookies.getAll()) {
    rewrite.cookies.set(cookie);
  }

  return rewrite;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files and Next.js internals
  if (isStaticFile(pathname) || isNextInternal(pathname)) {
    return NextResponse.next();
  }

  // Determine if this is a subdomain request that needs rewriting.
  // We compute the effective pathname so all auth/route checks run against
  // the intended destination (e.g. dashboard.trainers.gg/ → /dashboard).
  // Auth paths (/sign-in, /sign-up) are exempt from rewriting to prevent
  // redirect loops (e.g. dashboard.trainers.gg/sign-in → /dashboard/sign-in → protected → loop).
  const hostname = request.headers.get("host")?.replace(/:\d+$/, "") ?? "";
  const rewriteBase = subdomainRewriteMap[hostname];
  const shouldRewrite = rewriteBase && !isSubdomainExempt(pathname);
  const effectivePathname = shouldRewrite
    ? `${rewriteBase}${pathname === "/" ? "" : pathname}`
    : pathname;

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

  // Admin routes require site_admin role in JWT AND active sudo mode
  if (isAdminRoute(effectivePathname)) {
    // Allow sudo-required page without sudo check (would cause infinite redirect)
    if (effectivePathname === "/admin/sudo-required") {
      return applyRewrite(request, rewriteBase, pathname, response);
    }

    if (!user) {
      const signInUrl = new URL("/sign-in", request.url);
      return NextResponse.redirect(signInUrl);
    }

    // Decode JWT to check site_roles claim.
    // getUser() above already authenticated the token with the Supabase Auth server.
    // We only read the signed access_token to decode JWT claims — never session.user.
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
    return applyRewrite(request, rewriteBase, pathname, response);
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
      // Verify the user is a site admin before propagating impersonation info.
      // getUser() above already authenticated the token — reading access_token here
      // is safe; we only decode signed JWT claims, never trust session.user.
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
      } catch (error) {
        // If JWT parsing fails, don't propagate impersonation
        console.error("[proxy] Failed to decode impersonation JWT:", error);
      }

      if (isAdmin) {
        response.headers.set(
          "x-impersonation-session",
          impersonationCookie.value
        );
      }
    }
  }

  // Authenticated users on auth pages should go to the dashboard
  if (
    user &&
    (effectivePathname === "/sign-in" || effectivePathname === "/sign-up")
  ) {
    return NextResponse.redirect(
      createSubdomainAwareUrl(request, "/dashboard", rewriteBase)
    );
  }

  // Protected routes always require authentication
  if (!user && isProtectedRoute(effectivePathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    // Use raw pathname on subdomains (the rewrite will re-add the prefix after auth)
    signInUrl.searchParams.set("redirect", rewriteBase ? pathname : effectivePathname);
    return NextResponse.redirect(signInUrl);
  }

  // Onboarding gate: users with temp usernames must complete setup
  // Applies to ALL routes except auth flows, API, and the onboarding page itself
  if (
    user &&
    !isOnboardingExempt(effectivePathname) &&
    needsOnboarding(user.user_metadata?.username)
  ) {
    return NextResponse.redirect(
      createSubdomainAwareUrl(request, "/dashboard/onboarding", rewriteBase)
    );
  }

  // Reverse gate: if user is on /dashboard/onboarding but already has a
  // permanent username, redirect them to the dashboard
  if (
    user &&
    effectivePathname.startsWith("/dashboard/onboarding") &&
    !needsOnboarding(user.user_metadata?.username)
  ) {
    return NextResponse.redirect(
      createSubdomainAwareUrl(request, "/dashboard/overview", rewriteBase)
    );
  }

  return applyRewrite(
    request,
    shouldRewrite ? rewriteBase : undefined,
    pathname,
    response
  );
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
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|\\.well-known/workflow/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)",
  ],
};
