// Send Beta Invite Edge Function
// Creates an invite token, inserts into beta_invites, and sends an email via Resend.
//
// Requires:
// - JWT auth (Bearer token) — caller must be a site_admin
// - RESEND_API_KEY env secret
//
// POST body: { email: string }
// Returns: { success: boolean, error?: string, warning?: string, code?: string }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { captureEventWithRequest } from "../_shared/posthog.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface SendInviteRequest {
  email: string;
}

interface SendInviteResponse {
  success: boolean;
  error?: string;
  warning?: string;
  code?: string;
}

// Escape HTML special characters to prevent injection in email templates
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Generate a cryptographically secure token (URL-safe, 32 bytes = 43 chars base64url)
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Convert to base64url (URL-safe, no padding)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Build the invite email HTML
function buildInviteEmail(token: string, email: string): string {
  const siteUrl = Deno.env.get("SITE_URL") || "https://trainers.gg";
  const inviteUrl = `${siteUrl}/invite/${token}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to trainers.gg</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0d9488; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                trainers.gg
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 20px; font-weight: 600;">
                You're invited to the private beta!
              </h2>
              <p style="margin: 0 0 24px; color: #52525b; font-size: 15px; line-height: 1.6;">
                You've been selected to join <strong>trainers.gg</strong> — the competitive Pok&eacute;mon community platform. Click the button below to create your account.
              </p>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${inviteUrl}" style="display: inline-block; background-color: #0d9488; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 8px;">
                      Create Your Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #71717a; font-size: 13px; line-height: 1.5;">
                This invite is for <strong>${escapeHtml(email)}</strong> and expires in 7 days. It can only be used once.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.5;">
                If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // Validate RESEND_API_KEY is configured
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service is not configured",
          code: "EMAIL_NOT_CONFIGURED",
        } satisfies SendInviteResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Authenticate the caller via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authorization required",
          code: "UNAUTHORIZED",
        } satisfies SendInviteResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the JWT via Supabase Auth (server-side signature verification)
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid authorization token",
          code: "INVALID_TOKEN",
        } satisfies SendInviteResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    const callerUserId = user.id;

    // Create service role client for DB operations
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Check if caller is a site admin via database query
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role_id, roles!inner(name)")
      .eq("user_id", callerUserId)
      .eq("roles.name", "site_admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Admin access required",
          code: "FORBIDDEN",
        } satisfies SendInviteResponse),
        {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: SendInviteRequest = await req.json();
    const { email } = body;

    if (!email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email is required",
          code: "MISSING_EMAIL",
        } satisfies SendInviteResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Normalize email before validation so regex operates on canonical form
    const trimmedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    if (!emailRegex.test(trimmedEmail)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid email address",
          code: "INVALID_EMAIL",
        } satisfies SendInviteResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Check if email already has an account
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("email", trimmedEmail)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This email already has an account",
          code: "ALREADY_REGISTERED",
        } satisfies SendInviteResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Check for active (unused, unexpired) invite for this email
    const { data: activeInvite } = await supabaseAdmin
      .from("beta_invites")
      .select("id")
      .eq("email", trimmedEmail)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (activeInvite) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "An active invite already exists for this email",
          code: "INVITE_EXISTS",
        } satisfies SendInviteResponse),
        {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Generate a unique token
    const token = generateToken();

    // Insert the invite
    const { error: insertError } = await supabaseAdmin
      .from("beta_invites")
      .insert({
        email: trimmedEmail,
        token,
        invited_by: callerUserId,
      });

    if (insertError) {
      console.error("Failed to insert invite:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create invite",
          code: "INSERT_ERROR",
        } satisfies SendInviteResponse),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Send the invite email via Resend
    const emailHtml = buildInviteEmail(token, trimmedEmail);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "trainers.gg <noreply@trainers.gg>",
        to: trimmedEmail,
        subject: "You're invited to trainers.gg!",
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error("Resend API error:", resendError);
      // Don't fail — the invite is created, email can be resent
      return new Response(
        JSON.stringify({
          success: true,
          warning:
            "Invite created but email delivery failed. You can resend it.",
          code: "EMAIL_DELIVERY_FAILED",
        } satisfies SendInviteResponse),
        {
          status: 201,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Update waitlist notified_at if the email is on the waitlist
    await supabaseAdmin
      .from("waitlist")
      .update({ notified_at: new Date().toISOString() })
      .eq("email", trimmedEmail);

    // Fire-and-forget analytics (domain only — no email addresses)
    captureEventWithRequest(req, {
      event: "beta_invite_sent",
      distinctId: callerUserId,
      properties: {
        invited_email_domain: trimmedEmail.split("@")[1],
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
      } satisfies SendInviteResponse),
      {
        status: 201,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Send invite error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      } satisfies SendInviteResponse),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
