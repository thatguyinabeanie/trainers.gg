import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import { hasPermission } from "../permissions";
import { PERMISSIONS } from "../permissionKeys";

// Assign a role to a user in a specific group
export const assignRoleToUser = mutation({
  args: {
    profileId: v.id("profiles"),
    groupId: v.id("groups"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Get the group to check organization context
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Check permission to assign roles in this organization
    const canAssignRoles = await hasPermission(
      ctx,
      user.profile._id,
      PERMISSIONS.ROLE_ASSIGN_PERMISSIONS,
      "organization",
      group.organizationId
    );

    if (!canAssignRoles) {
      throw new Error(
        "You don't have permission to assign roles in this organization"
      );
    }

    // Check if the group role already exists (using compound index for performance)
    let groupRole = await ctx.db
      .query("groupRoles")
      .withIndex("by_group_role", (q) =>
        q.eq("groupId", args.groupId).eq("roleId", args.roleId)
      )
      .first();

    // Create group role if it doesn't exist
    if (!groupRole) {
      const groupRoleId = await ctx.db.insert("groupRoles", {
        groupId: args.groupId,
        roleId: args.roleId,
      });
      groupRole = await ctx.db.get(groupRoleId);
    }

    if (!groupRole) {
      throw new Error("Failed to create or find group role");
    }

    // Check if user already has this role in this group (using compound index for performance)
    const existingAssignment = await ctx.db
      .query("profileGroupRoles")
      .withIndex("by_profile_group_role", (q) =>
        q.eq("profileId", args.profileId).eq("groupRoleId", groupRole._id)
      )
      .first();

    if (existingAssignment) {
      throw new Error("User already has this role in this group");
    }

    // Assign the role to the user
    const assignmentId = await ctx.db.insert("profileGroupRoles", {
      profileId: args.profileId,
      groupRoleId: groupRole._id,
    });

    return { success: true, assignmentId };
  },
});

// Remove a role from a user in a specific group
export const removeRoleFromUser = mutation({
  args: {
    profileId: v.id("profiles"),
    groupId: v.id("groups"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Get the group to check organization context
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Check permission to assign roles in this organization
    const canAssignRoles = await hasPermission(
      ctx,
      user.profile._id,
      PERMISSIONS.ROLE_ASSIGN_PERMISSIONS,
      "organization",
      group.organizationId
    );

    if (!canAssignRoles) {
      throw new Error(
        "You don't have permission to manage roles in this organization"
      );
    }

    // Find the group role (using compound index for performance)
    const groupRole = await ctx.db
      .query("groupRoles")
      .withIndex("by_group_role", (q) =>
        q.eq("groupId", args.groupId).eq("roleId", args.roleId)
      )
      .first();

    if (!groupRole) {
      throw new Error("Role not found in this group");
    }

    // Find the assignment (using compound index for performance)
    const assignment = await ctx.db
      .query("profileGroupRoles")
      .withIndex("by_profile_group_role", (q) =>
        q.eq("profileId", args.profileId).eq("groupRoleId", groupRole._id)
      )
      .first();

    if (!assignment) {
      throw new Error("User does not have this role in this group");
    }

    // Remove the assignment
    await ctx.db.delete(assignment._id);

    return { success: true };
  },
});

// Add a user to a group (organization membership)
export const addUserToGroup = mutation({
  args: {
    profileId: v.id("profiles"),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Get the group to check organization context
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Check permission to manage group members
    const canManageMembers = await hasPermission(
      ctx,
      user.profile._id,
      PERMISSIONS.GROUP_MANAGE_MEMBERS,
      "organization",
      group.organizationId
    );

    if (!canManageMembers) {
      throw new Error(
        "You don't have permission to manage members in this organization"
      );
    }

    // Check if user is already a member of the organization (using compound index for performance)
    const existingMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_profile", (q) =>
        q
          .eq("organizationId", group.organizationId)
          .eq("profileId", args.profileId)
      )
      .first();

    if (!existingMember) {
      // Add user to organization first
      await ctx.db.insert("organizationMembers", {
        organizationId: group.organizationId,
        profileId: args.profileId,
      });
    }

    return { success: true };
  },
});

// Remove a user from a group/organization
export const removeUserFromGroup = mutation({
  args: {
    profileId: v.id("profiles"),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Get the group to check organization context
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Check permission to manage group members
    const canManageMembers = await hasPermission(
      ctx,
      user.profile._id,
      PERMISSIONS.GROUP_MANAGE_MEMBERS,
      "organization",
      group.organizationId
    );

    if (!canManageMembers) {
      throw new Error(
        "You don't have permission to manage members in this organization"
      );
    }

    // Get all group roles for this user in this group (using index for performance)
    const groupRoles = await ctx.db
      .query("groupRoles")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Remove all role assignments for this user in this group
    for (const groupRole of groupRoles) {
      const assignment = await ctx.db
        .query("profileGroupRoles")
        .withIndex("by_profile_group_role", (q) =>
          q.eq("profileId", args.profileId).eq("groupRoleId", groupRole._id)
        )
        .first();

      if (assignment) {
        await ctx.db.delete(assignment._id);
      }
    }

    // Check if user has roles in other groups of this organization (using index and filter in memory)
    const otherGroups = await ctx.db
      .query("groups")
      .withIndex("by_org", (q) => q.eq("organizationId", group.organizationId))
      .collect()
      .then((groups) => groups.filter((g) => g._id !== args.groupId));

    let hasOtherRoles = false;
    for (const otherGroup of otherGroups) {
      const otherGroupRoles = await ctx.db
        .query("groupRoles")
        .withIndex("by_group", (q) => q.eq("groupId", otherGroup._id))
        .collect();

      for (const otherGroupRole of otherGroupRoles) {
        const otherAssignment = await ctx.db
          .query("profileGroupRoles")
          .withIndex("by_profile_group_role", (q) =>
            q
              .eq("profileId", args.profileId)
              .eq("groupRoleId", otherGroupRole._id)
          )
          .first();

        if (otherAssignment) {
          hasOtherRoles = true;
          break;
        }
      }
      if (hasOtherRoles) break;
    }

    // If user has no roles in any group in this organization, remove them from the organization
    if (!hasOtherRoles) {
      const orgMember = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_profile", (q) =>
          q
            .eq("organizationId", group.organizationId)
            .eq("profileId", args.profileId)
        )
        .first();

      if (orgMember) {
        await ctx.db.delete(orgMember._id);
      }
    }

    return { success: true };
  },
});

