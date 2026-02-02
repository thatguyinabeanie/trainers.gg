-- Fix overly permissive SELECT policy on beta_invites.
-- The original policy allowed any authenticated user to read all rows
-- including invite tokens. Split into:
--   1. Anon-only SELECT (for unauthenticated token validation)
--   2. Admin-only SELECT (for the admin dashboard)

DROP POLICY "Anyone can validate invite tokens" ON public.beta_invites;

-- Anon users can validate tokens (needed for unauthenticated invite page)
CREATE POLICY "Anon can validate invite tokens"
  ON public.beta_invites
  FOR SELECT
  TO anon
  USING (true);

-- Only admins can read all invites (for admin dashboard)
CREATE POLICY "Admins can read invites"
  ON public.beta_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = 'site_admin'
    )
  );
