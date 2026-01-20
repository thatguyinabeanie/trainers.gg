import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Bluesky Identity
    did: v.string(), // Bluesky DID (e.g., "did:plc:abc123...")
    handle: v.string(), // Bluesky handle (e.g., "user.bsky.social")

    // Profile Info (initially pulled from Bluesky, user can override)
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),

    // trainers.gg Specific Fields
    gamePreferences: v.optional(v.array(v.string())), // ["VGC", "Showdown", "Draft", "Casual"]
    location: v.optional(v.string()),

    // Social Links
    socialLinks: v.optional(
      v.object({
        twitter: v.optional(v.string()),
        youtube: v.optional(v.string()),
        twitch: v.optional(v.string()),
        discord: v.optional(v.string()),
      })
    ),

    // Settings
    settings: v.optional(
      v.object({
        crossPostToBluesky: v.boolean(), // Default: true
        defaultFeedView: v.string(), // "pokemon" | "all"
      })
    ),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_did", ["did"])
    .index("by_handle", ["handle"]),
});
