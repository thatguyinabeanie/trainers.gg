"use client";

import { type PermissionKey } from "@/lib/constants/permissions";
import { getCurrentUser, getUserPermissions, hasPermission } from "@trainers/supabase";
import { useSupabaseQuery } from "@/lib/supabase";

/**
 * Custom hook to check if the current user has a specific permission
 * @param permission - The permission key to check
 * @param enabled - Whether to enable the query (default: true)
 * @returns Object with hasPermission boolean and loading state
 */
export function usePermission(permission: PermissionKey, enabled = true) {
  // Get current user with profile
  const { data: user, isLoading: userLoading } = useSupabaseQuery(
    (supabase) => getCurrentUser(supabase),
    []
  );

  // Check permission if user is loaded and has a profile
  const { data: permissionCheck, isLoading: permissionLoading } = useSupabaseQuery(
    async (supabase) => {
      if (!user?.profile?.id || !enabled) return false;
      return hasPermission(supabase, user.profile.id, permission);
    },
    [user?.profile?.id, enabled, permission]
  );

  return {
    hasPermission: permissionCheck === true,
    isLoading:
      userLoading ||
      (user?.profile?.id && enabled && permissionLoading),
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
  // Get current user with profile
  const { data: user, isLoading: userLoading } = useSupabaseQuery(
    (supabase) => getCurrentUser(supabase),
    []
  );

  // Get all user permissions in a single query
  const { data: userPermissions, isLoading: permissionsLoading } = useSupabaseQuery(
    async (supabase) => {
      if (!user?.profile?.id || !enabled) return [];
      return getUserPermissions(supabase, user.profile.id);
    },
    [user?.profile?.id, enabled]
  );

  // Create permissions map by checking if each requested permission is in the user's permissions
  const permissionsMap = {} as Record<PermissionKey, boolean>;
  permissions.forEach((permission) => {
    permissionsMap[permission] = userPermissions?.includes(permission) ?? false;
  });

  const isLoading =
    userLoading ||
    (user?.profile?.id && enabled && permissionsLoading);

  return {
    permissions: permissionsMap,
    isLoading,
    user,
  };
}
