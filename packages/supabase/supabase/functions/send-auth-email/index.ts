// packages/supabase/supabase/functions/send-auth-email/index.ts
//
// Send Auth Email Hook — handles all Supabase Auth email delivery via Resend.
// Configured as a Supabase Auth "Send Email" hook (HTTPS type).
//
// Webhook payload is verified via standard-webhooks signature.
// Does NOT use JWT auth — set verify_jwt = false in config.toml.
//
// Requires:
// - SEND_EMAIL_HOOK_SECRET env secret (webhook signature verification)
// - RESEND_API_KEY env secret (email delivery)

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { buildEmailLayout } from "../_shared/email-layout.ts";
import {
  buildSignupConfirmContent,
  buildPasswordResetContent,
  buildMagicLinkContent,
  buildEmailChangeContent,
  buildReauthContent,
} from "../_shared/email-content.ts";
import type { EmailContent } from "../_shared/email-content.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SEND_EMAIL_HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");

interface WebhookPayload {
  user: {
    email: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

const HANDLED_TYPES = new Set([
  "signup",
  "recovery",
  "magiclink",
  "email_change",
  "reauthentication",
]);

function buildConfirmUrl(
  siteUrl: string,
  tokenHash: string,
  type: string,
  redirectTo: string
): string {
  const base = siteUrl || "https://trainers.gg";
  return `${base}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(redirectTo)}`;
}

function getEmailContent(payload: WebhookPayload): EmailContent | null {
  const { token, token_hash, redirect_to, email_action_type, site_url } =
    payload.email_data;

  switch (email_action_type) {
    case "signup":
      return buildSignupConfirmContent(token);
    case "recovery":
      return buildPasswordResetContent(
        buildConfirmUrl(site_url, token_hash, "recovery", redirect_to)
      );
    case "magiclink":
      return buildMagicLinkContent(
        buildConfirmUrl(site_url, token_hash, "magiclink", redirect_to)
      );
    case "email_change":
      return buildEmailChangeContent(token);
    case "reauthentication":
      return buildReauthContent(token);
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Validate secrets are configured
    if (!RESEND_API_KEY || !SEND_EMAIL_HOOK_SECRET) {
      console.error(
        "Missing required secrets: RESEND_API_KEY or SEND_EMAIL_HOOK_SECRET"
      );
      return new Response(
        JSON.stringify({ error: "Email service is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    const rawBody = await req.text();
    const wh = new Webhook(SEND_EMAIL_HOOK_SECRET);

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    wh.verify(rawBody, headers);
    const payload = JSON.parse(rawBody) as WebhookPayload;

    const { email_action_type } = payload.email_data;
    const recipientEmail = payload.user.email;

    // Check if this is a type we handle
    if (!HANDLED_TYPES.has(email_action_type)) {
      console.warn(
        `[send-auth-email] Unhandled email_action_type: ${email_action_type} — returning 200 without sending`
      );
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build the email content
    const content = getEmailContent(payload);
    if (!content) {
      console.error(
        `[send-auth-email] Failed to build content for: ${email_action_type}`
      );
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Wrap in the branded layout
    const html = buildEmailLayout({
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
        html,
        text: content.text,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error("[send-auth-email] Resend API error:", resendError);
      return new Response(JSON.stringify({ error: "Email delivery failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[send-auth-email] Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
