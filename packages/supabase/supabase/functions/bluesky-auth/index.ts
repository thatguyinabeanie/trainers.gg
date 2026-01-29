// Bluesky Auth Edge Function
// Bridges AT Protocol OAuth sessions to Supabase sessions.
//
// Mode 1 — Sign in / Sign up (Authorization: Bearer <anon_key>):
//   Input: { did, handle, pds_url, access_token }
//   1. Verify DID ownership via com.atproto.server.getSession on user's PDS
//   2. Lookup or create Supabase user
//   3. Return Supabase session tokens
//
// Mode 2 — Link to existing account (Authorization: Bearer <user_jwt>):
//   Input: { did, handle, pds_url, access_token, link: true }
//   1. Verify Supabase JWT -> auth.uid()
//   2. Verify DID ownership
//   3. Link DID to existing user
//   4. Return success

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// -- Types --

interface BlueskyAuthRequest {
  did: string;
  handle: string;
  pds_url: string;
  access_token: string;
  link?: boolean;
}

interface BlueskyAuthResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    did: string;
  };
  is_new?: boolean;
  error?: string;
  code?: string;
}

// -- Helper Functions --

/**
 * Verify the caller owns the claimed DID by calling getSession on their PDS.
 * The AT Protocol access token is sent as a Bearer token to the user's PDS,
 * and the returned DID must match the claimed DID.
 */
