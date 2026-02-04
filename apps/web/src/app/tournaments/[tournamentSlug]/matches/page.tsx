import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/server";
import {
  getTournamentBySlug,
  getTournamentPhases,
  getPhaseRoundsWithMatches,
} from "@trainers/supabase";
import { CacheTags } from "@/lib/cache";
import { getPlayerName, type PlayerRef } from "@trainers/utils";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

// On-demand revalidation only
export const revalidate = false;

interface PageProps {
  params: Promise<{
    tournamentSlug: string;
  }>;
}

// Cached tournament fetch (same as tournament detail page)
const getCachedTournament = (slug: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getTournamentBySlug(supabase, slug);
    },
    [`tournament-detail-${slug}`],
    { tags: [CacheTags.tournament(slug), CacheTags.TOURNAMENTS_LIST] }
  )();

// Cached phases + rounds + matches fetch
const getCachedMatchesByPhase = (tournamentId: number, slug: string) =>
  unstable_cache(
    async () => {
      const supabase = createStaticClient();
      const phases = await getTournamentPhases(supabase, tournamentId);

      // Fetch rounds with matches for each phase
      const phasesWithMatches = await Promise.all(
        phases.map(async (phase) => {
          const rounds = await getPhaseRoundsWithMatches(
            supabase,
            phase.id,
            tournamentId
          );
          return { ...phase, rounds };
        })
      );

      return phasesWithMatches;
    },
    [`tournament-matches-${slug}`],
    { tags: [CacheTags.tournament(slug)] }
  )();

function getStatusBadgeVariant(
  status: string | null
): "default" | "secondary" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "active":
      return "secondary";
    default:
      return "outline";
  }
}

function getStatusLabel(status: string | null): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "active":
      return "In Progress";
    case "pending":
      return "Upcoming";
    default:
      return status ?? "Unknown";
  }
}

export default async function MatchesPage({ params }: PageProps) {
  const { tournamentSlug } = await params;

  const tournament = await getCachedTournament(tournamentSlug);
  if (!tournament) {
    notFound();
  }

  const phasesWithMatches = await getCachedMatchesByPhase(
    tournament.id,
    tournamentSlug
  );

  // Check if there are any matches at all
  const totalMatches = phasesWithMatches.reduce(
    (sum, phase) =>
      sum +
      phase.rounds.reduce((rSum, round) => rSum + round.matches.length, 0),
    0
  );

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
        <Link href="/tournaments" className="hover:underline">
          Tournaments
        </Link>
        <span>/</span>
        <Link
          href={`/tournaments/${tournamentSlug}`}
          className="hover:underline"
        >
          {tournament.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Matches</span>
      </div>

      <h1 className="mb-6 text-3xl font-bold">Matches</h1>

      {totalMatches === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
            <h3 className="mb-2 text-lg font-semibold">No matches yet</h3>
            <p className="text-muted-foreground text-sm">
              Matches will appear here once pairings are generated.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {phasesWithMatches.map((phase) => (
            <div key={phase.id} className="space-y-4">
              {/* Phase header (only show if more than one phase) */}
              {phasesWithMatches.length > 1 && (
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">
                    {phase.name ?? `Phase ${phase.phase_order}`}
                  </h2>
                  <Badge variant={getStatusBadgeVariant(phase.status)}>
                    {getStatusLabel(phase.status)}
                  </Badge>
                </div>
              )}

              {phase.rounds.map((round) => (
                <Card key={round.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Round {round.round_number}
                      </CardTitle>
                      <Badge variant={getStatusBadgeVariant(round.status)}>
                        {getStatusLabel(round.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {round.matches.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center text-sm">
                        No matches in this round yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {round.matches.map((match) => {
                          const isBye = !match.alt2_id;
                          const p1Name = getPlayerName(
                            match.player1 as PlayerRef
                          );
                          const p2Name = isBye
                            ? "BYE"
                            : getPlayerName(match.player2 as PlayerRef);

                          return (
                            <Link
                              key={match.id}
                              href={`/tournaments/${tournamentSlug}/matches/${match.id}`}
                              className="bg-muted/30 hover:bg-muted/60 flex items-center justify-between rounded-lg p-3 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-muted-foreground w-16 text-sm">
                                  {isBye
                                    ? "BYE"
                                    : `Table ${match.table_number ?? "-"}`}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{p1Name}</span>
                                  <span className="text-muted-foreground">
                                    vs
                                  </span>
                                  <span
                                    className={
                                      isBye
                                        ? "text-muted-foreground italic"
                                        : "font-medium"
                                    }
                                  >
                                    {p2Name}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {match.status === "completed" && (
                                  <span className="text-muted-foreground text-sm">
                                    {match.game_wins1 ?? 0}-
                                    {match.game_wins2 ?? 0}
                                  </span>
                                )}
                                <Badge
                                  variant={getStatusBadgeVariant(match.status)}
                                >
                                  {getStatusLabel(match.status)}
                                </Badge>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
