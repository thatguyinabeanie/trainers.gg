-- =============================================================================
-- Migration: Rename profiles to alts + Add Site Admin System (Idempotent)
-- =============================================================================
-- This migration (updated to be idempotent for preview branch compatibility):
-- 1. Renames `profiles` table to `alts` (and all related columns)
-- 2. Adds `scope` column to `roles` table ('site' | 'organization')
-- 3. Creates `user_roles` table for site-scoped roles (links users.id to roles)
-- 4. Creates `is_site_admin()` helper function
-- 5. Creates `custom_access_token_hook()` for JWT claims
-- 6. Updates all RLS policies
-- 7. Renames `entity_type` enum value 'profile' -> 'alt'
--
-- IMPORTANT: This migration is destructive and should only run on fresh databases
-- or during development when data loss is acceptable.
-- =============================================================================

-- =============================================================================
-- STEP 1: Create role_scope enum type
-- =============================================================================

CREATE TYPE "public"."role_scope" AS ENUM ('site', 'organization');
ALTER TYPE "public"."role_scope" OWNER TO "postgres";

-- =============================================================================
-- STEP 2: Add scope column to roles table
-- =============================================================================

ALTER TABLE "public"."roles" 
  ADD COLUMN "scope" "public"."role_scope" DEFAULT 'organization'::"public"."role_scope" NOT NULL;

-- Update the unique constraint to include scope (role names must be unique within a scope)
ALTER TABLE "public"."roles" DROP CONSTRAINT IF EXISTS "roles_name_key";
ALTER TABLE "public"."roles" ADD CONSTRAINT "roles_name_scope_key" UNIQUE ("name", "scope");

-- =============================================================================
-- STEP 3: Create user_roles table (for site-scoped roles)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_roles_user_id_role_id_key" UNIQUE ("user_id", "role_id"),
    CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."user_roles" OWNER TO "postgres";

-- Index for fast lookups
CREATE INDEX "idx_user_roles_user" ON "public"."user_roles" USING "btree" ("user_id");
CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role_id");

-- Enable RLS
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "User roles are viewable by everyone" ON "public"."user_roles" FOR SELECT USING (true);

-- Grants
GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";

-- =============================================================================
-- STEP 4: Rename profiles table to alts
-- =============================================================================

-- First, drop all dependent RLS policies that reference 'profiles'
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON "public"."organizations";
DROP POLICY IF EXISTS "Org invitations viewable by involved parties" ON "public"."organization_invitations";
DROP POLICY IF EXISTS "Org members can create tournaments" ON "public"."tournaments";
DROP POLICY IF EXISTS "Org members can update tournaments" ON "public"."tournaments";
DROP POLICY IF EXISTS "Org owners can add members" ON "public"."organization_members";
DROP POLICY IF EXISTS "Org owners can remove members" ON "public"."organization_members";
DROP POLICY IF EXISTS "Org owners can update" ON "public"."organizations";
DROP POLICY IF EXISTS "Org requests viewable by requester" ON "public"."organization_requests";
DROP POLICY IF EXISTS "Profile group roles are viewable by everyone" ON "public"."profile_group_roles";
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON "public"."profiles";
DROP POLICY IF EXISTS "Public teams are viewable" ON "public"."teams";
DROP POLICY IF EXISTS "Public templates are viewable" ON "public"."tournament_templates";
DROP POLICY IF EXISTS "Team owners can delete team pokemon" ON "public"."team_pokemon";
DROP POLICY IF EXISTS "Team owners can manage team pokemon" ON "public"."team_pokemon";
DROP POLICY IF EXISTS "Tournament invitations viewable by involved" ON "public"."tournament_invitations";
DROP POLICY IF EXISTS "Users can cancel own registration" ON "public"."tournament_registrations";
DROP POLICY IF EXISTS "Users can create org requests" ON "public"."organization_requests";
DROP POLICY IF EXISTS "Users can delete own teams" ON "public"."teams";
DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can insert own teams" ON "public"."teams";
DROP POLICY IF EXISTS "Users can register for tournaments" ON "public"."tournament_registrations";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update own registration" ON "public"."tournament_registrations";
DROP POLICY IF EXISTS "Users can update own teams" ON "public"."teams";
DROP POLICY IF EXISTS "Users can view own feature usage" ON "public"."feature_usage";
DROP POLICY IF EXISTS "Users can view own subscriptions" ON "public"."subscriptions";

-- Drop the trigger that references profiles
DROP TRIGGER IF EXISTS "update_profiles_updated_at" ON "public"."profiles";

