import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserHelper } from "./auth";
import type { Doc } from "./_generated/dataModel";

// Simple query to check if any users exist (for seeding check)
export const count = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.length;
  },
});

// Get current user with profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user) {
      return null;
    }

    // Get user profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .first();

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profile: profile
        ? {
            id: profile._id,
            displayName: profile.displayName,
            username: profile.username,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
          }
        : null,
    };
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    profileId: v.id("profiles"),
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserHelper(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const userId = user.id;
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the profile to verify ownership
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Verify the profile belongs to the current user
    if (profile.userId !== userId) {
      throw new Error("You can only update your own profile");
    }

    // Prepare update data
    const updates: Partial<Doc<"profiles">> = {};
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;

    // Update the profile
    await ctx.db.patch(args.profileId, updates);

    return { success: true };
  },
});
