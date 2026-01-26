# Social System Migration: alt_id → user_id

**Project:** trainers.gg  
**Date:** January 26, 2026  
**Status:** Planning  
**Priority:** High (blocks shiny hunting features)

---

## Overview

The current social system incorrectly uses `alt_id` (tournament personas) as the owner/actor for social features. This needs to migrate to `user_id` for several reasons:

1. **Social features are user-level** - Users post as themselves, not as tournament personas
2. **Bluesky federation** - AT Protocol requires user-level identity for content federation
3. **Shiny hunting integration** - The upcoming shiny dex is a user-level profile feature
4. **Semantic correctness** - Alts are for tournament anonymity only

---

## Current State (Incorrect)

| Table           | Column             | References | Issue                                 |
| --------------- | ------------------ | ---------- | ------------------------------------- |
| `posts`         | `alt_id`           | `alts(id)` | Posts tied to tournament persona      |
| `post_likes`    | `alt_id`           | `alts(id)` | Likes tied to tournament persona      |
| `follows`       | `follower_alt_id`  | `alts(id)` | Following uses tournament persona     |
| `follows`       | `following_alt_id` | `alts(id)` | Following uses tournament persona     |
| `organizations` | `owner_alt_id`     | `alts(id)` | Org ownership uses tournament persona |

**Helper Functions:**

- `get_current_alt_id()` - Returns the current user's main alt ID (used in RLS)

---

## Target State (Correct)

| Table           | Column              | References  | Benefit                     |
| --------------- | ------------------- | ----------- | --------------------------- |
| `posts`         | `user_id`           | `users(id)` | Posts tied to actual user   |
| `post_likes`    | `user_id`           | `users(id)` | Likes tied to actual user   |
| `follows`       | `follower_user_id`  | `users(id)` | Following is user-to-user   |
| `follows`       | `following_user_id` | `users(id)` | Following is user-to-user   |
| `organizations` | `owner_user_id`     | `users(id)` | Org ownership is user-level |

**Helper Functions:**

- RLS will use `auth.uid()` directly (no helper needed)

---

## Ownership Rules Reference

After migration, the ownership model will be:

| Entity                 | Owner Type | Reason                                             |
| ---------------------- | ---------- | -------------------------------------------------- |
| `teams`                | `alt_id`   | Alt-level (different teams per tournament persona) |
| `tournament_templates` | `alt_id`   | Always user's main alt                             |
| `organizations`        | `user_id`  | User-level (orgs owned by person)                  |
| `posts`                | `user_id`  | User-level (Bluesky federation)                    |
| `follows`              | `user_id`  | User-level (follow people, not personas)           |
| `post_likes`           | `user_id`  | User-level                                         |
| `shiny_catches`        | `user_id`  | User-level (personal collection)                   |
| `shiny_hunts`          | `user_id`  | User-level (personal collection)                   |

---

## Migration Strategy

### Option A: Phased Column Migration (Recommended)

Migrate in phases to avoid breaking changes:

1. **Phase 1:** Add new `user_id` columns alongside existing `alt_id` columns
2. **Phase 2:** Populate `user_id` from `alts.user_id` relationship
3. **Phase 3:** Update application code to use new columns
4. **Phase 4:** Update RLS policies to use `user_id`
5. **Phase 5:** Drop old `alt_id` columns

### Option B: Single Migration with Views

1. Create the migration with column renames and data migration
2. Create compatibility views for any legacy code
3. Update application code
4. Drop views

**Recommendation:** Option A is safer for production, but Option B is simpler if no users exist yet.

---

## Migration SQL

### Migration 1: Add user_id Columns

**File:** `YYYYMMDDHHMMSS_social_add_user_id_columns.sql`

