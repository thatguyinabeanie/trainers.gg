-- Enforce that checked-in registrations must have a team submitted.
-- This prevents check-in when team_id is NULL, closing a bug where
-- the UI could allow check-in based on stale local state.
ALTER TABLE tournament_registrations
ADD CONSTRAINT require_team_when_checked_in
CHECK (status != 'checked_in' OR team_id IS NOT NULL);
