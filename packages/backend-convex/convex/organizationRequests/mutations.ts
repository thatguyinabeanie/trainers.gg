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
  },
  handler: async (ctx, args) => {
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    await requirePermission(ctx, profileId, PERMISSIONS.ORG_REQUEST_CREATE);

    const existingSlug = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingSlug) {
      throw new Error(`Organization with slug '${args.slug}' already exists`);
    }

    const existingRequest = await ctx.db
      .query("organizationRequests")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      throw new Error(
        `A pending request already exists for slug '${args.slug}'`
      );
    }

    const requestId = await ctx.db.insert("organizationRequests", {
      requestedByProfileId: profileId,
      name: args.name,
      slug: args.slug,
      description: args.description,
      status: "pending",
    });

    return { requestId };
  },
});

export const approve = mutation({
  args: {
    requestId: v.id("organizationRequests"),
  },
  handler: async (ctx, args) => {
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    await requirePermission(ctx, profileId, PERMISSIONS.ORG_REQUEST_APPROVE);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", request.slug))
      .first();

    if (existingOrg) {
      throw new Error(
        `Organization with slug '${request.slug}' already exists`
      );
    }

    const organizationId = await ctx.db.insert("organizations", {
      name: request.name,
      slug: request.slug,
      description: request.description,
      ownerProfileId: request.requestedByProfileId,
      status: "active",
    });

    const defaultGroupId = await ctx.db.insert("groups", {
      organizationId,
      name: "Members",
      description: "Default group for all organization members",
    });

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

    await ctx.db.insert("organizationMembers", {
      organizationId,
      profileId: request.requestedByProfileId,
    });

    const ownerGroupRoleId = await ctx.db.insert("groupRoles", {
      groupId: defaultGroupId,
      roleId: ownerRoleId,
    });

    await ctx.db.insert("profileGroupRoles", {
      profileId: request.requestedByProfileId,
      groupRoleId: ownerGroupRoleId,
    });

    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedByProfileId: profileId,
      reviewedAt: Date.now(),
      createdOrganizationId: organizationId,
    });

    return { organizationId, defaultGroupId };
  },
});

export const reject = mutation({
  args: {
    requestId: v.id("organizationRequests"),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const profileId = await getCurrentProfileId(ctx);
    if (!profileId) {
      throw new Error("Not authenticated");
    }

    await requirePermission(ctx, profileId, PERMISSIONS.ORG_REQUEST_REJECT);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      reviewedByProfileId: profileId,
      reviewedAt: Date.now(),
      rejectionReason: args.rejectionReason,
    });

    return { success: true };
  },
});
