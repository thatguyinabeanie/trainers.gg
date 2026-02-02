-- Backfill teams for checked-in registrations that are missing team_id.
-- This can happen on preview branches where seed data was created before
-- the team requirement was enforced.
--
-- Creates a minimal team per registration and assigns it, preserving
-- the checked-in status.
DO $$
DECLARE
  reg RECORD;
  new_team_id bigint;
BEGIN
  FOR reg IN
    SELECT tr.id, tr.alt_id
    FROM tournament_registrations tr
    WHERE tr.status = 'checked_in' AND tr.team_id IS NULL
  LOOP
    INSERT INTO teams (name, created_by, is_public)
    VALUES ('backfill-team-' || reg.id, reg.alt_id, false)
    RETURNING id INTO new_team_id;

    UPDATE tournament_registrations
    SET team_id = new_team_id,
        team_submitted_at = COALESCE(checked_in_at, NOW()),
        team_locked = true
    WHERE id = reg.id;
  END LOOP;
END $$;
