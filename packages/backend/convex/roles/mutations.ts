import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requirePermission } from "../helpers";
import { getCurrentUserHelper } from "../auth";
import { PERMISSIONS } from "../permissionKeys";

export const assignRole = mutation({
  args: {
    profileId: v.id("profiles"),
    groupRoleId: v.id("groupRoles"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const groupRole = await ctx.db.get(args.groupRoleId);
    if (!groupRole) {
      throw new Error("Group role not found");
    }

    const group = await ctx.db.get(groupRole.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    await requirePermission(
      ctx,
      user.profile._id,
      PERMISSIONS.ROLE_ASSIGN_PERMISSIONS,
      "organization",
      group.organizationId.toString()
    );

    await ctx.db.insert("profileGroupRoles", {
      profileId: args.profileId,
      groupRoleId: args.groupRoleId,
    });
  },
});

export const unassignRole = mutation({
  args: {
    profileGroupRoleId: v.id("profileGroupRoles"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const profileGroupRole = await ctx.db.get(args.profileGroupRoleId);
    if (!profileGroupRole) {
      throw new Error("Profile group role not found");
    }

    const groupRole = await ctx.db.get(profileGroupRole.groupRoleId);
    if (!groupRole) {
      throw new Error("Group role not found");
    }

    const group = await ctx.db.get(groupRole.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    await requirePermission(
      ctx,
      user.profile._id,
      PERMISSIONS.ROLE_ASSIGN_PERMISSIONS,
      "organization",
      group.organizationId.toString()
    );

    await ctx.db.delete(args.profileGroupRoleId);
  },
});
