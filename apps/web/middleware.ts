import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isAuthPage = createRouteMatcher([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
]);

const isPublicPage = createRouteMatcher([
  "/",
  "/coming-soon",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/api/auth(.*)",
  "/api/webhooks(.*)",
  // Public content pages
  "/tournaments",
  "/players",
  "/articles",
]);

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static assets
  const isStaticAsset =
    pathname.includes(".") || pathname.startsWith("/_next");
  const isAuthAPI = pathname.startsWith("/api/auth");
  const isWebhookAPI = pathname.startsWith("/api/webhooks");

  if (isStaticAsset || isAuthAPI) {
    return;
  }

  // Maintenance mode - redirect all non-essential routes to /coming-soon
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";
  if (isMaintenanceMode) {
    const maintenanceAllowedPaths = ["/", "/coming-soon"];
    const isAllowedPath = maintenanceAllowedPaths.includes(pathname);

    if (!isWebhookAPI && !isAllowedPath) {
      return Response.redirect(new URL("/coming-soon", request.url));
    }
  }

  // Webhook security checks
  if (isWebhookAPI) {
    // Block authenticated users from accessing webhooks
    const authHeader = request.headers.get("authorization");
    const sessionCookie = request.cookies.get("__session")?.value;
    const clerkSessionCookie = request.cookies.get("__clerk_db_jwt")?.value;

    if (authHeader || sessionCookie || clerkSessionCookie) {
      console.warn("Authenticated user blocked from webhook", { pathname });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate User-Agent (Svix webhooks)
    const userAgent = request.headers.get("user-agent");
    if (!userAgent || !userAgent.includes("Svix-Webhooks")) {
      console.warn("Invalid User-Agent for webhook", { pathname, userAgent });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Payload size limit
    const contentLength = request.headers.get("content-length");
    const maxPayloadSize = 1024 * 1024; // 1MB
    if (contentLength && parseInt(contentLength) > maxPayloadSize) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    return;
  }

  // Allow public pages without requiring auth() call
  // This prevents MIDDLEWARE_INVOCATION_FAILED errors when Clerk
  // environment variables are misconfigured or unavailable
  if (isPublicPage(request) && !isAuthPage(request)) {
    return;
  }

  // Only call auth() when we actually need to check authentication
  const { userId } = await auth();

  // Redirect authenticated users away from auth pages
  if (isAuthPage(request) && userId) {
    return Response.redirect(new URL("/", request.url));
  }

  // Protect all other pages - require authentication
  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("from", pathname);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
