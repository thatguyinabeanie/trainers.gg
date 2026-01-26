# User vs Alt Architecture Guide

**Last Updated:** January 26, 2026  
**Status:** Authoritative Reference

---

## Overview

trainers.gg has two levels of identity:

| Level    | Table   | Purpose                                            |
| -------- | ------- | -------------------------------------------------- |
| **User** | `users` | The actual person (linked to `auth.users`)         |
| **Alt**  | `alts`  | Tournament-specific alternate identity (anonymity) |

This document explains when to use each and why.

---

## 🌐 The Critical Constraint: Bluesky Federation

trainers.gg uses the **AT Protocol (Bluesky)** for decentralized social features. This architectural decision has significant implications for how we handle identity.

### How AT Protocol Works

Every user on trainers.gg has:

```
┌─────────────────────────────────────────────────────────────────┐
│  User Account (users table)                                      │
├─────────────────────────────────────────────────────────────────┤
│  id:         uuid (matches auth.users.id)                       │
│  username:   "trainer123"                                        │
│  did:        "did:plc:abc123xyz..."  ← AT Protocol identifier   │
│  pds_handle: "@trainer123.trainers.gg"                          │
└─────────────────────────────────────────────────────────────────┘
```

When a user posts content on trainers.gg:

1. The post is stored in our database
2. The post is **federated** to the Bluesky network via the PDS
3. Users on **bsky.app** and other AT Protocol clients can see it
4. The post is attributed to the user's DID and handle

### Why Alts Cannot Be Used for Federated Content

**External AT Protocol clients (bsky.app, etc.) have no concept of "alts."**

They only understand:

- **DID** (Decentralized Identifier) - the user's unique identity
- **Handle** - the user's public-facing name (e.g., `@trainer123.trainers.gg`)

If we tried to federate content from an "alt":

```
❌ alt_id: "alt-abc-123"
   └── No DID
   └── No handle
   └── Cannot federate
   └── External clients cannot display or attribute content
```

### The Federation Rule

> **Any content that federates to Bluesky MUST use `user_id`, not `alt_id`.**

This includes:

- Posts
- Likes
- Follows
- Profile data
- Any future federated content types

---

## 🎭 Understanding Alts

### What Alts Are For

Alts provide **tournament anonymity**. In competitive Pokemon, players sometimes want to:

- Play in multiple divisions without opponents knowing their main account
- Compete in events without their tournament history being visible
- Test new team compositions without revealing their strategy

### How Alts Work

