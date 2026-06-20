-- =============================================================================
-- T5: Revoke anon SELECT on tournament_registration_staff
-- =============================================================================
-- RATIONALE
-- ----------
-- tournament_registration_staff was created in
-- 20260616100100_split_registration_staff_columns.sql. It carries staff-only
-- drop metadata and rental-photo state that players must never read about
-- themselves (drop_notes, dropped_by, rental_team_photo_key, etc.).
--
-- The baseline ALTER DEFAULT PRIVILEGES in earlier migrations granted ALL to
-- anon and authenticated on all new public tables. RLS policies on this table
-- are staff-only (no player or anon path), so anon access is fully blocked at
-- the policy layer — but the table-level SELECT grant for anon is still
-- present. Defense-in-depth requires removing it, mirroring what
-- 20260613173105_phase2_revoke_anon_s_bucket_select.sql did for the 19
-- S-bucket tables.
--
-- ACCESS AUDIT (authenticated path)
-- ----------------------------------
-- Direct authenticated reads of tournament_registration_staff DO exist:
--
--   packages/supabase/src/queries/tournaments.ts:502
--     .from("tournament_registrations")
--     .select("..., staff:tournament_registration_staff(
--       drop_category, drop_notes, dropped_by, dropped_at
--     )")
--
-- This is a PostgREST embed (join) on the authenticated browser client inside
-- getTournamentRegistrations(). The query starts from tournament_registrations
-- and joins to tournament_registration_staff for the staff manage view.
-- RLS policies on tournament_registration_staff gate access to callers with
-- tournament.manage permission — non-staff callers receive an absent sub-object.
--
-- Because authenticated callers legitimately embed tournament_registration_staff
-- via the Supabase JS client (with RLS as the access wall), the authenticated
-- SELECT grant must be preserved.
--
-- DECISION: revoke anon only, keep authenticated.
-- IDEMPOTENCY: REVOKE on an absent grant is a no-op — no IF EXISTS needed.
-- =============================================================================

-- Revoke anon SELECT — staff-internal table; no anon read path exists or
-- should ever exist. Authenticated SELECT is preserved (RLS guards the rows).
REVOKE SELECT ON public.tournament_registration_staff FROM anon;

COMMENT ON TABLE public.tournament_registration_staff IS
  'Staff-internal columns split from tournament_registrations (P1b security '
  'hardening). Players must never SELECT from this table — staff-only RLS. '
  'Stores drop metadata (drop_notes, dropped_by, etc.) and rental team photo '
  'state. Joined to the base table by registration_id (1-to-1, CASCADE). '
  'anon SELECT revoked T5 (2026-06-18); authenticated kept (RLS-scoped, '
  'staff-only policies); accessed via authenticated PostgREST embed in '
  'getTournamentRegistrations().';
