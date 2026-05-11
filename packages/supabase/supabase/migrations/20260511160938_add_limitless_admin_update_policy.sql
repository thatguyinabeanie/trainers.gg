-- Allow admins to update limitless.tournaments (queue imports from UI)
-- Idempotent: safe to re-run

-- Grant UPDATE privilege to authenticated role (RLS policy controls who can actually update)
GRANT UPDATE ON limitless.tournaments TO authenticated;

DROP POLICY IF EXISTS "Admins can update tournaments" ON limitless.tournaments;

CREATE POLICY "Admins can update tournaments"
  ON limitless.tournaments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role_id = 1)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role_id = 1)
  );
