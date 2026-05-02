-- =============================================================================
-- Fix pokemon INSERT RLS policy
-- =============================================================================
-- The "Authenticated users can create pokemon" policy (added in
-- 20260128000000_fix_performance_advisors.sql) uses:
--
--   WITH CHECK ((SELECT auth.uid()) IS NOT NULL)
--
-- This causes "new row violates row-level security policy" for authenticated
-- users during the team submission flow. The teams INSERT (which also uses
-- auth.uid() in a subquery) succeeds with the same Supabase client, pointing
-- to an edge case in how auth.uid() is resolved inside a standalone WITH CHECK
-- expression on a batch INSERT.
--
-- Fix: gate on the `authenticated` role instead. Supabase sets the role to
-- `authenticated` whenever a valid JWT is present in the Authorization header,
-- so `TO authenticated` is the canonical way to require a logged-in caller.
-- `WITH CHECK (true)` is correct here — the role restriction is the guard.

DROP POLICY IF EXISTS "Authenticated users can create pokemon" ON public.pokemon;
CREATE POLICY "Authenticated users can create pokemon" ON public.pokemon
  FOR INSERT TO authenticated
  WITH CHECK (true);
