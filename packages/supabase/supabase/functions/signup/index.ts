// Unified Signup Edge Function
// Creates both Supabase Auth account AND Bluesky PDS account atomically
//
// Flow:
// 1. Validate input (email, username, password)
// 2. Check username availability on both Supabase and PDS
// 3. Create Supabase Auth account
// 4. Create PDS account with @username.trainers.gg handle
// 5. Update Supabase user with DID
// 6. Return session

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  createPdsInviteCode,
  createPdsAccount,
  checkPdsHandleAvailable,
  generateHandle,
  PDS_CONFIG,
} from "../_shared/pds.ts";
import { captureEventWithRequest } from "../_shared/posthog.ts";
import { USER_SIGNED_UP } from "@trainers/posthog";
import { signupRequestSchema } from "@trainers/validators/auth";
import { ZodError } from "zod";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SignupResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    handle: string;
    did: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  error?: string;
  code?: string;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = await req.json();
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      birthDate,
      country,
      inviteToken,
    } = signupRequestSchema.parse(body);

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

    // ---------- Beta invite gate ----------
    // When maintenance mode is active, only users with a valid invite token
    // may sign up. The token must exist, be unused, unexpired, and the email
    // in the request must match the email on the invite. This is the
    // authoritative server-side check — client-side readOnly is cosmetic only.
    const maintenanceMode = Deno.env.get("MAINTENANCE_MODE") === "true";

    if (maintenanceMode) {
      if (!inviteToken) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "A valid invite is required to sign up during the private beta",
            code: "INVITE_REQUIRED",
          } satisfies SignupResponse),
          {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }

      const { data: invite, error: inviteError } = await supabaseAdmin
        .from("beta_invites")
        .select("id, email, expires_at, used_at")
        .eq("token", inviteToken)
        .maybeSingle();

      if (inviteError || !invite) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid invite token",
            code: "INVALID_INVITE",
          } satisfies SignupResponse),
          {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }

      if (invite.used_at) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "This invite has already been used",
            code: "INVITE_USED",
          } satisfies SignupResponse),
          {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }

      if (new Date(invite.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "This invite has expired",
            code: "INVITE_EXPIRED",
          } satisfies SignupResponse),
          {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }

      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Email does not match the invite",
            code: "EMAIL_MISMATCH",
          } satisfies SignupResponse),
          {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Escape LIKE special characters for case-insensitive matching
    const escapedUsername = username.replace(/[%_\\]/g, "\\$&");

    // Check username availability in users table (case-insensitive)
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("username", escapedUsername)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Username is already taken",
          code: "USERNAME_TAKEN",
        } satisfies SignupResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Check username availability in alts table (case-insensitive)
    const { data: existingAlt } = await supabaseAdmin
      .from("alts")
      .select("id")
      .ilike("username", escapedUsername)
      .maybeSingle();

    if (existingAlt) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Username is already taken",
          code: "USERNAME_TAKEN",
        } satisfies SignupResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Check if email already exists
    const escapedEmail = email.replace(/[%_\\]/g, "\\$&");
    const { data: existingEmail } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("email", escapedEmail)
      .maybeSingle();

    if (existingEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "An account with this email already exists",
          code: "EMAIL_TAKEN",
        } satisfies SignupResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Generate the Bluesky handle
    const handle = generateHandle(username);

    // Check handle availability on PDS
    const handleAvailable = await checkPdsHandleAvailable(handle);
    if (!handleAvailable) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This handle is already registered on Bluesky",
          code: "HANDLE_TAKEN",
        } satisfies SignupResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase Auth account first
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for now (can add email verification later)
        user_metadata: {
          username,
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          country,
        },
      });

    if (authError || !authData.user) {
      console.error("Supabase auth error:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: authError?.message || "Failed to create account",
          code: "AUTH_ERROR",
        } satisfies SignupResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const userId = authData.user.id;
    let did: string | null = null;
    let pdsStatus: "active" | "pending" | "failed" = "pending";

    // Create PDS account (non-blocking - if it fails, user can still use the app)
    if (PDS_CONFIG.hasAdminPassword) {
      const inviteCode = await createPdsInviteCode();

      if (inviteCode) {
        const pdsResult = await createPdsAccount(
          handle,
          email,
          password,
          inviteCode
        );

        if ("did" in pdsResult) {
          did = pdsResult.did;
          pdsStatus = "active";
        } else {
          console.error("PDS account creation failed:", pdsResult.error);
          pdsStatus = "failed";
        }
      } else {
        pdsStatus = "failed";
      }
    } else {
      console.warn(
        "PDS_ADMIN_PASSWORD not set - skipping PDS account creation"
      );
    }

    // Update the user record with DID and PDS status
    // Note: The handle_new_user trigger already created the user record,
    // so we update it with the DID
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        did,
        pds_status: pdsStatus,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update user with DID:", updateError);
      // Don't fail the signup - user is created, just without DID
    }

    // ---------- Mark invite as used (atomic, before returning success) ----------
    if (inviteToken) {
      const { error: markError } = await supabaseAdmin
        .from("beta_invites")
        .update({
          used_at: new Date().toISOString(),
          converted_user_id: userId,
        })
        .eq("token", inviteToken)
        .is("used_at", null);

      if (markError) {
        console.error("Failed to mark invite as used:", markError);
        // Don't fail the signup — account is already created
      }

      // Also update the waitlist entry if one exists for this email
      await supabaseAdmin
        .from("waitlist")
        .update({ converted_user_id: userId })
        .eq("email", email);
    }

    // Fire-and-forget analytics
    captureEventWithRequest(req, {
      event: USER_SIGNED_UP,
      distinctId: userId,
      properties: {
        username,
        has_invite: !!inviteToken,
        pds_status: pdsStatus,
        country,
      },
    });

    // For now, we'll return success and let the client sign in
    // In production, you'd want to return actual session tokens
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email,
          username,
          handle,
          did: did || "",
        },
        // Note: Client should call signIn after signup to get session
        // This is because admin.createUser doesn't return session tokens
      } satisfies SignupResponse),
      {
        status: 201,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Signup error:", error);

    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.issues[0]?.message ?? "Invalid input",
          code: "VALIDATION_ERROR",
        } satisfies SignupResponse),
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
        code: "INTERNAL_ERROR",
      } satisfies SignupResponse),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }
});
