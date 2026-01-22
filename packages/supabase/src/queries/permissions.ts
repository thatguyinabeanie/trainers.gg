import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;

/**
 * Get all permission keys for a profile through RBAC
 * (profile -> profile_group_roles -> group_roles -> roles -> role_permissions -> permissions)
 */
export async function getUserPermissions(
  supabase: TypedClient,
  profileId: number
): Promise<string[]> {
  const { data: profileGroupRoles, error } = await supabase
    .from("profile_group_roles")
    .select(
      `
      group_role:group_roles(
        role:roles(
          role_permissions(
            permission:permissions(key)
          )
        )
      )
    `
    )
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error fetching user permissions:", error);
    return [];
  }

  const permissions = new Set<string>();

  for (const pgr of profileGroupRoles ?? []) {
    const groupRole = pgr.group_role as {
      role: {
        role_permissions: { permission: { key: string } | null }[];
      } | null;
    } | null;

    if (!groupRole?.role) continue;

    for (const rp of groupRole.role.role_permissions ?? []) {
      if (rp.permission?.key) {
        permissions.add(rp.permission.key);
      }
    }
  }

  return Array.from(permissions);
}

/**
 * Check if a profile has a specific permission
 */
export async function hasPermission(
  supabase: TypedClient,
  profileId: number,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(supabase, profileId);
  return permissions.includes(permission);
}
