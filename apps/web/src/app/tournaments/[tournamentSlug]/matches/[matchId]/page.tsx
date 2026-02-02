import { notFound, redirect } from "next/navigation";
import { createClientReadOnly } from "@/lib/supabase/server";
import { getMatchDetails } from "@trainers/supabase";
import { getUser } from "@/lib/supabase/server";
import { MatchPageClient } from "./match-page-client";
import { PageContainer } from "@/components/layout/page-container";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    tournamentSlug: string;
    matchId: string;
  }>;
}

export default async function MatchPage({ params }: PageProps) {
  const { tournamentSlug, matchId } = await params;
  const matchIdNum = parseInt(matchId, 10);

  if (isNaN(matchIdNum)) {
    notFound();
  }

  const [supabase, user] = await Promise.all([
    createClientReadOnly(),
    getUser(),
  ]);

  if (!user) {
    redirect(
      `/sign-in?redirect=/tournaments/${tournamentSlug}/matches/${matchId}`
    );
  }

  const matchData = await getMatchDetails(supabase, matchIdNum);

  if (!matchData || !matchData.tournament) {
    notFound();
  }

  // Verify the match belongs to this tournament slug
  if (matchData.tournament.slug !== tournamentSlug) {
    notFound();
  }

  // Determine the current user's alt ID for this tournament
  const { data: userAlts } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", user.id);

  const userAltIds = new Set((userAlts ?? []).map((a) => a.id));

  // Check if user is a participant in this match
  const isPlayer1 =
    matchData.match.alt1_id !== null && userAltIds.has(matchData.match.alt1_id);
  const isPlayer2 =
    matchData.match.alt2_id !== null && userAltIds.has(matchData.match.alt2_id);
  const isParticipant = isPlayer1 || isPlayer2;
  const userAltId = isPlayer1
    ? matchData.match.alt1_id!
    : isPlayer2
      ? matchData.match.alt2_id!
      : (userAlts?.[0]?.id ?? null);

  // Check if user is org staff (can act as judge)
  const orgId = matchData.tournament.organization_id;
  let isStaff = false;
  if (orgId) {
    const { data: staffRecord } = await supabase
      .from("organization_staff")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();
    isStaff = !!staffRecord;
  }

  // Non-participants who are not staff cannot view the match
  if (!isParticipant && !isStaff) {
    notFound();
  }

  const player1 = matchData.player1 as {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;

  const player2 = matchData.player2 as {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;

  const round = matchData.round as {
    id: number;
    round_number: number;
    phase_id: number;
  } | null;

  return (
    <PageContainer>
      <div className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
        <Link href="/tournaments" className="hover:underline">
          Tournaments
        </Link>
        <span>/</span>
        <Link
          href={`/tournaments/${tournamentSlug}`}
          className="hover:underline"
        >
          {matchData.tournament.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">
          Round {round?.round_number ?? "?"} - Match
        </span>
      </div>

      <MatchPageClient
        matchId={matchIdNum}
        tournamentId={matchData.tournament.id}
        tournamentSlug={tournamentSlug}
        matchStatus={matchData.match.status ?? "pending"}
        staffRequested={matchData.match.staff_requested ?? false}
        player1={player1}
        player2={player2}
        alt1Id={matchData.match.alt1_id}
        alt2Id={matchData.match.alt2_id}
        roundNumber={round?.round_number ?? null}
        bestOf={matchData.phase?.best_of ?? 3}
        userAltId={userAltId}
        isParticipant={isParticipant}
        isStaff={isStaff}
        isPlayer1={isPlayer1}
      />
    </PageContainer>
  );
}
