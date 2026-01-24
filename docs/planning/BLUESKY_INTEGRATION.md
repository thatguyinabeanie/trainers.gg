# Bluesky Integration Guide - trainers.gg

This document details how trainers.gg integrates with Bluesky and the AT Protocol.

---

## Overview

trainers.gg uses Bluesky as the social backbone:

- **Authentication**: Users sign in with Bluesky accounts via OAuth
- **Social Graph**: Follows/followers from Bluesky
- **Content**: Posts federate to/from Bluesky network
- **Identity**: Users identified by their Bluesky DID

---

## AT Protocol Concepts

### Key Terms

| Term        | Description                                                              |
| ----------- | ------------------------------------------------------------------------ |
| **DID**     | Decentralized Identifier - permanent user ID (e.g., `did:plc:abc123...`) |
| **Handle**  | User-friendly name (e.g., `user.bsky.social` or `user.trainers.gg`)      |
| **PDS**     | Personal Data Server - hosts user's data                                 |
| **Lexicon** | Schema definitions for AT Protocol (like OpenAPI for atproto)            |
| **XRPC**    | HTTP-based RPC protocol used by AT Protocol                              |

### Bluesky Lexicons (app.bsky.\*)

| Lexicon                   | Description                  |
| ------------------------- | ---------------------------- |
| `app.bsky.actor.*`        | User profiles, preferences   |
| `app.bsky.feed.*`         | Posts, likes, reposts, feeds |
| `app.bsky.graph.*`        | Follows, blocks, lists       |
| `app.bsky.notification.*` | Notifications                |

---

## Phase 1: Using Bluesky's PDS

### OAuth Flow

Bluesky uses a custom OAuth 2.0 profile with additional security requirements:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   trainers.gg   │────▶│   Bluesky       │────▶│   User's PDS    │
│   (Client)      │     │   Auth Server   │     │   (bsky.social) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │  1. PAR Request       │
        │  2. Auth Redirect     │
        │  3. Callback + Code   │
        │  4. Token Exchange    │
        │  5. Access Token      │
        ▼                       ▼
```

### OAuth Requirements

| Requirement         | Description                                  |
| ------------------- | -------------------------------------------- |
| **PKCE**            | Proof Key for Code Exchange - required       |
| **PAR**             | Pushed Authorization Requests - required     |
| **DPoP**            | Demonstrating Proof of Possession - required |
| **Client Metadata** | JSON file hosted at public URL               |

### Client Metadata

trainers.gg hosts a client metadata file at `https://trainers.gg/oauth/client-metadata.json`:

```json
{
  "client_id": "https://trainers.gg/oauth/client-metadata.json",
  "application_type": "web",
  "client_name": "trainers.gg",
  "client_uri": "https://trainers.gg",
  "dpop_bound_access_tokens": true,
  "grant_types": ["authorization_code", "refresh_token"],
  "redirect_uris": ["https://trainers.gg/api/oauth/callback"],
  "response_types": ["code"],
  "scope": "atproto transition:generic",
  "token_endpoint_auth_method": "none"
}
```

**CRITICAL:** Per the AT Protocol OAuth spec, this URL must return HTTP 200 directly. Any redirect (301, 302, 308) will cause OAuth to fail with `invalid_client_metadata`. This is why `trainers.gg` must be the primary domain in Vercel (not `www.trainers.gg`).

### Handle Resolution

Users get handles like `@username.trainers.gg`. For these to work, the AT Protocol needs to resolve the handle to a DID.

**Resolution methods:**

1. **HTTPS method:** `https://username.trainers.gg/.well-known/atproto-did` returns the DID
2. **DNS TXT method:** `_atproto.username.trainers.gg` TXT record contains `did=did:plc:xxx`

The PDS handles this automatically when wildcard DNS (`*.trainers.gg`) points to Fly.io.

**Required DNS configuration:**

- `*.trainers.gg` CNAME → `trainers-pds.fly.dev`
- Wildcard SSL certificate on Fly.io: `fly certs add "*.trainers.gg" -a trainers-pds`

````

### Recommended Packages

```bash
pnpm add @atproto/oauth-client-browser @atproto/api
````

| Package                         | Purpose                                 |
| ------------------------------- | --------------------------------------- |
| `@atproto/oauth-client-browser` | Handles OAuth flow with DPoP, PAR, PKCE |
| `@atproto/api`                  | Type-safe API client for Bluesky        |

---

## API Integration

### Convex Actions for Bluesky

All Bluesky API calls go through Convex Actions (server-side):

```typescript
// convex/bluesky.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { BskyAgent } from "@atproto/api";

