import { Factory } from "fishery";
import type { Tables } from "@trainers/supabase/types";

export const tournamentMatchFactory = Factory.define<
  Tables<"tournament_matches">
>(({ sequence }) => ({
  id: sequence,
  round_id: 1,
  alt1_id: null,
  alt2_id: null,
  created_at: new Date().toISOString(),
  end_time: null,
  game_wins1: 0,
  game_wins2: 0,
  is_bye: false,
  match_confirmed_at: null,
  match_points1: null,
  match_points2: null,
  player1_match_confirmed: false,
  player2_match_confirmed: false,
  staff_notes: null,
  staff_requested: false,
  staff_requested_at: null,
  staff_resolved_by: null,
  start_time: null,
  status: "pending",
  table_number: sequence,
  winner_alt_id: null,
}));

export const matchGameFactory = Factory.define<Tables<"match_games">>(
  ({ sequence }) => ({
    id: sequence,
    match_id: 1,
    game_number: sequence,
    alt1_selection: null,
    alt1_submitted_at: null,
    alt2_selection: null,
    alt2_submitted_at: null,
    created_at: new Date().toISOString(),
    resolution_notes: null,
    resolved_at: null,
    resolved_by: null,
    status: "pending",
    updated_at: new Date().toISOString(),
    winner_alt_id: null,
  })
);