```
┌─────────────────────────────────────────────────────────────────┐
│  User Account                                                    │
│  username: "trainer123"                                          │
│  did: "did:plc:abc123..."                                        │
├─────────────────────────────────────────────────────────────────┤
│  ├── Alt 1: "VGCMaster"                                          │
│  │   └── Tournaments, team registrations, match history          │
│  │                                                               │
│  ├── Alt 2: "CasualPlayer"                                       │
│  │   └── Different tournaments, separate standings               │
│  │                                                               │
│  └── Alt 3: "SecretTester"                                       │
│      └── Testing new teams in low-stakes events                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why Alts Must Stay Separate from Social Features

If we used `alt_id` for social features (posts, follows, likes):

1. **Anonymity would be broken**
   - Posting patterns could link alts to the same person
   - "Alt 1 and Alt 3 always post at the same times..."
   - Social graphs would reveal alt relationships

2. **Federation would fail**
   - Posts couldn't federate (no DID)
   - Users would have broken Bluesky presence

3. **Display confusion**
   - Which alt's followers count on the user page?
   - Which alt's posts show on the feed?

---

## 📋 Feature Classification

### User-Level Features (`user_id`)

These features belong to the person, not the tournament persona:

| Feature             | Table/FK                                        | Rationale                        |
| ------------------- | ----------------------------------------------- | -------------------------------- |
| Posts               | `posts.user_id`                                 | Federate to Bluesky with DID     |
| Likes               | `post_likes.user_id`                            | Social interaction as the person |
| Follows             | `follows.follower_user_id`, `following_user_id` | Social graph                     |
| Organizations       | `organizations.owner_user_id`                   | Org ownership is person-level    |
| Shiny Dex           | `shiny_catches.user_id`                         | Personal collection              |
| Profile Bio         | `users.bio`                                     | Social profile content           |
| Avatar/Display Name | `users.image`, `users.name`                     | Public identity                  |
| Bluesky Handle      | `users.pds_handle`                              | AT Protocol identity             |

### Alt-Level Features (`alt_id`)

These features belong to the tournament persona:

| Feature                 | Table/FK                          | Rationale                   |
| ----------------------- | --------------------------------- | --------------------------- |
| Tournament Registration | `tournament_registrations.alt_id` | Compete under alt name      |
| Match Results           | `matches.player1_alt_id`, etc.    | Tournament anonymity        |
| Team Memberships        | `team_members.alt_id`             | Join teams as alt           |
| Tournament Standings    | `standings.alt_id`                | Rankings per alt            |
| Tournament Chat         | (if implemented)                  | In-tournament communication |

---

## 🧭 Decision Tree

Use this when designing a new feature:

```
                    ┌─────────────────────────────────────┐
                    │  Does this feature federate to      │
                    │  Bluesky/AT Protocol?               │
                    └─────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
                   YES                              NO
                    │                               │
                    ▼                               ▼
            ┌───────────────┐           ┌───────────────────────┐
            │ MUST use      │           │ Is this a tournament- │
            │ user_id       │           │ specific feature?     │
            └───────────────┘           └───────────────────────┘
                                                    │
                                    ┌───────────────┴───────────────┐
                                    ▼                               ▼
                                   YES                              NO
                                    │                               │
                                    ▼                               ▼
                            ┌───────────────┐           ┌───────────────┐
                            │ Use alt_id    │           │ Use user_id   │
                            │               │           │               │
                            │ - Registrations│          │ - Personal    │
                            │ - Matches     │           │   collections │
                            │ - Standings   │           │ - Settings    │
                            │ - Team rosters│           │ - Preferences │
                            └───────────────┘           └───────────────┘
```

### Quick Reference Questions

Ask yourself:

1. **"Would this appear on bsky.app?"** → `user_id`
2. **"Is this tied to a specific tournament?"** → `alt_id`
3. **"Is this a personal collection or achievement?"** → `user_id`
4. **"Does this need tournament anonymity?"** → `alt_id`
5. **"Is this part of the social profile?"** → `user_id`

---

## 🔐 RLS Policy Patterns

### User-Level RLS

```sql
-- Users can manage their own user-level data
CREATE POLICY "Users can manage own posts"
    ON public.posts FOR ALL
    USING (user_id = auth.uid());

-- Public visibility
CREATE POLICY "Public posts are viewable"
    ON public.posts FOR SELECT
    USING (is_public = true);
```

### Alt-Level RLS

```sql
-- Users can manage data for their own alts
CREATE POLICY "Users can manage own alt data"
    ON public.tournament_registrations FOR ALL
    USING (
        alt_id IN (
            SELECT id FROM public.alts WHERE user_id = auth.uid()
        )
    );
```

### Helper Function Pattern

```sql
-- Check if an alt belongs to the current user
CREATE OR REPLACE FUNCTION public.owns_alt(alt_id uuid)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.alts
        WHERE id = alt_id AND user_id = auth.uid()
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Usage in RLS
CREATE POLICY "Users can manage own alt tournament data"
    ON public.tournament_registrations FOR ALL
    USING (public.owns_alt(alt_id));
```

---

## 🚫 Common Mistakes to Avoid

### Mistake 1: Using `alt_id` for Social Features

```sql
-- ❌ WRONG: Posts with alt_id
CREATE TABLE posts (
    id bigint PRIMARY KEY,
    alt_id uuid REFERENCES alts(id),  -- WRONG!
    content text
);

-- ✅ CORRECT: Posts with user_id
CREATE TABLE posts (
    id bigint PRIMARY KEY,
    user_id uuid REFERENCES users(id),  -- CORRECT!
    content text
);
```

**Why it's wrong:** Posts federate to Bluesky. Alts don't have DIDs.

### Mistake 2: Querying Alt Data for User Display

```typescript
// ❌ WRONG: Getting display data from alt for social features
const userData = await supabase
  .from("alts")
  .select("username, display_name")
  .eq("id", altId)
  .single();

