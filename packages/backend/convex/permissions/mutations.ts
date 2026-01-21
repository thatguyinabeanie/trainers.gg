import { PERMISSIONS, PermissionKey } from "../permissionKeys";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";

// Seed default permissions (used by tests and seeding scripts)
export const seedDefaultPermissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔐 Seeding default permissions...");

    // Get all permission keys from the constants
    const permissionKeys = Object.values(PERMISSIONS);
    const permissionIds = new Map<PermissionKey, Id<"permissions">>();

    for (const key of permissionKeys) {
      // Check if permission already exists
      const existing = await ctx.db
        .query("permissions")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();

      if (!existing) {
        // Create new permission - use key as name for consistency
        const id = await ctx.db.insert("permissions", {
          key,
          name: key,
          description: `Allows ${key.replace(/\./g, " ").replace(/_/g, " ")}`,
        });
        permissionIds.set(key, id);
        console.log(`   ✓ Created permission: ${key}`);
      } else {
        permissionIds.set(key, existing._id as Id<"permissions">);
        console.log(`   - Permission already exists: ${key}`);
      }
    }

    console.log(`✅ Seeded ${permissionKeys.length} permissions`);
    return {
      message: `Seeded ${permissionKeys.length} permissions`,
      created:
        permissionKeys.length - Array.from(permissionIds.values()).length,
      existing: Array.from(permissionIds.values()).length,
    };
  },
});

// Create a new permission (admin function)
export const createPermission = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check for admin users
    // const user = await getCurrentUserHelper(ctx);
    // if (!user?.profile) {
    //   throw new Error("Not authenticated");
    // }
    // await requirePermission(ctx, user.profile._id, PERMISSIONS.PERMISSION_CREATE);

    // Check if permission already exists
    const existing = await ctx.db
      .query("permissions")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      throw new Error(`Permission with key '${args.key}' already exists`);
    }

    // Create the permission
    const permissionId = await ctx.db.insert("permissions", {
      key: args.key as PermissionKey,
      name: args.name,
      description: args.description,
    });

    return await ctx.db.get(permissionId);
  },
});

// Delete a permission (admin function)
export const deletePermission = mutation({
  args: {
    permissionId: v.id("permissions"),
  },
  handler: async (ctx, args) => {
    // TODO: Add permission check for admin users
    // const user = await getCurrentUserHelper(ctx);
    // if (!user?.profile) {
    //   throw new Error("Not authenticated");
    // }
    // await requirePermission(ctx, user.profile._id, PERMISSIONS.PERMISSION_DELETE);

    // Check if permission exists
    const permission = await ctx.db.get(args.permissionId);
    if (!permission) {
      throw new Error("Permission not found");
    }

    // Remove all role-permission associations first
    const rolePermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_permission", (q) =>
        q.eq("permissionId", args.permissionId)
      )
      .collect();

    for (const rolePermission of rolePermissions) {
      await ctx.db.delete(rolePermission._id);
    }

    // Delete the permission
    await ctx.db.delete(args.permissionId);

    return { success: true, deletedPermission: permission };
  },
});
