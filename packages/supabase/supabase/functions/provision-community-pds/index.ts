// Provision Community PDS Edge Function
// Creates a PDS account for a community, giving it a Bluesky identity.
//
// Flow:
// 1. Verify JWT and extract user ID
// 2. Verify user is the community owner
// 3. Check community doesn't already have a PDS account
// 4. Generate handle from community slug, check availability
// 5. Generate secure random password
// 6. Create PDS invite code + account
// 7. Store password in Vault
// 8. Register handle in pds_handles registry
// 9. Update communities.bluesky_did, bluesky_handle, pds_status
//
// Authentication: Requires JWT (only community owner can provision)

import { timingSafeEqual } from "node:crypto";

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  createPdsInviteCode,
  createPdsAccount,
  checkPdsHandleAvailable,
  generateSecurePassword,
  generateHandle,
  PDS_CONFIG,
} from "../_shared/pds.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Compares two strings in constant time to prevent timing attacks.
 * Returns false if lengths differ; otherwise delegates to `timingSafeEqual`.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

interface ProvisionCommunityPdsResponse {
  success: boolean;
  did?: string;
  handle?: string;
  error?: string;
  code?:
    | "HANDLE_TAKEN"
    | "PDS_ERROR"
    | "COMMUNITY_NOT_FOUND"
    | "ALREADY_PROVISIONED"
    | "UNAUTHORIZED"
    | "PDS_NOT_CONFIGURED"
    | "DB_UPDATE_FAILED"
    | "VAULT_STORAGE_FAILED";
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
        } satisfies ProvisionCommunityPdsResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

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

    // Verify JWT and get user
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(jwt);

    // Service-role bypass — admin actions invoke this with service-role client.
    // We compare the raw bearer token to the known service-role key rather than
    // decoding JWT claims, which would be forgeable without signature verification.
    let isServiceRole = false;
    if (userError || !user) {
      isServiceRole = safeCompare(jwt, SUPABASE_SERVICE_ROLE_KEY);

      if (!isServiceRole) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid or expired token",
            code: "UNAUTHORIZED",
          } satisfies ProvisionCommunityPdsResponse),
          {
            status: 401,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }
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
        } satisfies ProvisionCommunityPdsResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Check PDS is configured
    if (!PDS_CONFIG.hasAdminPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "PDS is not configured on this server",
          code: "PDS_NOT_CONFIGURED",
        } satisfies ProvisionCommunityPdsResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch community and verify ownership
    const { data: community, error: fetchError } = await supabaseAdmin
      .from("communities")
      .select("id, slug, name, owner_user_id, bluesky_did, pds_status")
      .eq("id", communityId)
      .maybeSingle();

    if (fetchError || !community) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Community not found",
          code: "COMMUNITY_NOT_FOUND",
        } satisfies ProvisionCommunityPdsResponse),
        {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Only the community owner can provision the PDS account (skip for service-role)
    if (!isServiceRole) {
      if (!user || community.owner_user_id !== user.id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Only the community owner can enable Bluesky identity",
            code: "UNAUTHORIZED",
          } satisfies ProvisionCommunityPdsResponse),
          {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Check if already provisioned
    if (community.pds_status === "active" && community.bluesky_did) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Community already has a Bluesky identity",
          code: "ALREADY_PROVISIONED",
        } satisfies ProvisionCommunityPdsResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Allow retry for failed provisioning
    if (community.pds_status === "failed") {
      console.log(`Retrying PDS provisioning for community ${communityId}`);
    }

    // Generate handle from community slug
    const handle = generateHandle(community.slug);

    // Resume flow: if community already has a DID from a previous failed attempt,
    // skip account creation and re-run the post-creation steps (which are idempotent)
    let pdsResultDid: string;

    if (community.bluesky_did) {
      console.log(
        `Resuming provisioning for community ${communityId} with existing DID ${community.bluesky_did}`
      );
      pdsResultDid = community.bluesky_did;
    } else {
      // Fresh provisioning: check handle availability and create account
      const handleAvailable = await checkPdsHandleAvailable(handle);

      if (!handleAvailable) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `The handle @${handle} is already taken on Bluesky`,
            code: "HANDLE_TAKEN",
          } satisfies ProvisionCommunityPdsResponse),
          {
            status: 409,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }

      // Also check the pds_handles registry for namespace collisions
      const { data: existingHandle } = await supabaseAdmin
        .from("pds_handles")
        .select("handle")
        .eq("handle", handle)
        .maybeSingle();

      if (existingHandle) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `The handle @${handle} is already registered`,
            code: "HANDLE_TAKEN",
          } satisfies ProvisionCommunityPdsResponse),
          {
            status: 409,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }

      // Generate secure random password (community never needs it directly)
      const pdsPassword = generateSecurePassword(32);

      // Create invite code
      const inviteCode = await createPdsInviteCode();
      if (!inviteCode) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to create PDS invite code",
            code: "PDS_ERROR",
          } satisfies ProvisionCommunityPdsResponse),
          {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }

      // Create PDS account
      // Use a synthetic email for the community (not tied to any user)
      const communityEmail = `community-${community.slug}@trainers.gg`;

      const pdsResult = await createPdsAccount(
        handle,
        communityEmail,
        pdsPassword,
        inviteCode
      );

      if ("error" in pdsResult) {
        console.error(
          "PDS account creation failed for community:",
          pdsResult.error
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: pdsResult.error,
            code: "PDS_ERROR",
          } satisfies ProvisionCommunityPdsResponse),
          {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }

      pdsResultDid = pdsResult.did;

      // Store password in Vault (needed for profile sync and future posting)
      const secretName = `pds_password_community_${communityId}`;
      const { error: vaultError } = await supabaseAdmin.rpc(
        "vault_create_secret",
        {
          secret_value: pdsPassword,
          secret_name: secretName,
          secret_description: `PDS password for community ${community.name} (${communityId})`,
        }
      );

      if (vaultError) {
        console.error(
          "Failed to store community PDS password in vault:",
          vaultError
        );

        // Persist DID with 'failed' status so the community isn't stuck
        // (retries would otherwise hit HANDLE_TAKEN with no DID recorded)
        await supabaseAdmin
          .from("communities")
          .update({
            bluesky_did: pdsResultDid,
            bluesky_handle: handle,
            pds_status: "failed",
          })
          .eq("id", communityId);

        return new Response(
          JSON.stringify({
            success: false,
            error:
              "PDS account was created but password storage failed. Please contact support.",
            code: "VAULT_STORAGE_FAILED",
          } satisfies ProvisionCommunityPdsResponse),
          {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Register in pds_handles registry (fatal — without this the namespace uniqueness guarantee is broken)
    const { error: registryError } = await supabaseAdmin
      .from("pds_handles")
      .insert({
        handle,
        entity_type: "community",
        entity_id: communityId.toString(),
        did: pdsResultDid,
      });

    if (registryError) {
      console.error("Failed to register handle in registry:", registryError);

      // Unique violation means this handle/entity is already registered — treat as success for resume
      if (registryError.code === "23505") {
        // Already registered — continue to update step
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to register handle in namespace registry",
            code: "DB_UPDATE_FAILED",
          } satisfies ProvisionCommunityPdsResponse),
          {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Update community record with DID and status
    const { error: updateError } = await supabaseAdmin
      .from("communities")
      .update({
        bluesky_did: pdsResultDid,
        bluesky_handle: handle,
        pds_status: "active",
      })
      .eq("id", communityId);

    if (updateError) {
      console.error("Failed to update community with DID:", updateError);

      // Mark as failed so owner can retry
      await supabaseAdmin
        .from("communities")
        .update({ pds_status: "failed" })
        .eq("id", communityId);

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "PDS account was created but database update failed. Please try again.",
          code: "DB_UPDATE_FAILED",
        } satisfies ProvisionCommunityPdsResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        did: pdsResultDid,
        handle,
      } satisfies ProvisionCommunityPdsResponse),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Provision community PDS error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
        code: "PDS_ERROR",
      } satisfies ProvisionCommunityPdsResponse),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
