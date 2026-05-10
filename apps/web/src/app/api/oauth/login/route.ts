/**
 * AT Protocol OAuth Login Route
 *
 * Initiates the OAuth flow for Bluesky/AT Protocol authentication.
 * GET /api/oauth/login?handle=user.bsky.social
 *
 * Supports two modes:
 * - Sign-in (default): signs in or creates a user from the Bluesky identity
 * - Link (mode=link): attaches the Bluesky DID to the currently authenticated user
 */

import { NextResponse } from "next/server";
import { startAtprotoAuth } from "@/lib/atproto/oauth-client";
import { getUser } from "@/lib/supabase/server";
import { sanitizeReturnUrl } from "@/lib/url-safety";

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
  const returnUrl = sanitizeReturnUrl(searchParams.get("returnUrl"), "/");
  const mode = searchParams.get("mode"); // "link" to attach DID to current user

  // If in link mode, verify the user is authenticated
  let linkUserId: string | undefined;
  if (mode === "link") {
    const user = await getUser();
    if (!user) {
      // Use NEXT_PUBLIC_SITE_URL to avoid broken redirects in tunnel/proxy scenarios
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
      const signInUrl = new URL("/sign-in", baseUrl);
      signInUrl.searchParams.set("redirect", returnUrl);
      return NextResponse.redirect(signInUrl);
    }
    linkUserId = user.id;
  }

  // If no handle provided, default to bsky.social as the authorization server.
  // The AT Protocol OAuth client accepts PDS/auth server URLs as input,
  // which lets the user authenticate directly on bsky.social's login page.
  const normalizedHandle = handle
    ? handle.replace(/^@/, "")
    : "https://bsky.social";

  try {
    // Start the OAuth flow - this discovers the user's PDS and redirects
    const authUrl = await startAtprotoAuth(normalizedHandle, returnUrl, linkUserId);

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
