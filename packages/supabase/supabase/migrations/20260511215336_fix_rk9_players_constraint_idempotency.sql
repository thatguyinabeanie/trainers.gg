-- Ensure rk9.players dedup constraint is created idempotently.
-- The original migration (20260511185215) added the constraint
-- without a preceding DROP CONSTRAINT IF EXISTS. While it works
-- on a fresh DB replay, preview branches that re-apply only new
-- migrations need this guard to avoid errors.
--
-- Per project convention: always DROP CONSTRAINT IF EXISTS before
-- ADD CONSTRAINT for idempotency.

ALTER TABLE rk9.players
  DROP CONSTRAINT IF EXISTS players_dedup_key;

ALTER TABLE rk9.players
  ADD CONSTRAINT players_dedup_key
    UNIQUE (player_id_masked, first_name, last_name, country);
