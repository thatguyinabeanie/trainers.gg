"use client";

import { useRouter } from "next/navigation";
import { Trophy, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BracketVisualization } from "@/components/tournament/bracket-visualization";
import { useCurrentUser } from "@/hooks/use-current-user";
import { transformPhaseData } from "@/lib/tournament-utils";
import { type TournamentPairingsData } from "@/lib/data/tournament-pairings-endpoint";
import type { TournamentMatch } from "@trainers/tournaments/types";

interface PublicPairingsViewProps {
  /** Tournament slug — used to build match-detail navigation URLs. */
  tournamentSlug: string;
  /**
   * Pairings data fetched server-side (service-role, cached) by the parent
   * server component. The presentational child does NOT fetch — it only renders.
   */
  data: TournamentPairingsData;
  /** Whether the current viewer can manage the tournament (organizer/staff). */
  canManage?: boolean;
}

/**
 * Presentational client child for tournament pairings.
 *
 * All revoke-set base-table reads (tournament_phases / tournament_rounds /
 * tournament_player_stats) are done server-side in the parent server component
 * (`PublicPairings`) via the cached service-role fetcher and handed down as
 * `data`. This component performs NO Supabase reads of revoke-set tables — it
 * renders the bracket and owns the click-to-navigate interactivity.
 *
 * Match-access control (`canClickMatch`) reads the current user's own alt from
 * `useCurrentUser` (API-backed via `/api/v1/me/profile`), replacing the prior
 * browser `getCurrentUserAlts` anon read of the `alts` base table.
 */
export function PublicPairingsView({
  tournamentSlug,
  data,
  canManage = false,
}: PublicPairingsViewProps) {
  const router = useRouter();
  const { alt } = useCurrentUser();

  const { phases, allPhaseRounds, unpairedPlayers } = data;

  // The current user's own alt id, used to gate match-detail access.
  const userAltId = alt ? String(alt.id) : null;

  const canClickMatch = (match: TournamentMatch) => {
    if (canManage) return true;
    if (!userAltId) return false;
    const p1Id = match.participant1?.id;
    const p2Id = match.participant2?.id;
    return (
      (p1Id !== undefined && p1Id === userAltId) ||
      (p2Id !== undefined && p2Id === userAltId)
    );
  };

  // Navigate to match detail page on click — look up round/table from loaded data.
  const handleMatchClick = (matchId: string) => {
    for (const phaseRounds of allPhaseRounds) {
      for (const round of phaseRounds) {
        const match = round.matches.find((m) => String(m.id) === matchId);
        if (match) {
          router.push(
            `/tournaments/${tournamentSlug}/r/${round.round_number}/t/${match.table_number ?? 0}`
          );
          return;
        }
      }
    }
  };

  // No phases yet.
  if (phases.length === 0) {
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

  // Transform all phases with their rounds for BracketVisualization.
  const bracketPhases =
    allPhaseRounds.length > 0
      ? phases.map((phase, index) =>
          transformPhaseData(phase, allPhaseRounds[index] ?? [])
        )
      : [];

  // Check if any phase has rounds with matches.
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
      {unpairedPlayers.length > 0 && (
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
        canClickMatch={canClickMatch}
      />
    </div>
  );
}
