# Bluesky Integration Guide - trainers.gg

This document details how trainers.gg integrates with Bluesky and the AT Protocol.

---

## Overview

trainers.gg uses Bluesky as the social backbone:

- **Identity**: Every user gets a `@username.trainers.gg` handle
- **Social Graph**: Follows/followers via AT Protocol
- **Content**: Posts federate to/from the Bluesky network
- **DID**: Users identified by their permanent Decentralized Identifier

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           trainers.gg                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │ Next.js Web │  │ Expo Mobile │  │ Supabase                            │  │
│  │             │  │             │  │ ┌─────────────────────────────────┐ │  │
│  │ signUp() ───┼──┼─────────────┼──┼─► Edge Function (/signup)         │ │  │
│  │             │  │             │  │ │  ├─► Create Supabase Auth       │ │  │
│  │             │  │             │  │ │  ├─► Create PDS Account         │ │  │
│  │             │  │             │  │ │  └─► Store DID in users table   │ │  │
│  │             │  │             │  │ └─────────────────────────────────┘ │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Edge Function calls PDS API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PDS (pds.trainers.gg)                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  User Accounts  │  │  DID / Handles  │  │  Federation (Relay)        │  │
│  │  @user.trainers │  │  did:plc:...    │  │  → bsky.network             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Federates with
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Bluesky Network                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  bsky.social    │  │  Relay          │  │  AppView                    │  │
│  │  (main PDS)     │  │  bsky.network   │  │  (aggregation)              │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AT Protocol Concepts

### Key Terms

| Term        | Description                                                              |
| ----------- | ------------------------------------------------------------------------ |
| **DID**     | Decentralized Identifier - permanent user ID (e.g., `did:plc:abc123...`) |
| **Handle**  | User-friendly name (e.g., `@username.trainers.gg`)                       |
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

## Authentication Flow

### Unified Signup

trainers.gg uses **Supabase Auth** for authentication, with automatic PDS account creation:

```
1. User enters email, username, password
2. Client calls /functions/v1/signup edge function
3. Edge function validates username availability (Supabase + PDS)
4. Edge function creates Supabase Auth account
5. Edge function generates PDS invite code
6. Edge function creates PDS account (@username.trainers.gg)
7. Edge function stores DID in users table
8. User receives session tokens
```

### Why This Approach?

| Approach              | Pros                                                | Cons                                                   |
| --------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| **Bluesky OAuth**     | Standard OAuth flow                                 | Complex (DPoP, PAR, PKCE), user needs existing account |
| **Supabase + PDS** ✅ | Simpler, user gets handle immediately, full control | Must manage PDS ourselves                              |

### Handle Resolution

Users get handles like `@username.trainers.gg`. For these to work, the AT Protocol needs to resolve the handle to a DID.

**Resolution methods:**

1. **HTTPS method:** `https://username.trainers.gg/.well-known/atproto-did` returns the DID
2. **DNS TXT method:** `_atproto.username.trainers.gg` TXT record contains `did=did:plc:xxx`

The PDS handles this automatically when wildcard DNS (`*.trainers.gg`) points to Fly.io.

**Current DNS configuration:**

| Record         | Type  | Points To              | Purpose           |
| -------------- | ----- | ---------------------- | ----------------- |
| `pds`          | CNAME | `trainers-pds.fly.dev` | PDS API           |
| `*` (wildcard) | CNAME | `trainers-pds.fly.dev` | Handle resolution |

---

## PDS Deployment

### Infrastructure

| Component   | Value                               |
| ----------- | ----------------------------------- |
| **Host**    | Fly.io                              |
| **Domain**  | pds.trainers.gg                     |
| **Handles** | \*.trainers.gg                      |
| **SSL**     | Fly.io managed (with wildcard cert) |

### Management Scripts

```bash
cd infra/pds

# Full deployment
./deploy.sh

# Create a user account manually
./create-account.sh <username> <email> <password>

# Check status
make status
make health
make logs
```

See [infra/pds/README.md](../../infra/pds/README.md) for full documentation.

---

## Future: Social Features

### Feed Strategy (Not Yet Implemented)

Two feed views are planned:

1. **Pokemon Feed** (Default)
   - Filter posts containing Pokemon-related keywords/hashtags
   - Prioritize posts from trainers.gg users

2. **Full Feed**
   - Complete Bluesky timeline from follows
   - No filtering

### Pokemon Content Detection

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
];

function isPokemonContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return POKEMON_KEYWORDS.some((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );
}
```

### Future: Custom Feed Generator

In a later phase, we could create a proper Bluesky Feed Generator that:

- Uses ML to classify Pokemon content
- Provides better relevance ranking
- Runs as a separate service

---

## Future: Post Creation

### Bluesky API Integration

Posts will be created via the user's PDS using the AT Protocol API:

```typescript
// packages/atproto/src/posts.ts
import { BskyAgent } from "@atproto/api";

export async function createPost(agent: BskyAgent, text: string) {
  const response = await agent.post({
    text,
    createdAt: new Date().toISOString(),
  });

  return {
    uri: response.uri,
    cid: response.cid,
  };
}

export async function likePost(agent: BskyAgent, uri: string, cid: string) {
  return await agent.like(uri, cid);
}

export async function repost(agent: BskyAgent, uri: string, cid: string) {
  return await agent.repost(uri, cid);
}

export async function follow(agent: BskyAgent, did: string) {
  return await agent.follow(did);
}
```

### Post Composer UI (Mockup)

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

## Rate Limits

Bluesky has rate limits that we need to respect:

| Endpoint       | Limit                |
| -------------- | -------------------- |
| General API    | ~3000 requests/5 min |
| Create record  | ~1500/hour           |
| Timeline fetch | Reasonable use       |

### Mitigation Strategies

1. **Caching**: Cache feed data for repeat views
2. **Debouncing**: Debounce rapid actions
3. **Queuing**: Queue posts if rate limited
4. **Graceful Degradation**: Show cached data if API unavailable

---

## Security Considerations

1. **Token Storage**
   - Never store tokens in localStorage (XSS vulnerable)
   - Use httpOnly cookies or secure session management
   - Mobile: Use `expo-secure-store`

2. **API Calls**
   - Sensitive operations through Edge Functions (server-side)
   - Validate user owns the session before making calls

3. **PDS Admin**
   - Admin password stored in Fly.io secrets
   - Only Edge Functions have access to admin operations

---

## Mobile Considerations

### Challenges

1. **PDS Authentication**: Need to authenticate with PDS from mobile
2. **Token Storage**: Use `expo-secure-store` for secure storage
3. **Deep Linking**: Handle `trainers.gg://` scheme for callbacks

### Potential Approaches

1. Use Supabase session to generate PDS session tokens
2. Proxy PDS operations through Edge Functions
3. Direct PDS authentication with secure token storage

---

## Useful Packages

```bash
pnpm add @atproto/api
```

| Package        | Purpose                                      |
| -------------- | -------------------------------------------- |
| `@atproto/api` | Type-safe API client for Bluesky/AT Protocol |

---

## References

### AT Protocol

- [AT Protocol Docs](https://atproto.com/docs)
- [Bluesky API Reference](https://docs.bsky.app/)
- [Lexicon Reference](https://atproto.com/lexicons)

### PDS

- [PDS Self-Hosting Guide](https://github.com/bluesky-social/pds)
- [Handle Resolution](https://atproto.com/specs/handle)

---

**Last Updated:** January 2026
