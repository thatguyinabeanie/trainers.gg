import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";

// Auth pages that require unauthenticated state
const authPages = [
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
