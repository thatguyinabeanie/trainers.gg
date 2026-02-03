-- Add tournament_matches to realtime publication so that updates
-- (e.g. staff_requested, status changes) are broadcast to all
-- connected clients on the match page.
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
