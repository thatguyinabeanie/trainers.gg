// Sync Community Profile to PDS Edge Function
// Pushes community name, description, and avatar to the PDS profile record.
//
// Flow:
// 1. Verify JWT and extract user ID
// 2. Verify user is the community owner
// 3. Verify community has an active PDS account
// 4. Retrieve PDS password from Vault
// 5. Login to PDS as the community
// 6. Update app.bsky.actor.profile with current community data
//
// Authentication: Requires JWT (only community owner can sync)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { loginPdsAgent } from "../_shared/pds.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SyncProfileResponse {
  success: boolean;
  error?: string;
  code?:
    | "UNAUTHORIZED"
    | "COMMUNITY_NOT_FOUND"
    | "NOT_PROVISIONED"
    | "PDS_ERROR"
    | "VAULT_READ_FAILED";
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // Get and verify JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing or invalid authorization header",
          code: "UNAUTHORIZED",
        } satisfies SyncProfileResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

    // Create service role client for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify JWT and get user
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired token",
          code: "UNAUTHORIZED",
        } satisfies SyncProfileResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const communityId = body.communityId;

    if (!communityId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "communityId is required",
          code: "COMMUNITY_NOT_FOUND",
        } satisfies SyncProfileResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch community
    const { data: community, error: fetchError } = await supabaseAdmin
      .from("communities")
      .select(
        "id, slug, name, description, logo_url, owner_user_id, bluesky_did, pds_status"
      )
      .eq("id", communityId)
      .maybeSingle();

    if (fetchError || !community) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Community not found",
          code: "COMMUNITY_NOT_FOUND",
        } satisfies SyncProfileResponse),
        {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Only the community owner can sync
    if (community.owner_user_id !== user.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Only the community owner can sync the Bluesky profile",
          code: "UNAUTHORIZED",
        } satisfies SyncProfileResponse),
        {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Verify community has an active PDS account
    if (community.pds_status !== "active" || !community.bluesky_did) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Community does not have an active Bluesky identity",
          code: "NOT_PROVISIONED",
        } satisfies SyncProfileResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Retrieve PDS password from Vault
    const secretName = `pds_password_community_${communityId}`;
    const { data: vaultData, error: vaultError } = await supabaseAdmin.rpc(
      "vault_read_secret",
      { secret_name: secretName }
    );

    if (vaultError || !vaultData) {
      console.error("Failed to read community PDS password from vault:", vaultError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to retrieve PDS credentials",
          code: "VAULT_READ_FAILED",
        } satisfies SyncProfileResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const pdsPassword = vaultData;

    // Login to PDS as the community
    const loginResult = await loginPdsAgent(community.bluesky_did, pdsPassword);

    if (!loginResult.success) {
      console.error("Failed to login as community PDS account:", loginResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to authenticate with PDS",
          code: "PDS_ERROR",
        } satisfies SyncProfileResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const agent = loginResult.agent;

    // Build the profile record
    // Download avatar blob if community has a logo_url
    let avatarBlob: { $type: "blob"; ref: { $link: string }; mimeType: string; size: number } | undefined;

    if (community.logo_url) {
      try {
        const logoResponse = await fetch(community.logo_url);
        if (logoResponse.ok) {
          const logoData = await logoResponse.arrayBuffer();
          const mimeType = logoResponse.headers.get("content-type") || "image/png";

          // Upload blob to PDS
          const uploadResult = await agent.uploadBlob(new Uint8Array(logoData), {
            encoding: mimeType,
          });

          if (uploadResult.success) {
            avatarBlob = uploadResult.data.blob;
          }
        }
      } catch (error) {
        // Non-fatal — continue without avatar
        console.warn("Failed to upload community avatar to PDS:", error);
      }
    }

    // Write the profile record
    const profileRecord: Record<string, unknown> = {
      $type: "app.bsky.actor.profile",
      displayName: community.name.slice(0, 64), // AT Protocol limit
      description: (community.description || "").slice(0, 256), // AT Protocol limit
    };

    if (avatarBlob) {
      profileRecord.avatar = avatarBlob;
    }

    try {
      // Use putRecord to create or update the profile
      await agent.com.atproto.repo.putRecord({
        repo: community.bluesky_did,
        collection: "app.bsky.actor.profile",
        rkey: "self",
        record: profileRecord,
      });
    } catch (error) {
      console.error("Failed to write profile record to PDS:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to update Bluesky profile",
          code: "PDS_ERROR",
        } satisfies SyncProfileResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
      } satisfies SyncProfileResponse),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync community profile error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
        code: "PDS_ERROR",
      } satisfies SyncProfileResponse),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
