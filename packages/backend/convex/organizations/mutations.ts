import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentProfileId } from "../auth";

import { requirePermission } from "../helpers";
import { PERMISSIONS } from "../permissionKeys";

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user profile ID
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    // Check if user can create organizations
    await requirePermission(ctx, profileId, PERMISSIONS.ORG_CREATE);

    // Check if slug is unique (using index for performance)
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error(`Organization with slug '${args.slug}' already exists`);
    }

    // Create organization
    const organizationId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      logoUrl: args.logoUrl,
      ownerProfileId: profileId,
      status: "pending",
    });

    // Create default group
    const defaultGroupId = await ctx.db.insert("groups", {
      organizationId,
      name: "Members",
      description: "Default group for all organization members",
    });

    // Create owner role
    const ownerRoleId = await ctx.db.insert("roles", {
      name: "Owner",
      description: "Organization owner with full permissions",
    });

    const allPermissions = await ctx.db.query("permissions").collect();
    for (const permission of allPermissions) {
      await ctx.db.insert("rolePermissions", {
        roleId: ownerRoleId,
        permissionId: permission._id,
      });
    }

    // Add user to organization
    await ctx.db.insert("organizationMembers", {
      organizationId,
      profileId: profileId,
    });

    // Create owner role for organization
    const ownerGroupRoleId = await ctx.db.insert("groupRoles", {
      groupId: defaultGroupId,
      roleId: ownerRoleId,
    });

    // Assign owner role to user
    await ctx.db.insert("profileGroupRoles", {
      profileId: profileId,
      groupRoleId: ownerGroupRoleId,
    });

    return { organizationId, defaultGroupId };
  },
});

export const update = mutation({
  args: {
    id: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    website: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const org = await ctx.db.get(id);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Get current user profile ID
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    // Check permission
    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.ORG_UPDATE,
      "organization",
      id
    );

    // Update organization
    await ctx.db.patch(id, updates);

    return { success: true };
  },
});

export const deleteOrganization = mutation({
  args: {
    id: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.id);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Get current user profile ID
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    // Check permission
    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.ORG_DELETE,
      "organization",
      args.id
    );

    // Delete all related data
    // Delete tournaments (using index for performance)
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_org", (q) => q.eq("organizationId", args.id))
      .collect();

    for (const tournament of tournaments) {
      await ctx.db.delete(tournament._id);
    }

    // Delete groups (using index for performance)
    const groups = await ctx.db
      .query("groups")
      .withIndex("by_org", (q) => q.eq("organizationId", args.id))
      .collect();

    for (const group of groups) {
      await ctx.db.delete(group._id);
    }

    // Delete organization members (using index for performance)
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", args.id))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete all group roles and profile group roles
    for (const group of groups) {
      const groupRoles = await ctx.db
        .query("groupRoles")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();

      for (const groupRole of groupRoles) {
        // Delete profile group roles first (using index for performance)
        const profileGroupRoles = await ctx.db
          .query("profileGroupRoles")
          .withIndex("by_group_role", (q) => q.eq("groupRoleId", groupRole._id))
          .collect();

        for (const pgr of profileGroupRoles) {
          await ctx.db.delete(pgr._id);
        }

        // Delete group role
        await ctx.db.delete(groupRole._id);
      }
    }

    // Delete organization invitations (using index for performance)
    const invitations = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_org", (q) => q.eq("organizationId", args.id))
      .collect();

    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    // Finally delete the organization
    await ctx.db.delete(args.id);

    return { success: true };
  },
});

export const inviteMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    profileId: v.id("profiles"),
    groupId: v.optional(v.id("groups")),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user profile ID
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    // Check permission
    await requirePermission(
      ctx,
      profileId,
      PERMISSIONS.ORG_INVITE_MEMBERS,
      "organization",
      args.organizationId
    );

    if (args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group) {
        throw new Error("Group not found");
      }
      if (group.organizationId !== args.organizationId) {
        throw new Error("Group does not belong to this organization");
      }
    }

    // Verify the target profile exists
    const targetProfile = await ctx.db.get(args.profileId);
    if (!targetProfile) {
      throw new Error("Target profile not found");
    }

    // Check if user is already a member (using compound index for performance)
    const existingMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_profile", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("profileId", args.profileId)
      )
      .first();

    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }

    // Check if there's already a pending invitation (using compound index and filter in memory)
    const existingInvitation = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_org_invited", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("invitedProfileId", args.profileId)
      )
      .collect()
      .then((invitations) => invitations.find((i) => i.status === "pending"));

    if (existingInvitation) {
      throw new Error(
        "User already has a pending invitation to this organization"
      );
    }

    // Create invitation
    const invitationId = await ctx.db.insert("organizationInvitations", {
      organizationId: args.organizationId,
      invitedProfileId: args.profileId,
      invitedByProfileId: profileId,
      status: "pending",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
    });

    return { success: true, invitationId };
  },
});

export const acceptInvitation = mutation({
  args: {
    invitationId: v.id("organizationInvitations"),
  },
  handler: async (ctx, args) => {
    // Get current user profile ID
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    // Get invitation
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify this invitation is for the current user
    if (invitation.invitedProfileId !== profileId) {
      throw new Error("This invitation is not for you");
    }

    // Check if invitation is still valid
    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer valid");
    }

    if (invitation.expiresAt && invitation.expiresAt < Date.now()) {
      // Mark as expired
      await ctx.db.patch(args.invitationId, { status: "expired" });
      throw new Error("This invitation has expired");
    }

    // Check if user is already a member (using compound index for performance)
    const existingMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_profile", (q) =>
        q
          .eq("organizationId", invitation.organizationId)
          .eq("profileId", profileId)
      )
      .first();

    if (existingMember) {
      // Mark invitation as accepted anyway
      await ctx.db.patch(args.invitationId, { status: "accepted" });
      throw new Error("You are already a member of this organization");
    }

    // Add user to organization
    await ctx.db.insert("organizationMembers", {
      organizationId: invitation.organizationId,
      profileId: profileId,
    });

    // Mark invitation as accepted
    await ctx.db.patch(args.invitationId, { status: "accepted" });

    return { success: true };
  },
});

export const declineInvitation = mutation({
  args: {
    invitationId: v.id("organizationInvitations"),
  },
  handler: async (ctx, args) => {
    // Get current user profile ID
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    // Get invitation
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify this invitation is for the current user
    if (invitation.invitedProfileId !== profileId) {
      throw new Error("This invitation is not for you");
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer pending");
    }

    // Mark invitation as declined
    await ctx.db.patch(args.invitationId, { status: "declined" });

    return { success: true };
  },
});
