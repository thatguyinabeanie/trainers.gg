import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createClient,
  createServiceRoleClient,
  getUser,
} from "@/lib/supabase/server";
import { isSudoModeActive as checkSudoModeActive } from "@trainers/supabase";

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

  let siteRoles: string[] = [];
  try {
    const payload = JSON.parse(atob(session.access_token.split(".")[1]!)) as {
      site_roles?: string[];
    };
    siteRoles = payload.site_roles ?? [];
  } catch (err) {
    console.error("[auth] Failed to parse JWT site_roles:", err);
    redirect("/forbidden");
  }

  if (!siteRoles.includes("site_admin")) {
    redirect("/forbidden");
  }

  return user;
}

/**
 * Verify the current user is authenticated, has the site_admin role, and
 * has an active sudo session. Use in server actions that perform admin mutations.
 *
 * Returns `{ userId }` on success, or `{ success: false, error }` on failure.
 */
export async function requireAdminWithSudo(): Promise<
  { userId: string } | { success: false; error: string }
> {
  // Check authentication
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check site_admin role via service role client (bypasses RLS)
  const supabase = createServiceRoleClient();
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role_id, roles!inner(name)")
    .eq("user_id", user.id)
    .eq("roles.name", "site_admin")
    .maybeSingle();

  if (!adminRole) {
    return { success: false, error: "Admin access required" };
  }

  // Check active sudo session
  const cookieStore = await cookies();
  const sudoCookie = cookieStore.get("sudo_mode");
  if (!sudoCookie?.value) {
    return { success: false, error: "Sudo mode required" };
  }

  // Verify sudo session in database
  const authClient = await createClient();
  try {
    const isActive = await checkSudoModeActive(authClient);
    if (!isActive) {
      return { success: false, error: "Sudo session expired" };
    }
  } catch (err) {
    console.error("[auth] Failed to verify sudo session:", err);
    return { success: false, error: "Failed to verify sudo session" };
  }

  return { userId: user.id };
}
