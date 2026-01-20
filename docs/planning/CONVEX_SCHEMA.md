# Convex Schema Design - trainers.gg

This document describes the database schema for trainers.gg using Convex.

---

## Overview

Convex uses a document-based model with TypeScript schema definitions. All data is stored in tables, and relationships are handled via references (IDs) or denormalization.

---

## Phase 1 Schema

### Users Table

The primary table for trainers.gg users. Linked to Bluesky accounts via DID.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Bluesky Identity
    did: v.string(),                      // Bluesky DID (e.g., "did:plc:abc123...")
    handle: v.string(),                   // Bluesky handle (e.g., "user.bsky.social")
    
    // Profile Info (initially pulled from Bluesky, user can override)
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    
    // trainers.gg Specific Fields
    gamePreferences: v.optional(v.array(v.string())), // ["VGC", "Showdown", "Draft", "Casual"]
    location: v.optional(v.string()),
    
    // Social Links
    socialLinks: v.optional(v.object({
      twitter: v.optional(v.string()),
      youtube: v.optional(v.string()),
      twitch: v.optional(v.string()),
      discord: v.optional(v.string()),
    })),
    
    // Settings
    settings: v.optional(v.object({
      crossPostToBluesky: v.boolean(),    // Default: true
      defaultFeedView: v.string(),        // "pokemon" | "all"
    })),
    
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_did", ["did"])
    .index("by_handle", ["handle"]),
});
```

### Field Details

| Field | Type | Description |
|-------|------|-------------|
| `did` | string | Bluesky Decentralized Identifier - primary key for Bluesky identity |
| `handle` | string | Bluesky handle (can change, but DID is permanent) |
| `displayName` | string? | Display name shown on profile |
| `bio` | string? | User bio/description |
| `avatarUrl` | string? | URL to avatar image |
| `bannerUrl` | string? | URL to banner image |
| `gamePreferences` | string[]? | Array of game formats user plays |
| `location` | string? | User's location (city, country) |
| `socialLinks` | object? | Links to other social platforms |
| `settings` | object? | User preferences |
| `createdAt` | number | Unix timestamp of account creation |
| `updatedAt` | number | Unix timestamp of last update |
| `lastLoginAt` | number? | Unix timestamp of last login |

---

## Phase 1 Queries

```typescript
// convex/users.ts
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
```

---

## Phase 1 Mutations

```typescript
// convex/users.ts (continued)

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
        // Only update profile fields if user hasn't customized them
        // (This logic can be refined based on requirements)
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
    socialLinks: v.optional(v.object({
      twitter: v.optional(v.string()),
      youtube: v.optional(v.string()),
      twitch: v.optional(v.string()),
      discord: v.optional(v.string()),
    })),
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
    
    const currentSettings = user.settings || {
      crossPostToBluesky: true,
      defaultFeedView: "pokemon",
    };
    
    await ctx.db.patch(user._id, {
      settings: {
        ...currentSettings,
        ...args,
      },
      updatedAt: Date.now(),
    });
  },
});
```

---

## Future Schema Additions (Phase 2+)

### Cached Posts (Optional - for performance)

If we need to cache Bluesky posts for faster loading or offline support:

```typescript
cachedPosts: defineTable({
  uri: v.string(),                    // AT Protocol URI (at://did/app.bsky.feed.post/rkey)
  cid: v.string(),                    // Content ID (hash)
  authorDid: v.string(),
  text: v.string(),
  createdAt: v.number(),
  cachedAt: v.number(),
  // Denormalized author info for display
  authorHandle: v.string(),
  authorDisplayName: v.optional(v.string()),
  authorAvatarUrl: v.optional(v.string()),
  // Engagement metrics (cached, may be stale)
  likeCount: v.optional(v.number()),
  repostCount: v.optional(v.number()),
  replyCount: v.optional(v.number()),
})
  .index("by_uri", ["uri"])
  .index("by_author", ["authorDid"])
  .index("by_created", ["createdAt"]),
```

### Follows (If tracking locally)

```typescript
follows: defineTable({
  followerDid: v.string(),
  followingDid: v.string(),
  createdAt: v.number(),
})
  .index("by_follower", ["followerDid"])
  .index("by_following", ["followingDid"])
  .index("by_pair", ["followerDid", "followingDid"]),
```

### Teams (Phase 2)

```typescript
teams: defineTable({
  ownerDid: v.string(),
  name: v.string(),
  format: v.string(),                  // "VGC", "Singles", "Doubles", "Draft"
  pokemon: v.array(v.object({
    species: v.string(),
    nickname: v.optional(v.string()),
    ability: v.optional(v.string()),
    item: v.optional(v.string()),
    moves: v.optional(v.array(v.string())),
    evs: v.optional(v.object({
      hp: v.number(),
      atk: v.number(),
      def: v.number(),
      spa: v.number(),
      spd: v.number(),
      spe: v.number(),
    })),
    ivs: v.optional(v.object({
      hp: v.number(),
      atk: v.number(),
      def: v.number(),
      spa: v.number(),
      spd: v.number(),
      spe: v.number(),
    })),
    nature: v.optional(v.string()),
    teraType: v.optional(v.string()),
  })),
  isPublic: v.boolean(),
  description: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner", ["ownerDid"])
  .index("by_format", ["format"])
  .index("by_public", ["isPublic"]),
```

### Tournaments (Phase 2)

```typescript
tournaments: defineTable({
  organizerDid: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  format: v.string(),
  bracketType: v.string(),            // "single_elimination", "double_elimination", "swiss"
  maxParticipants: v.optional(v.number()),
  registrationOpen: v.boolean(),
  status: v.string(),                 // "draft", "registration", "in_progress", "completed"
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  rules: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organizer", ["organizerDid"])
  .index("by_status", ["status"])
  .index("by_start_date", ["startDate"]),
```

---

## Convex Auth Integration

For Bluesky OAuth, we'll use Convex's custom JWT validation. The auth flow:

1. User completes Bluesky OAuth in the client
2. Client receives tokens from Bluesky
3. Client passes DID to Convex (or we validate the JWT)
4. Convex creates/updates user record

Since Bluesky OAuth uses non-standard JWT format with DPoP, we may need custom auth handling. This will be determined during Sprint 2.

---

## Indexes Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| `users` | `by_did` | Primary lookup for authenticated users |
| `users` | `by_handle` | Lookup users by handle for profiles |
| `cachedPosts` | `by_uri` | Deduplicate and lookup specific posts |
| `cachedPosts` | `by_author` | Get posts by specific user |
| `cachedPosts` | `by_created` | Sort posts chronologically |
| `follows` | `by_follower` | Get who a user follows |
| `follows` | `by_following` | Get a user's followers |

---

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Bluesky PDS   │────▶│   Convex        │────▶│   Client Apps   │
│   (Source of    │     │   (Cache &      │     │   (Display)     │
│    Truth)       │     │    Store)       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Users Table   │
                        │   (trainers.gg  │
                        │    specific)    │
                        └─────────────────┘
```

**Source of Truth**:
- Bluesky posts, likes, reposts, follows: Bluesky PDS
- trainers.gg profile extensions: Convex
- User settings/preferences: Convex
- Teams, tournaments (future): Convex