// ✅ CORRECT: Getting display data from user for social features
const userData = await supabase
  .from("users")
  .select("username, name, image, did")
  .eq("id", userId)
  .single();
```

**Why it's wrong:** Social features use user-level data, not alt-level.

### Mistake 3: Using `alt_id` for Follow Relationships

```sql
-- ❌ WRONG: Following an alt
INSERT INTO follows (follower_alt_id, following_alt_id)
VALUES ('alt-123', 'alt-456');

-- ✅ CORRECT: Following a user
INSERT INTO follows (follower_user_id, following_user_id)
VALUES ('user-123', 'user-456');
```

**Why it's wrong:** You follow a person, not their tournament persona.

### Mistake 4: Mixing User and Alt Context in the Same Query

```sql
-- ❌ WRONG: Confusing contexts
SELECT p.*, a.display_name
FROM posts p
JOIN alts a ON a.user_id = p.user_id  -- Mixing!

-- ✅ CORRECT: Consistent user context
SELECT p.*, u.name, u.username, u.image
FROM posts p
JOIN users u ON u.id = p.user_id
```

---

## 📊 Database Schema Reference

### Current Correct Schema (After Migration)

```sql
-- User-level social tables
posts (user_id → users.id)
post_likes (user_id → users.id)
follows (follower_user_id → users.id, following_user_id → users.id)
organizations (owner_user_id → users.id)
shiny_catches (user_id → users.id)
shiny_hunts (user_id → users.id)

-- Alt-level tournament tables
alts (user_id → users.id)
tournament_registrations (alt_id → alts.id)
matches (player1_alt_id → alts.id, player2_alt_id → alts.id)
team_members (alt_id → alts.id)
standings (alt_id → alts.id)
```

### Entity Relationship

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 users                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  id, username, email, name, image, did, pds_handle, bio             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                   ┌────────────────┼────────────────┐                       │
│                   │                │                │                       │
│                   ▼                ▼                ▼                       │
│    ┌──────────────────┐  ┌───────────────┐  ┌──────────────────┐           │
│    │  Social Features │  │     Alts      │  │ Personal Features│           │
│    │  (user_id FK)    │  │  (user_id FK) │  │  (user_id FK)    │           │
│    │                  │  │               │  │                  │           │
│    │  - posts         │  │  - id         │  │  - shiny_catches │           │
│    │  - post_likes    │  │  - username   │  │  - shiny_hunts   │           │
│    │  - follows       │  │  - display_   │  │  - (future       │           │
│    │  - organizations │  │    name       │  │    collections)  │           │
│    └──────────────────┘  └───────────────┘  └──────────────────┘           │
│                                    │                                         │
│                                    ▼                                         │
│                    ┌───────────────────────────────┐                        │
│                    │  Tournament Features          │                        │
│                    │  (alt_id FK)                  │                        │
│                    │                               │                        │
│                    │  - tournament_registrations   │                        │
│                    │  - matches                    │                        │
│                    │  - team_members               │                        │
│                    │  - standings                  │                        │
│                    └───────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist for New Features

Before implementing a feature that involves identity, verify:

- [ ] **Federation:** Will this content appear on Bluesky? If yes, use `user_id`
- [ ] **Tournament context:** Is this specific to tournament competition? If yes, use `alt_id`
- [ ] **Profile display:** Does this show on the social profile? If yes, use `user_id`
- [ ] **Anonymity:** Does this need to be hidden from tournament opponents? If yes, use `alt_id`
- [ ] **RLS policies:** Do policies correctly scope to `auth.uid()` (user) or check alt ownership?
- [ ] **Queries:** Are JOINs using the correct identity level?

---

## 📚 Related Documentation

- [SOCIAL_MIGRATION_PLAN.md](../planning/SOCIAL_MIGRATION_PLAN.md) - Migration from `alt_id` to `user_id` for social features
- [BLUESKY_INTEGRATION.md](../planning/BLUESKY_INTEGRATION.md) - AT Protocol integration details
- [shiny_hunting_integration_architecture.md](../shiny_hunting_integration_architecture.md) - Shiny dex implementation (user-level feature)