-- Drop the old function (we'll recreate it with new name)
DROP FUNCTION IF EXISTS "public"."get_current_profile_id"();

-- Rename the table (only if profiles exists and alts doesn't)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alts') THEN
    ALTER TABLE "public"."profiles" RENAME TO "alts";
  END IF;
END $$;

-- Rename the sequence (only if profiles_id_seq exists and alts_id_seq doesn't)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_class WHERE relname = 'profiles_id_seq' AND relkind = 'S')
     AND NOT EXISTS (SELECT FROM pg_class WHERE relname = 'alts_id_seq' AND relkind = 'S') THEN
    ALTER SEQUENCE "public"."profiles_id_seq" RENAME TO "alts_id_seq";
  END IF;
END $$;

-- Rename indexes on the alts table (only if they haven't been renamed yet)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'profiles_pkey') THEN
    ALTER INDEX "profiles_pkey" RENAME TO "alts_pkey";
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'profiles_username_key') THEN
    ALTER INDEX "profiles_username_key" RENAME TO "alts_username_key";
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_profiles_tier') THEN
    ALTER INDEX "idx_profiles_tier" RENAME TO "idx_alts_tier";
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_profiles_tier_expiry') THEN
    ALTER INDEX "idx_profiles_tier_expiry" RENAME TO "idx_alts_tier_expiry";
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_profiles_user') THEN
    ALTER INDEX "idx_profiles_user" RENAME TO "idx_alts_user";
  END IF;
  IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_profiles_username') THEN
    ALTER INDEX "idx_profiles_username" RENAME TO "idx_alts_username";
  END IF;
END $$;

-- Recreate the updated_at trigger with new table name
CREATE OR REPLACE TRIGGER "update_alts_updated_at" 
  BEFORE UPDATE ON "public"."alts" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- =============================================================================
-- STEP 5: Rename profile_group_roles table to alt_group_roles
-- =============================================================================

DO $$
BEGIN
  -- Only rename if profile_group_roles exists and alt_group_roles doesn't
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_group_roles')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alt_group_roles') THEN

    ALTER TABLE "public"."profile_group_roles" RENAME TO "alt_group_roles";

    -- Rename the sequence
    IF EXISTS (SELECT FROM pg_class WHERE relname = 'profile_group_roles_id_seq' AND relkind = 'S') THEN
      ALTER SEQUENCE "public"."profile_group_roles_id_seq" RENAME TO "alt_group_roles_id_seq";
    END IF;

    -- Rename indexes
    IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'profile_group_roles_pkey') THEN
      ALTER INDEX "profile_group_roles_pkey" RENAME TO "alt_group_roles_pkey";
    END IF;
    IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'profile_group_roles_profile_id_group_role_id_key') THEN
      ALTER INDEX "profile_group_roles_profile_id_group_role_id_key" RENAME TO "alt_group_roles_alt_id_group_role_id_key";
    END IF;
    IF EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_profile_group_roles_profile') THEN
      ALTER INDEX "idx_profile_group_roles_profile" RENAME TO "idx_alt_group_roles_alt";
    END IF;
  END IF;
END $$;

-- Rename the profile_id column to alt_id
ALTER TABLE "public"."alt_group_roles" RENAME COLUMN "profile_id" TO "alt_id";

-- Rename constraints
ALTER TABLE "public"."alt_group_roles" 
  DROP CONSTRAINT IF EXISTS "profile_group_roles_profile_id_fkey",
  DROP CONSTRAINT IF EXISTS "profile_group_roles_group_role_id_fkey";

ALTER TABLE "public"."alt_group_roles" 
  ADD CONSTRAINT "alt_group_roles_alt_id_fkey" FOREIGN KEY ("alt_id") REFERENCES "public"."alts"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "alt_group_roles_group_role_id_fkey" FOREIGN KEY ("group_role_id") REFERENCES "public"."group_roles"("id") ON DELETE CASCADE;

-- =============================================================================
-- STEP 6: Rename all profile_id columns to alt_id across tables
-- =============================================================================

-- users.main_profile_id -> main_alt_id
ALTER TABLE "public"."users" RENAME COLUMN "main_profile_id" TO "main_alt_id";
ALTER INDEX IF EXISTS "idx_users_main_profile" RENAME TO "idx_users_main_alt";
ALTER TABLE "public"."users" DROP CONSTRAINT IF EXISTS "users_main_profile_fk";
ALTER TABLE "public"."users" ADD CONSTRAINT "users_main_alt_fk" 
  FOREIGN KEY ("main_alt_id") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

