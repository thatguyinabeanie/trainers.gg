-- =============================================================================
-- Fix #4: Revoke anon write grants on tournament_registration_staff
-- =============================================================================
-- RATIONALE
-- ----------
-- tournament_registration_staff holds staff-only PII: drop_notes, dropped_by,
-- rental_team_photo_key, etc. Migration 20260618000400 revoked anon SELECT as
-- defense-in-depth. However, the baseline ALTER DEFAULT PRIVILEGES granted
-- ALL (including INSERT, UPDATE, DELETE) to anon on every new public table, so
-- anon still holds write grants on this table.
--
-- The 19 S-bucket tables had their write grants stripped in
-- 20260611020500_revoke_unused_table_grants.sql. tournament_registration_staff
-- was created later (20260616100100) so it missed that sweep.
--
-- GRANTS ≈ POLICIES (defense-in-depth rationale)
-- ------------------------------------------------
-- RLS is the primary access barrier — no anon INSERT/UPDATE/DELETE policy
-- exists on tournament_registration_staff, so anon can never successfully
-- write a row. But the table-level grant is a second, grant-level wall: if a
-- future migration accidentally creates a permissive write policy for anon,
-- the absent grant prevents exploitation through the PostgREST/anon API path.
-- Two walls are better than one.
--
-- AUTHENTICATED ACCESS PRESERVED
-- --------------------------------
-- The RLS policies on tournament_registration_staff target `authenticated`:
--   "Staff insert/update/delete registration staff data" (all TO authenticated)
-- These policies gate writes to callers with tournament.manage permission.
-- The authenticated INSERT/UPDATE/DELETE table grants must remain — revoking
-- them would break the staff drop flow and rental-photo upload. Only anon is
-- targeted here.
--
-- The `public` pseudo-role (all roles) does not hold explicit write grants on
-- this table (no GRANT ... TO public statement was ever issued for it), but
-- REVOKE is idempotent — revoking an absent grant is a no-op.
--
-- IDEMPOTENCY: REVOKE on an absent grant is a no-op — no IF EXISTS needed.
-- =============================================================================

-- Remove anon write access — staff-internal table; no anon write path exists
-- or should ever exist. The `public` revoke is a belt-and-suspenders guard
-- matching the pattern used in 20260611020500 (revoke_unused_table_grants).
REVOKE INSERT, UPDATE, DELETE ON public.tournament_registration_staff FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.tournament_registration_staff FROM PUBLIC;

COMMENT ON TABLE public.tournament_registration_staff IS
  'Staff-internal columns split from tournament_registrations (P1b security '
  'hardening). Players must never SELECT from this table — staff-only RLS. '
  'Stores drop metadata (drop_notes, dropped_by, etc.) and rental team photo '
  'state. Joined to the base table by registration_id (1-to-1, CASCADE). '
  'anon SELECT revoked T5 (2026-06-18); authenticated kept (RLS-scoped, '
  'staff-only policies); accessed via authenticated PostgREST embed in '
  'getTournamentRegistrations(). anon INSERT/UPDATE/DELETE revoked Fix #4 '
  '(2026-06-18) — defense-in-depth, mirrors S-bucket write-grant sweep.';
