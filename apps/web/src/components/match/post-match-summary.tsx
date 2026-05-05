"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/lib/supabase";
import { getPlayerMatches } from "@trainers/supabase";
import { Trophy, TrendingUp, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PostMatchSummaryProps {
  tournamentId: number;
  tournamentSlug: string;
  matchId: number;
  userAltId: number | null;
  myWins: number;
  opponentWins: number;
  myName: string;
  roundNumber: number | null;
}

export function PostMatchSummary({
  tournamentId,
  tournamentSlug,
  matchId,
  userAltId,
  myWins,
  opponentWins,
  myName,
  roundNumber,
}: PostMatchSummaryProps) {
  const supabase = useSupabase();

  const { data, isLoading } = useQuery({
    queryKey: ['post-match-summary', tournamentId, matchId, userAltId],
    queryFn: async () => {
      // Get all player matches to find the next one
      const matches = await getPlayerMatches(
        supabase,
        tournamentId,
        userAltId!
      );

      // Find the next pending match (after current match) in a deterministic way
      const pendingMatches = matches
        .filter((m) => m.id !== matchId && m.status === "pending")
        .map((m) => {
          const round = m.round as { round_number: number } | null;
          const matchRoundNumber =
            typeof round?.round_number === "number"
              ? round.round_number
              : Number.POSITIVE_INFINITY;
          return { match: m, roundNumber: matchRoundNumber };
        });

      let candidateMatches = pendingMatches;

      // If we know the current match's round, prefer pending matches in later rounds
      if (typeof roundNumber === "number") {
        const laterRoundMatches = pendingMatches.filter(
          (m) => m.roundNumber > roundNumber
        );
        if (laterRoundMatches.length > 0) {
          candidateMatches = laterRoundMatches;
        }
      }

      candidateMatches.sort((a, b) => {
        if (a.roundNumber !== b.roundNumber) {
          return a.roundNumber - b.roundNumber;
        }
        return a.match.id - b.match.id;
      });

      const nextPendingMatch = candidateMatches[0]?.match;

      let nextMatch = null;
      if (nextPendingMatch) {
        const round = nextPendingMatch.round as {
          round_number: number;
        } | null;
        nextMatch = {
          id: nextPendingMatch.id,
          roundNumber: round?.round_number ?? 0,
          tableNumber: nextPendingMatch.table_number ?? 0,
        };
      }

      // Check current round status by deriving round_id from the current match
      const currentMatch = matches.find((m) => m.id === matchId);
      const currentRound = currentMatch?.round as {
        id: number;
        round_number: number;
      } | null;

      let roundStatus: "active" | "completed" | null = null;
      if (currentRound?.id) {
        const { count, error: countError } = await supabase
          .from("tournament_matches")
          .select("*", { count: "exact", head: true })
          .eq("round_id", currentRound.id)
          .eq("status", "active");

        if (!countError) {
          roundStatus = (count ?? 0) > 0 ? "active" : "completed";
        }
      }

      return { nextMatch, roundStatus };
    },
    enabled: !!userAltId,
  });

  const nextMatch = data?.nextMatch ?? null;
  const roundStatus = data?.roundStatus ?? null;

  const didWin = myWins > opponentWins;
  const resultText = didWin
    ? `${myName} won ${myWins}-${opponentWins}`
    : `${myName} lost ${opponentWins}-${myWins}`;

  return (
    <div className="bg-muted/50 space-y-4 rounded-lg border p-6">
      {/* Result Summary */}
      <div className="flex items-center gap-3">
        <div
          className={`rounded-full p-2 ${didWin ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"}`}
        >
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Match Complete</h3>
          <p className="text-muted-foreground text-sm">{resultText}</p>
        </div>
      </div>

      {/* Round Status */}
      {!isLoading && roundStatus && roundNumber != null && (
        <div className="flex items-center gap-2 text-sm">
          {roundStatus === "active" ? (
            <>
              <Clock className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground">
                Waiting for Round {roundNumber} to complete
              </span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">
                Round {roundNumber} complete
              </span>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/tournaments/${tournamentSlug}/standings`}
          className="hover:bg-accent hover:text-accent-foreground border-input bg-background ring-offset-background focus-visible:ring-ring inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          <TrendingUp className="h-4 w-4" />
          View Standings
        </Link>

        {!isLoading && nextMatch && (
          <Link
            href={`/tournaments/${tournamentSlug}/r/${nextMatch.roundNumber}/t/${nextMatch.tableNumber}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 ring-offset-background focus-visible:ring-ring inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            Next Match (Round {nextMatch.roundNumber})
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
