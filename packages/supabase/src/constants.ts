/**
 * Constants for the Supabase backend package
 */

// =============================================================================
// Cookie Domain (cross-subdomain auth)
// =============================================================================

/**
 * Derive the cookie domain from NEXT_PUBLIC_SITE_URL using strict hostname parsing.
 * Returns ".trainers.gg" in production so cookies are shared across subdomains
 * (builder.trainers.gg, dashboard.trainers.gg). Returns undefined in local dev
 * and preview deploys so cookies use browser defaults.
 */
function deriveCookieDomain(): string | undefined {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return undefined;

  try {
    const { hostname } = new URL(siteUrl);
    if (
      hostname === "trainers.gg" ||
      hostname.endsWith(".trainers.gg")
    ) {
      return ".trainers.gg";
    }
  } catch {
    // Invalid URL — fall through to undefined
  }

  return undefined;
}

export const COOKIE_DOMAIN: string | undefined = deriveCookieDomain();

// =============================================================================
// Invitations
// =============================================================================

/**
 * Number of days before an invitation expires
 */
export const INVITATION_EXPIRY_DAYS = 7;

/**
 * Invitation expiry duration in milliseconds
 */
export const INVITATION_EXPIRY_MS =
  INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Helper function to get expiry date for invitations
 */
export function getInvitationExpiryDate(): string {
  return new Date(Date.now() + INVITATION_EXPIRY_MS).toISOString();
}