-- organizations.owner_profile_id -> owner_alt_id
ALTER TABLE "public"."organizations" RENAME COLUMN "owner_profile_id" TO "owner_alt_id";
ALTER INDEX IF EXISTS "idx_organizations_owner" RENAME TO "idx_organizations_owner_alt";
ALTER TABLE "public"."organizations" DROP CONSTRAINT IF EXISTS "organizations_owner_profile_id_fkey";
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_owner_alt_id_fkey" 
  FOREIGN KEY ("owner_alt_id") REFERENCES "public"."alts"("id") ON DELETE RESTRICT;

-- organization_members.profile_id -> alt_id
ALTER TABLE "public"."organization_members" RENAME COLUMN "profile_id" TO "alt_id";
ALTER INDEX IF EXISTS "idx_org_members_profile" RENAME TO "idx_org_members_alt";
ALTER TABLE "public"."organization_members" DROP CONSTRAINT IF EXISTS "organization_members_organization_id_profile_id_key";
ALTER TABLE "public"."organization_members" ADD CONSTRAINT "organization_members_organization_id_alt_id_key" 
  UNIQUE ("organization_id", "alt_id");
ALTER TABLE "public"."organization_members" DROP CONSTRAINT IF EXISTS "organization_members_profile_id_fkey";
ALTER TABLE "public"."organization_members" ADD CONSTRAINT "organization_members_alt_id_fkey" 
  FOREIGN KEY ("alt_id") REFERENCES "public"."alts"("id") ON DELETE CASCADE;

-- organization_invitations columns
ALTER TABLE "public"."organization_invitations" RENAME COLUMN "invited_profile_id" TO "invited_alt_id";
ALTER TABLE "public"."organization_invitations" RENAME COLUMN "invited_by_profile_id" TO "invited_by_alt_id";
ALTER INDEX IF EXISTS "idx_org_invitations_invited" RENAME TO "idx_org_invitations_invited_alt";
ALTER TABLE "public"."organization_invitations" DROP CONSTRAINT IF EXISTS "organization_invitations_invited_profile_id_fkey";
ALTER TABLE "public"."organization_invitations" DROP CONSTRAINT IF EXISTS "organization_invitations_invited_by_profile_id_fkey";
ALTER TABLE "public"."organization_invitations" ADD CONSTRAINT "organization_invitations_invited_alt_id_fkey" 
  FOREIGN KEY ("invited_alt_id") REFERENCES "public"."alts"("id") ON DELETE CASCADE;
ALTER TABLE "public"."organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_alt_id_fkey" 
  FOREIGN KEY ("invited_by_alt_id") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

-- organization_requests columns
ALTER TABLE "public"."organization_requests" RENAME COLUMN "requested_by_profile_id" TO "requested_by_alt_id";
ALTER TABLE "public"."organization_requests" RENAME COLUMN "reviewed_by_profile_id" TO "reviewed_by_alt_id";
ALTER TABLE "public"."organization_requests" DROP CONSTRAINT IF EXISTS "organization_requests_requested_by_profile_id_fkey";
ALTER TABLE "public"."organization_requests" DROP CONSTRAINT IF EXISTS "organization_requests_reviewed_by_profile_id_fkey";
ALTER TABLE "public"."organization_requests" ADD CONSTRAINT "organization_requests_requested_by_alt_id_fkey" 
  FOREIGN KEY ("requested_by_alt_id") REFERENCES "public"."alts"("id") ON DELETE CASCADE;
ALTER TABLE "public"."organization_requests" ADD CONSTRAINT "organization_requests_reviewed_by_alt_id_fkey" 
  FOREIGN KEY ("reviewed_by_alt_id") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

-- tournament_registrations.profile_id -> alt_id
ALTER TABLE "public"."tournament_registrations" RENAME COLUMN "profile_id" TO "alt_id";
ALTER INDEX IF EXISTS "idx_registrations_profile" RENAME TO "idx_registrations_alt";
ALTER TABLE "public"."tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_tournament_id_profile_id_key";
ALTER TABLE "public"."tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_alt_id_key" 
  UNIQUE ("tournament_id", "alt_id");
ALTER TABLE "public"."tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_profile_id_fkey";
ALTER TABLE "public"."tournament_registrations" ADD CONSTRAINT "tournament_registrations_alt_id_fkey" 
  FOREIGN KEY ("alt_id") REFERENCES "public"."alts"("id") ON DELETE CASCADE;

