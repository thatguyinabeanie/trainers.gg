import { v } from "convex/values";
import { z } from "zod";
import { mutation } from "../_generated/server";
import { getCurrentUserHelper } from "../auth";
import type { Id } from "../_generated/dataModel";

/**
 * Complete user sign up by creating a profile
 * Used for testing and initial user setup
 */
export const completeSignUp = mutation({
  args: {
    username: v.string(),
    displayName: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user from auth context
    const user = await getCurrentUserHelper(ctx);

    if (!user) {
      // For testing: create a user if no auth context exists
      // In production, this would require proper Clerk authentication
      const userId = await ctx.db.insert("users", {
        email: `${args.username}@test.com`,
        name: args.displayName,
        clerkUserId: `test_${args.username}`,
      });

      // Create profile
      await ctx.db.insert("profiles", {
        userId,
        username: args.username,
        displayName: args.displayName,
        bio: args.bio,
        avatarUrl: args.avatarUrl,
      });

      return userId;
    }

    // Check if user already has a profile
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .first();

    if (existingProfile) {
      throw new Error("User already has a profile");
    }

    // Create profile for authenticated user
    await ctx.db.insert("profiles", {
      userId: user.id,
      username: args.username,
      displayName: args.displayName,
      bio: args.bio,
      avatarUrl: args.avatarUrl,
    });

    return user.id;
  },
});

/**
 * Update user profile
 */
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  battleTag: z.string().max(50).optional().or(z.literal("")),
});

export const updateProfile = mutation({
  args: {
    data: v.object({
      displayName: v.optional(v.string()),
      bio: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
      battleTag: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Validate input with Zod
    const validated = updateProfileSchema.parse(args.data);

    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated or profile not found");
    }

    // Prepare update object (only include defined fields)
    const updates: {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      battleTag?: string;
    } = {};

    if (validated.displayName !== undefined) {
      updates.displayName = validated.displayName;
    }
    if (validated.bio !== undefined) {
      updates.bio = validated.bio || undefined; // Convert empty string to undefined
    }
    if (validated.avatarUrl !== undefined) {
      updates.avatarUrl = validated.avatarUrl || undefined;
    }
    if (validated.battleTag !== undefined) {
      updates.battleTag = validated.battleTag || undefined;
    }

    // Update profile
    await ctx.db.patch(user.profile._id, updates);

    // Return updated profile
    return await ctx.db.get(user.profile._id);
  },
});

/**
 * Delete user profile (soft delete by removing profile, keeping user record)
 */
export const deleteProfile = mutation({
  args: {},
  handler: async (ctx) => {
    // Get current user
    const user = await getCurrentUserHelper(ctx);
    if (!user?.profile) {
      throw new Error("Not authenticated or profile not found");
    }

    // TODO: Add cleanup logic for:
    // - Remove from all organizations
    // - Cancel tournament registrations
    // - Archive teams

    // Delete the profile
    await ctx.db.delete(user.profile._id);

    return { success: true };
  },
});

/**
 * Update user subscription tier
 * Note: In production, this should be protected and called from payment webhooks
 */
const updateTierSchema = z.object({
  profileId: z.custom<Id<"profiles">>(),
  tier: z.enum(["free", "player_pro", "coach_premium"]),
  tierExpiresAt: z.number().optional(),
});

export const updateSubscriptionTier = mutation({
  args: {
    data: v.object({
      profileId: v.id("profiles"),
      tier: v.union(
        v.literal("free"),
        v.literal("player_pro"),
        v.literal("coach_premium")
      ),
      tierExpiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Validate input
    const validated = updateTierSchema.parse(args.data);

    // TODO: Add permission check - only admins or payment webhooks should call this
    // const user = await getCurrentUserHelper(ctx);
    // if (!user?.profile) {
    //   throw new Error("Not authenticated");
    // }
    // await requirePermission(ctx, user.profile._id, PERMISSIONS.ADMIN_MANAGE_SUBSCRIPTIONS);

    // Get the profile
    const profile = await ctx.db.get(validated.profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Update tier
    await ctx.db.patch(validated.profileId, {
      tier: validated.tier,
      tierExpiresAt: validated.tierExpiresAt,
    });

    return { success: true };
  },
});
