// Update PDS Handle Edge Function
// Updates the Bluesky handle on an existing PDS account when username changes
//
// Flow:
// 1. Verify JWT and extract user ID
// 2. Validate new username format
// 3. Check user has pds_status = 'active' and has a DID
// 4. Retrieve PDS password from Vault
// 5. Generate new handle and check availability
// 6. Login to PDS agent with DID + password
// 7. Update handle via com.atproto.identity.updateHandle
// 8. Update users.pds_handle in database
//
// Authentication: Requires JWT (user can only update their own handle)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  checkPdsHandleAvailable,
  generateHandle,
  loginPdsAgent,
} from "../_shared/pds.ts";
import { z, ZodError } from "zod";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface UpdatePdsHandleResponse {
  success: boolean;
  handle?: string;
  error?: string;
  code?:
    | "UNAUTHORIZED"
    | "INVALID_USERNAME"
    | "NOT_PROVISIONED"
    | "HANDLE_TAKEN"
    | "VAULT_ERROR"
    | "PDS_ERROR"
    | "DB_UPDATE_FAILED";
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
        } satisfies UpdatePdsHandleResponse),
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
        } satisfies UpdatePdsHandleResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { username } = z
      .object({
        username: z
          .string()
          .min(3, "Username must be at least 3 characters")
          .max(20, "Username must be at most 20 characters")
          .regex(
            /^[a-zA-Z0-9_-]+$/,
            "Username can only contain letters, numbers, underscores, and hyphens"
          ),
      })
      .parse(body);

    // Fetch user from database to check pds_status and DID
    const { data: userData, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, pds_status, did, pds_handle")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError || !userData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User not found in database",
          code: "NOT_PROVISIONED",
        } satisfies UpdatePdsHandleResponse),
        {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has an active PDS account
    if (userData.pds_status !== "active" || !userData.did) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User does not have an active PDS account",
          code: "NOT_PROVISIONED",
        } satisfies UpdatePdsHandleResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Generate new handle and check availability
    const newHandle = generateHandle(username);

    // Skip update if handle is already the current one
    if (userData.pds_handle === newHandle) {
      return new Response(
        JSON.stringify({
          success: true,
          handle: newHandle,
        } satisfies UpdatePdsHandleResponse),
        {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const handleAvailable = await checkPdsHandleAvailable(newHandle);

    if (!handleAvailable) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This handle is already registered on Bluesky",
          code: "HANDLE_TAKEN",
        } satisfies UpdatePdsHandleResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Retrieve PDS password from Vault
    const secretName = `pds_password_${user.id}`;
    const { data: vaultData, error: vaultError } = await supabaseAdmin.rpc(
      "vault_read_secret",
      {
        secret_name: secretName,
      }
    );

    if (vaultError || !vaultData) {
      console.error("Failed to retrieve password from vault:", vaultError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to retrieve PDS credentials",
          code: "VAULT_ERROR",
        } satisfies UpdatePdsHandleResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const pdsPassword = vaultData as string;

    // Login to PDS agent
    const loginResult = await loginPdsAgent(userData.did, pdsPassword);

    if (!loginResult.success) {
      console.error("PDS agent login failed:", loginResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: loginResult.error,
          code: "PDS_ERROR",
        } satisfies UpdatePdsHandleResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Update handle via AT Protocol API
    try {
      await loginResult.agent.com.atproto.identity.updateHandle({
        handle: newHandle,
      });
    } catch (error) {
      console.error("Failed to update handle on PDS:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update handle on PDS",
          code: "PDS_ERROR",
        } satisfies UpdatePdsHandleResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Update pds_handle in database
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        pds_handle: newHandle,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update pds_handle in database:", updateError);
      // Handle was updated on PDS but database update failed
      // This is a less critical error - the PDS is the source of truth
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Handle updated on PDS but database sync failed. Please contact support.",
          code: "DB_UPDATE_FAILED",
        } satisfies UpdatePdsHandleResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        handle: newHandle,
      } satisfies UpdatePdsHandleResponse),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Update PDS handle error:", error);

    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.issues[0]?.message ?? "Invalid input",
          code: "INVALID_USERNAME",
        } satisfies UpdatePdsHandleResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
        code: "PDS_ERROR",
      } satisfies UpdatePdsHandleResponse),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
