-- =============================================================================
-- Migration: Migrate Social Tables from alt_id to user_id
-- =============================================================================
-- This migration changes social features (posts, likes, follows) to use user_id
-- instead of alt_id, and organizations to use owner_user_id.
--
-- RATIONALE:
-- 1. Bluesky Federation: Posts federate to the AT Protocol network. External
--    clients (bsky.app) only understand DIDs, which are user-level identifiers.
--    Alts don't have DIDs and cannot federate.
--
-- 2. Tournament Anonymity: Using alt_id for social features would break
--    tournament anonymity by linking alts through posting patterns.
--
-- 3. Feature Classification:
--    - User-level: Posts, likes, follows, organizations, shiny dex
--    - Alt-level: Tournament registrations, matches, standings
--
-- NOTE: Database is empty (no production data), so we use DROP/CREATE approach.
-- =============================================================================

-- =============================================================================
-- Step 1: Add bio field to users table for social profiles
-- =============================================================================

ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "bio" text;

COMMENT ON COLUMN "public"."users"."bio" IS 'User bio displayed on social profile';

-- =============================================================================
-- Step 2: Drop existing social tables and their dependencies
-- =============================================================================

-- Drop RLS policies first
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON "public"."posts";
DROP POLICY IF EXISTS "Users can create posts" ON "public"."posts";
DROP POLICY IF EXISTS "Users can update own posts" ON "public"."posts";
DROP POLICY IF EXISTS "Users can delete own posts" ON "public"."posts";
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON "public"."post_likes";
DROP POLICY IF EXISTS "Users can like posts" ON "public"."post_likes";
DROP POLICY IF EXISTS "Users can unlike posts" ON "public"."post_likes";
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON "public"."follows";
DROP POLICY IF EXISTS "Users can follow" ON "public"."follows";
DROP POLICY IF EXISTS "Users can unfollow" ON "public"."follows";

-- Drop triggers
DROP TRIGGER IF EXISTS "update_posts_updated_at" ON "public"."posts";
DROP TRIGGER IF EXISTS "trigger_update_post_likes_count" ON "public"."post_likes";
DROP TRIGGER IF EXISTS "trigger_update_post_replies_count" ON "public"."posts";

-- Drop functions (will be recreated)
DROP FUNCTION IF EXISTS "public"."update_post_likes_count"();
DROP FUNCTION IF EXISTS "public"."update_post_replies_count"();

-- Drop indexes
DROP INDEX IF EXISTS "public"."idx_posts_alt";
DROP INDEX IF EXISTS "public"."idx_posts_created_at";
DROP INDEX IF EXISTS "public"."idx_posts_reply_to";
DROP INDEX IF EXISTS "public"."idx_posts_repost_of";
DROP INDEX IF EXISTS "public"."idx_post_likes_post";
DROP INDEX IF EXISTS "public"."idx_post_likes_alt";
DROP INDEX IF EXISTS "public"."idx_follows_follower";
DROP INDEX IF EXISTS "public"."idx_follows_following";

-- Drop tables (CASCADE handles foreign keys)
DROP TABLE IF EXISTS "public"."post_likes" CASCADE;
DROP TABLE IF EXISTS "public"."follows" CASCADE;
DROP TABLE IF EXISTS "public"."posts" CASCADE;

-- =============================================================================
-- Step 3: Recreate posts table with user_id
-- =============================================================================

CREATE TABLE "public"."posts" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL,
    "content" text NOT NULL,
    "reply_to_id" bigint,
    "repost_of_id" bigint,
    "quote_content" text,
    "likes_count" integer DEFAULT 0,
    "replies_count" integer DEFAULT 0,
    "reposts_count" integer DEFAULT 0,
    "views_count" integer DEFAULT 0,
    "is_pinned" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    
    CONSTRAINT "posts_content_length" CHECK (char_length("content") <= 500),
    CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") 
        REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "posts_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") 
        REFERENCES "public"."posts"("id") ON DELETE SET NULL,
    CONSTRAINT "posts_repost_of_id_fkey" FOREIGN KEY ("repost_of_id") 
        REFERENCES "public"."posts"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."posts" OWNER TO "postgres";

COMMENT ON TABLE "public"."posts" IS 'Social posts created by users. Uses user_id for Bluesky federation.';
COMMENT ON COLUMN "public"."posts"."user_id" IS 'The user who created the post. Links to users.id for DID attribution.';

-- =============================================================================
-- Step 4: Recreate post_likes table with user_id
-- =============================================================================

