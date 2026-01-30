/**
 * AT Protocol OAuth Login Route
 *
 * Initiates the OAuth flow for Bluesky/AT Protocol authentication.
 * GET /api/oauth/login?handle=user.bsky.social
 */

import { NextResponse } from "next/server";
import { startAtprotoAuth } from "@/lib/atproto/oauth-client";

/**
 * Check if running on a Vercel preview deployment.
 * Bluesky OAuth is disabled on previews due to deployment protection.
 *
 * Detection strategy:
 * 1. VERCEL_ENV is the most reliable - set by Vercel to:
 *    - "production" for production deployments
 *    - "preview" for preview deployments
 *    - "development" for local dev (via vercel dev)
 * 2. Fallback: if on Vercel (VERCEL_URL set) but NODE_ENV isn't production
 */
function isVercelPreview(): boolean {
  // VERCEL_ENV is the most reliable indicator
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "preview";
  }

  // Fallback: if we're on Vercel (VERCEL_URL set) but not in production NODE_ENV
  if (process.env.VERCEL_URL && process.env.NODE_ENV !== "production") {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  // Bluesky OAuth is not available on preview deployments
  if (isVercelPreview()) {
    return NextResponse.json(
      {
        error: "Bluesky login is not available on preview deployments.",
        details: "Please use the production site at https://trainers.gg",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");
  const returnUrl = searchParams.get("returnUrl") || "/";

  // If no handle provided, default to bsky.social as the authorization server.
  // The AT Protocol OAuth client accepts PDS/auth server URLs as input,
  // which lets the user authenticate directly on bsky.social's login page.
  const normalizedHandle = handle
    ? handle.replace(/^@/, "")
    : "https://bsky.social";

  try {
    // Start the OAuth flow - this discovers the user's PDS and redirects
    const authUrl = await startAtprotoAuth(normalizedHandle, returnUrl);

    // Redirect to the authorization server
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Failed to start AT Protocol OAuth:", error);

    // Check for specific error types
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Handle resolution failures
    if (
      errorMessage.includes("resolve") ||
      errorMessage.includes("not found")
    ) {
      return NextResponse.json(
        {
          error: "Could not find that handle. Please check and try again.",
          details: errorMessage,
        },
        { status: 404 }
      );
    }

    // Missing configuration
    if (errorMessage.includes("ATPROTO_PRIVATE_KEY")) {
      return NextResponse.json(
        {
          error: "Bluesky login is not configured. Please contact support.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to start Bluesky login. Please try again.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
