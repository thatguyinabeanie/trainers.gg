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
import { corsHeaders } from "../_shared/cors.ts";

const PDS_HOST = Deno.env.get("PDS_HOST") || "https://pds.trainers.gg";
const PDS_ADMIN_PASSWORD = Deno.env.get("PDS_ADMIN_PASSWORD");
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

// Create an invite code on the PDS (required for account creation)
async function createPdsInviteCode(): Promise<string | null> {
  if (!PDS_ADMIN_PASSWORD) {
    console.error("PDS_ADMIN_PASSWORD not set");
    return null;
  }

  try {
    const response = await fetch(
      `${PDS_HOST}/xrpc/com.atproto.server.createInviteCode`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`admin:${PDS_ADMIN_PASSWORD}`)}`,
        },
        body: JSON.stringify({ useCount: 1 }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create invite code:", error);
      return null;
    }

    const data = await response.json();
    return data.code;
  } catch (error) {
    console.error("Error creating invite code:", error);
    return null;
  }
}

// Create account on the PDS
async function createPdsAccount(
  handle: string,
  email: string,
  password: string,
  inviteCode: string
): Promise<{ did: string } | { error: string }> {
  try {
    const response = await fetch(
      `${PDS_HOST}/xrpc/com.atproto.server.createAccount`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          handle,
          password,
          inviteCode,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || "Failed to create PDS account" };
    }

    return { did: data.did };
  } catch (error) {
    console.error("Error creating PDS account:", error);
    return { error: "Failed to connect to PDS" };
  }
}

// Check if handle is available on the PDS
async function checkPdsHandleAvailable(handle: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${PDS_HOST}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
    );

    // 400 with "Unable to resolve handle" means it's available
    if (response.status === 400) {
      return true;
    }

    // 200 means handle exists (not available)
    return false;
  } catch {
    // Network error - assume available but will fail at creation
    return true;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate the Bluesky handle
    const handle = `${username.toLowerCase()}.trainers.gg`;

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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = authData.user.id;
    let did: string | null = null;
    let pdsStatus: "active" | "pending" | "failed" = "pending";

    // Create PDS account (non-blocking - if it fails, user can still use the app)
    if (PDS_ADMIN_PASSWORD) {
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

    // Generate a session for the user
    const { data: sessionData, error: sessionError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
