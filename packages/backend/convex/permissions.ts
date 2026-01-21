import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { PermissionKey } from "./permissionKeys";

/**
 * Checks if a user has a specific permission.
 *
 * This function traverses the user's roles and associated permissions.
 * It checks all groups the user is a part of.
 *
 * @param ctx - The Convex query or mutation context.
 * @param profileId - The ID of the user's profile.
 * @param permission - The permission key to check for.
 * @returns A boolean indicating whether the user has the permission.
 */
export async function hasPermission(
  ctx: QueryCtx | MutationCtx,
  profileId: Id<"profiles">,
  permission: PermissionKey,
  _resourceType?: string,
  _resourceId?: string
): Promise<boolean> {
  // 1. Get all group role assignments for the given profile (using index for performance)
  const profileGroupRoles = await ctx.db
    .query("profileGroupRoles")
    .withIndex("by_profile", (q) => q.eq("profileId", profileId))
    .collect();

  if (profileGroupRoles.length === 0) {
    return false;
  }

  // 2. Extract the groupRoleIds from the assignments
  const groupRoleIds = profileGroupRoles.map((pgr) => pgr.groupRoleId);

  // 3. Fetch all the group roles associated with these assignments
  const groupRoles = await Promise.all(
    groupRoleIds.map((groupRoleId) => ctx.db.get(groupRoleId))
  );

  // 4. Extract the roleIds from the group roles
  const roleIds = groupRoles
    .filter((gr): gr is NonNullable<typeof gr> => gr !== null)
    .map((gr) => gr.roleId);

  if (roleIds.length === 0) {
    return false;
  }

  // 5. Find the specific permission document by its key (using index for performance)
  const permissionDoc = await ctx.db
    .query("permissions")
    .withIndex("by_key", (q) => q.eq("key", permission))
    .first();

  if (!permissionDoc) {
    // If the permission doesn't exist in the DB, no one can have it.
    return false;
  }

  // 6. Check if any of the user's roles are linked to this permission
  for (const roleId of roleIds) {
    // Use the compound index by_role_permission for efficient lookup
    const rolePermission = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role_permission", (q) =>
        q.eq("roleId", roleId).eq("permissionId", permissionDoc._id)
      )
      .first();

    if (rolePermission) {
      // Permission found for one of the user's roles
      return true;
    }
  }

  // 7. If no role granted the permission, check for admin wildcard
  const adminWildcardPermission = await ctx.db
    .query("permissions")
    .withIndex("by_key", (q) => q.eq("key", "admin.*"))
    .first();

  if (adminWildcardPermission) {
    for (const roleId of roleIds) {
      // Use the compound index by_role_permission for efficient lookup
      const adminRolePermission = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role_permission", (q) =>
          q.eq("roleId", roleId).eq("permissionId", adminWildcardPermission._id)
        )
        .first();

      if (adminRolePermission) {
        return true; // User has admin wildcard, so they have all permissions
      }
    }
  }

  // 8. No permission found
  return false;
}

/**
 * Asserts that a user has a specific permission, throwing an error if not.
 *
 * @param ctx - The Convex query or mutation context.
 * @param profileId - The ID of the user's profile.
 * @param permission - The permission key to check for.
 * @throws An error if the user does not have the permission.
 */
export async function assertPermission(
  ctx: QueryCtx | MutationCtx,
  profileId: Id<"profiles">,
  permission: PermissionKey,
  _resourceType?: string,
  _resourceId?: string
): Promise<void> {
  const hasPerm = await hasPermission(
    ctx,
    profileId,
    permission,
    _resourceType,
    _resourceId
  );
  if (!hasPerm) {
    throw new Error(
      `Permission Denied: User does not have the '${permission}' permission.`
    );
  }
}