async function verifyDidOwnership(
  pdsUrl: string,
  accessToken: string,
  expectedDid: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${pdsUrl}/xrpc/com.atproto.server.getSession`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return { valid: false, error: `PDS returned ${response.status}` };
    }

    const session = await response.json();

    if (session.did !== expectedDid) {
      return {
        valid: false,
        error: "DID mismatch: token does not belong to claimed DID",
      };
    }

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { valid: false, error: `PDS verification failed: ${message}` };
  }
}

/**
 * Fetch a Bluesky profile from the public API.
 * Returns display info (handle, displayName, avatar) or null on failure.
 */
async function fetchBlueskyProfile(did: string): Promise<{
  handle: string;
  displayName?: string;
  avatar?: string;
} | null> {
  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return null;

    const profile = await response.json();
    return {
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
    };
  } catch {
    return null;
  }
}

/**
 * Sanitize a Bluesky handle into a valid username.
 * Extracts the part before the first dot, lowercases, removes invalid chars,
 * ensures 3+ chars (prefixes with "user_" if too short), and caps at 20 chars.
 */
function sanitizeUsername(handle: string): string {
  // Extract the first part before the first dot
  const baseUsername = handle.split(".")[0] || handle;

  // Only alphanumeric, underscores, hyphens
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

// -- Helper to build JSON responses --

function jsonResponse(body: BlueskyAuthResponse, status: number): Response {
  return new Response(JSON.stringify(body satisfies BlueskyAuthResponse), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// -- Main Handler --

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: BlueskyAuthRequest = await req.json();
    const { did, handle, pds_url, access_token, link } = body;

    // Validate required fields
    if (!did || !handle || !pds_url || !access_token) {
      return jsonResponse(
        {
          success: false,
          error: "Missing required fields: did, handle, pds_url, access_token",
          code: "MISSING_FIELDS",
        },
        400
      );
    }

    // Step 1: Verify DID ownership via PDS
    const verification = await verifyDidOwnership(pds_url, access_token, did);
    if (!verification.valid) {
      return jsonResponse(
        {
          success: false,
          error: verification.error || "DID verification failed",
          code: "INVALID_PROOF",
        },
        401
      );
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the Authorization header to check for user JWT
    const authHeader = req.headers.get("Authorization");
    const jwt = authHeader?.replace("Bearer ", "");

    // ---------------------------------------------------------------
    // MODE 2: Link DID to existing authenticated user
    // ---------------------------------------------------------------
    if (link && jwt) {
      // Verify Supabase JWT
      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(jwt);

      if (userError || !user) {
        return jsonResponse(
          {
            success: false,
            error: "Invalid or expired session",
            code: "UNAUTHORIZED",
          },
          401
        );
      }

      // Check DID is not already linked to a different user
      const { data: existingDid } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("did", did)
        .neq("id", user.id)
        .maybeSingle();

      if (existingDid) {
        return jsonResponse(
          {
            success: false,
            error: "This Bluesky account is already linked to another user",
            code: "DID_ALREADY_LINKED",
          },
          409
        );
      }

      // Link DID to user
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          did,
          pds_handle: handle,
          pds_status: "active",
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to link DID:", updateError);
        return jsonResponse(
          {
            success: false,
            error: "Failed to link Bluesky account",
            code: "INTERNAL_ERROR",
          },
          500
        );
      }

      return jsonResponse(
        {
          success: true,
          user: { id: user.id, email: user.email || "", did },
        },
        200
      );
    }

    // ---------------------------------------------------------------
    // MODE 1: Sign in or sign up via Bluesky
    // ---------------------------------------------------------------

    // Generate placeholder email from DID (used only for Supabase Auth)
    // Use the full sanitized DID to prevent collisions
    const didSlug = did.replace(/[^a-zA-Z0-9]/g, "_");
    const placeholderEmail = `${didSlug}@bluesky.trainers.gg`;

    // Primary lookup: by DID (authoritative, collision-free)
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id, email, did")
      .eq("did", did)
      .maybeSingle();

    let userEmail: string;
    let userId: string;
    let isNew = false;

    if (existingUser && existingUser.email) {
      // Existing user found by DID — sign them in
      userEmail = existingUser.email;
      userId = existingUser.id;
    } else {
      // Fallback: check by placeholder email for legacy accounts
      const { data: userByEmail } = await supabaseAdmin
        .from("users")
        .select("id, email, did")
        .eq("email", placeholderEmail)
        .maybeSingle();

      if (userByEmail && userByEmail.email) {
        // Legacy account found — sign them in and update DID if missing
        userEmail = userByEmail.email;
        userId = userByEmail.id;

        // Update DID if not set
        if (!userByEmail.did) {
          await supabaseAdmin
            .from("users")
            .update({ did, pds_status: "external" })
            .eq("id", userByEmail.id);
        }
      } else {
        // New user — create account
        isNew = true;

        // Fetch Bluesky profile for display info
        const profile = await fetchBlueskyProfile(did);
        const username = sanitizeUsername(profile?.handle || handle);

        // Create Supabase Auth account with placeholder email
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email: placeholderEmail,
            email_confirm: true,
            user_metadata: {
              username,
              display_name: profile?.displayName,
              avatar_url: profile?.avatar,
              bluesky_handle: handle,
              did,
              auth_provider: "bluesky",
            },
          });

        if (authError) {
          // Handle "already registered" edge case gracefully
          if (authError.message?.includes("already been registered")) {
            const { data: existByEmail } = await supabaseAdmin
              .from("users")
              .select("id, email")
              .ilike("email", placeholderEmail)
              .maybeSingle();

            if (existByEmail) {
              // Update their record with current DID and profile data
              await supabaseAdmin
                .from("users")
                .update({
                  did,
                  pds_handle: handle,
                  pds_status: "external",
                  image: profile?.avatar,
                })
                .eq("id", existByEmail.id);

              userEmail = placeholderEmail;
              userId = existByEmail.id;
              isNew = false;
            } else {
              return jsonResponse(
                {
                  success: false,
                  error: "Account conflict — please contact support",
                  code: "ACCOUNT_CONFLICT",
                },
                409
              );
            }
          } else {
            console.error("Failed to create user:", authError);
            return jsonResponse(
              {
                success: false,
                error: authError.message || "Failed to create account",
                code: "AUTH_ERROR",
              },
              500
            );
          }
        } else if (authData?.user) {
          userId = authData.user.id;
          userEmail = placeholderEmail;

          // Update the user record with DID and profile data
          // Note: pds_status = 'external' because they already have a PDS elsewhere
          await supabaseAdmin
            .from("users")
            .update({
              did,
              pds_handle: handle,
              pds_status: "external",
              image: profile?.avatar,
            })
            .eq("id", authData.user.id);
        } else {
          return jsonResponse(
            {
              success: false,
              error: "Failed to create account",
              code: "AUTH_ERROR",
            },
            500
          );
        }
      }
    }

    // Generate magic link for session creation
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail!,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("Failed to generate magic link:", linkError);
      return jsonResponse(
        {
          success: false,
          error: "Failed to create session",
          code: "SESSION_ERROR",
        },
        500
      );
    }

    // Verify the magic link to get actual session tokens
    const { data: verifyData, error: verifyError } =
      await supabaseAdmin.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

    if (verifyError || !verifyData.session) {
      console.error("Failed to verify magic link:", verifyError);
      return jsonResponse(
        {
          success: false,
          error: "Failed to create session",
          code: "SESSION_ERROR",
        },
        500
      );
    }

    return jsonResponse(
      {
        success: true,
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
        user: {
          id: userId!,
          email: userEmail!,
          did,
        },
        is_new: isNew,
      },
      200
    );
  } catch (error) {
    console.error("Bluesky auth error:", error);
    return jsonResponse(
      {
        success: false,
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
      500
    );
  }
});
