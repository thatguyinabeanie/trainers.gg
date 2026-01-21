import { query } from "../_generated/server";
import { v } from "convex/values";

export const list = query({
  handler: async (ctx) => {
    const roles = await ctx.db.query("roles").collect();

    // Get permissions for each role
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const rolePermissions = await ctx.db
          .query("rolePermissions")
          .withIndex("by_role", (q) => q.eq("roleId", role._id))
          .collect();

        const permissions = await Promise.all(
          rolePermissions.map(async (rp) => {
            const permission = await ctx.db.get(rp.permissionId);
            return permission ? { permission } : null;
          })
        );

        return {
          ...role,
          rolePermissions: permissions.filter(Boolean),
        };
      })
    );

    return rolesWithPermissions;
  },
});

export const getById = query({
  args: { id: v.id("roles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("roles").collect();
  },
});
