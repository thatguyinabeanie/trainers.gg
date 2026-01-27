-- =============================================================================
-- Cleanup tournament_phases table
-- =============================================================================
-- Remove unused columns and add clear, purposeful columns for phase configuration.
-- - Add cut_rule for elimination phases (x-1, x-2, x-3, top-4, top-8, top-16, top-32)
-- - Add check_in_time_minutes for no-show handling (default 5 min per game loss)
-- - Replace match_format text with best_of integer (1, 3, or 5)
-- - Drop unused columns: advancement_type, advancement_count, bracket_size,
--   total_rounds, bracket_format, seeding_method

-- Add new columns
ALTER TABLE tournament_phases
ADD COLUMN IF NOT EXISTS cut_rule text,
ADD COLUMN IF NOT EXISTS check_in_time_minutes integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS best_of integer DEFAULT 3;

-- Migrate existing match_format data to best_of
UPDATE tournament_phases SET best_of = 1 WHERE match_format ILIKE '%1%';
UPDATE tournament_phases SET best_of = 3 WHERE match_format ILIKE '%3%' OR match_format IS NULL;
UPDATE tournament_phases SET best_of = 5 WHERE match_format ILIKE '%5%';

-- Add comments for documentation
COMMENT ON COLUMN tournament_phases.cut_rule IS 'Qualification rule for elimination phases preceded by Swiss: x-1, x-2, x-3, top-4, top-8, top-16, top-32. NULL for standalone phases.';
COMMENT ON COLUMN tournament_phases.check_in_time_minutes IS 'Time in minutes before a no-show receives a game loss. Default 5. NULL or 0 disables auto-loss.';
COMMENT ON COLUMN tournament_phases.best_of IS 'Number of games in a match: 1, 3, or 5. Default 3.';

-- Drop unused columns
ALTER TABLE tournament_phases
DROP COLUMN IF EXISTS match_format,
DROP COLUMN IF EXISTS advancement_type,
DROP COLUMN IF EXISTS advancement_count,
DROP COLUMN IF EXISTS bracket_size,
DROP COLUMN IF EXISTS total_rounds,
DROP COLUMN IF EXISTS bracket_format,
DROP COLUMN IF EXISTS seeding_method;
