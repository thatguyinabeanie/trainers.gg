-- =============================================================================
-- Migration: Drop Posts and Post Likes Tables
-- =============================================================================
-- Social feed functionality removed pre-release. Follows table is kept.
-- =============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS "trigger_update_post_likes_count" ON "public"."post_likes";
DROP TRIGGER IF EXISTS "trigger_update_post_replies_count" ON "public"."posts";
DROP TRIGGER IF EXISTS "update_posts_updated_at" ON "public"."posts";

-- Drop trigger functions
DROP FUNCTION IF EXISTS "public"."update_post_likes_count"();
DROP FUNCTION IF EXISTS "public"."update_post_replies_count"();

-- Drop tables (cascade handles foreign key dependencies)
DROP TABLE IF EXISTS "public"."post_likes" CASCADE;
DROP TABLE IF EXISTS "public"."posts" CASCADE;