```sql
-- ============================================================================
-- Migration: Add user_id columns to social tables
-- Purpose: Prepare for migration from alt_id to user_id
-- ============================================================================

-- ----------------------------------------------------------------------------
-- posts: Add user_id column
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."posts"
    ADD COLUMN "user_id" uuid;

-- Populate user_id from alts table
UPDATE "public"."posts" p
SET "user_id" = a."user_id"
FROM "public"."alts" a
WHERE p."alt_id" = a."id";

-- Make user_id NOT NULL after population
ALTER TABLE "public"."posts"
    ALTER COLUMN "user_id" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- Add index for user_id queries
CREATE INDEX "idx_posts_user_id" ON "public"."posts" ("user_id");

-- ----------------------------------------------------------------------------
-- post_likes: Add user_id column
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."post_likes"
    ADD COLUMN "user_id" uuid;

-- Populate user_id from alts table
UPDATE "public"."post_likes" pl
SET "user_id" = a."user_id"
FROM "public"."alts" a
WHERE pl."alt_id" = a."id";

-- Make user_id NOT NULL after population
ALTER TABLE "public"."post_likes"
    ALTER COLUMN "user_id" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "public"."post_likes"
    ADD CONSTRAINT "post_likes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- Update unique constraint to use user_id
ALTER TABLE "public"."post_likes"
    DROP CONSTRAINT "post_likes_post_id_alt_id_key";

ALTER TABLE "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");

-- Add index
CREATE INDEX "idx_post_likes_user_id" ON "public"."post_likes" ("user_id");

-- ----------------------------------------------------------------------------
-- follows: Add user_id columns
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."follows"
    ADD COLUMN "follower_user_id" uuid,
    ADD COLUMN "following_user_id" uuid;

-- Populate from alts table
UPDATE "public"."follows" f
SET
    "follower_user_id" = follower."user_id",
    "following_user_id" = following."user_id"
FROM "public"."alts" follower, "public"."alts" following
WHERE f."follower_alt_id" = follower."id"
  AND f."following_alt_id" = following."id";

-- Make columns NOT NULL after population
ALTER TABLE "public"."follows"
    ALTER COLUMN "follower_user_id" SET NOT NULL,
    ALTER COLUMN "following_user_id" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "public"."follows"
    ADD CONSTRAINT "follows_follower_user_id_fkey"
    FOREIGN KEY ("follower_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "follows_following_user_id_fkey"
    FOREIGN KEY ("following_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- Update unique and check constraints
ALTER TABLE "public"."follows"
    DROP CONSTRAINT "follows_follower_following_key",
    DROP CONSTRAINT "follows_no_self_follow";

ALTER TABLE "public"."follows"
    ADD CONSTRAINT "follows_user_follower_following_key" UNIQUE ("follower_user_id", "following_user_id"),
    ADD CONSTRAINT "follows_no_self_follow_user" CHECK ("follower_user_id" != "following_user_id");

-- Add indexes
CREATE INDEX "idx_follows_follower_user_id" ON "public"."follows" ("follower_user_id");
CREATE INDEX "idx_follows_following_user_id" ON "public"."follows" ("following_user_id");

-- ----------------------------------------------------------------------------
-- organizations: Add owner_user_id column
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."organizations"
    ADD COLUMN "owner_user_id" uuid;

-- Populate from alts table
UPDATE "public"."organizations" o
SET "owner_user_id" = a."user_id"
FROM "public"."alts" a
WHERE o."owner_alt_id" = a."id";

-- Make owner_user_id NOT NULL after population
ALTER TABLE "public"."organizations"
    ALTER COLUMN "owner_user_id" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "public"."organizations"
    ADD CONSTRAINT "organizations_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;

-- Add index
CREATE INDEX "idx_organizations_owner_user_id" ON "public"."organizations" ("owner_user_id");
```

### Migration 2: Update RLS Policies

**File:** `YYYYMMDDHHMMSS_social_update_rls_to_user_id.sql`