// Create a new role
export const createRole = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check if user can create roles (admin permission)
    const canCreateRoles = await hasPermission(
      ctx,
      user.profile._id,
      PERMISSIONS.ROLE_CREATE
    );

    if (!canCreateRoles) {
      throw new Error("You don't have permission to create roles");
    }

    // Check if role name already exists (using index for performance)
    const existingRole = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existingRole) {
      throw new Error(`Role with name '${args.name}' already exists`);
    }

    // Create the role
    const roleId = await ctx.db.insert("roles", {
      name: args.name,
      description: args.description,
    });

    return { success: true, roleId };
  },
});

// Assign permissions to a role
export const assignPermissionsToRole = mutation({
  args: {
    roleId: v.id("roles"),
    permissionIds: v.array(v.id("permissions")),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    // Check if user can assign permissions to roles
    const canAssignPermissions = await hasPermission(
      ctx,
      user.profile._id,
      PERMISSIONS.ROLE_ASSIGN_PERMISSIONS
    );

    if (!canAssignPermissions) {
      throw new Error(
        "You don't have permission to assign permissions to roles"
      );
    }

    // Remove existing permissions for this role (using index for performance)
    const existingPermissions = await ctx.db
      .query("rolePermissions")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .collect();

    for (const rp of existingPermissions) {
      await ctx.db.delete(rp._id);
    }

    // Add new permissions
    for (const permissionId of args.permissionIds) {
      await ctx.db.insert("rolePermissions", {
        roleId: args.roleId,
        permissionId,
      });
    }

    return { success: true };
  },
});
