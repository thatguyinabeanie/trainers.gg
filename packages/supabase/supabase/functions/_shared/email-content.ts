import { escapeHtml } from "./escape-html.ts";

/** The canonical site URL used for building org links. */
const SITE_URL = "https://trainers.gg";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface EmailContent {
  /** Email subject line. */
  subject: string;
  /** Inner HTML for the body section (injected into the layout). */
  body: string;
  /** Plain-text alternative (no HTML). */
  text: string;
}

// ---------------------------------------------------------------------------
// Internal HTML helpers
// Each helper uses BOTH inline styles (for email clients that strip <style>)
// AND CSS classes (for dark-mode media-query overrides in the layout).
// ---------------------------------------------------------------------------

/**
 * Full-width teal CTA button using a table-based layout for maximum email
 * client compatibility.
 */
function ctaButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td align="center">
      <a
        href="${safeHref}"
        class="email-cta"
        style="display:inline-block;background-color:#0d9488;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:10px;letter-spacing:0.01em;"
      >${safeLabel}</a>
    </td>
  </tr>
</table>`.trim();
}

/**
 * Large monospace OTP display block. Uses the `email-otp` class so the layout's
 * dark-mode media query can override background and text colors.
 */
function otpBlock(code: string): string {
  const formatted = formatOtp(code);
  return `
<div
  class="email-otp"
  style="display:block;font-family:monospace,monospace;font-size:28px;font-weight:700;color:#171717;background-color:#f5f5f5;text-align:center;padding:20px 32px;border-radius:8px;letter-spacing:0.12em;margin:24px 0;"
>${formatted}</div>`.trim();
}

/** Section heading styled for email. */
function heading(text: string): string {
  return `<h2 class="email-heading" style="font-size:20px;font-weight:700;color:#171717;margin:0 0 16px 0;">${text}</h2>`;
}

/** Body paragraph. Accepts pre-built HTML content (caller must escape user data). */
function bodyText(html: string): string {
  return `<p class="email-body-text" style="font-size:15px;line-height:1.6;color:#525252;margin:0 0 12px 0;">${html}</p>`;
}

/** Small gray fine-print text (e.g. expiry notices). */
function finePrint(text: string): string {
  const safe = escapeHtml(text);
  return `<p class="email-fine" style="font-size:12px;color:#a3a3a3;margin:16px 0 0 0;">${safe}</p>`;
}

/**
 * Gray info box with an uppercase label row and a value row.
 * Used for rejection reasons, etc.
 */
function infoBox(label: string, value: string): string {
  const safeLabel = escapeHtml(label);
  const safeValue = escapeHtml(value);
  return `
<div
  class="email-info-box"
  style="background-color:#f5f5f5;border-radius:8px;padding:16px 20px;margin:16px 0;"
>
  <p class="email-info-label" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#a3a3a3;margin:0 0 4px 0;">${safeLabel}</p>
  <p class="email-info-value" style="font-size:14px;color:#171717;margin:0;">${safeValue}</p>
</div>`.trim();
}

// ---------------------------------------------------------------------------
// Public helper
// ---------------------------------------------------------------------------

/**
 * Formats a numeric OTP code by splitting it in half with a space.
 * e.g. "384291" → "384 291", "1234" → "12 34"
 */
export function formatOtp(code: string): string {
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)} ${code.slice(mid)}`;
}

// ---------------------------------------------------------------------------
// Content builders
// ---------------------------------------------------------------------------

/**
 * Builds email content for organization approval notifications.
 */
export function buildOrgApprovedContent(
  orgName: string,
  orgSlug: string
): EmailContent {
  const safeOrgName = escapeHtml(orgName);
  const safeSlug = escapeHtml(orgSlug);
  const orgUrl = `${SITE_URL}/organizations/${safeSlug}`;

  const body = [
    heading("Your organization has been approved!"),
    bodyText(
      `Congratulations! <strong class="email-body-strong" style="color:#171717;font-weight:600;">${safeOrgName}</strong> has been approved and is now live on trainers.gg.`
    ),
    bodyText("You can now create tournaments, manage your roster, and more."),
    ctaButton(orgUrl, "View Your Organization"),
  ].join("\n");

  const text = [
    "Your organization has been approved!",
    "",
    `Congratulations! ${orgName} has been approved and is now live on trainers.gg.`,
    "",
    "You can now create tournaments, manage your roster, and more.",
    "",
    `View your organization: ${SITE_URL}/organizations/${orgSlug}`,
  ].join("\n");

  return {
    subject: "Your organization has been approved!",
    body,
    text,
  };
}

/**
 * Builds email content for organization rejection notifications.
 */
