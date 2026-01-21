import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUserHelper } from "../auth";

export const searchByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    if (!args.username.trim() || args.username.length < 2) {
      return [];
    }

    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .take(10);

    return profiles.map((profile) => ({
      _id: profile._id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    }));
  },
});

export const searchByUsernamePrefix = query({
  args: { prefix: v.string() },
  handler: async (ctx, args) => {
    if (!args.prefix.trim() || args.prefix.length < 2) {
      return [];
    }

    // Since Convex doesn't have native prefix search, we'll filter
    // Use the by_username index for range-based prefix matching
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) =>
        q.gte("username", args.prefix).lt("username", args.prefix + "\uFFFF")
      )
      .take(10);

    return profiles.map((profile) => ({
      _id: profile._id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    }));
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!profile) {
      return null;
    }

    return {
      _id: profile._id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
    };
  },
});

/**
 * Get current user's full profile
 */
export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      return null;
    }

    return {
      _id: user.profile._id,
      userId: user.id,
      username: user.profile.username,
      displayName: user.profile.displayName,
      avatarUrl: user.profile.avatarUrl,
      bio: user.profile.bio,
      battleTag: user.profile.battleTag,
    };
  },
});

/**
 * Get profile by ID
 */
export const getById = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      return null;
    }

    return {
      _id: profile._id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      battleTag: profile.battleTag,
    };
  },
});

/**
 * Get user's subscription info
 */
export const getSubscriptionInfo = query({
  args: { profileId: v.optional(v.id("profiles")) },
  handler: async (ctx, args) => {
    let profileId = args.profileId;

    // If no profileId provided, get current user's profile
    if (!profileId) {
      const user = await getCurrentUserHelper(ctx);
      if (!user?.profile) {
        return null;
      }
      profileId = user.profile._id;
    }

    const profile = await ctx.db.get(profileId);
    if (!profile) {
      return null;
    }

    const now = Date.now();
    const isExpired =
      profile.tierExpiresAt !== undefined && profile.tierExpiresAt < now;

    return {
      tier: profile.tier || "free",
      tierExpiresAt: profile.tierExpiresAt,
      isExpired,
      isActive: !isExpired,
    };
  },
});
