"use client";

import { useRouter } from "next/navigation";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  getTournamentPhases,
  getPhaseRoundsWithMatches,
} from "@trainers/supabase";
import { Loader2, Trophy } from "lucide-react";
import { BracketVisualization } from "@/components/tournament/bracket-visualization";
import { transformPhaseData } from "@/lib/tournament-utils";

interface PublicPairingsProps {
  tournamentId: number;
  tournamentSlug: string;
}

export function PublicPairings({
  tournamentId,
  tournamentSlug,
}: PublicPairingsProps) {
  const router = useRouter();

  // Fetch phases
  const phasesQueryFn = (supabase: Parameters<typeof getTournamentPhases>[0]) =>
    getTournamentPhases(supabase, tournamentId);

  const { data: phases, isLoading: phasesLoading } = useSupabaseQuery(
    phasesQueryFn,
    [tournamentId, "public-phases"]
  );

  // Fetch rounds + matches for ALL phases at once
  const allRoundsQueryFn = (
    supabase: Parameters<typeof getPhaseRoundsWithMatches>[0]
  ) =>
    phases && phases.length > 0
      ? Promise.all(
          phases.map((phase) =>
            getPhaseRoundsWithMatches(supabase, phase.id, tournamentId)
          )
        )
      : Promise.resolve(
          [] as Awaited<ReturnType<typeof getPhaseRoundsWithMatches>>[]
        );

  const { data: allPhaseRounds, isLoading: roundsLoading } = useSupabaseQuery(
    allRoundsQueryFn,
    [phases?.map((p) => p.id).join(",") ?? "", "public-all-rounds"]
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

  // Still loading rounds
  if (roundsLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Transform all phases with their rounds for BracketVisualization
  const bracketPhases =
    allPhaseRounds && allPhaseRounds.length > 0
      ? phases.map((phase, index) =>
          transformPhaseData(phase, allPhaseRounds[index] ?? [])
        )
      : [];

  // Check if any phase has rounds with matches
  const hasAnyRounds = bracketPhases.some((p) => p.rounds.length > 0);

  if (!hasAnyRounds) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Trophy className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
        <h3 className="mb-2 text-lg font-semibold">No pairings yet</h3>
        <p className="text-muted-foreground text-sm">
          Pairings will appear once rounds are generated.
        </p>
      </div>
    );
  }

  return (
    <BracketVisualization
      phases={bracketPhases}
      onMatchClick={handleMatchClick}
    />
  );
}
