import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", identity.subject))
      .unique();

    return user;
  },
});

// Get user by DID
export const getUserByDid = query({
  args: { did: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", args.did))
      .unique();
  },
});

// Get user by handle
export const getUserByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_handle", (q) => q.eq("handle", args.handle))
      .unique();
  },
});

// Create or update user on OAuth callback
export const createOrUpdateUser = mutation({
  args: {
    did: v.string(),
    handle: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", args.did))
      .unique();

    const now = Date.now();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        handle: args.handle,
        lastLoginAt: now,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        did: args.did,
        handle: args.handle,
        displayName: args.displayName,
        avatarUrl: args.avatarUrl,
        bio: args.bio,
        settings: {
          crossPostToBluesky: true,
          defaultFeedView: "pokemon",
        },
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });
    }
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    gamePreferences: v.optional(v.array(v.string())),
    socialLinks: v.optional(
      v.object({
        twitter: v.optional(v.string()),
        youtube: v.optional(v.string()),
        twitch: v.optional(v.string()),
        discord: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      ...args,
      updatedAt: Date.now(),
    });
  },
});

// Update user settings
export const updateSettings = mutation({
  args: {
    crossPostToBluesky: v.optional(v.boolean()),
    defaultFeedView: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_did", (q) => q.eq("did", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentSettings = user.settings ?? {
      crossPostToBluesky: true,
      defaultFeedView: "pokemon",
    };

    await ctx.db.patch(user._id, {
      settings: {
        ...currentSettings,
        ...Object.fromEntries(
          Object.entries(args).filter(([, v]) => v !== undefined)
        ),
      },
      updatedAt: Date.now(),
    });
  },
});
