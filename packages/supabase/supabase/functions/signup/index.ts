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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SignupRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  country?: string;
  inviteToken?: string;
}

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
    const body: SignupRequest = await req.json();
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      birthDate,
      country,
      inviteToken,
    } = body;

    // Validate required fields
    if (!email || !username || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email, username, and password are required",
          code: "MISSING_FIELDS",
        } satisfies SignupResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Username must be 3-20 characters, alphanumeric with underscores/hyphens only",
          code: "INVALID_USERNAME",
        } satisfies SignupResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Validate password strength (must match Supabase Auth settings)
    // Requirements: 8+ chars, lowercase, uppercase, digit, symbol
    const passwordErrors: string[] = [];
    if (password.length < 8) {
      passwordErrors.push("at least 8 characters");
    }
    if (!/[a-z]/.test(password)) {
      passwordErrors.push("one lowercase letter");
    }
    if (!/[A-Z]/.test(password)) {
      passwordErrors.push("one uppercase letter");
    }
    if (!/[0-9]/.test(password)) {
      passwordErrors.push("one number");
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      passwordErrors.push("one symbol");
    }

    if (passwordErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Password must contain: ${passwordErrors.join(", ")}`,
          code: "WEAK_PASSWORD",
        } satisfies SignupResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
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

    // Check username availability in Supabase
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("username", username)
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

    // Check if email already exists
    const { data: existingEmail } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("email", email)
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
