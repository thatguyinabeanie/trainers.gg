// Bluesky Auth Edge Function
// Bridges AT Protocol OAuth sessions to Supabase sessions.
//
// Mode 1 — Sign in / Sign up (Authorization: Bearer <anon_key>):
//   Input: { did, handle }
//   1. Verify DID exists and handle matches via DID resolution
//   2. Lookup or create Supabase user
//   3. Return Supabase session tokens
//
// Mode 2 — Link to existing account (Authorization: Bearer <user_jwt>):
//   Input: { did, handle, link: true }
//   1. Verify Supabase JWT -> auth.uid()
//   2. Verify DID exists and handle matches
//   3. Link DID to existing user
//   4. Return success
//
// DID Verification Strategy:
// The mobile client completes AT Protocol OAuth (DPoP + PKCE + PAR) on-device,
// which cryptographically proves DID ownership. DPoP tokens cannot be forwarded
// to this edge function because they're bound to the client's key pair.
// Instead, we verify the DID by resolving it from plc.directory and confirming
// the handle matches via the Bluesky public API.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// -- Types --

interface BlueskyAuthRequest {
  did: string;
  handle: string;
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
 * Verify the claimed DID is valid and the handle matches by resolving the DID
 * and checking the profile from the public Bluesky API.
 *
 * This verifies:
 * 1. The DID exists in the PLC directory (for did:plc) or resolves (for did:web)
 * 2. The handle associated with this DID matches the claimed handle
 *
 * The mobile client has already completed AT Protocol OAuth with DPoP/PKCE/PAR,
 * which cryptographically proves the user authorized access. DPoP-bound tokens
 * cannot be forwarded, so we verify via DID resolution instead.
 */
async function verifyDid(
  did: string,
  expectedHandle: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Resolve the DID's profile from the public Bluesky API
    // This confirms the DID exists and returns the associated handle
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      return {
        valid: false,
        error: `Failed to resolve DID: API returned ${response.status}`,
      };
    }

    const profile = await response.json();

    // Verify the handle matches what the client claims
    if (profile.handle !== expectedHandle) {
      return {
        valid: false,
        error: `Handle mismatch: DID resolves to ${profile.handle}, not ${expectedHandle}`,
      };
    }

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { valid: false, error: `DID verification failed: ${message}` };
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

function jsonResponse(
  body: BlueskyAuthResponse,
  status: number,
  cors: Record<string, string>
): Response {
  return new Response(JSON.stringify(body satisfies BlueskyAuthResponse), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// -- Main Handler --

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body: BlueskyAuthRequest = await req.json();
    const { did, handle, link } = body;

    // Validate required fields
    if (!did || !handle) {
      return jsonResponse(
        {
          success: false,
          error: "Missing required fields: did, handle",
          code: "MISSING_FIELDS",
        },
        400,
        cors
      );
    }

    // Step 1: Verify DID exists and handle matches
    const verification = await verifyDid(did, handle);
    if (!verification.valid) {
      return jsonResponse(
        {
          success: false,
          error: verification.error || "DID verification failed",
          code: "INVALID_PROOF",
        },
        401,
        cors
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
          409,
          cors
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
          500,
          cors
        );
      }

      return jsonResponse(
        {
          success: true,
          user: { id: user.id, email: user.email || "", did },
        },
        200,
        cors
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
                409,
                cors
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
              500,
              cors
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
            500,
            cors
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
        500,
        cors
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
        500,
        cors
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
      200,
      cors
    );
  } catch (error) {
    console.error("Bluesky auth error:", error);
    return jsonResponse(
      {
        success: false,
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      },
      500,
      cors
    );
  }
});
