-- Add tournament_registrations and tournament_rounds to realtime publication
-- so that registration status changes, check-ins, and round status updates
-- are broadcast to all connected clients on the tournament organizer dashboard.
--
-- Without this migration, subscriptions to postgres_changes on these tables
-- will connect successfully but never receive events, causing the real-time
-- dashboard features to silently fail.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_registrations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_rounds;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
