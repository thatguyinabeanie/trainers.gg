/**
 * AT Protocol OAuth Callback Route
 *
 * Handles the OAuth callback from Bluesky/AT Protocol authorization servers.
 *
 * Two modes:
 * - Sign-in (default): signs in existing users or creates new accounts
 * - Link (when linkUserId is in state): attaches DID to the current user
 *
 * Sign-in flow:
 * 1. Exchange auth code for tokens, get user's DID
 * 2. If DID exists in our DB → generate magic link → redirect to verify
 * 3. If DID is new → create account from Bluesky profile → sign in
 *
 * Link flow:
 * 1. Exchange auth code for tokens, get user's DID
 * 2. If DID is already linked to another user → redirect with error
 * 3. Attach DID to current user → redirect back
 *
 * NOTE: Bluesky OAuth users get pds_status = 'pending' so they can be
 * provisioned a trainers.gg PDS account when they set their username in
 * dashboard settings.
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
import { sanitizeReturnUrl } from "@/lib/url-safety";

/**
 * Sanitize a username from a Bluesky handle
 * Does NOT check for uniqueness - that happens in dashboard settings
 */
function sanitizeUsername(handle: string): string {
  const baseUsername = extractUsernameFromHandle(handle);

  // Sanitize: only alphanumeric, underscores, hyphens
  let sanitized = baseUsername
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 20);

  // Ensure minimum length
  if (sanitized.length < 3) {
    sanitized = `user_${sanitized}`;
  }

  return sanitized;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Prefer explicit site URL for tunnel/proxy scenarios where request.url
  // may combine forwarded protocol (https) with internal host (localhost)
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    // Step 1: Exchange auth code for tokens, get DID
    const { did, returnUrl, linkUserId } =
      await handleAtprotoCallback(searchParams);

    // Use service role client for auth operations
    const supabase = createServiceRoleClient();
    // Use atproto client for user table operations (has extended types)
    const supabaseAtproto = createAtprotoServiceClient();

    // =========================================================================
    // LINK MODE: Attach DID to the currently authenticated user
    // =========================================================================
    if (linkUserId) {
      return await handleLinkMode({
        did,
        linkUserId,
        returnUrl,
        baseUrl,
        supabaseAtproto,
      });
    }

    // =========================================================================
    // SIGN-IN MODE: Sign in or create user (existing behavior)
    // =========================================================================
    return await handleSignInMode({
      did,
      returnUrl,
      baseUrl,
      supabase,
      supabaseAtproto,
    });
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

// =============================================================================
// Link Mode Handler
// =============================================================================

async function handleLinkMode({
  did,
  linkUserId,
  returnUrl,
  baseUrl,
  supabaseAtproto,
}: {
  did: string;
  linkUserId: string;
  returnUrl: string | undefined;
  baseUrl: string;
  supabaseAtproto: ReturnType<typeof createAtprotoServiceClient>;
}) {
  const redirectTarget = sanitizeReturnUrl(
    returnUrl,
    "/dashboard/settings/account"
  );

  // Check if the DID is already linked to another user
  const { data: existingHolder, error: lookupError } = await supabaseAtproto
    .from("users")
    .select("id")
    .eq("did", did)
    .maybeSingle();

  if (lookupError) {
    console.error("Failed to check DID ownership:", lookupError);
    const errorUrl = new URL(redirectTarget, baseUrl);
    errorUrl.hash =
      "error=link_failed&error_code=update_failed&error_description=Failed+to+verify+Bluesky+account+ownership";
    return NextResponse.redirect(errorUrl.toString());
  }

  if (existingHolder && existingHolder.id !== linkUserId) {
    // DID belongs to a different user — redirect with error
    const errorUrl = new URL(redirectTarget, baseUrl);
    errorUrl.hash =
      "error=link_failed&error_code=identity_already_exists&error_description=That+Bluesky+account+is+already+linked+to+another+user";
    return NextResponse.redirect(errorUrl.toString());
  }

  // Attach the DID to the current user
  // NOTE: Only update `did` — pds_status tracks trainers.gg-managed PDS state
  // and must not be changed when linking an external Bluesky identity.
  const { error: updateError } = await supabaseAtproto
    .from("users")
    .update({ did })
    .eq("id", linkUserId);

  if (updateError) {
    console.error("Failed to link Bluesky DID to user:", updateError);
    const errorUrl = new URL(redirectTarget, baseUrl);
    errorUrl.hash =
      "error=link_failed&error_code=update_failed&error_description=Failed+to+link+Bluesky+account";
    return NextResponse.redirect(errorUrl.toString());
  }

  // Redirect back — session is unchanged, user stays signed in as themselves
  return NextResponse.redirect(new URL(redirectTarget, baseUrl));
}

// =============================================================================
// Sign-In Mode Handler (existing behavior, extracted into function)
// =============================================================================

