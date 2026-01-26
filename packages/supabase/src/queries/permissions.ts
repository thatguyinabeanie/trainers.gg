import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;

/**
 * Get all permission keys for a user through RBAC
 * TODO: Implement full permission checking via group_roles → groups → organization
 * Currently returns empty array as the schema needs clarification
 */
export async function getUserPermissions(
  supabase: TypedClient,
  userId: string
): Promise<string[]> {
  // TODO: Fix permission checking once schema is clarified
  // The JOIN chain should be: user_group_roles → group_roles → groups (for organization scoping)
  // But we need to understand how permissions are assigned
  console.warn("getUserPermissions not fully implemented yet");
  return [];
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(
  supabase: TypedClient,
  userId: string,
  permission: string
): Promise<boolean> {
  const permissions = await getUserPermissions(supabase, userId);
  return permissions.includes(permission);
}
