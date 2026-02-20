"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useSupabase } from "@/lib/supabase";
import { Swords, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CurrentMatchBannerProps {
  tournamentId: number;
  tournamentSlug: string;
}

interface MatchData {
  id: number;
  status: "pending" | "active";
  roundNumber: number;
  phaseName: string;
  table: number | null;
  opponent: {
    displayName: string;
    username: string;
  } | null;
}

export function CurrentMatchBanner({
  tournamentId,
  tournamentSlug,
}: CurrentMatchBannerProps) {
  const { user, isAuthenticated } = useAuth();
  const supabase = useSupabase();
  const [match, setMatch] = useState<MatchData | null>(null);

  const userId = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    let cancelled = false;

    async function fetchActiveMatch() {
      const { data: alts } = await supabase
        .from("alts")
        .select("id")
        .eq("user_id", userId!);

      if (!alts || alts.length === 0 || cancelled) return;

      const altIds = alts.map((a) => a.id);

      const { data: matchData } = await supabase
        .from("tournament_matches")
        .select(
          `
          id,
          status,
          alt1_id,
          alt2_id,
          table_number,
          player1:alts!tournament_matches_alt1_id_fkey(id, username, display_name),
          player2:alts!tournament_matches_alt2_id_fkey(id, username, display_name),
          round:tournament_rounds!inner(
            round_number,
            phase:tournament_phases(name)
          )
        `
        )
        .eq("tournament_id", tournamentId)
        .in("status", ["pending", "active"])
        .or(altIds.map((id) => `alt1_id.eq.${id},alt2_id.eq.${id}`).join(","))
        .limit(1)
        .maybeSingle();

      if (cancelled || !matchData) return;

      const round = matchData.round as unknown as {
        round_number: number;
        phase: { name: string } | null;
      } | null;

      const isPlayer1 =
        matchData.alt1_id != null && altIds.includes(matchData.alt1_id);
      const opponentRaw = isPlayer1 ? matchData.player2 : matchData.player1;
      const opponentArr = opponentRaw as
        | { id: number; username: string; display_name: string | null }[]
        | null;
      const opponentProfile = opponentArr?.[0] ?? null;

      setMatch({
        id: matchData.id,
        status: matchData.status as "pending" | "active",
        roundNumber: round?.round_number ?? 0,
        phaseName: round?.phase?.name ?? "",
        table: matchData.table_number,
        opponent: opponentProfile
          ? {
              displayName:
                opponentProfile.display_name || opponentProfile.username,
              username: opponentProfile.username,
            }
          : null,
      });
    }

    fetchActiveMatch();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, supabase, tournamentId]);

  if (!match) return null;

  const isActive = match.status === "active";

  return (
    <div className="mb-6">
      <Link
        href={`/tournaments/${tournamentSlug}/matches/${match.id}`}
        className={cn(
          "border-primary/30 from-primary/10 via-background to-background group relative flex items-center gap-4 overflow-hidden rounded-lg border bg-gradient-to-r p-4 transition-all hover:shadow-md",
          isActive && "border-primary/50"
        )}
      >
        {isActive && (
          <div className="absolute inset-0 animate-pulse">
            <div className="border-primary/30 absolute inset-0 rounded-lg border" />
          </div>
        )}

        <div className="bg-primary/20 relative flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Swords className="text-primary size-5" />
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Your Match</span>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={cn(
                "font-mono text-xs font-bold",
                isActive && "animate-pulse bg-emerald-500 text-white"
              )}
            >
              {isActive ? "LIVE" : "READY"}
            </Badge>
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
            <span className="font-medium">{match.phaseName}</span>
            <span>&bull;</span>
            <span className="font-mono font-semibold">
              Round {match.roundNumber}
            </span>
            {match.opponent && (
              <>
                <span>&bull;</span>
                <span>vs {match.opponent.displayName}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-primary relative flex items-center gap-1 text-sm font-semibold">
          <span>Go to Match</span>
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </div>
  );
}