CREATE TABLE "public"."post_likes" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
    "post_id" bigint NOT NULL,
    "user_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    
    CONSTRAINT "post_likes_post_id_user_id_key" UNIQUE ("post_id", "user_id"),
    CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") 
        REFERENCES "public"."posts"("id") ON DELETE CASCADE,
    CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") 
        REFERENCES "public"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."post_likes" OWNER TO "postgres";

COMMENT ON TABLE "public"."post_likes" IS 'Likes on posts. Uses user_id for consistent user-level social interactions.';

-- =============================================================================
-- Step 5: Recreate follows table with user_id
-- =============================================================================

CREATE TABLE "public"."follows" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
    "follower_user_id" uuid NOT NULL,
    "following_user_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    
    CONSTRAINT "follows_follower_following_key" UNIQUE ("follower_user_id", "following_user_id"),
    CONSTRAINT "follows_no_self_follow" CHECK ("follower_user_id" != "following_user_id"),
    CONSTRAINT "follows_follower_user_id_fkey" FOREIGN KEY ("follower_user_id") 
        REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "follows_following_user_id_fkey" FOREIGN KEY ("following_user_id") 
        REFERENCES "public"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."follows" OWNER TO "postgres";

COMMENT ON TABLE "public"."follows" IS 'User follow relationships. Uses user_id (not alt_id) because you follow the person.';

-- =============================================================================
-- Step 6: Recreate indexes for new tables
-- =============================================================================

-- Posts indexes
CREATE INDEX "idx_posts_user" ON "public"."posts" USING "btree" ("user_id");
CREATE INDEX "idx_posts_created_at" ON "public"."posts" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_posts_reply_to" ON "public"."posts" USING "btree" ("reply_to_id") WHERE "reply_to_id" IS NOT NULL;
CREATE INDEX "idx_posts_repost_of" ON "public"."posts" USING "btree" ("repost_of_id") WHERE "repost_of_id" IS NOT NULL;
CREATE INDEX "idx_posts_not_deleted" ON "public"."posts" USING "btree" ("created_at" DESC) WHERE "is_deleted" = false;

-- Post likes indexes
CREATE INDEX "idx_post_likes_post" ON "public"."post_likes" USING "btree" ("post_id");
CREATE INDEX "idx_post_likes_user" ON "public"."post_likes" USING "btree" ("user_id");

-- Follows indexes
CREATE INDEX "idx_follows_follower" ON "public"."follows" USING "btree" ("follower_user_id");
CREATE INDEX "idx_follows_following" ON "public"."follows" USING "btree" ("following_user_id");

-- =============================================================================
-- Step 7: Recreate triggers
-- =============================================================================

-- Trigger for updated_at on posts
CREATE TRIGGER "update_posts_updated_at"
    BEFORE UPDATE ON "public"."posts"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Function to update likes_count on posts
CREATE OR REPLACE FUNCTION "public"."update_post_likes_count"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER "trigger_update_post_likes_count"
    AFTER INSERT OR DELETE ON "public"."post_likes"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_post_likes_count"();

-- Function to update replies_count on parent posts
CREATE OR REPLACE FUNCTION "public"."update_post_replies_count"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.reply_to_id IS NOT NULL THEN
        UPDATE posts SET replies_count = replies_count + 1 WHERE id = NEW.reply_to_id;
    ELSIF TG_OP = 'DELETE' AND OLD.reply_to_id IS NOT NULL THEN
        UPDATE posts SET replies_count = GREATEST(0, replies_count - 1) WHERE id = OLD.reply_to_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.reply_to_id IS DISTINCT FROM NEW.reply_to_id THEN
            IF OLD.reply_to_id IS NOT NULL THEN
                UPDATE posts SET replies_count = GREATEST(0, replies_count - 1) WHERE id = OLD.reply_to_id;
            END IF;
            IF NEW.reply_to_id IS NOT NULL THEN
                UPDATE posts SET replies_count = replies_count + 1 WHERE id = NEW.reply_to_id;
            END IF;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER "trigger_update_post_replies_count"
    AFTER INSERT OR UPDATE OR DELETE ON "public"."posts"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_post_replies_count"();

-- =============================================================================
-- Step 8: Enable RLS and create policies using user_id
-- =============================================================================

ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;

-- Posts: Public read (non-deleted), owner can write
CREATE POLICY "Posts are viewable by everyone" 
    ON "public"."posts" FOR SELECT 
    USING ("is_deleted" = false);

CREATE POLICY "Users can create posts" 
    ON "public"."posts" FOR INSERT 
    WITH CHECK ("user_id" = auth.uid());

CREATE POLICY "Users can update own posts" 
    ON "public"."posts" FOR UPDATE 
    USING ("user_id" = auth.uid());

CREATE POLICY "Users can delete own posts" 
    ON "public"."posts" FOR DELETE 
    USING ("user_id" = auth.uid());

