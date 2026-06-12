-- ============================================================================
-- Migration: Revoke unused table DML grants (defense-in-depth)
--
-- RLS audit finding / decision #9: several tables carry the default full-DML
-- grants to `anon` / `authenticated` but have NO corresponding write policy.
-- RLS already blocks those writes, so the grants are not a live vulnerability —
-- but they are misleading and provide no second wall. The goal of this
-- migration is to make grants ≈ policies: a role keeps a DML verb on a table
-- ONLY if a policy actually grants that verb. Revoking the unused verbs gives a
-- second, grant-level barrier in addition to RLS.
--
-- REVOKE is naturally idempotent, so no IF EXISTS guards are needed.
--
-- SCOPE / SAFETY NOTES (why each revoke below is safe):
--   * Only INSERT/UPDATE/DELETE are touched. SELECT is intentionally left
--     alone everywhere here — every table below is meant to be readable by at
--     least one of these roles via a SELECT policy.
--   * Each table below is written EXCLUSIVELY by the service-role client
--     (RLS + grants bypassed) or by SECURITY DEFINER trigger functions, so
--     removing client-side write grants cannot break any app flow.
--   * Verbs that ARE backed by a policy (e.g. notifications UPDATE/DELETE for
--     authenticated, which let a user mark-read / dismiss their own rows) are
--     deliberately NOT revoked.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- import_runs
--   Pipeline observability log. SELECT-only policy for site admins. No write
--   policy for any role; rows are written only by the import-tick worker via
--   the service-role client. No anon policy at all.
--   Safe to revoke: INSERT/UPDATE/DELETE from anon and authenticated.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.import_runs FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- import_exclusions
--   Pipeline table mirroring import_runs. SELECT-only policy for site admins.
--   The admin "Delete & exclude" action writes via the service-role client.
--   No write policy for any role; no anon policy at all.
--   Safe to revoke: INSERT/UPDATE/DELETE from anon and authenticated.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.import_exclusions FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- audit_log
--   Immutable audit trail. SELECT-only policy for tournament staff / site
--   admins. A BEFORE UPDATE OR DELETE trigger already hard-blocks mutation, and
--   there is NO INSERT policy — rows are created only by SECURITY DEFINER
--   triggers and the service-role client. No anon policy at all.
--   Safe to revoke: INSERT/UPDATE/DELETE from anon and authenticated.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- notifications
--   Per-user notifications. authenticated has SELECT/UPDATE/DELETE policies
--   (view / mark-read / dismiss own rows) — those stay. There is NO INSERT
--   policy: notifications are created only by SECURITY DEFINER triggers
--   (e.g. notify_judge_call) and the service-role client, to prevent spoofing.
--   anon has no policy of any kind.
--   Safe to revoke:
--     * INSERT from authenticated  (no INSERT policy backs it)
--     * INSERT/UPDATE/DELETE from anon  (no anon policy backs any verb)
--   Left intact: UPDATE/DELETE for authenticated (backed by policies).
-- ----------------------------------------------------------------------------
REVOKE INSERT ON public.notifications FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon;