export function buildOrgRejectedContent(
  orgName: string,
  adminNotes: string | null
): EmailContent {
  const safeOrgName = escapeHtml(orgName);

  const bodyParts = [
    heading("Organization request update"),
    bodyText(
      `Thank you for your interest in creating <strong class="email-body-strong" style="color:#171717;font-weight:600;">${safeOrgName}</strong> on trainers.gg. Unfortunately, your request was not approved at this time.`
    ),
  ];

  if (adminNotes) {
    bodyParts.push(infoBox("Reason", adminNotes));
  }

  bodyParts.push(
    bodyText(
      "If you have questions or would like to reapply, please contact our support team."
    )
  );

  const body = bodyParts.join("\n");

  const textParts = [
    "Organization request update",
    "",
    `Thank you for your interest in creating ${orgName} on trainers.gg. Unfortunately, your request was not approved at this time.`,
  ];

  if (adminNotes) {
    textParts.push("", `Reason: ${adminNotes}`);
  }

  textParts.push(
    "",
    "If you have questions or would like to reapply, please contact our support team."
  );

  return {
    subject: "Organization request update",
    body,
    text: textParts.join("\n"),
  };
}

/**
 * Builds email content for email confirmation (signup OTP).
 */
export function buildSignupConfirmContent(otp: string): EmailContent {
  const body = [
    heading("Confirm your email"),
    bodyText(
      "Enter the code below to confirm your email address and activate your account."
    ),
    otpBlock(otp),
    finePrint(
      "This code expires in 1 hour. If you didn't create an account, you can safely ignore this email."
    ),
  ].join("\n");

  const text = [
    "Confirm your email",
    "",
    "Enter the code below to confirm your email address and activate your account.",
    "",
    `Your confirmation code: ${formatOtp(otp)}`,
    "",
    "This code expires in 1 hour. If you didn't create an account, you can safely ignore this email.",
  ].join("\n");

  return {
    subject: "Confirm your email",
    body,
    text,
  };
}

/**
 * Builds email content for password reset links.
 */
export function buildPasswordResetContent(resetUrl: string): EmailContent {
  const body = [
    heading("Reset your password"),
    bodyText(
      "We received a request to reset the password for your trainers.gg account. Click the button below to choose a new password."
    ),
    ctaButton(resetUrl, "Reset Password"),
    finePrint(
      "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email."
    ),
  ].join("\n");

  const text = [
    "Reset your password",
    "",
    "We received a request to reset the password for your trainers.gg account.",
    "",
    `Reset your password: ${resetUrl}`,
    "",
    "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.",
  ].join("\n");

  return {
    subject: "Reset your password",
    body,
    text,
  };
}

/**
 * Builds email content for magic link sign-in.
 */
export function buildMagicLinkContent(signInUrl: string): EmailContent {
  const body = [
    heading("Sign in to trainers.gg"),
    bodyText(
      "Click the button below to sign in to your trainers.gg account. No password required."
    ),
    ctaButton(signInUrl, "Sign In"),
    finePrint(
      "This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email."
    ),
  ].join("\n");

  const text = [
    "Sign in to trainers.gg",
    "",
    "Click the link below to sign in to your trainers.gg account. No password required.",
    "",
    `Sign in: ${signInUrl}`,
    "",
    "This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.",
  ].join("\n");

  return {
    subject: "Sign in to trainers.gg",
    body,
    text,
  };
}

/**
 * Builds email content for email address change confirmation (OTP).
 */
export function buildEmailChangeContent(otp: string): EmailContent {
  const body = [
    heading("Confirm your new email"),
    bodyText("Enter the code below to confirm your new email address."),
    otpBlock(otp),
    finePrint(
      "This code expires in 1 hour. If you didn't request an email change, please contact support immediately."
    ),
  ].join("\n");

  const text = [
    "Confirm your new email",
    "",
    "Enter the code below to confirm your new email address.",
    "",
    `Your confirmation code: ${formatOtp(otp)}`,
    "",
    "This code expires in 1 hour. If you didn't request an email change, please contact support immediately.",
  ].join("\n");

  return {
    subject: "Confirm your new email",
    body,
    text,
  };
}

/**
 * Builds email content for re-authentication verification (OTP).
 */
export function buildReauthContent(otp: string): EmailContent {
  const body = [
    heading("Verify your identity"),
    bodyText(
      "Enter the code below to verify your identity and complete the action."
    ),
    otpBlock(otp),
    finePrint(
      "This code expires in 10 minutes. If you didn't request this, please secure your account immediately."
    ),
  ].join("\n");

  const text = [
    "Verify your identity",
    "",
    "Enter the code below to verify your identity and complete the action.",
    "",
    `Your verification code: ${formatOtp(otp)}`,
    "",
    "This code expires in 10 minutes. If you didn't request this, please secure your account immediately.",
  ].join("\n");

  return {
    subject: "Verify your identity",
    body,
    text,
  };
}