-- Post likes: Public read, authenticated can like/unlike own
CREATE POLICY "Post likes are viewable by everyone" 
    ON "public"."post_likes" FOR SELECT 
    USING (true);

CREATE POLICY "Users can like posts" 
    ON "public"."post_likes" FOR INSERT 
    WITH CHECK ("user_id" = auth.uid());

CREATE POLICY "Users can unlike posts" 
    ON "public"."post_likes" FOR DELETE 
    USING ("user_id" = auth.uid());

-- Follows: Public read, authenticated can follow/unfollow
CREATE POLICY "Follows are viewable by everyone" 
    ON "public"."follows" FOR SELECT 
    USING (true);

CREATE POLICY "Users can follow" 
    ON "public"."follows" FOR INSERT 
    WITH CHECK ("follower_user_id" = auth.uid());

CREATE POLICY "Users can unfollow" 
    ON "public"."follows" FOR DELETE 
    USING ("follower_user_id" = auth.uid());

-- =============================================================================
-- Step 9: Grant permissions
-- =============================================================================

GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";

GRANT ALL ON TABLE "public"."post_likes" TO "anon";
GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";

GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";

-- =============================================================================
-- Step 10: Migrate organizations.owner_alt_id to owner_user_id
-- =============================================================================

-- Drop existing policies that reference owner_alt_id
-- These were created in 20260121214424_rename_profiles_to_alts_and_site_admin.sql
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON "public"."organizations";
DROP POLICY IF EXISTS "Org owners can update" ON "public"."organizations";
DROP POLICY IF EXISTS "Org owners can add members" ON "public"."organization_members";
DROP POLICY IF EXISTS "Org owners can remove members" ON "public"."organization_members";
DROP POLICY IF EXISTS "Org members can create tournaments" ON "public"."tournaments";
DROP POLICY IF EXISTS "Org members can update tournaments" ON "public"."tournaments";

-- Drop policies that reference owner_alt_id via JOIN
DROP POLICY IF EXISTS "Users can view own feature usage" ON "public"."feature_usage";
DROP POLICY IF EXISTS "Users can view own subscriptions" ON "public"."subscriptions";

-- Drop the old foreign key constraint
ALTER TABLE "public"."organizations" DROP CONSTRAINT IF EXISTS "organizations_owner_alt_id_fkey";

-- Drop the old index
DROP INDEX IF EXISTS "public"."idx_organizations_owner";

-- Rename the column
ALTER TABLE "public"."organizations" RENAME COLUMN "owner_alt_id" TO "owner_user_id";

-- Drop NOT NULL constraint before type change
ALTER TABLE "public"."organizations" 
    ALTER COLUMN "owner_user_id" DROP NOT NULL;

-- Change column type from bigint to uuid
ALTER TABLE "public"."organizations" 
    ALTER COLUMN "owner_user_id" TYPE uuid USING NULL;

-- Re-add NOT NULL constraint
ALTER TABLE "public"."organizations" 
    ALTER COLUMN "owner_user_id" SET NOT NULL;

-- Add new foreign key constraint to users table
ALTER TABLE "public"."organizations" 
    ADD CONSTRAINT "organizations_owner_user_id_fkey" 
    FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;

-- Create new index
CREATE INDEX "idx_organizations_owner" ON "public"."organizations" USING "btree" ("owner_user_id");

-- Add column comment
COMMENT ON COLUMN "public"."organizations"."owner_user_id" IS 'The user who owns this organization. Uses user_id (not alt_id).';

-- Recreate RLS policies using user_id
CREATE POLICY "Users can create organizations" 
    ON "public"."organizations" FOR INSERT 
    WITH CHECK ("owner_user_id" = auth.uid());

CREATE POLICY "Org owners can update" 
    ON "public"."organizations" FOR UPDATE 
    USING ("owner_user_id" = auth.uid());

CREATE POLICY "Org owners can delete" 
    ON "public"."organizations" FOR DELETE 
    USING ("owner_user_id" = auth.uid());

-- Recreate organization_members policies using owner_user_id
CREATE POLICY "Org owners can add members" ON "public"."organization_members" 
    FOR INSERT WITH CHECK (EXISTS ( 
        SELECT 1 FROM "public"."organizations" "o"
        WHERE "o"."id" = "organization_members"."organization_id" 
        AND "o"."owner_user_id" = auth.uid()
    ));

CREATE POLICY "Org owners can remove members" ON "public"."organization_members" 
    FOR DELETE USING ((EXISTS ( 
        SELECT 1 FROM "public"."organizations" "o"
        WHERE "o"."id" = "organization_members"."organization_id" 
        AND "o"."owner_user_id" = auth.uid()
    )) OR ("alt_id" IN (
        SELECT "alts"."id" FROM "public"."alts" WHERE "alts"."user_id" = auth.uid()
    )));

