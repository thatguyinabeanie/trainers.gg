/**
 * Tournament system constants
 */

// Check-in configuration
export const DEFAULT_CHECK_IN_WINDOW_MINUTES = 60;

// Match scoring
export const MATCH_WIN_POINTS = 3;
export const MATCH_LOSS_POINTS = 0;
export const MATCH_TIE_POINTS = 1; // For future use if ties are allowed

// Best-of formats
export const BEST_OF_3_WINS_REQUIRED = 2;
export const BEST_OF_5_WINS_REQUIRED = 3;

// Bye match defaults (auto-win for player without opponent)
export const BYE_GAME_WINS = 2;
export const BYE_GAME_LOSSES = 0;
