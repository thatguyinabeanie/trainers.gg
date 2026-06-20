-- =============================================================================
-- Convert public_user_profiles and public_tournament_registrations views
-- from SECURITY DEFINER to SECURITY INVOKER
-- =============================================================================
-- Both views were originally created with security_invoker = false as columnar
-- firewalls: they bypass the caller's row-level RLS on the base tables while
-- projecting only safe, non-sensitive columns to anon/authenticated readers.
--
-- The Supabase linter flags security_invoker = false (SECURITY DEFINER) views
-- as Critical. The cleaner equivalent is:
--   1. Column-level SELECT grants on the base table for the anon role
--   2. An anon RLS policy on the base table (USING true = all rows visible)
--   3. View changed to security_invoker = true
--
-- Net security posture is identical: anon still only sees the explicitly
-- granted columns. Private columns (email, rental_team_photo_url, drop_notes,
-- etc.) are never accessible because the column-level grant does not include
-- them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. public.public_user_profiles  →  SECURITY INVOKER
-- -----------------------------------------------------------------------------
-- Phase 2 kept anon table-level SELECT on public.users (explicitly excluded
-- from the 19-table revoke) but no anon RLS policy exists, so anon currently
-- gets 0 rows via PostgREST. The SECURITY DEFINER view was the only anon path.
--
-- Fix: revoke table-level anon SELECT, add column-level grant for safe cols,
-- add an anon RLS policy, and recreate the view as SECURITY INVOKER.

-- Revoke the broad table-level anon SELECT (defense-in-depth: anon should
-- only access the explicitly granted columns, not the full row).
REVOKE SELECT ON public.users FROM anon;

-- Grant SELECT on only the safe, public-facing columns to anon.
-- Private columns (email, phone_number, birth_date, first_name, last_name,
-- external_accounts, public_metadata, etc.) are intentionally excluded.
GRANT SELECT (
  id,
  username,
  bio,
  country,
  image,
  did,
  pds_handle,
  main_alt_id,
  created_at,
  name,
  is_coach
) ON public.users TO anon;

-- Add an anon RLS policy so the column-level grant is usable via PostgREST.
-- Anon may see all user profile rows — this is the existing effective behaviour
-- (the SECURITY DEFINER view returned all rows; this policy matches that).
DROP POLICY IF EXISTS "anon read public user profiles" ON public.users;
CREATE POLICY "anon read public user profiles"
  ON public.users FOR SELECT
  TO anon
  USING (true);

-- Recreate the view as SECURITY INVOKER.  Column shape is unchanged.
CREATE OR REPLACE VIEW public.public_user_profiles
  WITH (security_invoker = true) AS
SELECT
  id,
  username,
  bio,
  country,
  image,
  did,
  pds_handle,
  main_alt_id,
  created_at,
  name,
  is_coach
FROM public.users;

GRANT SELECT ON public.public_user_profiles TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. public.public_tournament_registrations  →  SECURITY INVOKER
-- -----------------------------------------------------------------------------
-- Phase 2 DID revoke anon SELECT on public.tournament_registrations; the
-- SECURITY DEFINER view was the only anon path for tournament roster display.
--
-- Fix: add column-level grant for safe cols, add an anon RLS policy, and
-- recreate the view as SECURITY INVOKER.

-- Grant SELECT on only the safe, public-facing columns to anon.
-- Staff-internal columns (drop_notes, dropped_by, rental_team_photo_url, etc.)
-- are intentionally excluded.
GRANT SELECT (
  id,
  tournament_id,
  alt_id,
  status,
  registered_at,
  checked_in_at,
  team_name,
  team_submitted_at,
  display_name_option,
  show_country_flag,
  in_game_name,
  team_id
) ON public.tournament_registrations TO anon;

-- Add an anon RLS policy so the column-level grant is usable via PostgREST.
DROP POLICY IF EXISTS "anon read public tournament registrations" ON public.tournament_registrations;
CREATE POLICY "anon read public tournament registrations"
  ON public.tournament_registrations FOR SELECT
  TO anon
  USING (true);

-- Recreate the view as SECURITY INVOKER.  Column shape is unchanged.
CREATE OR REPLACE VIEW public.public_tournament_registrations
  WITH (security_invoker = true) AS
SELECT
  id,
  tournament_id,
  alt_id,
  status,
  registered_at,
  checked_in_at,
  team_name,
  team_submitted_at,
  display_name_option,
  show_country_flag,
  in_game_name,
  team_id
FROM public.tournament_registrations;

GRANT SELECT ON public.public_tournament_registrations TO anon, authenticated;
