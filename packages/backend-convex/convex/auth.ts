import { v } from "convex/values";
import { type Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

// Helper function to generate unique username
async function generateUniqueUsername(
  ctx: MutationCtx,
  email: string | undefined,
  clerkUserId: string
): Promise<string> {
  // Start with preferred username
  const baseUsername = email || `user_${clerkUserId.slice(-8)}`;
  let username = baseUsername;
  let counter = 1;

  // Check for existing username and increment until unique
  while (true) {
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (!existingProfile) {
      return username;
    }

    // Generate alternative username
    if (email) {
      // For email-based usernames, append counter: "user@example.com" -> "user@example.com_2"
      username = `${baseUsername}_${counter}`;
    } else {
      // For fallback usernames, append counter: "user_12345678" -> "user_12345678_2"
      username = `${baseUsername}_${counter}`;
    }
    counter++;

    // Safety check to prevent infinite loop
    if (counter > 1000) {
      throw new Error("Unable to generate unique username after 1000 attempts");
    }
  }
}

// Helper function to get current user from Clerk JWT or test context
export async function getCurrentUserHelper(
  ctx: QueryCtx | MutationCtx
): Promise<{
  id: Id<"users">;
  clerkUserId: string | undefined;
  email: string | undefined;
  name: string | undefined;
  image: string | undefined;
  profile: {
    _id: Id<"profiles">;
    displayName: string;
    username: string;
    bio?: string;
    avatarUrl?: string;
    battleTag?: string;
  } | null;
} | null> {
  // Get Clerk user from JWT token
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    // Test mode is not supported for authenticated operations
    // Use t.run() directly in tests to bypass authentication
    return null;
  }

  // Find Convex user by Clerk user ID (using index for performance)
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
    .first();

  if (!user) {
    return null;
  }

  // Get user profile (using index for performance)
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  return {
    id: user._id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: user.name,
    image: user.image,
    profile: profile || null,
  };
}

export async function getCurrentProfileId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"profiles"> | null> {
  const user = await getCurrentUserHelper(ctx);
  return user?.profile?._id || null;
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserHelper(ctx);
  },
});

// Mutation to create user and profile when they first sign up
// Mutation to ensure current user has a profile
export const ensureUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find user (using index for performance)
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if profile exists (using index for performance)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (profile) {
      return profile; // Profile already exists
    }

    // Create profile with unique username
    const uniqueUsername = await generateUniqueUsername(
      ctx,
      user.email,
      user.clerkUserId || identity.subject
    );

    const profileId = await ctx.db.insert("profiles", {
      userId: user._id,
      displayName: user.name || user.email || "User",
      username: uniqueUsername,
      tier: "free",
    });

    // Update user with main profile
    await ctx.db.patch(user._id, { mainProfileId: profileId });

    return await ctx.db.get(profileId);
  },
});

export const createUserWithProfile = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists (using index for performance)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      name: args.name,
      image: args.image,
    });

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Failed to create user");

    // Create default profile with unique username
    const uniqueUsername = await generateUniqueUsername(
      ctx,
      args.email,
      args.clerkUserId
    );
    const profileId = await ctx.db.insert("profiles", {
      userId: user._id,
      displayName: args.name || args.email || "User",
      username: uniqueUsername,
      tier: "free",
    });

    // Update user with main profile
    await ctx.db.patch(user._id, { mainProfileId: profileId });

    return user;
  },
});

