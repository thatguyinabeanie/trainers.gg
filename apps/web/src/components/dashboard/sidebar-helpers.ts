/**
 * Pure helper functions for the dashboard sidebar.
 * Extracted for testability.
 */

/** Extract the community slug from a dashboard pathname, or null if not in community context. */
export function getCommunitySlug(pathname: string): string | null {
  const match = /^\/dashboard\/community\/([^/]+)/.exec(pathname);
  return match?.[1] ?? null;
}

/** Cookie name used for the alt switcher filter. */
export const DASHBOARD_ALT_COOKIE = "dashboard-alt";

/** Max-age for the alt cookie — 1 year in seconds. */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
