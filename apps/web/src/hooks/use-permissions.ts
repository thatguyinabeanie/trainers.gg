"use client";

import { type Id } from "@trainers/backend-convex/convex/_generated/dataModel";
import { type PermissionKey } from "@/lib/constants/permissions";
import { api } from "@/lib/convex/api";
import { useQuery } from "convex/react";

/**
 * Custom hook to check if the current user has a specific permission
 * @param permission - The permission key to check
 * @param enabled - Whether to enable the query (default: true)
 * @returns Object with hasPermission boolean and loading state
 */
export function usePermission(permission: PermissionKey, enabled = true) {
  // Get current user with profile
  const user = useQuery(api.auth.getCurrentUser);

  // Check permission if user is loaded and has a profile
  const permissionCheck = useQuery(
    api.permissions.queries.hasPermissionQuery,
    user?.profile?._id && enabled
      ? {
          profileId: user.profile._id as Id<"profiles">,
          permission,
        }
      : "skip"
  );

  return {
    hasPermission: permissionCheck === true,
    isLoading:
      user === undefined ||
      (user?.profile?._id && enabled && permissionCheck === undefined),
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
  const user = useQuery(api.auth.getCurrentUser);

  // Get all user permissions in a single query
  const userPermissions = useQuery(
    api.permissions.queries.getUserPermissions,
    user?.profile?._id && enabled
      ? {
          profileId: user.profile._id as Id<"profiles">,
        }
      : "skip"
  );

  // Create permissions map by checking if each requested permission is in the user's permissions
  const permissionsMap = {} as Record<PermissionKey, boolean>;
  permissions.forEach((permission) => {
    permissionsMap[permission] = userPermissions?.includes(permission) ?? false;
  });

  const isLoading =
    user === undefined ||
    (user?.profile?._id && enabled && userPermissions === undefined);

  return {
    permissions: permissionsMap,
    isLoading,
    user,
  };
}
