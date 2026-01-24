-- =============================================================================
-- Migration: Add Posts Table
-- =============================================================================
-- This migration adds the posts table for social feed functionality.
-- Posts are short-form content (like tweets) created by alts.
-- =============================================================================

-- =============================================================================
-- Posts Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
    "alt_id" bigint NOT NULL,
    "content" text NOT NULL,
    "reply_to_id" bigint,  -- For threading/replies
    "repost_of_id" bigint, -- For reposts/quotes
    "quote_content" text,  -- Content added to a quote repost
    "likes_count" integer DEFAULT 0,
    "replies_count" integer DEFAULT 0,
    "reposts_count" integer DEFAULT 0,
    "views_count" integer DEFAULT 0,
    "is_pinned" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    
    -- Constraints
    CONSTRAINT "posts_content_length" CHECK (char_length("content") <= 500),
    CONSTRAINT "posts_alt_id_fkey" FOREIGN KEY ("alt_id") 
        REFERENCES "public"."alts"("id") ON DELETE CASCADE,
    CONSTRAINT "posts_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") 
        REFERENCES "public"."posts"("id") ON DELETE SET NULL,
    CONSTRAINT "posts_repost_of_id_fkey" FOREIGN KEY ("repost_of_id") 
        REFERENCES "public"."posts"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."posts" OWNER TO "postgres";

-- =============================================================================
-- Post Likes Table (junction table for likes)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
    "post_id" bigint NOT NULL,
    "alt_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    
    CONSTRAINT "post_likes_post_id_alt_id_key" UNIQUE ("post_id", "alt_id"),
    CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") 
        REFERENCES "public"."posts"("id") ON DELETE CASCADE,
    CONSTRAINT "post_likes_alt_id_fkey" FOREIGN KEY ("alt_id") 
        REFERENCES "public"."alts"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."post_likes" OWNER TO "postgres";

-- =============================================================================
-- Follows Table (who follows whom)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY,
    "follower_alt_id" bigint NOT NULL,
    "following_alt_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    
    CONSTRAINT "follows_follower_following_key" UNIQUE ("follower_alt_id", "following_alt_id"),
    CONSTRAINT "follows_no_self_follow" CHECK ("follower_alt_id" != "following_alt_id"),
    CONSTRAINT "follows_follower_alt_id_fkey" FOREIGN KEY ("follower_alt_id") 
        REFERENCES "public"."alts"("id") ON DELETE CASCADE,
    CONSTRAINT "follows_following_alt_id_fkey" FOREIGN KEY ("following_alt_id") 
        REFERENCES "public"."alts"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."follows" OWNER TO "postgres";

-- =============================================================================
-- Indexes
-- =============================================================================

-- Posts indexes
CREATE INDEX "idx_posts_alt" ON "public"."posts" USING "btree" ("alt_id");
CREATE INDEX "idx_posts_created_at" ON "public"."posts" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_posts_reply_to" ON "public"."posts" USING "btree" ("reply_to_id") WHERE "reply_to_id" IS NOT NULL;
CREATE INDEX "idx_posts_repost_of" ON "public"."posts" USING "btree" ("repost_of_id") WHERE "repost_of_id" IS NOT NULL;

-- Post likes indexes
CREATE INDEX "idx_post_likes_post" ON "public"."post_likes" USING "btree" ("post_id");
CREATE INDEX "idx_post_likes_alt" ON "public"."post_likes" USING "btree" ("alt_id");

-- Follows indexes
CREATE INDEX "idx_follows_follower" ON "public"."follows" USING "btree" ("follower_alt_id");
CREATE INDEX "idx_follows_following" ON "public"."follows" USING "btree" ("following_alt_id");

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

CREATE TRIGGER "update_posts_updated_at"
    BEFORE UPDATE ON "public"."posts"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();

-- =============================================================================
-- Trigger functions for denormalized counts
-- =============================================================================

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
        -- Handle case where reply_to_id changes
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
-- RLS Policies
-- =============================================================================

ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;

-- Posts: Public read, owner can write
CREATE POLICY "Posts are viewable by everyone" 
    ON "public"."posts" FOR SELECT 
    USING ("is_deleted" = false);

CREATE POLICY "Users can create posts" 
    ON "public"."posts" FOR INSERT 
    WITH CHECK ("alt_id" = "public"."get_current_alt_id"());

CREATE POLICY "Users can update own posts" 
    ON "public"."posts" FOR UPDATE 
    USING ("alt_id" = "public"."get_current_alt_id"());

CREATE POLICY "Users can delete own posts" 
    ON "public"."posts" FOR DELETE 
    USING ("alt_id" = "public"."get_current_alt_id"());

-- Post likes: Public read, authenticated can like/unlike
CREATE POLICY "Post likes are viewable by everyone" 
    ON "public"."post_likes" FOR SELECT 
    USING (true);

CREATE POLICY "Users can like posts" 
    ON "public"."post_likes" FOR INSERT 
    WITH CHECK ("alt_id" = "public"."get_current_alt_id"());

CREATE POLICY "Users can unlike posts" 
    ON "public"."post_likes" FOR DELETE 
    USING ("alt_id" = "public"."get_current_alt_id"());

-- Follows: Public read, authenticated can follow/unfollow
CREATE POLICY "Follows are viewable by everyone" 
    ON "public"."follows" FOR SELECT 
    USING (true);

CREATE POLICY "Users can follow" 
    ON "public"."follows" FOR INSERT 
    WITH CHECK ("follower_alt_id" = "public"."get_current_alt_id"());

CREATE POLICY "Users can unfollow" 
    ON "public"."follows" FOR DELETE 
    USING ("follower_alt_id" = "public"."get_current_alt_id"());

-- =============================================================================
-- Grants
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
-- Migration Complete
-- =============================================================================
