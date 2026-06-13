-- Audit finding #4: Add tournament_invitations to realtime publication
-- The app subscribes to tournament_invitations realtime changes, but the table
-- was not in the supabase_realtime publication, so events never delivered.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'tournament_invitations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_invitations;
  END IF;
END $$;
