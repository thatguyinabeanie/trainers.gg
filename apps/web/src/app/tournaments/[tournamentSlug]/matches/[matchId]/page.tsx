import { notFound, redirect } from "next/navigation";
import { createClientReadOnly } from "@/lib/supabase/server";
import {
  getMatchDetails,
  getPlayerTournamentStats,
  getTeamForRegistration,
} from "@trainers/supabase";
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
    getUser().catch(() => null),
  ]);

  const matchData = await getMatchDetails(supabase, matchIdNum);

  if (!matchData || !matchData.tournament) {
    notFound();
  }

  // Verify the match belongs to this tournament slug
  if (matchData.tournament.slug !== tournamentSlug) {
    notFound();
  }

  const tournamentId = matchData.tournament.id;

  // Determine user role if authenticated
  let isPlayer1 = false;
  let isPlayer2 = false;
  let isParticipant = false;
  let userAltId: number | null = null;
  let isStaff = false;

  let currentUserUsername: string | null = null;
  let currentUserDisplayName: string | null = null;

  if (user) {
    const { data: userAlts } = await supabase
      .from("alts")
      .select("id, username, display_name")
      .eq("user_id", user.id);

    const userAltIds = new Set((userAlts ?? []).map((a) => a.id));

    // Use the first alt's info for presence (works for both participants and staff)
    if (userAlts && userAlts.length > 0) {
      currentUserUsername = userAlts[0]!.username;
      currentUserDisplayName = userAlts[0]!.display_name;
    }

    isPlayer1 =
      matchData.match.alt1_id !== null &&
      userAltIds.has(matchData.match.alt1_id);
    isPlayer2 =
      matchData.match.alt2_id !== null &&
      userAltIds.has(matchData.match.alt2_id);
    isParticipant = isPlayer1 || isPlayer2;
    userAltId = isPlayer1
      ? matchData.match.alt1_id!
      : isPlayer2
        ? matchData.match.alt2_id!
        : (userAlts?.[0]?.id ?? null);

    // Check if user is org staff or org owner (can act as judge)
    const orgId = matchData.tournament.organization_id;
    if (orgId) {
      const [{ data: staffRecord }, { data: org }] = await Promise.all([
        supabase
          .from("organization_staff")
          .select("id")
          .eq("organization_id", orgId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("organizations")
          .select("owner_user_id")
          .eq("id", orgId)
          .maybeSingle(),
      ]);
      isStaff = !!staffRecord || org?.owner_user_id === user.id;
    }
  }

  // Access control: only match players, org staff, and org owners can view
  if (!user) {
    redirect(
      `/sign-in?redirect=/tournaments/${tournamentSlug}/matches/${matchId}`
    );
  }
  if (!isParticipant && !isStaff) {
    notFound();
  }

  // Type cast players to include in_game_name (IGN) and user_id (for handle lookup)
  const player1Raw = matchData.player1 as {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    in_game_name: string | null;
    user_id: string;
  } | null;

  const player2Raw = matchData.player2 as {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    in_game_name: string | null;
    user_id: string;
  } | null;

  // Fetch user handles for profile links
  const userIds = [player1Raw?.user_id, player2Raw?.user_id].filter(
    (id): id is string => !!id
  );
  const handleMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, pds_handle")
      .in("id", userIds);
    for (const u of users ?? []) {
      if (u.pds_handle) handleMap[u.id] = u.pds_handle;
    }
  }

  const player1 = player1Raw
    ? { ...player1Raw, handle: handleMap[player1Raw.user_id] ?? null }
    : null;
  const player2 = player2Raw
    ? { ...player2Raw, handle: handleMap[player2Raw.user_id] ?? null }
    : null;

  const round = matchData.round as {
    id: number;
    round_number: number;
    phase_id: number;
  } | null;

  // Determine team visibility
  const openTeamSheets =
    (matchData.tournament as { open_team_sheets?: boolean }).open_team_sheets ??
    false;
  const tournamentStatus = matchData.tournament.status ?? "draft";
  const canViewOpponentTeam =
    isStaff ||
    (openTeamSheets && ["active", "completed"].includes(tournamentStatus));

  // Determine opponent alt ID from current user's perspective
  const myAltIdForTeam = isPlayer1
    ? matchData.match.alt1_id
    : isPlayer2
      ? matchData.match.alt2_id
      : null;
  const opponentAltId = isPlayer1
    ? matchData.match.alt2_id
    : isPlayer2
      ? matchData.match.alt1_id
      : null;

  // For staff who aren't participants, fetch both player teams directly
  const staffViewBothTeams = isStaff && !isParticipant;

  // Fetch teams and stats in parallel
  const [myTeamRaw, opponentTeamRaw, player1StatsRaw, player2StatsRaw] =
    await Promise.all([
      // My team: participant's own team, or player2's team for staff (maps to right side)
      isParticipant && myAltIdForTeam
        ? getTeamForRegistration(supabase, tournamentId, myAltIdForTeam).catch(
            () => null
          )
        : staffViewBothTeams && matchData.match.alt2_id
          ? getTeamForRegistration(
              supabase,
              tournamentId,
              matchData.match.alt2_id
            ).catch(() => null)
          : null,
      // Opponent team: opponent's team for participants, player1's team for staff (maps to left side)
      canViewOpponentTeam && opponentAltId
        ? getTeamForRegistration(supabase, tournamentId, opponentAltId).catch(
            () => null
          )
        : staffViewBothTeams && matchData.match.alt1_id
          ? getTeamForRegistration(
              supabase,
              tournamentId,
              matchData.match.alt1_id
            ).catch(() => null)
          : null,
      // Player 1 stats
      matchData.match.alt1_id
        ? getPlayerTournamentStats(
            supabase,
            tournamentId,
            matchData.match.alt1_id
          )
        : null,
      // Player 2 stats
      matchData.match.alt2_id
        ? getPlayerTournamentStats(
            supabase,
            tournamentId,
            matchData.match.alt2_id
          )
        : null,
    ]);

  // Transform team data into the shape expected by TeamSheet
  function transformTeam(
    raw: Awaited<ReturnType<typeof getTeamForRegistration>> | null
  ) {
    if (!raw) return null;
    return {
      teamId: raw.teamId,
      teamName: raw.teamName ?? null,
      pokemon: raw.pokemon.map((p) => ({
        species: p.species ?? "",
        nickname: p.nickname ?? null,
        ability: p.ability ?? "",
        held_item: p.held_item ?? null,
        tera_type: p.tera_type ?? null,
        move1: p.move1 ?? "",
        move2: p.move2 ?? null,
        move3: p.move3 ?? null,
        move4: p.move4 ?? null,
        nature: p.nature ?? "",
        gender: p.gender ?? null,
        is_shiny: p.is_shiny ?? false,
        position: p.position,
      })),
    };
  }

  const myTeam = transformTeam(myTeamRaw);
  const opponentTeam = transformTeam(opponentTeamRaw);

  // Transform player stats
  function transformStats(
    raw: Awaited<ReturnType<typeof getPlayerTournamentStats>>
  ) {
    if (!raw) return null;
    return { wins: raw.match_wins ?? 0, losses: raw.match_losses ?? 0 };
  }

  const player1Stats = transformStats(player1StatsRaw);
  const player2Stats = transformStats(player2StatsRaw);

  return (
    <PageContainer>
      <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs sm:mb-4 sm:gap-2 sm:text-sm">
        <Link
          href="/tournaments"
          className="hidden shrink-0 hover:underline sm:inline"
        >
          Tournaments
        </Link>
        <span className="hidden sm:inline">/</span>
        <Link
          href={`/tournaments/${tournamentSlug}`}
          className="truncate hover:underline"
        >
          {matchData.tournament.name}
        </Link>
        <span>/</span>
        <span className="text-foreground shrink-0">
          Round {round?.round_number ?? "?"}
        </span>
      </div>

      <MatchPageClient
        matchId={matchIdNum}
        tournamentId={tournamentId}
        tournamentSlug={tournamentSlug}
        matchStatus={matchData.match.status ?? "pending"}
        staffRequested={matchData.match.staff_requested ?? false}
        player1={player1}
        player2={player2}
        alt1Id={matchData.match.alt1_id}
        alt2Id={matchData.match.alt2_id}
        roundNumber={round?.round_number ?? null}
        tableNumber={matchData.match.table_number ?? null}
        bestOf={matchData.phase?.best_of ?? 3}
        userAltId={userAltId}
        isParticipant={isParticipant}
        isStaff={isStaff}
        isPlayer1={isPlayer1}
        player1Stats={player1Stats}
        player2Stats={player2Stats}
        myTeam={myTeam}
        opponentTeam={opponentTeam}
        openTeamSheets={openTeamSheets}
        currentUserUsername={currentUserUsername}
        currentUserDisplayName={currentUserDisplayName}
      />
    </PageContainer>
  );
}
