export interface EmailLayoutOptions {
  /** HTML <title> content */
  title: string;
  /** Inner HTML content for the body section */
  body: string;
  /** Optional custom footer text (defaults to "© 2026 trainers.gg") */
  footer?: string;
}

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif";

/**
 * Wrap email body content in the branded trainers.gg layout.
 * Returns a complete HTML document with email-safe table layout,
 * light-mode default, and dark mode media query overrides.
 */
export function buildEmailLayout({
  title,
  body,
  footer = "© 2026 trainers&zwnj;.gg",
}: EmailLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .email-outer { background-color: #0a0a0a !important; }
      .email-card { background-color: #171717 !important; }
      .email-wordmark { color: #2dd4bf !important; }
      .email-heading { color: #fafafa !important; }
      .email-body-text { color: #a3a3a3 !important; }
      .email-body-strong { color: #fafafa !important; }
      .email-cta { background-color: #14b8a6 !important; }
      .email-otp { background-color: #262626 !important; color: #fafafa !important; }
      .email-info-box { background-color: #262626 !important; }
      .email-info-label { color: #737373 !important; }
      .email-info-value { color: #a3a3a3 !important; }
      .email-fine { color: #525252 !important; }
      .email-footer-border { border-top-color: rgba(255, 255, 255, 0.1) !important; }
      .email-footer-text { color: #525252 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: ${FONT_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-outer" style="background-color: #f5f5f5; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-card" style="max-width: 480px; background-color: #ffffff; border-radius: 10px; overflow: hidden;">
          <!-- Wordmark -->
          <tr>
            <td style="padding: 32px 32px 20px; text-align: center;">
              <span class="email-wordmark" style="font-size: 20px; font-weight: 700; color: #14b8a6; letter-spacing: -0.01em; font-family: ${FONT_STACK};">trainers.gg</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 24px 32px 32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer-border" style="padding: 20px 32px; border-top: 1px solid #e5e5e5; text-align: center;">
              <span class="email-footer-text" style="font-size: 12px; color: #a3a3a3; font-family: ${FONT_STACK};">${footer}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