// Internal webhook handlers for Clerk events
export const handleUserCreated = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    username: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    lastSignInAt: v.optional(v.number()),
    externalAccounts: v.optional(
      v.array(
        v.object({
          provider: v.string(),
          provider_user_id: v.string(),
          email_address: v.optional(v.string()),
          username: v.optional(v.string()),
        })
      )
    ),
    // Clerk's publicMetadata: flexible JSON object with string keys
    // https://clerk.com/docs/users/metadata
    publicMetadata: v.optional(
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null())
      )
    ),
  },
  handler: async (ctx, args) => {
    console.log("Creating user from Clerk webhook:", args);

    // Check if user already exists (using index for performance)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (existingUser) {
      console.log("User already exists:", existingUser._id);
      return existingUser;
    }

    // Create new user using the existing function logic
    const userId = await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      name: args.name,
      image: args.image,
      username: args.username,
      phoneNumber: args.phoneNumber,
      createdAt: args.createdAt || Date.now(),
      lastSignInAt: args.lastSignInAt,
      externalAccounts: args.externalAccounts?.map((acc) => ({
        provider: acc.provider,
        providerUserId: acc.provider_user_id,
        email: acc.email_address,
        username: acc.username,
      })),
      publicMetadata: args.publicMetadata,
    });

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Failed to create user");

    // Create default profile with unique username
    const uniqueUsername = await generateUniqueUsername(
      ctx,
      args.email,
      args.clerkUserId
    );
    const profileId = await ctx.db.insert("profiles", {
      userId: user._id,
      displayName: args.name || args.email || "User",
      username: uniqueUsername,
      tier: "free",
    });

    // Update user with main profile
    await ctx.db.patch(user._id, { mainProfileId: profileId });

    console.log("User created successfully:", user._id);
    return user;
  },
});

export const handleUserUpdated = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    username: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    lastSignInAt: v.optional(v.number()),
    externalAccounts: v.optional(
      v.array(
        v.object({
          provider: v.string(),
          provider_user_id: v.string(),
          email_address: v.optional(v.string()),
          username: v.optional(v.string()),
        })
      )
    ),
    // Clerk's publicMetadata: flexible JSON object with string keys
    // https://clerk.com/docs/users/metadata
    publicMetadata: v.optional(
      v.record(
        v.string(),
        v.union(v.string(), v.number(), v.boolean(), v.null())
      )
    ),
    isLocked: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log("Updating user from Clerk webhook:", args);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      console.log("User not found, creating new user");
      // Create new user using the same logic as handleUserCreated
      const userId = await ctx.db.insert("users", {
        clerkUserId: args.clerkUserId,
        email: args.email,
        name: args.name,
        image: args.image,
        username: args.username,
        phoneNumber: args.phoneNumber,
        updatedAt: args.updatedAt || Date.now(),
        lastSignInAt: args.lastSignInAt,
        externalAccounts: args.externalAccounts?.map((acc) => ({
          provider: acc.provider,
          providerUserId: acc.provider_user_id,
          email: acc.email_address,
          username: acc.username,
        })),
        publicMetadata: args.publicMetadata,
        isLocked: args.isLocked,
      });

      const newUser = await ctx.db.get(userId);
      if (!newUser) throw new Error("Failed to create user");

      // Create default profile with unique username
      const uniqueUsername = await generateUniqueUsername(
        ctx,
        args.email,
        args.clerkUserId
      );
      const profileId = await ctx.db.insert("profiles", {
        userId: newUser._id,
        displayName: args.name || args.email || "User",
        username: uniqueUsername,
        tier: "free",
      });

      // Update user with main profile
      await ctx.db.patch(newUser._id, { mainProfileId: profileId });

      console.log("User created successfully:", newUser._id);
      return newUser;
    }

    // Update user info
    await ctx.db.patch(user._id, {
      email: args.email,
      name: args.name,
      image: args.image,
      username: args.username,
      phoneNumber: args.phoneNumber,
      updatedAt: args.updatedAt || Date.now(),
      lastSignInAt: args.lastSignInAt,
      externalAccounts: args.externalAccounts?.map((acc) => ({
        provider: acc.provider,
        providerUserId: acc.provider_user_id,
        email: acc.email_address,
        username: acc.username,
      })),
      publicMetadata: args.publicMetadata,
      isLocked: args.isLocked,
    });

    // Update profile if needed
    if (user.mainProfileId) {
      // Get current profile to check if username needs updating
      const currentProfile = await ctx.db.get(user.mainProfileId);
      if (currentProfile) {
        const newUsername = args.email || `user_${args.clerkUserId.slice(-8)}`;

        // Only update username if it's actually different and ensure uniqueness
        if (currentProfile.username !== newUsername) {
          const uniqueUsername = await generateUniqueUsername(
            ctx,
            args.email,
            args.clerkUserId
          );
          await ctx.db.patch(user.mainProfileId, {
            displayName: args.name || args.email || "User",
            username: uniqueUsername,
          });
        } else {
          // Just update display name if username is the same
          await ctx.db.patch(user.mainProfileId, {
            displayName: args.name || args.email || "User",
          });
        }
      }
    }

    console.log("User updated successfully:", user._id);
    return user;
  },
});

