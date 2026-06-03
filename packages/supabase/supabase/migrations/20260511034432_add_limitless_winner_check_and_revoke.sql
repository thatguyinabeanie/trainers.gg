-- Adds a CHECK constraint ensuring winner_id references one of the match
-- participants, and makes the tournament_stats GRANT idempotent via REVOKE.

-- 1. winner_id must be one of the two players (or NULL for tie/bye/unfinished)
DO $$ BEGIN
  ALTER TABLE limitless.match_results
    ADD CONSTRAINT chk_winner_is_participant
    CHECK (winner_id IS NULL OR winner_id = player1_id OR winner_id = player2_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Make tournament_stats() GRANT idempotent — REVOKE first so re-running is safe
REVOKE ALL ON FUNCTION limitless.tournament_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION limitless.tournament_stats() TO service_role;
