import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentProfileId } from "../auth";
import { requirePermission } from "../helpers";

import { PERMISSIONS } from "../permissionKeys";

export const createGroup = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.GROUP_CREATE,
      "organization",
      args.organizationId.toString()
    );

    return await ctx.db.insert("groups", {
      organizationId: args.organizationId,
      name: args.name,
      description: args.description,
    });
  },
});

export const updateGroup = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.GROUP_UPDATE,
      "organization",
      group.organizationId.toString()
    );

    const { groupId, ...updates } = args;
    await ctx.db.patch(groupId, updates);
  },
});

export const deleteGroup = mutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.GROUP_DELETE,
      "organization",
      group.organizationId.toString()
    );

    await ctx.db.delete(args.groupId);
  },
});

export const addMemberToGroup = mutation({
  args: {
    profileId: v.id("profiles"),
    groupId: v.id("groups"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.GROUP_MANAGE_MEMBERS,
      "organization",
      group.organizationId.toString()
    );

    // Check if the person is already a member of the organization
    const orgMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_profile", (q) =>
        q
          .eq("organizationId", group.organizationId)
          .eq("profileId", args.profileId)
      )
      .first();

    if (!orgMember) {
      throw new Error("Profile is not a member of this organization");
    }

    // Find or create the group role
    let groupRole = await ctx.db
      .query("groupRoles")
      .withIndex("by_group_role", (q) =>
        q.eq("groupId", args.groupId).eq("roleId", args.roleId)
      )
      .first();

    if (!groupRole) {
      const groupRoleId = await ctx.db.insert("groupRoles", {
        groupId: args.groupId,
        roleId: args.roleId,
      });
      groupRole = await ctx.db.get(groupRoleId);
      if (!groupRole) {
        throw new Error("Failed to create group role");
      }
    }

    // Check if user already has this role in this group
    const existingAssignment = await ctx.db
      .query("profileGroupRoles")
      .withIndex("by_profile_group_role", (q) =>
        q.eq("profileId", args.profileId).eq("groupRoleId", groupRole!._id)
      )
      .first();

    if (existingAssignment) {
      throw new Error("Profile already has this role in this group");
    }

    // Add the role assignment
    await ctx.db.insert("profileGroupRoles", {
      profileId: args.profileId,
      groupRoleId: groupRole._id,
    });

    return { success: true };
  },
});

export const removeMemberFromGroup = mutation({
  args: {
    profileId: v.id("profiles"),
    groupId: v.id("groups"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.GROUP_MANAGE_MEMBERS,
      "organization",
      group.organizationId.toString()
    );

    // Find the group role
    const groupRole = await ctx.db
      .query("groupRoles")
      .withIndex("by_group_role", (q) =>
        q.eq("groupId", args.groupId).eq("roleId", args.roleId)
      )
      .first();

    if (!groupRole) {
      throw new Error("Role not found in this group");
    }

    // Find the profile group role assignment
    const profileGroupRole = await ctx.db
      .query("profileGroupRoles")
      .withIndex("by_profile_group_role", (q) =>
        q.eq("profileId", args.profileId).eq("groupRoleId", groupRole._id)
      )
      .first();

    if (!profileGroupRole) {
      throw new Error("Profile does not have this role in this group");
    }

    // Remove the role assignment
    await ctx.db.delete(profileGroupRole._id);

    return { success: true };
  },
});

export const assignRole = mutation({
  args: {
    groupId: v.id("groups"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.GROUP_MANAGE_AVAILABLE_ROLES,
      "organization",
      group.organizationId.toString()
    );

    // Check if this role is already assigned to the group
    const existingGroupRole = await ctx.db
      .query("groupRoles")
      .withIndex("by_group_role", (q) =>
        q.eq("groupId", args.groupId).eq("roleId", args.roleId)
      )
      .first();

    if (existingGroupRole) {
      throw new Error("Role is already assigned to this group");
    }

    // Create the group role assignment
    await ctx.db.insert("groupRoles", {
      groupId: args.groupId,
      roleId: args.roleId,
    });

    return { success: true };
  },
});

export const unassignRole = mutation({
  args: {
    groupId: v.id("groups"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.GROUP_MANAGE_AVAILABLE_ROLES,
      "organization",
      group.organizationId.toString()
    );

    // Find the group role assignment
    const groupRole = await ctx.db
      .query("groupRoles")
      .withIndex("by_group_role", (q) =>
        q.eq("groupId", args.groupId).eq("roleId", args.roleId)
      )
      .first();

    if (!groupRole) {
      throw new Error("Role is not assigned to this group");
    }

    // Remove all profile group role assignments for this group role
    const profileGroupRoles = await ctx.db
      .query("profileGroupRoles")
      .withIndex("by_group_role", (q) => q.eq("groupRoleId", groupRole._id))
      .collect();

    for (const profileGroupRole of profileGroupRoles) {
      await ctx.db.delete(profileGroupRole._id);
    }

    // Remove the group role assignment
    await ctx.db.delete(groupRole._id);

    return { success: true };
  },
});
