import { Factory } from "fishery";
import type { Tables } from "@trainers/supabase/types";

/**
 * Public standings row shape — matches the explicit-column select in
 * `getPublicTournamentStandings` (tournament_standings joined with
 * alts.id, alts.username, alts.avatar_url).
 *
 * Use this factory whenever tests need a standings fixture to avoid
 * brittle inline object literals.
 */
export type PublicStandingRow = Tables<"tournament_standings"> & {
  alt: {
    id: number;
    username: string;
    avatar_url: string | null;
  };
};

export const publicStandingFactory = Factory.define<PublicStandingRow>(
  ({ sequence }) => ({
    id: sequence,
    tournament_id: 1,
    alt_id: sequence,
    rank: sequence,
    round_number: 1,
    match_points: null,
    match_win_percentage: null,
    game_wins: null,
    game_losses: null,
    game_win_percentage: null,
    opponent_match_win_percentage: null,
    opponent_game_win_percentage: null,
    created_at: new Date().toISOString(),
    alt: {
      id: sequence,
      username: `player_${sequence}`,
      avatar_url: null,
    },
  })
);
