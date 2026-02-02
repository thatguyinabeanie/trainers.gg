-- Enforce that checked-in registrations must have a team submitted.
-- This prevents check-in when team_id is NULL, closing a bug where
-- the UI could allow check-in based on stale local state.

-- First, fix any existing checked-in registrations that have no team.
-- Revert them to 'registered' status so they don't violate the constraint.
UPDATE tournament_registrations
SET status = 'registered', checked_in_at = NULL
WHERE status = 'checked_in' AND team_id IS NULL;

-- Now add the constraint safely.
ALTER TABLE tournament_registrations
ADD CONSTRAINT require_team_when_checked_in
CHECK (status != 'checked_in' OR team_id IS NOT NULL);
