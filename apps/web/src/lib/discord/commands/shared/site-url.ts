/**
 * Site URL helper — reads NEXT_PUBLIC_SITE_URL with a safe fallback.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://trainers.gg";
