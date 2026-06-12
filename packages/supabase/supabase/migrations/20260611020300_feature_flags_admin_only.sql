-- RLS audit #6: lock feature_flags SELECT to site admins.
--
-- Previously, `feature_flags` had a SELECT policy `USING (true)` for the
-- `authenticated` role, which leaked the full roadmap (every flag key,
-- description, and allowlist) to any signed-in user. We restrict SELECT to
-- site admins so the roadmap is no longer readable by ordinary users.
--
-- Flag *evaluation* in the web app no longer depends on this policy: the
-- three flag readers (feature-flags adapter, check-flag helpers, and the
-- Vercel flags discovery route) read via the service-role client, which
-- bypasses RLS. Those readers run server-side only (RSC / route handlers,
-- never edge middleware), so this lock does not disable flags for non-admins.
--
-- Idempotent: drops the old permissive policy, then (re)creates the admin lock.

DROP POLICY IF EXISTS "Authenticated users can read feature flags"
  ON public.feature_flags;

DROP POLICY IF EXISTS "Site admins can read feature flags"
  ON public.feature_flags;
CREATE POLICY "Site admins can read feature flags"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (public.is_site_admin());
