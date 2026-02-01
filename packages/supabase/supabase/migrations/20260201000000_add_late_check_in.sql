-- Add late check-in support to tournaments.
-- When set, registered players can late-check-in before round N+1 pairings.
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS late_check_in_max_round integer DEFAULT NULL;

COMMENT ON COLUMN public.tournaments.late_check_in_max_round IS
  'Maximum round number that allows late check-in. NULL = no late check-in. E.g., 2 means players can late-check-in before round 3 starts.';