```sql
-- ============================================================================
-- Migration: Update RLS policies to use user_id instead of alt_id
-- ============================================================================

-- ----------------------------------------------------------------------------
-- posts: Update RLS policies
-- ----------------------------------------------------------------------------

-- Drop old policies
DROP POLICY IF EXISTS "Users can create posts" ON "public"."posts";
DROP POLICY IF EXISTS "Users can update own posts" ON "public"."posts";
DROP POLICY IF EXISTS "Users can delete own posts" ON "public"."posts";

-- Create new policies using user_id
CREATE POLICY "Users can create posts"
    ON "public"."posts" FOR INSERT
    WITH CHECK ("user_id" = "auth"."uid"());

CREATE POLICY "Users can update own posts"
    ON "public"."posts" FOR UPDATE
    USING ("user_id" = "auth"."uid"());

CREATE POLICY "Users can delete own posts"
    ON "public"."posts" FOR DELETE
    USING ("user_id" = "auth"."uid"());

-- ----------------------------------------------------------------------------
-- post_likes: Update RLS policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can like posts" ON "public"."post_likes";
DROP POLICY IF EXISTS "Users can unlike posts" ON "public"."post_likes";

CREATE POLICY "Users can like posts"
    ON "public"."post_likes" FOR INSERT
    WITH CHECK ("user_id" = "auth"."uid"());

CREATE POLICY "Users can unlike posts"
    ON "public"."post_likes" FOR DELETE
    USING ("user_id" = "auth"."uid"());

-- ----------------------------------------------------------------------------
-- follows: Update RLS policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can follow" ON "public"."follows";
DROP POLICY IF EXISTS "Users can unfollow" ON "public"."follows";

CREATE POLICY "Users can follow"
    ON "public"."follows" FOR INSERT
    WITH CHECK ("follower_user_id" = "auth"."uid"());

CREATE POLICY "Users can unfollow"
    ON "public"."follows" FOR DELETE
    USING ("follower_user_id" = "auth"."uid"());

-- ----------------------------------------------------------------------------
-- organizations: Update RLS policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON "public"."organizations";
DROP POLICY IF EXISTS "Org owners can update" ON "public"."organizations";

CREATE POLICY "Authenticated users can create organizations"
    ON "public"."organizations" FOR INSERT
    WITH CHECK ("owner_user_id" = "auth"."uid"());

CREATE POLICY "Org owners can update"
    ON "public"."organizations" FOR UPDATE
    USING ("owner_user_id" = "auth"."uid"());
```

### Migration 3: Drop Old Columns

**File:** `YYYYMMDDHHMMSS_social_drop_alt_id_columns.sql`

```sql
-- ============================================================================
-- Migration: Drop deprecated alt_id columns from social tables
-- WARNING: Only run this after application code has been updated!
-- ============================================================================

-- ----------------------------------------------------------------------------
-- posts: Drop alt_id column
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."posts"
    DROP CONSTRAINT "posts_alt_id_fkey";

DROP INDEX IF EXISTS "idx_posts_alt_id";

ALTER TABLE "public"."posts"
    DROP COLUMN "alt_id";

-- ----------------------------------------------------------------------------
-- post_likes: Drop alt_id column
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."post_likes"
    DROP CONSTRAINT "post_likes_alt_id_fkey";

DROP INDEX IF EXISTS "idx_post_likes_alt_id";

ALTER TABLE "public"."post_likes"
    DROP COLUMN "alt_id";

-- ----------------------------------------------------------------------------
-- follows: Drop alt_id columns
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."follows"
    DROP CONSTRAINT "follows_follower_alt_id_fkey",
    DROP CONSTRAINT "follows_following_alt_id_fkey";

DROP INDEX IF EXISTS "idx_follows_follower_alt_id";
DROP INDEX IF EXISTS "idx_follows_following_alt_id";

ALTER TABLE "public"."follows"
    DROP COLUMN "follower_alt_id",
    DROP COLUMN "following_alt_id";

-- ----------------------------------------------------------------------------
-- organizations: Drop owner_alt_id column
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."organizations"
    DROP CONSTRAINT "organizations_owner_alt_id_fkey";

DROP INDEX IF EXISTS "idx_organizations_owner_alt_id";

ALTER TABLE "public"."organizations"
    DROP COLUMN "owner_alt_id";

-- ----------------------------------------------------------------------------
-- Cleanup: Drop unused helper function
-- ----------------------------------------------------------------------------
-- Note: get_current_alt_id() may still be used by teams table RLS
-- Only drop if no longer referenced
-- DROP FUNCTION IF EXISTS "public"."get_current_alt_id"();
```

