// Send Organization Request Notification Edge Function
// Sends an email via Resend when an org request is approved or rejected.
//
// Requires:
// - JWT auth (Bearer token) — caller must be a site_admin
// - RESEND_API_KEY env secret
//
// POST body: { requestId: number, action: "approved" | "rejected" }
// Returns: { success: boolean, error?: string, code?: string }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { captureEventWithRequest } from "../_shared/posthog.ts";
import { ORG_REQUEST_APPROVED, ORG_REQUEST_REJECTED } from "@trainers/posthog";
import { buildEmailLayout } from "../_shared/email-layout.ts";
import {
  buildOrgApprovedContent,
  buildOrgRejectedContent,
} from "../_shared/email-content.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface NotificationResponse {
  success: boolean;
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
    // Validate RESEND_API_KEY is configured
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email service is not configured",
          code: "EMAIL_NOT_CONFIGURED",
        } satisfies NotificationResponse),
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
        } satisfies NotificationResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the JWT via Supabase Auth
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
        } satisfies NotificationResponse),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Create service role client for DB operations
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Check if caller is a site admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role_id, roles!inner(name)")
      .eq("user_id", user.id)
      .eq("roles.name", "site_admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Admin access required",
          code: "FORBIDDEN",
        } satisfies NotificationResponse),
        {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { requestId, action } = body as {
      requestId: number;
      action: string;
    };

    if (
      typeof requestId !== "number" ||
      !Number.isInteger(requestId) ||
      requestId <= 0
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid requestId",
          code: "INVALID_INPUT",
        } satisfies NotificationResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    if (action !== "approved" && action !== "rejected") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid action — must be 'approved' or 'rejected'",
          code: "INVALID_INPUT",
        } satisfies NotificationResponse),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Look up the request and user email
    const { data: orgRequest, error: queryError } = await supabaseAdmin
      .from("organization_requests")
      .select(
        "id, name, slug, admin_notes, user_id, users!organization_requests_user_id_fkey(email)"
      )
      .eq("id", requestId)
      .single();

    if (queryError || !orgRequest) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Organization request not found",
          code: "NOT_FOUND",
        } satisfies NotificationResponse),
        {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Extract email from the joined users row
    const userRow = orgRequest.users as unknown as {
      email: string | null;
    } | null;
    const recipientEmail = userRow?.email;

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User email not found",
          code: "NO_EMAIL",
        } satisfies NotificationResponse),
        {
          status: 422,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Build the email
    const content =
      action === "approved"
        ? buildOrgApprovedContent(orgRequest.name, orgRequest.slug)
        : buildOrgRejectedContent(orgRequest.name, orgRequest.admin_notes);

    const emailHtml = buildEmailLayout({
      title: content.subject,
      body: content.body,
    });

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "trainers.gg <noreply@trainers.gg>",
        to: recipientEmail,
        subject: content.subject,
        html: emailHtml,
        text: content.text,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error("Resend API error:", resendError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email delivery failed",
          code: "EMAIL_DELIVERY_FAILED",
        } satisfies NotificationResponse),
        {
          status: 502,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }

    // Fire-and-forget analytics
    captureEventWithRequest(req, {
      event:
        action === "approved" ? ORG_REQUEST_APPROVED : ORG_REQUEST_REJECTED,
      distinctId: user.id,
      properties: {
        request_id: requestId,
        org_name: orgRequest.name,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
      } satisfies NotificationResponse),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Send org request notification error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
      } satisfies NotificationResponse),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
