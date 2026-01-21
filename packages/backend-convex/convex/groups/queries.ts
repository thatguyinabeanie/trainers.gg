import { v } from "convex/values";
import { query } from "../_generated/server";

export const getById = query({
  args: { id: v.id("groups") },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.id);
    if (!group) {
      return null;
    }

    // Get organization details
    const organization = await ctx.db.get(group.organizationId);

    return {
      ...group,
      organization: organization
        ? { name: organization.name, slug: organization.slug }
        : undefined,
    };
  },
});

export const listRoles = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    // Get all group roles for this group
    const groupRoles = await ctx.db
      .query("groupRoles")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    return groupRoles;
  },
});

export const listMembers = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    // Get all group roles for this group
    const groupRoles = await ctx.db
      .query("groupRoles")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Get all profile group roles for each group role
    const members = [];
    for (const groupRole of groupRoles) {
      const profileGroupRoles = await ctx.db
        .query("profileGroupRoles")
        .withIndex("by_group_role", (q) => q.eq("groupRoleId", groupRole._id))
        .collect();

      for (const profileGroupRole of profileGroupRoles) {
        const profile = await ctx.db.get(profileGroupRole.profileId);
        const role = await ctx.db.get(groupRole.roleId);

        if (profile && role) {
          members.push({
            profileId: profile._id,
            profile,
            role,
            groupRoleId: groupRole._id,
          });
        }
      }
    }

    return members;
  },
});

export const getMemberGroupAssignments = query({
  args: {
    organizationId: v.id("organizations"),
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    // Get all groups in the organization
    const organizationGroups = await ctx.db
      .query("groups")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    const assignments = [];

    // For each group, check if the profile h roles
    for (const group of organizationGroups) {
      const groupRoles = await ctx.db
        .query("groupRoles")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();

      for (const groupRole of groupRoles) {
        const profileGroupRole = await ctx.db
          .query("profileGroupRoles")
          .withIndex("by_profile_group_role", (q) =>
            q.eq("profileId", args.profileId).eq("groupRoleId", groupRole._id)
          )
          .first();

        if (profileGroupRole) {
          const role = await ctx.db.get(groupRole.roleId);
          if (role) {
            assignments.push({
              _id: profileGroupRole._id,
              profileId: profileGroupRole.profileId,
              groupRoleId: profileGroupRole.groupRoleId,
              _creationTime: profileGroupRole._creationTime,
              groupRole: {
                groupId: groupRole.groupId,
                roleId: groupRole.roleId,
                group,
                role,
              },
            });
          }
        }
      }
    }

    return assignments;
  },
});

export const listByOrganization = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("groups")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();
  },
});

export const getByOrganization = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query("groups")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // For each group, get the associated roles
    const groupsWithRoles = await Promise.all(
      groups.map(async (group) => {
        const groupRoles = await ctx.db
          .query("groupRoles")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();

        const roles = await Promise.all(
          groupRoles.map(async (gr) => {
            const role = await ctx.db.get(gr.roleId);
            return role ? { roleId: gr.roleId, ...role } : null;
          })
        );

        return {
          ...group,
          roles: roles.filter(Boolean),
        };
      })
    );

    return groupsWithRoles;
  },
});
