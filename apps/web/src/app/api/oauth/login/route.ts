/**
 * AT Protocol OAuth Login Route
 *
 * Initiates the OAuth flow for Bluesky/AT Protocol authentication.
 * GET /api/oauth/login?handle=user.bsky.social
 */

import { NextResponse } from "next/server";
import { startAtprotoAuth } from "@/lib/atproto/oauth-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");
  const returnUrl = searchParams.get("returnUrl") || "/";

  // Validate handle
  if (!handle) {
    return NextResponse.json(
      { error: "Handle is required. Example: ?handle=user.bsky.social" },
      { status: 400 }
    );
  }

  // Normalize handle (remove @ prefix if present)
  const normalizedHandle = handle.replace(/^@/, "");

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
