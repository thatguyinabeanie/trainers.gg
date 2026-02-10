"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase";
import { getPlayerMatches } from "@trainers/supabase";
import { Button } from "@/components/ui/button";
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
  const [nextMatch, setNextMatch] = useState<{
    id: number;
    roundNumber: number;
  } | null>(null);
  const [roundStatus, setRoundStatus] = useState<"active" | "completed" | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userAltId) {
      setIsLoading(false);
      return;
    }

    async function loadNextMatchData() {
      try {
        // Get all player matches to find the next one
        const matches = await getPlayerMatches(
          supabase,
          tournamentId,
          userAltId!
        );

        // Find the next pending match (after current match)
        const nextPendingMatch = matches.find(
          (m) => m.id !== matchId && m.status === "pending"
        );

        if (nextPendingMatch) {
          const round = nextPendingMatch.round as {
            round_number: number;
          } | null;
          setNextMatch({
            id: nextPendingMatch.id,
            roundNumber: round?.round_number ?? 0,
          });
        }

        // Check current round status if we have roundNumber
        if (roundNumber) {
          const { data: round } = await supabase
            .from("tournament_rounds")
            .select("id")
            .eq("tournament_id", tournamentId)
            .eq("round_number", roundNumber)
            .maybeSingle();

          if (round) {
            // Check if there are any active matches in this round
            const { count } = await supabase
              .from("tournament_matches")
              .select("*", { count: "exact", head: true })
              .eq("round_id", round.id)
              .eq("status", "active");

            setRoundStatus((count ?? 0) > 0 ? "active" : "completed");
          }
        }
      } catch (error) {
        console.error("Error loading next match data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadNextMatchData();
  }, [supabase, tournamentId, userAltId, matchId, roundNumber]);

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
      {!isLoading && roundStatus && roundNumber && (
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
          className="flex-1"
        >
          <Button variant="outline" className="w-full gap-2">
            <TrendingUp className="h-4 w-4" />
            View Standings
          </Button>
        </Link>

        {!isLoading && nextMatch && (
          <Link
            href={`/tournaments/${tournamentSlug}/matches/${nextMatch.id}`}
            className="flex-1"
          >
            <Button className="w-full gap-2">
              Next Match (Round {nextMatch.roundNumber})
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
