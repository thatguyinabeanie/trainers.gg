-- =============================================================================
-- RLS policy: allow invitees to update (accept/decline) their own invitations
-- =============================================================================
-- Uses DO + EXECUTE to keep this as a single prepared statement for db push
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Invitees can update own invitations" ON public.tournament_invitations';
  EXECUTE '
    CREATE POLICY "Invitees can update own invitations" ON public.tournament_invitations
      FOR UPDATE TO public
      USING (
        invited_alt_id IN (
          SELECT alts.id FROM public.alts
          WHERE alts.user_id = (SELECT auth.uid())
        )
      )
      WITH CHECK (
        invited_alt_id IN (
          SELECT alts.id FROM public.alts
          WHERE alts.user_id = (SELECT auth.uid())
        )
      )';
END $$;