---

## Application Code Changes

### Files to Update

After the database migration, update these application files:

#### Supabase Queries

| File                                               | Changes Needed                                      |
| -------------------------------------------------- | --------------------------------------------------- |
| `packages/supabase/src/queries/posts.ts`           | Change `alt_id` → `user_id`                         |
| `packages/supabase/src/queries/follows.ts`         | Change `follower_alt_id` → `follower_user_id`, etc. |
| `packages/supabase/src/mutations/posts.ts`         | Change `alt_id` → `user_id`                         |
| `packages/supabase/src/mutations/follows.ts`       | Change alt columns → user columns                   |
| `packages/supabase/src/mutations/organizations.ts` | Change `owner_alt_id` → `owner_user_id`             |

#### Web App Components

| File                                               | Changes Needed                    |
| -------------------------------------------------- | --------------------------------- |
| `apps/web/src/components/social/post-form.tsx`     | Use `user_id` instead of `alt_id` |
| `apps/web/src/components/social/follow-button.tsx` | Use user-level follow logic       |
| `apps/web/src/app/[username]/page.tsx`             | Query posts by `user_id`          |

#### Mobile App Components

| File                                  | Changes Needed                    |
| ------------------------------------- | --------------------------------- |
| `apps/mobile/src/components/social/*` | Use `user_id` instead of `alt_id` |

### TypeScript Type Changes

After migration, regenerate types:

```bash
cd packages/supabase
pnpm generate-types
```

The generated types will automatically reflect the new schema.

---

## Testing Checklist

Before deploying the migration:

- [ ] Test on local Supabase instance
- [ ] Verify data migration populates `user_id` correctly
- [ ] Verify RLS policies work with `auth.uid()`
- [ ] Test creating posts as a user
- [ ] Test liking posts as a user
- [ ] Test following/unfollowing users
- [ ] Test creating organizations
- [ ] Test editing organizations
- [ ] Verify no orphaned data after migration
- [ ] Test on Supabase preview branch before production

---

## Rollback Plan

If issues arise:

1. **Before dropping old columns:** Simply revert RLS policies to use `alt_id`
2. **After dropping old columns:** Restore from backup or re-add columns with data from `alts.user_id` relationship

---

## Dependencies

This migration **blocks**:

- Shiny hunting feature (requires user-level social integration)
- Bluesky federation (requires user-level content ownership)
- Profile page updates (social tab displays user-level data)

This migration **depends on**:

- Nothing (can proceed immediately)

---

## Timeline Estimate

| Phase | Task                     | Effort  |
| ----- | ------------------------ | ------- |
| 1     | Create migration files   | 1 day   |
| 2     | Test on local Supabase   | 1 day   |
| 3     | Update application code  | 2 days  |
| 4     | Test full flow           | 1 day   |
| 5     | Deploy to preview branch | 0.5 day |
| 6     | QA on preview            | 1 day   |
| 7     | Deploy to production     | 0.5 day |

**Total:** ~7 days

---

## Next Steps

1. [ ] Review this plan
2. [ ] Create migration files in `packages/supabase/supabase/migrations/`
3. [ ] Test locally with `pnpm local:start` and `pnpm db:migrate`
4. [ ] Update application code to use new columns
5. [ ] Push to feature branch for preview testing
6. [ ] After QA, merge to main for production deployment
7. [ ] After production is stable, create final migration to drop old columns