-- tournament_invitations columns
ALTER TABLE "public"."tournament_invitations" RENAME COLUMN "invited_profile_id" TO "invited_alt_id";
ALTER TABLE "public"."tournament_invitations" RENAME COLUMN "invited_by_profile_id" TO "invited_by_alt_id";
ALTER INDEX IF EXISTS "idx_tournament_invitations_invited" RENAME TO "idx_tournament_invitations_invited_alt";
ALTER TABLE "public"."tournament_invitations" DROP CONSTRAINT IF EXISTS "tournament_invitations_tournament_id_invited_profile_id_key";
ALTER TABLE "public"."tournament_invitations" ADD CONSTRAINT "tournament_invitations_tournament_id_invited_alt_id_key" 
  UNIQUE ("tournament_id", "invited_alt_id");
ALTER TABLE "public"."tournament_invitations" DROP CONSTRAINT IF EXISTS "tournament_invitations_invited_profile_id_fkey";
ALTER TABLE "public"."tournament_invitations" DROP CONSTRAINT IF EXISTS "tournament_invitations_invited_by_profile_id_fkey";
ALTER TABLE "public"."tournament_invitations" ADD CONSTRAINT "tournament_invitations_invited_alt_id_fkey" 
  FOREIGN KEY ("invited_alt_id") REFERENCES "public"."alts"("id") ON DELETE CASCADE;
ALTER TABLE "public"."tournament_invitations" ADD CONSTRAINT "tournament_invitations_invited_by_alt_id_fkey" 
  FOREIGN KEY ("invited_by_alt_id") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

-- tournament_matches columns
ALTER TABLE "public"."tournament_matches" RENAME COLUMN "profile1_id" TO "alt1_id";
ALTER TABLE "public"."tournament_matches" RENAME COLUMN "profile2_id" TO "alt2_id";
ALTER TABLE "public"."tournament_matches" RENAME COLUMN "winner_profile_id" TO "winner_alt_id";
ALTER INDEX IF EXISTS "idx_matches_profile1" RENAME TO "idx_matches_alt1";
ALTER INDEX IF EXISTS "idx_matches_profile2" RENAME TO "idx_matches_alt2";
ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_profile1_id_fkey";
ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_profile2_id_fkey";
ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_winner_profile_id_fkey";
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_alt1_id_fkey" 
  FOREIGN KEY ("alt1_id") REFERENCES "public"."alts"("id") ON DELETE SET NULL;
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_alt2_id_fkey" 
  FOREIGN KEY ("alt2_id") REFERENCES "public"."alts"("id") ON DELETE SET NULL;
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_winner_alt_id_fkey" 
  FOREIGN KEY ("winner_alt_id") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

-- tournament_pairings columns
ALTER TABLE "public"."tournament_pairings" RENAME COLUMN "profile1_id" TO "alt1_id";
ALTER TABLE "public"."tournament_pairings" RENAME COLUMN "profile2_id" TO "alt2_id";
ALTER TABLE "public"."tournament_pairings" RENAME COLUMN "profile1_seed" TO "alt1_seed";
ALTER TABLE "public"."tournament_pairings" RENAME COLUMN "profile2_seed" TO "alt2_seed";
ALTER TABLE "public"."tournament_pairings" DROP CONSTRAINT IF EXISTS "tournament_pairings_profile1_id_fkey";
ALTER TABLE "public"."tournament_pairings" DROP CONSTRAINT IF EXISTS "tournament_pairings_profile2_id_fkey";
ALTER TABLE "public"."tournament_pairings" ADD CONSTRAINT "tournament_pairings_alt1_id_fkey" 
  FOREIGN KEY ("alt1_id") REFERENCES "public"."alts"("id") ON DELETE SET NULL;
ALTER TABLE "public"."tournament_pairings" ADD CONSTRAINT "tournament_pairings_alt2_id_fkey" 
  FOREIGN KEY ("alt2_id") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

-- tournament_standings.profile_id -> alt_id
ALTER TABLE "public"."tournament_standings" RENAME COLUMN "profile_id" TO "alt_id";
ALTER TABLE "public"."tournament_standings" DROP CONSTRAINT IF EXISTS "tournament_standings_tournament_id_profile_id_round_number_key";
ALTER TABLE "public"."tournament_standings" ADD CONSTRAINT "tournament_standings_tournament_id_alt_id_round_number_key" 
  UNIQUE ("tournament_id", "alt_id", "round_number");
ALTER TABLE "public"."tournament_standings" DROP CONSTRAINT IF EXISTS "tournament_standings_profile_id_fkey";
ALTER TABLE "public"."tournament_standings" ADD CONSTRAINT "tournament_standings_alt_id_fkey" 
  FOREIGN KEY ("alt_id") REFERENCES "public"."alts"("id") ON DELETE CASCADE;