// Public mutation for webhook handlers to call
export const deleteUserFromWebhook = mutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Deleting user from Clerk webhook:", args);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      console.log("User not found for deletion");
      return;
    }

    // Delete user's profile
    if (user.mainProfileId) {
      await ctx.db.delete(user.mainProfileId);
    }

    // Delete user
    await ctx.db.delete(user._id);

    console.log("User deleted successfully:", user._id);
  },
});

export const handleUserDeleted = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Deleting user from Clerk webhook:", args);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      console.log("User not found for deletion");
      return;
    }

    // Delete user's profile
    if (user.mainProfileId) {
      await ctx.db.delete(user.mainProfileId);
    }

    // Delete user
    await ctx.db.delete(user._id);

    console.log("User deleted successfully:", user._id);
  },
});

// ========== SESSION TRACKING MUTATIONS ==========

export const handleSessionCreated = internalMutation({
  args: {
    clerkUserId: v.string(),
    sessionId: v.string(),
    createdAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Recording session creation:", args);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      console.log("User not found for session creation");
      return;
    }

    // Update user's last active timestamp
    await ctx.db.patch(user._id, {
      lastActiveAt: args.lastActiveAt || Date.now(),
    });

    // Tracked in TODO.md: Session Analytics Storage (#6)
    console.log("Session creation recorded for user:", user._id);
  },
});

export const handleSessionEnded = internalMutation({
  args: {
    clerkUserId: v.string(),
    sessionId: v.string(),
    endedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log("Recording session end:", args);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      console.log("User not found for session end");
      return;
    }

    // Tracked in TODO.md: Session Analytics Updates (#7)
    console.log("Session end recorded for user:", user._id);
  },
});

export const handleSessionRemoved = internalMutation({
  args: {
    clerkUserId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Recording session removal:", args);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      console.log("User not found for session removal");
      return;
    }

    // Tracked in TODO.md: Session Removal Handling (#8)
    console.log("Session removal recorded for user:", user._id);
  },
});

export const handleSessionRevoked = internalMutation({
  args: {
    clerkUserId: v.string(),
    sessionId: v.string(),
    revokedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log("Recording session revocation:", args);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      console.log("User not found for session revocation");
      return;
    }

    // Tracked in TODO.md: Security Session Revocation Handling (#9)
    console.log("Session revocation recorded for user:", user._id);
  },
});

// ========== ACCOUNT STATUS MUTATIONS ==========
// Note: user.banned and user.unbanned events don't exist in Clerk
// Removed handleUserBanned and handleUserUnbanned mutations

// ========== EMAIL MANAGEMENT MUTATIONS ==========

export const handleEmailCreated = internalMutation({
  args: {
    clerkUserId: v.string(),
    emailAddress: v.string(),
    isPrimary: v.optional(v.boolean()),
    isVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log("Recording email creation:", args);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      console.log("User not found for email creation");
      return;
    }

    // If this is the primary email, update the user's email field
    if (args.isPrimary) {
      await ctx.db.patch(user._id, {
        email: args.emailAddress,
      });
    }

    console.log("Email creation recorded for user:", user._id);
  },
});

// Note: email.updated and email.deleted events don't exist in Clerk
// Only email.created is available, so removed handleEmailUpdated and handleEmailDeleted
