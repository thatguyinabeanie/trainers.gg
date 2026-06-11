// Provision All Communities PDS Edge Function
// One-time admin operation to batch-provision PDS accounts for all existing communities.
//
// Authentication: Requires service-role key (admin-only operation)
//
// Call after deploying the pds_handles migration to provision existing communities.
// Safe to re-run — skips communities that already have active PDS accounts.

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

interface ProvisionResult {
  communityId: number;
  slug: string;
  handle: string;
  success: boolean;
  did?: string;
  error?: string;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // Require service-role key — this is an admin-only operation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify it's the service role key (not a user JWT)
    if (!safeCompare(token, SUPABASE_SERVICE_ROLE_KEY)) {
      // If it's a user JWT, verify it's a site admin
      const supabaseAdmin = createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: { autoRefreshToken: false, persistSession: false },
        }
      );

      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          {
            status: 401,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }

      // Check if user is a site admin via user_roles + roles
      const { data: adminRole } = await supabaseAdmin
        .from("user_roles")
        .select("role_id, roles!inner(name)")
        .eq("user_id", user.id)
        .eq("roles.name", "site_admin")
        .maybeSingle();

      if (!adminRole) {
        return new Response(
          JSON.stringify({ success: false, error: "Admin access required" }),
          {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Check PDS is configured
    if (!PDS_CONFIG.hasAdminPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "PDS is not configured" }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Fetch all communities that don't have an active PDS account
    const { data: communities, error: fetchError } = await supabaseAdmin
      .from("communities")
      .select("id, slug, name")
      .or("pds_status.is.null,pds_status.neq.active");

    if (fetchError) {
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    if (!communities || communities.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All communities already provisioned",
          results: [],
        }),
        {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const results: ProvisionResult[] = [];

    for (const community of communities) {
      const handle = generateHandle(community.slug);
      const result: ProvisionResult = {
        communityId: community.id,
        slug: community.slug,
        handle,
        success: false,
      };

      try {
        // Check handle availability
        const available = await checkPdsHandleAvailable(handle);
        if (!available) {
          result.error = `Handle @${handle} already taken on PDS`;
          results.push(result);
          continue;
        }

        // Check registry
        const { data: existingHandle } = await supabaseAdmin
          .from("pds_handles")
          .select("handle")
          .eq("handle", handle)
          .maybeSingle();

        if (existingHandle) {
          result.error = `Handle @${handle} already in registry`;
          results.push(result);
          continue;
        }

        // Generate password
        const pdsPassword = generateSecurePassword(32);

        // Create invite code
        const inviteCode = await createPdsInviteCode();
        if (!inviteCode) {
          result.error = "Failed to create invite code";
          results.push(result);
          continue;
        }

        // Create PDS account
        const communityEmail = `community-${community.slug}@trainers.gg`;
        const pdsResult = await createPdsAccount(
          handle,
          communityEmail,
          pdsPassword,
          inviteCode
        );

        if ("error" in pdsResult) {
          result.error = pdsResult.error;
          results.push(result);
          continue;
        }

        // Store password in Vault
        const secretName = `pds_password_community_${community.id}`;
        const { error: vaultError } = await supabaseAdmin.rpc(
          "vault_create_secret",
          {
            secret_value: pdsPassword,
            secret_name: secretName,
            secret_description: `PDS password for community ${community.name} (${community.id})`,
          }
        );

        if (vaultError) {
          await supabaseAdmin
            .from("communities")
            .update({
              bluesky_did: pdsResult.did,
              bluesky_handle: handle,
              pds_status: "failed",
            })
            .eq("id", community.id);
          result.error = `Vault storage failed: ${vaultError.message}`;
          results.push(result);
          continue;
        }

        // Register in pds_handles
        const { error: registryError } = await supabaseAdmin
          .from("pds_handles")
          .insert({
            handle,
            entity_type: "community",
            entity_id: community.id.toString(),
            did: pdsResult.did,
          });

        if (registryError) {
          await supabaseAdmin
            .from("communities")
            .update({
              bluesky_did: pdsResult.did,
              bluesky_handle: handle,
              pds_status: "failed",
            })
            .eq("id", community.id);
          result.error = `Registry insert failed: ${registryError.message}`;
          results.push(result);
          continue;
        }

        // Update community record
        const { error: updateError } = await supabaseAdmin
          .from("communities")
          .update({
            bluesky_did: pdsResult.did,
            bluesky_handle: handle,
            pds_status: "active",
          })
          .eq("id", community.id);

        if (updateError) {
          result.error = `Community update failed: ${updateError.message}`;
          results.push(result);
          continue;
        }

        result.success = true;
        result.did = pdsResult.did;
      } catch (error) {
        result.error = error instanceof Error ? error.message : "Unknown error";
      }

      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        message: `Provisioned ${successCount}/${results.length} communities${failCount > 0 ? ` (${failCount} failed)` : ""}`,
        results,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Batch provision error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