-- tournament_player_stats.profile_id -> alt_id
ALTER TABLE "public"."tournament_player_stats" RENAME COLUMN "profile_id" TO "alt_id";
ALTER INDEX IF EXISTS "idx_player_stats_profile" RENAME TO "idx_player_stats_alt";
ALTER TABLE "public"."tournament_player_stats" DROP CONSTRAINT IF EXISTS "tournament_player_stats_tournament_id_profile_id_key";
ALTER TABLE "public"."tournament_player_stats" ADD CONSTRAINT "tournament_player_stats_tournament_id_alt_id_key" 
  UNIQUE ("tournament_id", "alt_id");
ALTER TABLE "public"."tournament_player_stats" DROP CONSTRAINT IF EXISTS "tournament_player_stats_profile_id_fkey";
ALTER TABLE "public"."tournament_player_stats" ADD CONSTRAINT "tournament_player_stats_alt_id_fkey" 
  FOREIGN KEY ("alt_id") REFERENCES "public"."alts"("id") ON DELETE CASCADE;

-- tournament_opponent_history columns
ALTER TABLE "public"."tournament_opponent_history" RENAME COLUMN "profile_id" TO "alt_id";
ALTER TABLE "public"."tournament_opponent_history" RENAME COLUMN "opponent_id" TO "opponent_alt_id";
ALTER INDEX IF EXISTS "idx_opponent_history_tournament_profile" RENAME TO "idx_opponent_history_tournament_alt";
ALTER TABLE "public"."tournament_opponent_history" DROP CONSTRAINT IF EXISTS "tournament_opponent_history_tournament_id_profile_id_oppone_key";
ALTER TABLE "public"."tournament_opponent_history" ADD CONSTRAINT "tournament_opponent_history_tournament_id_alt_id_opponent_key" 
  UNIQUE ("tournament_id", "alt_id", "opponent_alt_id", "round_number");
ALTER TABLE "public"."tournament_opponent_history" DROP CONSTRAINT IF EXISTS "tournament_opponent_history_profile_id_fkey";
ALTER TABLE "public"."tournament_opponent_history" DROP CONSTRAINT IF EXISTS "tournament_opponent_history_opponent_id_fkey";
ALTER TABLE "public"."tournament_opponent_history" ADD CONSTRAINT "tournament_opponent_history_alt_id_fkey" 
  FOREIGN KEY ("alt_id") REFERENCES "public"."alts"("id") ON DELETE CASCADE;
ALTER TABLE "public"."tournament_opponent_history" ADD CONSTRAINT "tournament_opponent_history_opponent_alt_id_fkey" 
  FOREIGN KEY ("opponent_alt_id") REFERENCES "public"."alts"("id") ON DELETE CASCADE;

-- Update FK constraints for columns that stay as-is but now reference alts table
-- (created_by, archived_by, staff_resolved_by, rental_team_photo_verified_by)
ALTER TABLE "public"."teams" DROP CONSTRAINT IF EXISTS "teams_created_by_fkey";
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

ALTER TABLE "public"."tournament_templates" DROP CONSTRAINT IF EXISTS "tournament_templates_created_by_fkey";
ALTER TABLE "public"."tournament_templates" ADD CONSTRAINT "tournament_templates_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

ALTER TABLE "public"."tournaments" DROP CONSTRAINT IF EXISTS "tournaments_archived_by_fkey";
ALTER TABLE "public"."tournaments" ADD CONSTRAINT "tournaments_archived_by_fkey" 
  FOREIGN KEY ("archived_by") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

ALTER TABLE "public"."tournament_events" DROP CONSTRAINT IF EXISTS "tournament_events_created_by_fkey";
ALTER TABLE "public"."tournament_events" ADD CONSTRAINT "tournament_events_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

ALTER TABLE "public"."tournament_registrations" DROP CONSTRAINT IF EXISTS "tournament_registrations_rental_team_photo_verified_by_fkey";
ALTER TABLE "public"."tournament_registrations" ADD CONSTRAINT "tournament_registrations_rental_team_photo_verified_by_fkey" 
  FOREIGN KEY ("rental_team_photo_verified_by") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

ALTER TABLE "public"."tournament_matches" DROP CONSTRAINT IF EXISTS "tournament_matches_staff_resolved_by_fkey";
ALTER TABLE "public"."tournament_matches" ADD CONSTRAINT "tournament_matches_staff_resolved_by_fkey" 
  FOREIGN KEY ("staff_resolved_by") REFERENCES "public"."alts"("id") ON DELETE SET NULL;

