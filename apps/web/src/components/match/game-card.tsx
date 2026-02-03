// ============================================================================
// Game data types — shared by match-header.tsx and match-page-client.tsx
// ============================================================================

export interface GameData {
  id: number;
  game_number: number;
  status: string;
  winner_alt_id: number | null;
  // Player view (from get_match_games_for_player RPC)
  my_selection?: number | null;
  opponent_submitted?: boolean;
  // Staff view (raw) — also revealed after agreed/disputed/resolved
  alt1_selection?: number | null;
  alt2_selection?: number | null;
  resolved_by?: number | null;
}
