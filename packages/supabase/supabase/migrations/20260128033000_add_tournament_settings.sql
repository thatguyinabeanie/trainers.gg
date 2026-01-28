-- =============================================================================
-- Add tournament game and registration settings
-- =============================================================================
-- Adds columns for:
-- - Game settings (game, game_format, platform, battle_format)
-- - Registration settings (registration_type, check_in_required, allow_late_registration)

-- Game settings columns
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS game text,
ADD COLUMN IF NOT EXISTS game_format text,
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'cartridge',
ADD COLUMN IF NOT EXISTS battle_format text DEFAULT 'doubles';

-- Registration settings columns
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS registration_type text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS check_in_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_late_registration boolean DEFAULT false;

-- Column comments for documentation
COMMENT ON COLUMN tournaments.game IS 'Pokemon game ID (e.g., sv, swsh, bdsp)';
COMMENT ON COLUMN tournaments.game_format IS 'Game format/regulation (e.g., reg-i, series-13)';
COMMENT ON COLUMN tournaments.platform IS 'Battle platform: cartridge or showdown';
COMMENT ON COLUMN tournaments.battle_format IS 'Battle format: singles or doubles';
COMMENT ON COLUMN tournaments.registration_type IS 'Registration type: open or invite_only';
COMMENT ON COLUMN tournaments.check_in_required IS 'Whether players must check in before tournament start';
COMMENT ON COLUMN tournaments.allow_late_registration IS 'Allow player registration after tournament has started';