-- =============================================================================
-- STEP 7: Update entity_type enum (profile -> alt)
-- =============================================================================

-- PostgreSQL doesn't allow renaming enum values directly, so we need to:
-- 1. Add the new value
-- 2. Update all data (in a separate transaction - handled below)
-- 3. Remove the old value (requires recreating the type)

ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'alt';

-- Note: We cannot use the new enum value 'alt' in the same transaction where it was added.
-- PostgreSQL error: "unsafe use of new value of enum type"
-- 
-- Since this migration is designed for fresh databases where feature_usage and subscriptions
-- tables are empty, we skip the UPDATE statements. If you need to migrate existing data,
-- run the following statements AFTER this migration completes:
--
--   UPDATE "public"."feature_usage" SET "entity_type" = 'alt' WHERE "entity_type"::text = 'profile';
--   UPDATE "public"."subscriptions" SET "entity_type" = 'alt' WHERE "entity_type"::text = 'profile';
--
-- For fresh databases, 'profile' will simply be an unused enum value.

-- =============================================================================
-- STEP 8: Create new helper functions
-- =============================================================================

-- get_current_alt_id() - returns the current user's main alt ID
CREATE OR REPLACE FUNCTION "public"."get_current_alt_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT a.id FROM alts a
  WHERE a.user_id = auth.uid()
$$;

ALTER FUNCTION "public"."get_current_alt_id"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_current_alt_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_alt_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_alt_id"() TO "service_role";

-- is_site_admin() - checks if the current user has a site admin role
CREATE OR REPLACE FUNCTION "public"."is_site_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.scope = 'site'
      AND r.name = 'Site Admin'
  )
$$;

ALTER FUNCTION "public"."is_site_admin"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."is_site_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_site_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_site_admin"() TO "service_role";

-- =============================================================================
-- STEP 9: Create custom_access_token_hook for JWT claims
-- =============================================================================
-- This function is called by Supabase Auth to add custom claims to the JWT.
-- It must be enabled in the Supabase Dashboard under Auth > Hooks.

CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  claims jsonb;
  v_user_id uuid;
  is_admin boolean;
BEGIN
  -- Get the user ID from the event
  v_user_id := (event->>'user_id')::uuid;
  
  -- Check if user is a site admin
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_user_id
      AND r.scope = 'site'
      AND r.name = 'Site Admin'
  ) INTO is_admin;
  
  -- Build the claims object
  claims := event->'claims';
  
  IF is_admin THEN
    claims := jsonb_set(claims, '{is_site_admin}', 'true'::jsonb);
  ELSE
    claims := jsonb_set(claims, '{is_site_admin}', 'false'::jsonb);
  END IF;
  
  -- Return the modified event with new claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

ALTER FUNCTION "public"."custom_access_token_hook"(jsonb) OWNER TO "postgres";

-- Grant execute to supabase_auth_admin (required for the hook)
GRANT EXECUTE ON FUNCTION "public"."custom_access_token_hook"(jsonb) TO "supabase_auth_admin";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";

-- =============================================================================
-- STEP 10: Update handle_new_user function to use alts
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  raw_meta jsonb;
  user_username text;
  user_email text;
  user_name text;
  user_avatar text;
  new_user_id uuid;
  new_alt_id bigint;
  final_username text;
  username_suffix text;
  attempt_count int := 0;