-- Recreate tournament policies using owner_user_id  
CREATE POLICY "Org members can create tournaments" ON "public"."tournaments" 
    FOR INSERT WITH CHECK (EXISTS ( 
        SELECT 1 FROM "public"."organizations" "o"
        WHERE "o"."id" = "tournaments"."organization_id" 
        AND (
            "o"."owner_user_id" = auth.uid()
            OR EXISTS ( 
                SELECT 1 FROM "public"."organization_members" "om"
                JOIN "public"."alts" "a" ON "a"."id" = "om"."alt_id"
                WHERE "om"."organization_id" = "o"."id" 
                AND "a"."user_id" = auth.uid()
            )
        )
    ));

CREATE POLICY "Org members can update tournaments" ON "public"."tournaments" 
    FOR UPDATE USING (EXISTS ( 
        SELECT 1 FROM "public"."organizations" "o"
        WHERE "o"."id" = "tournaments"."organization_id" 
        AND (
            "o"."owner_user_id" = auth.uid()
            OR EXISTS ( 
                SELECT 1 FROM "public"."organization_members" "om"
                JOIN "public"."alts" "a" ON "a"."id" = "om"."alt_id"
                WHERE "om"."organization_id" = "o"."id" 
                AND "a"."user_id" = auth.uid()
            )
        )
    ));

-- =============================================================================
-- Step 11: Update organization_members to use alt_id correctly
-- =============================================================================
-- Note: organization_members.alt_id is CORRECT - members join orgs as their alt.
-- But the RLS policies need to check user ownership of the alt.
-- The existing policies already do this via JOIN to alts table.

-- =============================================================================
-- Step 12: Update views that reference the old column names
-- =============================================================================

-- Drop and recreate organization views that reference owner_alt_id
DROP VIEW IF EXISTS "public"."organization_details";
DROP VIEW IF EXISTS "public"."organization_with_owner";

-- Recreate organization_with_owner view
CREATE OR REPLACE VIEW "public"."organization_with_owner" AS
SELECT 
    o.*,
    u.username AS owner_username,
    u.name AS owner_name,
    u.image AS owner_image
FROM "public"."organizations" o
JOIN "public"."users" u ON u.id = o.owner_user_id;

-- Grant permissions on view
GRANT SELECT ON "public"."organization_with_owner" TO "anon";
GRANT SELECT ON "public"."organization_with_owner" TO "authenticated";
GRANT SELECT ON "public"."organization_with_owner" TO "service_role";

-- =============================================================================
-- Step 13: Recreate feature_usage and subscriptions policies
-- =============================================================================

-- Recreate feature_usage policy using owner_user_id
CREATE POLICY "Users can view own feature usage" ON "public"."feature_usage" 
    FOR SELECT USING (
        (("entity_type"::text = 'alt') 
            AND ("entity_id" IN ( 
                SELECT "alts"."id" FROM "public"."alts" WHERE "alts"."user_id" = auth.uid()
            ))) 
        OR (("entity_type"::text = 'organization') 
            AND ("entity_id" IN ( 
                SELECT "o"."id" FROM "public"."organizations" "o"
                WHERE "o"."owner_user_id" = auth.uid()
            )))
    );

-- Recreate subscriptions policy using owner_user_id
CREATE POLICY "Users can view own subscriptions" ON "public"."subscriptions" 
    FOR SELECT USING (
        (("entity_type"::text = 'alt') 
            AND ("entity_id" IN ( 
                SELECT "alts"."id" FROM "public"."alts" WHERE "alts"."user_id" = auth.uid()
            ))) 
        OR (("entity_type"::text = 'organization') 
            AND ("entity_id" IN ( 
                SELECT "o"."id" FROM "public"."organizations" "o"
                WHERE "o"."owner_user_id" = auth.uid()
            )))
    );

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- Summary of changes:
-- 1. Added users.bio field for social profiles
-- 2. posts.alt_id -> posts.user_id (uuid, FK to users)
-- 3. post_likes.alt_id -> post_likes.user_id (uuid, FK to users)
-- 4. follows.follower_alt_id -> follows.follower_user_id (uuid, FK to users)
-- 5. follows.following_alt_id -> follows.following_user_id (uuid, FK to users)
-- 6. organizations.owner_alt_id -> organizations.owner_user_id (uuid, FK to users)
-- 7. All RLS policies updated to use auth.uid() directly
-- 8. All indexes updated for new column names
-- =============================================================================
