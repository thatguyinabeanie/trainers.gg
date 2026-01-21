import { PermissionKey } from "../permissionKeys";
import { v } from "convex/values";
import { query } from "../_generated/server";
import { hasPermission as checkUserPermission } from "../permissions";

export const getAllPermissions = query(async ({ db }) => {
  return await db.query("permissions").collect();
});

// Export the permission checking function as a query
export const hasPermissionQuery = query({
  args: {
    profileId: v.id("profiles"),
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    return await checkUserPermission(
      ctx,
      args.profileId,
      args.permission as PermissionKey
    );
  },
});

// Get all permissions for a user (used by user-auth-nav.tsx)
export const getUserPermissions = query({
  args: {
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    // Get all group role assignments for the given profile
    const profileGroupRoles = await ctx.db
      .query("profileGroupRoles")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();

    if (profileGroupRoles.length === 0) {
      return [];
    }

    // Extract the groupRoleIds from the assignments
    const groupRoleIds = profileGroupRoles.map((pgr) => pgr.groupRoleId);

    // Fetch all the group roles associated with these assignments
    const groupRoles = await Promise.all(
      groupRoleIds.map((groupRoleId) => ctx.db.get(groupRoleId))
    );

    // Extract the roleIds from the group roles
    const roleIds = groupRoles
      .filter((gr): gr is NonNullable<typeof gr> => gr !== null)
      .map((gr) => gr.roleId);

    if (roleIds.length === 0) {
      return [];
    }

    // Get all role permissions for these roles
    const allRolePermissions = await Promise.all(
      roleIds.map((roleId) =>
        ctx.db
          .query("rolePermissions")
          .withIndex("by_role", (q) => q.eq("roleId", roleId))
          .collect()
      )
    );

    // Flatten the array and get unique permission IDs
    const permissionIds = [
      ...new Set(allRolePermissions.flat().map((rp) => rp.permissionId)),
    ];

    // Get all permission documents
    const permissions = await Promise.all(
      permissionIds.map((permissionId) => ctx.db.get(permissionId))
    );

    // Return the permission keys
    return permissions
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => p.key);
  },
});

// Check if a user has a specific permission (used by tests)
export const hasPermission = query({
  args: {
    profileId: v.id("profiles"),
    permissionName: v.string(),
  },
  handler: async (ctx, args) => {
    return await checkUserPermission(
      ctx,
      args.profileId,
      args.permissionName as PermissionKey
    );
  },
});
