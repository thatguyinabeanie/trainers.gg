/**
 * AT Protocol OAuth Callback Route
 *
 * Handles the OAuth callback from Bluesky/AT Protocol authorization servers.
 * Automatically signs in existing users or creates new accounts.
 *
 * Flow:
 * 1. Exchange auth code for tokens, get user's DID
 * 2. If DID exists in our DB → generate magic link → redirect to verify
 * 3. If DID is new → create account from Bluesky profile → sign in
 *
 * GET /api/oauth/callback?code=...&state=...
 */

import { NextResponse } from "next/server";
import {
  handleAtprotoCallback,
  getBlueskyProfile,
  extractUsernameFromHandle,
} from "@/lib/atproto/oauth-client";
import {
  createServiceRoleClient,
  createAtprotoServiceClient,
} from "@/lib/supabase/server";

/**
 * Generate a unique username by appending numbers if needed
 */
async function generateUniqueUsername(
  baseUsername: string,
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<string> {
  // Sanitize: only alphanumeric, underscores, hyphens
  let sanitized = baseUsername
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 20);

  // Ensure minimum length
  if (sanitized.length < 3) {
    sanitized = `user_${sanitized}`;
  }

  // Check if username is available
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .ilike("username", sanitized)
    .maybeSingle();

  if (!existing) {
    return sanitized;
  }

  // Append numbers until we find an available one
  for (let i = 1; i < 1000; i++) {
    const candidate = `${sanitized}${i}`;
    const { data } = await supabase
      .from("users")
      .select("id")
      .ilike("username", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }
  }

  // Fallback: use timestamp
  return `user_${Date.now().toString(36)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const baseUrl = new URL(request.url).origin;

  try {
    // Step 1: Exchange auth code for tokens, get DID
    const { did, returnUrl } = await handleAtprotoCallback(searchParams);

    // Use service role client for auth operations
    const supabase = createServiceRoleClient();
    // Use atproto client for user table operations (has extended types)
    const supabaseAtproto = createAtprotoServiceClient();

    // Generate placeholder email for lookups
    const didSlug = did.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
    const placeholderEmail = `${didSlug}@bluesky.trainers.gg`;

    // Step 2: Check if user already exists with this DID or placeholder email
    // Note: Using separate queries since .or() with special characters in DID can be tricky
    let existingUser: {
      id: string;
      email: string | null;
      did: string | null;
    } | null = null;

    // First, check by DID (most reliable)
    const { data: userByDid } = await supabaseAtproto
      .from("users")
      .select("id, email, did")
      .eq("did", did)
      .maybeSingle();

    if (userByDid) {
      existingUser = userByDid;
    } else {
      // If not found by DID, check by placeholder email
      const { data: userByEmail } = await supabaseAtproto
        .from("users")
        .select("id, email, did")
        .ilike("email", placeholderEmail)
        .maybeSingle();

      if (userByEmail) {
        existingUser = userByEmail;
      }
    }

    let userEmail: string;

    if (existingUser && existingUser.email) {
      // Existing user - use their email
      userEmail = existingUser.email;

      // If DID wasn't set on the user record, update it now
      if (!existingUser.did) {
        await supabaseAtproto
          .from("users")
          .update({ did, pds_status: "active" })
          .eq("id", existingUser.id);
      }
    } else {
      // New user - create account from Bluesky profile
      const profile = await getBlueskyProfile(did);

      if (!profile) {
        throw new Error("Could not fetch Bluesky profile");
      }

      // Generate unique username from handle
      const baseUsername = extractUsernameFromHandle(profile.handle);
      const username = await generateUniqueUsername(baseUsername, supabase);

      userEmail = placeholderEmail;

      // Create Supabase Auth account
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          user_metadata: {
            username,
            display_name: profile.displayName,
            avatar_url: profile.avatar,
            bluesky_handle: profile.handle,
            did,
            auth_provider: "bluesky",
          },
        });

      if (authError || !authData.user) {
        console.error("Failed to create user:", authError);
        throw new Error(authError?.message || "Failed to create account");
      }

      // Update user record with Bluesky info
      await supabaseAtproto
        .from("users")
        .update({
          did,
          pds_handle: profile.handle,
          pds_status: "active",
          image: profile.avatar,
        })
        .eq("id", authData.user.id);
    }

    // Step 3: Generate magic link for immediate sign-in
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
        options: {
          redirectTo: returnUrl || "/",
        },
      });

    if (linkError || !linkData.properties.hashed_token) {
      console.error("Failed to generate magic link:", linkError);
      throw new Error("Failed to complete sign-in");
    }

    // Step 4: Redirect to Supabase's verify endpoint with the token
    // This will set the session cookies and redirect to the final destination
    const verifyUrl = new URL("/auth/callback", baseUrl);
    verifyUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
    verifyUrl.searchParams.set("type", "magiclink");
    verifyUrl.searchParams.set("next", returnUrl || "/");

    return NextResponse.redirect(verifyUrl);
  } catch (error) {
    console.error("AT Protocol OAuth callback failed:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Redirect to sign-in with error
    const signInUrl = new URL("/sign-in", baseUrl);
    signInUrl.searchParams.set("error", "bluesky_auth_failed");
    signInUrl.searchParams.set("error_description", errorMessage);

    return NextResponse.redirect(signInUrl);
  }
}
