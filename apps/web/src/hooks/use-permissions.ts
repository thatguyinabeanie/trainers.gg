"use client";

import { type PermissionKey } from "@trainers/utils";
import { getUserPermissions, hasPermission } from "@trainers/supabase";
import { useSupabaseQuery } from "@/lib/supabase";
import { useCurrentUser } from "./use-current-user";

/**
 * Custom hook to check if the current user has a specific permission
 * @param permission - The permission key to check
 * @param enabled - Whether to enable the query (default: true)
 * @returns Object with hasPermission boolean and loading state
 */
export function usePermission(permission: PermissionKey, enabled = true) {
  // Use shared hook to get current user (prevents duplicate queries)
  const { user, isLoading: userLoading } = useCurrentUser();

  // Check permission if user is loaded
  const { data: permissionCheck, isLoading: permissionLoading } =
    useSupabaseQuery(
      async (supabase) => {
        if (!user?.id || !enabled) return false;
        return hasPermission(supabase, user.id, permission);
      },
      [user?.id, enabled, permission]
    );

  return {
    hasPermission: permissionCheck === true,
    isLoading: userLoading || (user?.id && enabled && permissionLoading),
    user,
  };
}

/**
 * Custom hook to check multiple permissions at once
 * @param permissions - Array of permission keys to check
 * @param enabled - Whether to enable the query (default: true)
 * @returns Object with permissions map and loading state
 */
export function usePermissions(permissions: PermissionKey[], enabled = true) {
  // Use shared hook to get current user (prevents duplicate queries)
  const { user, isLoading: userLoading } = useCurrentUser();

  // Get all user permissions in a single query
  const { data: userPermissions, isLoading: permissionsLoading } =
    useSupabaseQuery(
      async (supabase) => {
        if (!user?.id || !enabled) return [];
        return getUserPermissions(supabase, user.id);
      },
      [user?.id, enabled]
    );

  // Create permissions map by checking if each requested permission is in the user's permissions
  const permissionsMap = {} as Record<PermissionKey, boolean>;
  permissions.forEach((permission) => {
    permissionsMap[permission] = userPermissions?.includes(permission) ?? false;
  });

  const isLoading =
    userLoading || (user?.alt?.id && enabled && permissionsLoading);

  return {
    permissions: permissionsMap,
    isLoading,
    user,
  };
}
