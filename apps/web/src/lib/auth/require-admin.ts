import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side guard that requires the current user to have the `site_admin` role.
 *
 * - Redirects to /sign-in if not authenticated
 * - Redirects to /forbidden if authenticated but not a site admin
 * - Returns the authenticated user if they are a site admin
 *
 * Use in admin layouts and pages as defense-in-depth alongside the proxy check.
 */
export async function requireSiteAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect("/forbidden");
  }

  const payload = JSON.parse(atob(session.access_token.split(".")[1]!)) as {
    site_roles?: string[];
  };

  const siteRoles: string[] = payload.site_roles ?? [];

  if (!siteRoles.includes("site_admin")) {
    redirect("/forbidden");
  }

  return user;
}
