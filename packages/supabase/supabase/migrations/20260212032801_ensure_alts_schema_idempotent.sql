-- =============================================================================
-- Migration: Ensure alts schema is idempotent
-- =============================================================================
-- This migration ensures the alts schema is in the correct state, even if
-- run multiple times. This fixes issues with Supabase preview branches that
-- try to re-apply migrations.
--
-- If the profiles table still exists and alts doesn't, rename it.
-- If alts already exists, do nothing (migration already applied).
-- =============================================================================

DO $$
BEGIN
  -- Only rename if profiles exists and alts doesn't
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles')
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alts') THEN

    -- Rename the table
    ALTER TABLE "public"."profiles" RENAME TO "alts";

    -- Rename the sequence
    ALTER SEQUENCE IF EXISTS "public"."profiles_id_seq" RENAME TO "alts_id_seq";

    -- Rename indexes
    ALTER INDEX IF EXISTS "profiles_pkey" RENAME TO "alts_pkey";
    ALTER INDEX IF EXISTS "profiles_username_key" RENAME TO "alts_username_key";
    ALTER INDEX IF EXISTS "idx_profiles_tier" RENAME TO "idx_alts_tier";
    ALTER INDEX IF EXISTS "idx_profiles_tier_expiry" RENAME TO "idx_alts_tier_expiry";
    ALTER INDEX IF EXISTS "idx_profiles_user" RENAME TO "idx_alts_user";
    ALTER INDEX IF EXISTS "idx_profiles_username" RENAME TO "idx_alts_username";

    RAISE NOTICE 'Renamed profiles to alts';
  ELSE
    RAISE NOTICE 'Alts table already exists or profiles table not found - skipping rename';
  END IF;
END $$;