// Get user's timeline
export const getTimeline = action({
  args: {
    accessToken: v.string(),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = new BskyAgent({ service: "https://bsky.social" });

    // Resume session with access token
    // Note: This is simplified - actual implementation needs DPoP handling

    const response = await agent.getTimeline({
      cursor: args.cursor,
      limit: args.limit || 50,
    });

    return {
      feed: response.data.feed,
      cursor: response.data.cursor,
    };
  },
});

// Create a post
export const createPost = action({
  args: {
    accessToken: v.string(),
    text: v.string(),
    // images: v.optional(v.array(v.string())), // Future: image uploads
  },
  handler: async (ctx, args) => {
    const agent = new BskyAgent({ service: "https://bsky.social" });

    const response = await agent.post({
      text: args.text,
      createdAt: new Date().toISOString(),
    });

    return {
      uri: response.uri,
      cid: response.cid,
    };
  },
});

// Like a post
export const likePost = action({
  args: {
    accessToken: v.string(),
    uri: v.string(),
    cid: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = new BskyAgent({ service: "https://bsky.social" });

    const response = await agent.like(args.uri, args.cid);

    return { uri: response.uri };
  },
});

// Unlike a post
export const unlikePost = action({
  args: {
    accessToken: v.string(),
    likeUri: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = new BskyAgent({ service: "https://bsky.social" });

    await agent.deleteLike(args.likeUri);

    return { success: true };
  },
});

// Repost
export const repost = action({
  args: {
    accessToken: v.string(),
    uri: v.string(),
    cid: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = new BskyAgent({ service: "https://bsky.social" });

    const response = await agent.repost(args.uri, args.cid);

    return { uri: response.uri };
  },
});

// Follow a user
export const followUser = action({
  args: {
    accessToken: v.string(),
    did: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = new BskyAgent({ service: "https://bsky.social" });

    const response = await agent.follow(args.did);

    return { uri: response.uri };
  },
});

// Unfollow a user
export const unfollowUser = action({
  args: {
    accessToken: v.string(),
    followUri: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = new BskyAgent({ service: "https://bsky.social" });

    await agent.deleteFollow(args.followUri);

    return { success: true };
  },
});

// Get user profile
export const getProfile = action({
  args: {
    actor: v.string(), // Handle or DID
  },
  handler: async (ctx, args) => {
    const agent = new BskyAgent({ service: "https://bsky.social" });

    const response = await agent.getProfile({ actor: args.actor });

    return response.data;
  },
});

// Get user's posts
export const getAuthorFeed = action({
  args: {
    actor: v.string(),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = new BskyAgent({ service: "https://bsky.social" });

    const response = await agent.getAuthorFeed({
      actor: args.actor,
      cursor: args.cursor,
      limit: args.limit || 50,
    });

    return {
      feed: response.data.feed,
      cursor: response.data.cursor,
    };
  },
});
```

---

## Feed Strategy

### Two Feed Views

1. **Pokemon Feed** (Default)
   - Filter posts containing Pokemon-related keywords/hashtags
   - Prioritize posts from trainers.gg users
   - Simple implementation: keyword matching

2. **Full Feed**
   - Complete Bluesky timeline
   - No filtering

### Pokemon Content Detection (Phase 1 - Simple)

```typescript
const POKEMON_KEYWORDS = [
  // Hashtags
  "#pokemon",
  "#vgc",
  "#pokemonvgc",
  "#shinyhunting",
  "#shiny",
  "#draftleague",
  "#pokemonshowdown",
  "#competitivepokemon",
  "#pokemonscarlet",
  "#pokemonviolet",
  "#pokemonsv",

  // Keywords
  "pokemon",
  "vgc",
  "showdown",
  "draft league",
  "shiny hunt",
  "competitive pokemon",
  "regionals",
  "nationals",
  "worlds",
  "terastal",
  "tera type",
];

function isPokemonContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return POKEMON_KEYWORDS.some((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );
}
```

### Future: Custom Feed Generator

In Phase 2+, we could create a proper Bluesky Feed Generator that:

- Uses ML to classify Pokemon content
- Provides better relevance ranking
- Runs as a separate service

---

## Cross-Posting Logic

### Default Behavior

When a user creates a post on trainers.gg:

1. Post is created on Bluesky (via their PDS)
2. Post appears in their Bluesky feed
3. Post is visible on trainers.gg

### User Controls

```typescript
// Check user's cross-posting preference
async function shouldCrossPost(
  userId: Id<"users">,
  perPostOverride?: boolean
): Promise<boolean> {
  // Per-post override takes precedence
  if (perPostOverride !== undefined) {
    return perPostOverride;
  }

  // Fall back to user's default setting
  const user = await ctx.db.get(userId);
  return user?.settings?.crossPostToBluesky ?? true;
}
```

### Post Composer UI

```
┌─────────────────────────────────────────────────────┐
│  What's happening?                                  │
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [📷 Add Image]              ☑️ Post to Bluesky     │
│                                                     │
│                              [Post]                 │
└─────────────────────────────────────────────────────┘
```

---

## Mobile OAuth Considerations

### Expo Implementation

For React Native/Expo, we need to handle OAuth differently:

```typescript
// Using expo-auth-session
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

// Register for redirect
WebBrowser.maybeCompleteAuthSession();

// OAuth configuration will need to account for:
// 1. Different redirect URI (app scheme or universal link)
// 2. DPoP key management in React Native
// 3. Secure token storage (expo-secure-store)
```

### Challenges

1. **DPoP Keys**: Need secure key generation in React Native
2. **Redirect URI**: May need custom URI scheme or Universal Links
3. **Token Storage**: Use `expo-secure-store` for secure storage

### Potential Solutions

1. Use `@atproto/oauth-client-browser` if it works in React Native WebView
2. Build custom OAuth flow using React Native crypto libraries
3. Proxy OAuth through web app (less ideal)

---

## Phase 2: Own PDS

### Benefits

- `@username.trainers.gg` handles
- Full control over user data
- Can customize account creation flow
- Not dependent on Bluesky's infrastructure

### Deployment Options

| Platform         | Pros                                    | Cons             |
| ---------------- | --------------------------------------- | ---------------- |
| **Fly.io**       | Easy container deployment, good scaling | Cost at scale    |
| **Railway**      | Simple, git-based deploys               | Less control     |
| **Render**       | Good free tier                          | Cold starts      |
| **DigitalOcean** | Full VPS control, cheap                 | More maintenance |

### PDS Requirements

- Public IPv4 address
- Domain with DNS configured
- SSL certificate (auto via Caddy)
- 1GB+ RAM
- Persistent storage for SQLite + blobs

### Handle Configuration

```
trainers.gg              → PDS server
*.trainers.gg            → PDS server (for user handles)
```

Users would have handles like:

- `ash.trainers.gg`
- `cynthia.trainers.gg`
- `leon.trainers.gg`

---

## Rate Limits

Bluesky has rate limits that we need to respect:

| Endpoint       | Limit                |
| -------------- | -------------------- |
| General API    | ~3000 requests/5 min |
| Create record  | ~1500/hour           |
| Timeline fetch | Reasonable use       |

### Mitigation Strategies

1. **Caching**: Cache feed data in Convex for repeat views
2. **Debouncing**: Debounce rapid actions (like spam clicking)
3. **Queuing**: Queue posts if rate limited
4. **Graceful Degradation**: Show cached data if API unavailable

---

## Error Handling

```typescript
// Common Bluesky API errors
const BLUESKY_ERRORS = {
  InvalidToken: "Session expired, please sign in again",
  RateLimitExceeded: "Too many requests, please wait",
  RecordNotFound: "Post not found",
  InvalidRequest: "Invalid request",
  AuthRequired: "Please sign in to continue",
};

function handleBlueskyError(error: any): string {
  const errorType = error?.error;
  return BLUESKY_ERRORS[errorType] || "Something went wrong";
}
```

---

## Security Considerations

1. **Token Storage**
   - Never store tokens in localStorage (XSS vulnerable)
   - Use httpOnly cookies or secure session management
   - Mobile: Use `expo-secure-store`

2. **DPoP Keys**
   - Generate per-session
   - Never export or share
   - Store in IndexedDB (web) or Keychain (mobile)

3. **API Calls**
   - All Bluesky calls through Convex Actions (server-side)
   - Validate user owns the session before making calls
   - Don't expose raw tokens to client

4. **Client Metadata**
   - Host at HTTPS URL
   - Keep redirect URIs minimal and specific
   - Update if keys are compromised
