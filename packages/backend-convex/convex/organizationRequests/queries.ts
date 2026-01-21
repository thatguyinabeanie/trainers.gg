import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserHelper } from "../auth";
import { hasPermission } from "../permissions";
import { PERMISSIONS } from "../permissionKeys";

export const getMyRequests = query({
  handler: async (ctx) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return [];
    }

    const requests = await ctx.db
      .query("organizationRequests")
      .withIndex("by_requester", (q) =>
        q.eq("requestedByProfileId", user.profile!._id)
      )
      .order("desc")
      .collect();

    const requestsWithReviewer = await Promise.all(
      requests.map(async (request) => {
        const reviewer = request.reviewedByProfileId
          ? await ctx.db.get(request.reviewedByProfileId)
          : null;

        return {
          ...request,
          reviewer,
        };
      })
    );

    return requestsWithReviewer;
  },
});

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return [];
    }

    const canViewAll = await hasPermission(
      ctx,
      user.profile._id,
      PERMISSIONS.ORG_REQUEST_VIEW_ALL
    );

    if (!canViewAll) {
      throw new Error("Not authorized to view all organization requests");
    }

    let requests;

    if (args.status) {
      requests = await ctx.db
        .query("organizationRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      requests = await ctx.db
        .query("organizationRequests")
        .order("desc")
        .collect();
    }

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const requester = await ctx.db.get(request.requestedByProfileId);
        const reviewer = request.reviewedByProfileId
          ? await ctx.db.get(request.reviewedByProfileId)
          : null;
        const createdOrganization = request.createdOrganizationId
          ? await ctx.db.get(request.createdOrganizationId)
          : null;

        return {
          ...request,
          requester,
          reviewer,
          createdOrganization,
        };
      })
    );

    return requestsWithDetails;
  },
});

export const getById = query({
  args: {
    requestId: v.id("organizationRequests"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    const canViewAll = await hasPermission(
      ctx,
      user.profile._id,
      PERMISSIONS.ORG_REQUEST_VIEW_ALL
    );

    const isRequester = request.requestedByProfileId === user.profile._id;

    if (!canViewAll && !isRequester) {
      throw new Error("Not authorized to view this request");
    }

    const requester = await ctx.db.get(request.requestedByProfileId);
    const reviewer = request.reviewedByProfileId
      ? await ctx.db.get(request.reviewedByProfileId)
      : null;
    const createdOrganization = request.createdOrganizationId
      ? await ctx.db.get(request.createdOrganizationId)
      : null;

    return {
      ...request,
      requester,
      reviewer,
      createdOrganization,
    };
  },
});
