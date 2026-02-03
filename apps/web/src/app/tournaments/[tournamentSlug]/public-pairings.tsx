"use client";

import { useRouter } from "next/navigation";
import { useSupabaseQuery } from "@/lib/supabase";
import {
  getTournamentPhases,
  getPhaseRoundsWithMatches,
  getPhaseRoundsWithStats,
  getUnpairedCheckedInPlayers,
} from "@trainers/supabase";
import { Loader2, Trophy, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  // Fetch rounds with stats for the first phase to find the latest round
  const firstPhaseId = phases?.[0]?.id ?? null;
  const roundsStatsQueryFn = (
    supabase: Parameters<typeof getPhaseRoundsWithStats>[0]
  ) =>
    firstPhaseId
      ? getPhaseRoundsWithStats(supabase, firstPhaseId)
      : Promise.resolve([]);

  const { data: roundsWithStats } = useSupabaseQuery(roundsStatsQueryFn, [
    firstPhaseId,
    "public-rounds-stats",
  ]);

  // Find the latest round (active first, then most recent)
  const latestRound =
    roundsWithStats?.find((r) => r.status === "active") ??
    (roundsWithStats && roundsWithStats.length > 0
      ? roundsWithStats[roundsWithStats.length - 1]
      : null);

  // Fetch unpaired checked-in players for the latest round
  const unpairedQueryFn = (
    supabase: Parameters<typeof getUnpairedCheckedInPlayers>[0]
  ) =>
    latestRound
      ? getUnpairedCheckedInPlayers(supabase, tournamentId, latestRound.id)
      : Promise.resolve([]);

  const { data: unpairedPlayers } = useSupabaseQuery(unpairedQueryFn, [
    latestRound?.id,
    "public-unpaired-players",
  ]);

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
    <div className="space-y-4">
      {unpairedPlayers && unpairedPlayers.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {unpairedPlayers.length} late{" "}
              {unpairedPlayers.length === 1 ? "arrival" : "arrivals"} — not
              paired this round
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {unpairedPlayers.map((player) => (
                <Badge
                  key={player.altId}
                  variant="secondary"
                  className="text-xs"
                >
                  {player.displayName ?? player.username}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
      <BracketVisualization
        phases={bracketPhases}
        onMatchClick={handleMatchClick}
      />
    </div>
  );
}
