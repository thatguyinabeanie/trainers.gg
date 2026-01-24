/**
 * AT Protocol OAuth Callback Route
 *
 * Handles the OAuth callback from Bluesky/AT Protocol authorization servers.
 * GET /api/oauth/callback?code=...&state=...
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleAtprotoCallback } from "@/lib/atproto/oauth-client";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    // Handle the OAuth callback - exchanges code for tokens
    const { did, returnUrl } = await handleAtprotoCallback(searchParams);

    // Look up user by DID
    const supabase = await createClient();
    const { data: user } = await supabase
      .from("users")
      .select("id, email, username")
      .eq("did", did)
      .maybeSingle();

    if (user) {
      // User exists with this DID - sign them in
      // We need to create a session for this user
      // Since we can't directly create a session, we'll use a magic link approach
      // or redirect to a page that completes the sign-in

      // Store the DID in a secure cookie for the sign-in completion page
      const cookieStore = await cookies();
      cookieStore.set("atproto_did", did, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 5, // 5 minutes
        path: "/",
      });

      // Redirect to complete sign-in
      return NextResponse.redirect(
        new URL("/auth/atproto-callback", request.url)
      );
    }

    // No user with this DID - check if it's a trainers.gg handle
    // For now, redirect to sign-up with the DID pre-filled
    const cookieStore = await cookies();
    cookieStore.set("atproto_did", did, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 5, // 5 minutes
      path: "/",
    });

    // Redirect to link account page or sign-up
    const linkUrl = new URL("/auth/link-bluesky", request.url);
    if (returnUrl) {
      linkUrl.searchParams.set("returnUrl", returnUrl);
    }

    return NextResponse.redirect(linkUrl);
  } catch (error) {
    console.error("AT Protocol OAuth callback failed:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Redirect to sign-in with error
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("error", "bluesky_auth_failed");
    signInUrl.searchParams.set("error_description", errorMessage);

    return NextResponse.redirect(signInUrl);
  }
}
