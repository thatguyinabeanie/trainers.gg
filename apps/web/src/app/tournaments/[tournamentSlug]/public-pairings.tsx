"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  getTournamentPhases,
  getPhaseRoundsWithMatches,
} from "@trainers/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Loader2, Trophy } from "lucide-react";
import { BracketVisualization } from "@/components/tournament/bracket-visualization";
import type { TournamentPhase } from "@/lib/types/tournament";

interface PublicPairingsProps {
  tournamentId: number;
  tournamentSlug: string;
}

export function PublicPairings({
  tournamentId,
  tournamentSlug,
}: PublicPairingsProps) {
  const router = useRouter();
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);

  // Fetch phases
  const phasesQueryFn = (supabase: Parameters<typeof getTournamentPhases>[0]) =>
    getTournamentPhases(supabase, tournamentId);

  const { data: phases, isLoading: phasesLoading } = useSupabaseQuery(
    phasesQueryFn,
    [tournamentId, "public-phases"]
  );

  // Auto-select the first phase when phases load
  useEffect(() => {
    if (!selectedPhaseId && phases && phases.length > 0 && phases[0]) {
      setSelectedPhaseId(phases[0].id);
    }
  }, [phases, selectedPhaseId]);

  // Fetch rounds + matches for selected phase
  const bracketQueryFn = (
    supabase: Parameters<typeof getPhaseRoundsWithMatches>[0]
  ) =>
    selectedPhaseId
      ? getPhaseRoundsWithMatches(supabase, selectedPhaseId, tournamentId)
      : Promise.resolve([]);

  const { data: bracketRounds, isLoading: bracketLoading } = useSupabaseQuery(
    bracketQueryFn,
    [selectedPhaseId, "public-bracket-rounds"]
  );

  // Navigate to match detail page on click
  const handleMatchClick = (matchId: string) => {
    router.push(`/tournaments/${tournamentSlug}/matches/${matchId}`);
  };

  // Loading state
  if (phasesLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // No phases yet
  if (!phases || phases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Trophy className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
        <h3 className="mb-2 text-lg font-semibold">No pairings yet</h3>
        <p className="text-muted-foreground text-sm">
          Pairings will appear once the tournament begins.
        </p>
      </div>
    );
  }

  const currentPhase = phases.find((p) => p.id === selectedPhaseId);

  // Transform data for BracketVisualization
  const bracketPhases: TournamentPhase[] =
    currentPhase && bracketRounds
      ? [
          {
            id: String(currentPhase.id),
            name: currentPhase.name ?? `Phase ${currentPhase.phase_order}`,
            format: currentPhase.phase_type ?? "swiss",
            status: currentPhase.status ?? "pending",
            rounds: bracketRounds.map((round) => ({
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
                const p1Stats = (
                  match as {
                    player1Stats?: { wins: number; losses: number } | null;
                  }
                ).player1Stats;
                const p2Stats = (
                  match as {
                    player2Stats?: { wins: number; losses: number } | null;
                  }
                ).player2Stats;
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
                        record: p1Stats ?? undefined,
                      }
                    : null,
                  participant2: p2
                    ? {
                        id: String(p2.id),
                        name: p2.display_name ?? p2.username ?? "Player 2",
                        record: p2Stats ?? undefined,
                      }
                    : null,
                };
              }),
            })),
          },
        ]
      : [];

  return (
    <div className="space-y-4">
      {/* Phase selector (only if multiple phases) */}
      {phases.length > 1 && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedPhaseId?.toString() ?? ""}
            onValueChange={(value) => {
              if (value) {
                setSelectedPhaseId(parseInt(value));
              }
            }}
          >
            <SelectTrigger className="w-48">
              {currentPhase
                ? (currentPhase.name ?? `Phase ${currentPhase.phase_order}`)
                : "Select phase"}
            </SelectTrigger>
            <SelectContent>
              {phases.map((phase) => (
                <SelectItem key={phase.id} value={phase.id.toString()}>
                  {phase.name ?? `Phase ${phase.phase_order}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bracket loading */}
      {bracketLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : bracketRounds && bracketRounds.length > 0 ? (
        <BracketVisualization
          phases={bracketPhases}
          onMatchClick={handleMatchClick}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Trophy className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
          <h3 className="mb-2 text-lg font-semibold">No pairings yet</h3>
          <p className="text-muted-foreground text-sm">
            Pairings will appear once rounds are generated.
          </p>
        </div>
      )}
    </div>
  );
}
