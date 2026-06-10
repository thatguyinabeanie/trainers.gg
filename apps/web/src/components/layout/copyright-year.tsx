"use client";

/**
 * Renders the current year for the site footer copyright line.
 *
 * Extracted as a Client Component because new Date() is a dynamic runtime
 * read — calling it in a Server Component during PPR prerender triggers a
 * "used new Date() before accessing uncached/request data" build error.
 * A Client Component renders this at hydration time instead.
 */
export function CopyrightYear() {
  return <>{new Date().getFullYear()}</>;
}