async function handleSignInMode({
  did,
  returnUrl,
  baseUrl,
  supabase,
  supabaseAtproto,
}: {
  did: string;
  returnUrl: string | undefined;
  baseUrl: string;
  supabase: ReturnType<typeof createServiceRoleClient>;
  supabaseAtproto: ReturnType<typeof createAtprotoServiceClient>;
}) {
  // Generate placeholder email from DID (used only for Supabase Auth requirement)
  // Use the full sanitized DID to prevent collisions - no truncation
  const didSlug = did.replace(/[^a-zA-Z0-9]/g, "_");
  const placeholderEmail = `${didSlug}@bluesky.trainers.gg`;

  // Check if user already exists - DID is the authoritative identifier
  // We only fall back to email for legacy accounts that may not have DID set.
  // NOTE: email is canonical in auth.users — public.users no longer has an email column.
  let existingUser: {
    id: string;
    did: string | null;
  } | null = null;

  // Primary lookup: by DID (authoritative, collision-free)
  const { data: userByDid } = await supabaseAtproto
    .from("users")
    .select("id, did")
    .eq("did", did)
    .maybeSingle();

  if (userByDid) {
    existingUser = userByDid;
  } else {
    // Fallback: check by placeholder email for legacy accounts without DID.
    // email is no longer in public.users — look up via auth admin API instead.
    // This is only for backwards compatibility with accounts created before
    // DID was stored. New accounts always have DID set.
    const { data: authListData } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });
    const legacyAuthUser = authListData.users.find(
      (u) => u.email === placeholderEmail
    );

    if (legacyAuthUser) {
      // Verify the user has a public.users row (created by auth trigger)
      const { data: publicUserRow } = await supabaseAtproto
        .from("users")
        .select("id, did")
        .eq("id", legacyAuthUser.id)
        .maybeSingle();

      if (publicUserRow) {
        existingUser = publicUserRow;
      }
    }
  }

  let userEmail: string;

  if (existingUser) {
    // Existing user — fetch their email from auth.users (canonical source)
    const { data: authUserData } = await supabase.auth.admin.getUserById(
      existingUser.id
    );
    const resolvedEmail = authUserData?.user?.email;

    if (!resolvedEmail) {
      throw new Error("Could not resolve email for existing user");
    }

    userEmail = resolvedEmail;

    // If DID wasn't set on the user record, update it now.
    // Set pds_status to 'pending' so they get a trainers.gg PDS account.
    if (!existingUser.did) {
      const { error: didUpdateError } = await supabaseAtproto
        .from("users")
        .update({ did, pds_status: "pending" })
        .eq("id", existingUser.id);

      if (didUpdateError) {
        console.error("Failed to update DID on existing user:", didUpdateError);
      }
    }
  } else {
    // User not found in public.users - try to create or sign in
    const profile = await getBlueskyProfile(did);

    if (!profile) {
      throw new Error("Could not fetch Bluesky profile");
    }

    // Extract username from handle (e.g., "pikachu" from "pikachu.bsky.social")
    // This may conflict with existing usernames - that's OK, the user can
    // choose a different username from dashboard settings
    const username = sanitizeUsername(profile.handle);

    userEmail = placeholderEmail;

    // Try to create Supabase Auth account
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

    if (authError) {
      // Check if user already exists in auth (email already registered)
      if (authError.message?.includes("already been registered")) {
        // User exists in auth — look up their public.users row by auth user id.
        // email is no longer in public.users; look up the auth user by email
        // via the admin API to get their id, then update by id.
        const { data: authListData } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 50,
        });
        const existingAuthUser = authListData.users.find(
          (u) => u.email === placeholderEmail
        );

        if (existingAuthUser) {
          const { error: updateExistingError } = await supabaseAtproto
            .from("users")
            .update({
              did,
              pds_status: "pending",
              image: profile.avatar,
            })
            .eq("id", existingAuthUser.id);

          if (updateExistingError) {
            console.error(
              "Failed to update existing user with DID:",
              updateExistingError
            );
          }
        }
        // userEmail is already set to placeholderEmail, proceed to magic link
      } else {
        console.error("Failed to create user:", authError);
        throw new Error(authError.message || "Failed to create account");
      }
    } else if (authData?.user) {
      // New user created successfully - update their public.users record
      // pds_status = 'pending' — they'll get a trainers.gg PDS when they set a username
      const { error: newUserUpdateError } = await supabaseAtproto
        .from("users")
        .update({
          did,
          pds_status: "pending",
          image: profile.avatar,
        })
        .eq("id", authData.user.id);

      if (newUserUpdateError) {
        console.error(
          "Failed to update new user with DID:",
          newUserUpdateError
        );
      }
    }
  }

  // Generate magic link for immediate sign-in
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

  // Redirect to auth callback with the token
  // This will set the session cookies and redirect to the final destination
  const verifyUrl = new URL("/auth/callback", baseUrl);
  verifyUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
  verifyUrl.searchParams.set("type", "magiclink");
  verifyUrl.searchParams.set("next", returnUrl || "/");

  return NextResponse.redirect(verifyUrl);
}
