import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";

// Auth pages that require unauthenticated state
const authPages = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];

// Pages that don't require profile completion
const noProfileCheckPages = [
  "/onboarding",
  "/auth/callback",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
];

// Public pages that don't require authentication
const publicPages = [
  "/",
  "/coming-soon",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/onboarding",
  "/forbidden",
  // Public content pages
  "/tournaments",
  "/organizations",
  "/players",
  "/articles",
  "/teams",
  "/draft-leagues",
  "/home",
  "/about",
];

// Pages that require site admin role
const siteAdminPages = ["/admin"];

function isAuthPage(pathname: string): boolean {
  return authPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
}

function isPublicPage(pathname: string): boolean {
  return publicPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
}

function requiresProfileCheck(pathname: string): boolean {
  return !noProfileCheckPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
}

function isSiteAdminPage(pathname: string): boolean {
  return siteAdminPages.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static assets and Next.js internals
  const isStaticAsset = pathname.includes(".") || pathname.startsWith("/_next");
  const isAuthAPI =
    pathname.startsWith("/api/auth") || pathname.startsWith("/auth/callback");
  const isWebhookAPI = pathname.startsWith("/api/webhooks");

  if (isStaticAsset || isAuthAPI) {
    return NextResponse.next();
  }

  // Webhook security checks
  if (isWebhookAPI) {
    // Block authenticated users from accessing webhooks
    const authHeader = request.headers.get("authorization");
    const supabaseAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-"));

    if (authHeader || supabaseAuthCookie) {
      console.warn("Authenticated user blocked from webhook", { pathname });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate User-Agent (Svix webhooks)
    const userAgent = request.headers.get("user-agent");
    if (!userAgent || !userAgent.includes("Svix-Webhooks")) {
      console.warn("Invalid User-Agent for webhook", { pathname, userAgent });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Payload size limit
    const contentLength = request.headers.get("content-length");
    const maxPayloadSize = 1024 * 1024; // 1MB
    if (contentLength && parseInt(contentLength) > maxPayloadSize) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    return NextResponse.next();
  }

  // Maintenance mode - redirect all non-essential routes to /coming-soon
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";
  if (isMaintenanceMode) {
    const maintenanceAllowedPaths = [
      "/",
      "/coming-soon",
      "/sign-in",
      "/sign-up",
      "/forgot-password",
      "/reset-password",
    ];
    const isAllowedPath = maintenanceAllowedPaths.includes(pathname);

    if (!isAllowedPath) {
      return NextResponse.redirect(new URL("/coming-soon", request.url));
    }
  }

  // Refresh Supabase session on each request
  const { supabase, response } = await refreshSession(request);

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[middleware]", {
    pathname,
    userId: user?.id ?? "none",
    isPublic: isPublicPage(pathname),
    isSiteAdmin: isSiteAdminPage(pathname),
  });

  // Handle auth pages - redirect authenticated users away
  if (isAuthPage(pathname)) {
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Allow public pages without authentication
  if (isPublicPage(pathname)) {
    return response;
  }

  // Protect all other pages - require authentication
  if (!user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check if user needs to complete onboarding
  if (requiresProfileCheck(pathname)) {
    // Check user metadata for onboarding status (fast check)
    const onboardingCompleted = user.user_metadata?.onboarding_completed;

    if (!onboardingCompleted) {
      // Redirect to onboarding page
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // Check site admin access for /admin routes
  if (isSiteAdminPage(pathname)) {
    // Get the session to access JWT claims
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check the is_site_admin claim from the JWT (set by custom_access_token_hook)
    // The claim is added to the access token by the Postgres hook function
    let isSiteAdmin = false;
    if (session?.access_token) {
      try {
        const payload = session.access_token.split(".")[1];
        if (payload) {
          const claims = JSON.parse(atob(payload)) as {
            is_site_admin?: boolean;
          };
          isSiteAdmin = claims.is_site_admin === true;
        }
      } catch {
        // Invalid token format, treat as not admin
        isSiteAdmin = false;
      }
    }

    if (!isSiteAdmin) {
      // User is not a site admin - return 403
      return NextResponse.rewrite(new URL("/forbidden", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
