// Provision PDS Edge Function
// Creates a PDS account when a user sets their username from dashboard settings
//
// Flow:
// 1. Verify JWT and extract user ID
// 2. Check user has pds_status = 'pending'
// 3. Get user's email from auth.users
// 4. Check PDS handle availability
// 5. Generate secure random password
// 6. Create PDS invite code + account
// 7. Store password in Vault
// 8. Update users.did and users.pds_status
//
// Authentication: Requires JWT (user can only provision their own account)

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

interface ProvisionPdsRequest {
  username: string;
}

interface ProvisionPdsResponse {
  success: boolean;
  did?: string;
  error?: string;
  code?:
    | "HANDLE_TAKEN"
    | "PDS_ERROR"
    | "USER_NOT_FOUND"
    | "ALREADY_PROVISIONED"
    | "UNAUTHORIZED"
    | "INVALID_USERNAME"
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
        } satisfies ProvisionPdsResponse),
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

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired token",
          code: "UNAUTHORIZED",
        } satisfies ProvisionPdsResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: ProvisionPdsRequest = await req.json();
    const { username } = body;

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!username || !usernameRegex.test(username)) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Username must be 3-20 characters, alphanumeric with underscores/hyphens only",
          code: "INVALID_USERNAME",
        } satisfies ProvisionPdsResponse),
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
        } satisfies ProvisionPdsResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch user from database to check pds_status
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, email, pds_status, did")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError || !userData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User not found in database",
          code: "USER_NOT_FOUND",
        } satisfies ProvisionPdsResponse),
        {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Check if already provisioned
    if (userData.pds_status === "active" && userData.did) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "PDS account already exists",
          code: "ALREADY_PROVISIONED",
        } satisfies ProvisionPdsResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Allow retry for failed PDS provisioning
    // Users with pds_status = 'failed' can attempt to provision again
    if (userData.pds_status === "failed") {
      console.log(`Retrying PDS provisioning for user ${user.id}`);
    }

    // Check if external (Bluesky OAuth user)
    if (userData.pds_status === "external") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "External PDS accounts cannot be provisioned",
          code: "ALREADY_PROVISIONED",
        } satisfies ProvisionPdsResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Generate handle and check availability on PDS
    const handle = generateHandle(username);
    const handleAvailable = await checkPdsHandleAvailable(handle);

    if (!handleAvailable) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This handle is already registered on Bluesky",
          code: "HANDLE_TAKEN",
        } satisfies ProvisionPdsResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Generate secure random password (user won't need it - they auth via Supabase)
    const pdsPassword = generateSecurePassword(32);

    // Create invite code
    const inviteCode = await createPdsInviteCode();
    if (!inviteCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create PDS invite code",
          code: "PDS_ERROR",
        } satisfies ProvisionPdsResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Create PDS account
    // Use the user's real email (which may be a placeholder for Bluesky users)
    const email = userData.email || user.email;
    if (!email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User has no email address",
          code: "USER_NOT_FOUND",
        } satisfies ProvisionPdsResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const pdsResult = await createPdsAccount(
      handle,
      email,
      pdsPassword,
      inviteCode
    );

    if ("error" in pdsResult) {
      console.error("PDS account creation failed:", pdsResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: pdsResult.error,
          code: "PDS_ERROR",
        } satisfies ProvisionPdsResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Store password in Vault FIRST (before marking success)
    // This is critical - without the password, the user is locked out of their PDS
    const secretName = `pds_password_${user.id}`;
    const { error: vaultError } = await supabaseAdmin.rpc(
      "vault_create_secret",
      {
        secret_value: pdsPassword,
        secret_name: secretName,
        secret_description: `PDS password for user ${user.id}`,
      }
    );

    if (vaultError) {
      // CRITICAL: Password storage failed - user will be locked out of PDS
      // Return error so the client can handle this (e.g., show support contact)
      console.error("Failed to store password in vault:", vaultError);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "PDS account was created but password storage failed. Please contact support.",
          code: "VAULT_STORAGE_FAILED",
          did: pdsResult.did, // Include DID for support reference
        } satisfies ProvisionPdsResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Update user record with DID and pds_status
    // This must succeed for onboarding to complete
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        did: pdsResult.did,
        pds_status: "active",
        pds_handle: handle,
      })
      .eq("id", user.id);

    if (updateError) {
      // CRITICAL: DB update failed - PDS account exists but user record is stale
      // Set pds_status to 'failed' so user can retry
      console.error("Failed to update user with DID:", updateError);

      // Try to mark as failed so user can retry
      await supabaseAdmin
        .from("users")
        .update({ pds_status: "failed" })
        .eq("id", user.id);

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "PDS account was created but database update failed. Please try again.",
          code: "DB_UPDATE_FAILED",
          did: pdsResult.did, // Include DID for support reference
        } satisfies ProvisionPdsResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        did: pdsResult.did,
      } satisfies ProvisionPdsResponse),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Provision PDS error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
        code: "PDS_ERROR",
      } satisfies ProvisionPdsResponse),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
