import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;

/**
 * Get all permission keys for an alt through RBAC
 * (alt -> alt_group_roles -> group_roles -> roles -> role_permissions -> permissions)
 */
export async function getUserPermissions(
  supabase: TypedClient,
  altId: number
): Promise<string[]> {
  const { data: altGroupRoles, error } = await supabase
    .from("alt_group_roles")
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
    .eq("alt_id", altId);

  if (error) {
    console.error("Error fetching user permissions:", error);
    return [];
  }

  const permissions = new Set<string>();

  for (const agr of altGroupRoles ?? []) {
    const groupRole = agr.group_role as {
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
 * Check if an alt has a specific permission
 */
export async function hasPermission(
  supabase: TypedClient,
  altId: number,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(supabase, altId);
  return permissions.includes(permission);
}