BEGIN
  -- Extract metadata
  raw_meta := NEW.raw_user_meta_data;
  user_email := NEW.email;
  
  -- Get username from metadata (set during signup) or generate from email
  user_username := COALESCE(
    raw_meta->>'username',
    raw_meta->>'preferred_username',
    split_part(user_email, '@', 1)
  );
  
  -- Clean username: lowercase, replace invalid chars
  user_username := lower(regexp_replace(user_username, '[^a-z0-9_-]', '_', 'g'));
  
  -- Ensure minimum length
  IF length(user_username) < 3 THEN
    user_username := user_username || '_user';
  END IF;
  
  -- Get name from metadata or use username
  user_name := COALESCE(
    raw_meta->>'name',
    raw_meta->>'full_name',
    user_username
  );
  
  -- Get avatar from metadata
  user_avatar := COALESCE(
    raw_meta->>'avatar_url',
    raw_meta->>'picture'
  );
  
  -- Ensure username uniqueness by appending random suffix if needed
  final_username := user_username;
  WHILE EXISTS (
    SELECT 1 FROM public.alts WHERE username = final_username
  ) OR EXISTS (
    SELECT 1 FROM public.users WHERE username = final_username
  ) LOOP
    attempt_count := attempt_count + 1;
    IF attempt_count > 10 THEN
      -- Fallback to UUID-based username
      final_username := 'user_' || substr(gen_random_uuid()::text, 1, 8);
      EXIT;
    END IF;
    username_suffix := substr(md5(random()::text), 1, 4);
    final_username := user_username || '_' || username_suffix;
  END LOOP;
  
  -- Create user record
  INSERT INTO public.users (
    id,
    email,
    username,
    name,
    image,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_email,
    final_username,
    user_name,
    user_avatar,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_user_id;
  
  -- Create alt record (main alt for the user)
  INSERT INTO public.alts (
    user_id,
    username,
    display_name,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    final_username,
    user_name,
    user_avatar,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_alt_id;
  
  -- Update user with main_alt_id
  UPDATE public.users
  SET main_alt_id = new_alt_id
  WHERE id = new_user_id;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Duplicate key violation in handle_new_user for user %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- =============================================================================
-- STEP 11: Recreate all RLS policies with updated references
-- =============================================================================

-- alts table (formerly profiles)
CREATE POLICY "Alts are viewable by everyone" ON "public"."alts" FOR SELECT USING (true);
CREATE POLICY "Users can insert own alt" ON "public"."alts" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "Users can update own alt" ON "public"."alts" FOR UPDATE USING (("user_id" = "auth"."uid"()));

-- alt_group_roles table (formerly profile_group_roles)
CREATE POLICY "Alt group roles are viewable by everyone" ON "public"."alt_group_roles" FOR SELECT USING (true);

-- organizations
CREATE POLICY "Authenticated users can create organizations" ON "public"."organizations" 
  FOR INSERT WITH CHECK (("owner_alt_id" = "public"."get_current_alt_id"()));

CREATE POLICY "Org owners can update" ON "public"."organizations" 
  FOR UPDATE USING (("owner_alt_id" IN ( 
    SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
  )));

-- organization_members
CREATE POLICY "Org owners can add members" ON "public"."organization_members" 
  FOR INSERT WITH CHECK ((EXISTS ( 
    SELECT 1 FROM "public"."organizations" "o"
    WHERE (("o"."id" = "organization_members"."organization_id") 
      AND ("o"."owner_alt_id" = "public"."get_current_alt_id"()))
  )));

CREATE POLICY "Org owners can remove members" ON "public"."organization_members" 
  FOR DELETE USING (((EXISTS ( 
    SELECT 1 FROM "public"."organizations" "o"
    WHERE (("o"."id" = "organization_members"."organization_id") 
      AND ("o"."owner_alt_id" = "public"."get_current_alt_id"()))
  )) OR ("alt_id" = "public"."get_current_alt_id"())));

-- organization_invitations
CREATE POLICY "Org invitations viewable by involved parties" ON "public"."organization_invitations" 
  FOR SELECT USING ((("invited_alt_id" IN ( 
    SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
  )) OR ("invited_by_alt_id" IN ( 
    SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
  ))));

-- organization_requests
CREATE POLICY "Org requests viewable by requester or site admin" ON "public"."organization_requests" 
  FOR SELECT USING ((
    ("requested_by_alt_id" IN ( 
      SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
    ))
    OR "public"."is_site_admin"()
  ));

CREATE POLICY "Users can create org requests" ON "public"."organization_requests" 
  FOR INSERT WITH CHECK (("requested_by_alt_id" = "public"."get_current_alt_id"()));

-- Site admins can update org requests (approve/reject)
CREATE POLICY "Site admins can update org requests" ON "public"."organization_requests"
  FOR UPDATE USING ("public"."is_site_admin"());

-- tournaments
CREATE POLICY "Org members can create tournaments" ON "public"."tournaments" 
  FOR INSERT WITH CHECK ((EXISTS ( 
    SELECT 1 FROM "public"."organizations" "o"
    WHERE (("o"."id" = "tournaments"."organization_id") 
      AND (("o"."owner_alt_id" = "public"."get_current_alt_id"()) 
        OR (EXISTS ( 
          SELECT 1 FROM "public"."organization_members" "om"
          WHERE (("om"."organization_id" = "o"."id") 
            AND ("om"."alt_id" = "public"."get_current_alt_id"()))
        ))))
  )));

CREATE POLICY "Org members can update tournaments" ON "public"."tournaments" 
  FOR UPDATE USING ((EXISTS ( 
    SELECT 1 FROM "public"."organizations" "o"
    WHERE (("o"."id" = "tournaments"."organization_id") 
      AND (("o"."owner_alt_id" = "public"."get_current_alt_id"()) 
        OR (EXISTS ( 
          SELECT 1 FROM "public"."organization_members" "om"
          WHERE (("om"."organization_id" = "o"."id") 
            AND ("om"."alt_id" = "public"."get_current_alt_id"()))
        ))))
  )));

-- tournament_registrations
CREATE POLICY "Users can register for tournaments" ON "public"."tournament_registrations" 
  FOR INSERT WITH CHECK (("alt_id" = "public"."get_current_alt_id"()));

CREATE POLICY "Users can update own registration" ON "public"."tournament_registrations" 
  FOR UPDATE USING (("alt_id" = "public"."get_current_alt_id"()));

CREATE POLICY "Users can cancel own registration" ON "public"."tournament_registrations" 
  FOR DELETE USING (("alt_id" = "public"."get_current_alt_id"()));

-- tournament_invitations
CREATE POLICY "Tournament invitations viewable by involved" ON "public"."tournament_invitations" 
  FOR SELECT USING ((("invited_alt_id" IN ( 
    SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
  )) OR ("invited_by_alt_id" IN ( 
    SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
  ))));

-- teams
CREATE POLICY "Public teams are viewable" ON "public"."teams" 
  FOR SELECT USING ((("is_public" = true) OR ("created_by" IN ( 
    SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
  ))));

CREATE POLICY "Users can insert own teams" ON "public"."teams" 
  FOR INSERT WITH CHECK (("created_by" IN ( 
    SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
  )));

CREATE POLICY "Users can update own teams" ON "public"."teams" 
  FOR UPDATE USING (("created_by" IN ( 
    SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
  )));

CREATE POLICY "Users can delete own teams" ON "public"."teams" 
  FOR DELETE USING (("created_by" IN ( 
    SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
  )));

-- team_pokemon
CREATE POLICY "Team owners can manage team pokemon" ON "public"."team_pokemon" 
  FOR INSERT WITH CHECK ((EXISTS ( 
    SELECT 1 FROM "public"."teams" "t"
    WHERE (("t"."id" = "team_pokemon"."team_id") 
      AND ("t"."created_by" = "public"."get_current_alt_id"()))
  )));

CREATE POLICY "Team owners can delete team pokemon" ON "public"."team_pokemon" 
  FOR DELETE USING ((EXISTS ( 
    SELECT 1 FROM "public"."teams" "t"
    WHERE (("t"."id" = "team_pokemon"."team_id") 
      AND ("t"."created_by" = "public"."get_current_alt_id"()))
  )));

-- tournament_templates
CREATE POLICY "Public templates are viewable" ON "public"."tournament_templates" 
  FOR SELECT USING ((("is_public" = true) OR ("created_by" IN ( 
    SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
  ))));

-- feature_usage
-- Note: Using ::text comparison to avoid "unsafe use of new enum value" error
-- since 'alt' was added to the enum in this same migration
CREATE POLICY "Users can view own feature usage" ON "public"."feature_usage" 
  FOR SELECT USING (((("entity_type"::text = 'alt') 
    AND ("entity_id" IN ( 
      SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
    ))) 
    OR (("entity_type"::text = 'organization') 
      AND ("entity_id" IN ( 
        SELECT "o"."id" FROM ("public"."organizations" "o"
        JOIN "public"."alts" "a" ON (("o"."owner_alt_id" = "a"."id")))
        WHERE ("a"."user_id" = "auth"."uid"())
      )))));

-- subscriptions
CREATE POLICY "Users can view own subscriptions" ON "public"."subscriptions" 
  FOR SELECT USING (((("entity_type"::text = 'alt') 
    AND ("entity_id" IN ( 
      SELECT "alts"."id" FROM "public"."alts" WHERE ("alts"."user_id" = "auth"."uid"())
    ))) 
    OR (("entity_type"::text = 'organization') 
      AND ("entity_id" IN ( 
        SELECT "o"."id" FROM ("public"."organizations" "o"
        JOIN "public"."alts" "a" ON (("o"."owner_alt_id" = "a"."id")))
        WHERE ("a"."user_id" = "auth"."uid"())
      )))));

-- =============================================================================
-- STEP 12: Insert Site Admin role
-- =============================================================================

INSERT INTO "public"."roles" ("name", "description", "scope")
VALUES ('Site Admin', 'Full administrative access to the entire platform', 'site');

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- 
-- Post-migration steps (manual):
-- 1. Enable Custom Access Token Hook in Supabase Dashboard:
--    Auth > Hooks > Custom Access Token Hook > Enable
--    Function: custom_access_token_hook
--
-- 2. Grant Site Admin role to admin user via seed.sql or manually
-- =============================================================================
