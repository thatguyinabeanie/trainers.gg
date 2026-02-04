import type { TypedClient } from "../client";

/**
 * Get all permission keys for a user through RBAC
 * TODO: Implement full permission checking via group_roles → groups → organization
 * Currently returns empty array as the schema needs clarification
 */
export async function getUserPermissions(
  supabase: TypedClient,
  userId: string
): Promise<string[]> {
  // STUB: Returns empty array until full RBAC is implemented.
  // Permission checks currently rely on org owner_user_id checks in TypeScript
  // and has_org_permission() in SQL RPCs.
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
