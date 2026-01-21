import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { getCurrentUserHelper } from "./auth";

// Helper to get current user's profile
async function getCurrentProfile(ctx: QueryCtx) {
  const user = await getCurrentUserHelper(ctx);
  if (!user) return null;

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", user.id))
    .first();

  return profile;
}

// List all organizations
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    const organizations = await ctx.db
      .query("organizations")
      .order("desc")
      .take(limit + 1);

    // Add owner profiles
    const orgsWithOwners = await Promise.all(
      organizations.map(async (org) => {
        const owner = await ctx.db.get(org.ownerProfileId);
        return { ...org, owner };
      })
    );

    // Handle pagination
    let nextCursor: string | undefined;
    if (orgsWithOwners.length > limit) {
      const nextItem = orgsWithOwners.pop();
      nextCursor = nextItem?._id;
    }

    return {
      items: orgsWithOwners,
      nextCursor,
    };
  },
});

// Get organization by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!org) return null;

    const owner = await ctx.db.get(org.ownerProfileId);
    return { ...org, owner };
  },
});

// List user's member organizations
export const listMyMemberOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) return [];

    // Get organization memberships
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();

    // Get organization details
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org) return null;

        const memberCount = await ctx.db
          .query("organizationMembers")
          .withIndex("by_org", (q) => q.eq("organizationId", org._id))
          .collect();

        return {
          ...org,
          _count: { members: memberCount.length },
        };
      })
    );

    return organizations.filter(Boolean);
  },
});

// Check if user can manage organization
export const canManage = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const profile = await getCurrentProfile(ctx);
    if (!profile) return false;

    const org = await ctx.db.get(args.organizationId);
    if (!org) return false;

    // Owner always has manage rights
    if (org.ownerProfileId === profile._id) return true;

    // Check for admin role through groups
    const profileGroupRoles = await ctx.db
      .query("profileGroupRoles")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .collect();

    for (const pgr of profileGroupRoles) {
      const groupRole = await ctx.db.get(pgr.groupRoleId);
      if (!groupRole) continue;

      const group = await ctx.db.get(groupRole.groupId);
      if (!group || group.organizationId !== args.organizationId) continue;

      // Check if role has manage permissions
      const role = await ctx.db.get(groupRole.roleId);
      if (!role) continue;

      const rolePerms = await ctx.db
        .query("rolePermissions")
        .withIndex("by_role", (q) => q.eq("roleId", role._id))
        .collect();

      for (const rp of rolePerms) {
        const perm = await ctx.db.get(rp.permissionId);
        if (perm?.key === "ORG_MANAGE") return true;
      }
    }

    return false;
  },
});

// List organization members
export const listMembers = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    // Get profile details
    const membersWithProfiles = await Promise.all(
      members.map(async (member) => {
        const profile = await ctx.db.get(member.profileId);
        return { ...member, profile };
      })
    );

    return membersWithProfiles;
  },
});
