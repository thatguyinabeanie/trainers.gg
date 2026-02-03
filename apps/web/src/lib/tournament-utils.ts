import type { TournamentPhase } from "@/lib/types/tournament";
import type { getPhaseRoundsWithMatches } from "@trainers/supabase";

// Row shape from tournament_phases table
type PhaseRow = {
  id: number;
  name: string | null;
  phase_order: number;
  phase_type: string | null;
  status: string | null;
};

// Single round from getPhaseRoundsWithMatches result
type RoundWithMatches = Awaited<
  ReturnType<typeof getPhaseRoundsWithMatches>
>[number];

/**
 * Transform raw phase + rounds data from Supabase into the
 * TournamentPhase shape used by BracketVisualization.
 */
export function transformPhaseData(
  phase: PhaseRow,
  rounds: RoundWithMatches[]
): TournamentPhase {
  return {
    id: String(phase.id),
    name: phase.name ?? `Phase ${phase.phase_order}`,
    format: phase.phase_type ?? "swiss",
    status: phase.status ?? "pending",
    rounds: rounds.map((round) => ({
      id: String(round.id),
      roundNumber: round.round_number,
      name: `Round ${round.round_number}`,
      status: round.status ?? "pending",
      matches: round.matches.map((match) => {
        const p1 = match.player1 as {
          id: number;
          display_name?: string;
          username?: string;
        } | null;
        const p2 = match.player2 as {
          id: number;
          display_name?: string;
          username?: string;
        } | null;
        return {
          id: String(match.id),
          matchNumber: match.table_number ?? 0,
          status: match.status ?? "pending",
          gameWins1: match.game_wins1 ?? 0,
          gameWins2: match.game_wins2 ?? 0,
          winnerProfileId: match.winner_alt_id
            ? String(match.winner_alt_id)
            : null,
          isBye: !match.alt2_id,
          participant1: p1
            ? {
                id: String(p1.id),
                name: p1.display_name ?? p1.username ?? "Player 1",
                record: match.player1Stats ?? undefined,
              }
            : null,
          participant2: p2
            ? {
                id: String(p2.id),
                name: p2.display_name ?? p2.username ?? "Player 2",
                record: match.player2Stats ?? undefined,
              }
            : null,
        };
      }),
    })),
  };
}
