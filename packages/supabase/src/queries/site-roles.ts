import type { TypedClient } from "../client";

/**
 * Check if a user has the site admin role
 */
export async function isSiteAdmin(
  supabase: TypedClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      `
      role:roles!inner(
        id,
        name,
        scope
      )
    `
    )
    .eq("user_id", userId)
    .eq("roles.scope", "site")
    .eq("roles.name", "site_admin")
    .maybeSingle();

  if (error) {
    console.error("Error checking site admin status:", error);
    return false;
  }

  return data !== null;
}

/**
 * Get all site-scoped roles
 */
export async function getSiteRoles(supabase: TypedClient) {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("scope", "site")
    .order("name");

  if (error) {
    console.error("Error fetching site roles:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get all users with site admin role
 */
export async function getSiteAdmins(supabase: TypedClient) {
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      `
      id,
      created_at,
      user:users(
        id,
        email,
        username,
        first_name,
        last_name,
        image
      ),
      role:roles!inner(
        id,
        name,
        scope
      )
    `
    )
    .eq("roles.scope", "site")
    .eq("roles.name", "site_admin");

  if (error) {
    console.error("Error fetching site admins:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get all site roles for a specific user
 */
export async function getUserSiteRoles(supabase: TypedClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select(
      `
      id,
      created_at,
      role:roles!inner(
        id,
        name,
        description,
        scope
      )
    `
    )
    .eq("user_id", userId)
    .eq("roles.scope", "site");

  if (error) {
    console.error("Error fetching user site roles:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Grant a site role to a user
 *
 * @param supabase    - Typed Supabase client (service role)
 * @param userId      - UUID of the user to grant the role to
 * @param roleId      - ID of the site role to grant
 * @param adminUserId - UUID of the admin performing the action
 */
export async function grantSiteRole(
  supabase: TypedClient,
  userId: string,
  roleId: number,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  // First verify the role is site-scoped
  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id, scope")
    .eq("id", roleId)
    .single();

  if (roleError || !role) {
    return { success: false, error: "Role not found" };
  }

  if (role.scope !== "site") {
    return {
      success: false,
      error: "Cannot grant non-site role via this function",
    };
  }

  // Check if user already has this role
  const { data: existing } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role_id", roleId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "User already has this role" };
  }

  // Grant the role
  const { error: insertError } = await supabase.from("user_roles").insert({
    user_id: userId,
    role_id: roleId,
  });

  if (insertError) {
    console.error("Error granting site role:", insertError);
    return { success: false, error: insertError.message };
  }

  // Insert audit log entry
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.role_granted" as const,
    actor_user_id: adminUserId,
    metadata: {
      target_user_id: userId,
      role_id: roleId,
    },
  });

  if (auditError) {
    console.error("Failed to log role grant to audit log:", auditError);
  }

  return { success: true };
}

/**
 * Revoke a site role from a user
 *
 * @param supabase    - Typed Supabase client (service role)
 * @param userId      - UUID of the user to revoke the role from
 * @param roleId      - ID of the site role to revoke
 * @param adminUserId - UUID of the admin performing the action
 */
export async function revokeSiteRole(
  supabase: TypedClient,
  userId: string,
  roleId: number,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role_id", roleId);

  if (error) {
    console.error("Error revoking site role:", error);
    return { success: false, error: error.message };
  }

  // Insert audit log entry
  const { error: auditError } = await supabase.from("audit_log").insert({
    action: "admin.role_revoked" as const,
    actor_user_id: adminUserId,
    metadata: {
      target_user_id: userId,
      role_id: roleId,
    },
  });

  if (auditError) {
    console.error("Failed to log role revoke to audit log:", auditError);
  }

  return { success: true };
}
