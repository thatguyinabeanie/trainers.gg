import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type TypedClient = SupabaseClient<Database>;
type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

/**
 * List public tournaments with pagination (for public browse page)
 * Returns format compatible with Convex api.tournaments.queries.list
 */
export async function listPublicTournaments(
  supabase: TypedClient,
  options: {
    limit?: number;
    cursor?: number | null;
    statusFilter?: TournamentStatus;
  } = {}
) {
  const { limit = 50, cursor = null, statusFilter } = options;
  const offset = cursor ?? 0;

  let query = supabase
    .from("tournaments")
    .select(
      `
      *,
      organization:organizations(id, name, slug)
    `,
      { count: "exact" }
    )
    .is("archived_at", null)
    .order("start_date", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  // Filter by status if provided
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  } else {
    // Default: show upcoming, active, and completed (not draft or cancelled)
    query = query.in("status", ["upcoming", "active", "completed"]);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Get registration counts for each tournament
  const tournamentsWithCounts = await Promise.all(
    (data ?? []).map(async (tournament) => {
      const { count: regCount } = await supabase
        .from("tournament_registrations")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournament.id);

      return {
        ...tournament,
        participants: Array(regCount ?? 0).fill(null), // Mimic Convex structure
        _count: { registrations: regCount ?? 0 },
      };
    })
  );

  const totalCount = count ?? 0;
  const nextCursor = offset + limit < totalCount ? offset + limit : null;

  return {
    page: tournamentsWithCounts,
    continueCursor: nextCursor,
    isDone: nextCursor === null,
  };
}

/**
 * List tournaments with filters and pagination
 */
export async function listTournaments(
  supabase: TypedClient,
  options: {
    limit?: number;
    offset?: number;
    organizationId?: number;
    status?: TournamentStatus;
    includeArchived?: boolean;
  } = {}
) {
  const { limit = 10, offset = 0, includeArchived = false } = options;

  let query = supabase
    .from("tournaments")
    .select(
      `
      *,
      organization:organizations(*)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.organizationId) {
    query = query.eq("organization_id", options.organizationId);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  }

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  // Get registration counts for each tournament
  const tournamentsWithCounts = await Promise.all(
    (data ?? []).map(async (tournament) => {
      const { count: regCount } = await supabase
        .from("tournament_registrations")
        .select("*", { count: "exact", head: true })
        .eq("tournament_id", tournament.id);

      return {
        ...tournament,
        _count: { registrations: regCount ?? 0 },
      };
    })
  );

  return {
    items: tournamentsWithCounts,
    total: count ?? 0,
    hasMore: (count ?? 0) > offset + limit,
  };
}

/**
 * Get tournament by organization slug and tournament slug
 */
export async function getTournamentByOrgAndSlug(
  supabase: TypedClient,
  organizationSlug: string,
  tournamentSlug: string
) {
  // First get the organization
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", organizationSlug)
    .single();

  if (!org) return null;

  // Get the tournament
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      organization:organizations(*)
    `
    )
    .eq("organization_id", org.id)
    .eq("slug", tournamentSlug)
    .is("archived_at", null)
    .single();

  if (error || !tournament) return null;

  // Get additional details
  const [registrations, phases, currentPhase] = await Promise.all([
    supabase
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", tournament.id),
    supabase
      .from("tournament_phases")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("phase_order", { ascending: true }),
    tournament.current_phase_id
      ? supabase
          .from("tournament_phases")
          .select("*")
          .eq("id", tournament.current_phase_id)
          .single()
      : null,
  ]);

  return {
    ...tournament,
    registrations: registrations.data ?? [],
    phases: phases.data ?? [],
    currentPhase: currentPhase?.data ?? null,
    _count: {
      registrations: registrations.data?.length ?? 0,
      phases: phases.data?.length ?? 0,
    },
  };
}

/**
 * Get tournament by ID
 */
export async function getTournamentById(supabase: TypedClient, id: number) {
  const { data, error } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      organization:organizations(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get tournament registrations
 */
export async function getTournamentRegistrations(
  supabase: TypedClient,
  tournamentId: number
) {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select(
      `
      *,
      alt:alts!tournament_registrations_alt_id_fkey(*),
      team:teams(*)
    `
    )
    .eq("tournament_id", tournamentId)
    .order("registered_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Check if alt is registered for tournament
 */
export async function isRegisteredForTournament(
  supabase: TypedClient,
  tournamentId: number,
  altId: number
) {
  const { data } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", altId)
    .single();

  return !!data;
}

/**
 * Get tournament phases
 */
export async function getTournamentPhases(
  supabase: TypedClient,
  tournamentId: number
) {
  const { data, error } = await supabase
    .from("tournament_phases")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("phase_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get tournament rounds for a phase
 */
export async function getTournamentRounds(
  supabase: TypedClient,
  phaseId: number
) {
  const { data, error } = await supabase
    .from("tournament_rounds")
    .select("*")
    .eq("phase_id", phaseId)
    .order("round_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get matches for a round
 */
export async function getRoundMatches(supabase: TypedClient, roundId: number) {
  const { data, error } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      player1:alts!tournament_matches_alt1_id_fkey(*),
      player2:alts!tournament_matches_alt2_id_fkey(*),
      winner:alts!tournament_matches_winner_alt_id_fkey(*)
    `
    )
    .eq("round_id", roundId)
    .order("table_number", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get standings for a tournament
 */
export async function getTournamentStandings(
  supabase: TypedClient,
  tournamentId: number
) {
  const { data, error } = await supabase
    .from("tournament_standings")
    .select(
      `
      *,
      alt:alts(*)
    `
    )
    .eq("tournament_id", tournamentId)
    .order("rank", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get player stats for a tournament
 */
export async function getPlayerTournamentStats(
  supabase: TypedClient,
  tournamentId: number,
  altId: number
) {
  const { data, error } = await supabase
    .from("tournament_player_stats")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", altId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get check-in status for current user
 * If no altId is provided, returns status for the current authenticated user
 */
export async function getCheckInStatus(
  supabase: TypedClient,
  tournamentId: number,
  altId?: number
) {
  let targetAltId: number | undefined = altId;

  if (!targetAltId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        isRegistered: false,
        isCheckedIn: false,
        checkInOpen: false,
        checkInStartTime: null,
        checkInEndTime: null,
        registrationStatus: null,
      };
    }

    const { data: alt } = await supabase
      .from("alts")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!alt) {
      return {
        isRegistered: false,
        isCheckedIn: false,
        checkInOpen: false,
        checkInStartTime: null,
        checkInEndTime: null,
        registrationStatus: null,
      };
    }
    targetAltId = alt.id as number;
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("start_date, check_in_window_minutes")
    .eq("id", tournamentId)
    .single();

  if (!tournament) {
    throw new Error("Tournament not found");
  }

  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("status, checked_in_at")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", targetAltId!)
    .single();

  const now = Date.now();
  const checkInWindowMinutes = tournament.check_in_window_minutes ?? 60;
  const startDate = tournament.start_date
    ? new Date(tournament.start_date).getTime()
    : null;
  const checkInStartTime = startDate
    ? startDate - checkInWindowMinutes * 60 * 1000
    : null;
  const checkInEndTime = startDate;

  const checkInOpen =
    (!checkInStartTime || now >= checkInStartTime) &&
    (!checkInEndTime || now <= checkInEndTime);

  return {
    isRegistered: !!registration,
    isCheckedIn: registration?.status === "checked_in",
    checkInOpen,
    checkInStartTime,
    checkInEndTime,
    registrationStatus: registration?.status ?? null,
  };
}

/**
 * Get check-in statistics for a tournament
 */
export async function getCheckInStats(
  supabase: TypedClient,
  tournamentId: number
) {
  const { data: registrations } = await supabase
    .from("tournament_registrations")
    .select("status, checked_in_at, alt_id")
    .eq("tournament_id", tournamentId);

  const regs = registrations ?? [];
  const total = regs.length;
  const checkedIn = regs.filter((r) => r.status === "checked_in").length;
  const registered = regs.filter((r) => r.status === "registered").length;
  const dropped = regs.filter((r) => r.status === "dropped").length;
  const waitlist = regs.filter((r) => r.status === "waitlist").length;

  // Get checked-in alts
  const checkedInRegs = regs.filter((r) => r.status === "checked_in");
  const altIds = checkedInRegs.map((r) => r.alt_id);

  let checkedInList: {
    altId: number;
    displayName: string;
    checkedInAt: number;
  }[] = [];

  if (altIds.length > 0) {
    const { data: alts } = await supabase
      .from("alts")
      .select("id, username")
      .in("id", altIds);

    const altMap = new Map(alts?.map((a) => [a.id, a]) ?? []);

    checkedInList = checkedInRegs.map((reg) => ({
      altId: reg.alt_id,
      displayName: altMap.get(reg.alt_id)?.username ?? "Unknown",
      checkedInAt: reg.checked_in_at
        ? new Date(reg.checked_in_at).getTime()
        : Date.now(),
    }));
  }

  return {
    total,
    checkedIn,
    registered,
    dropped,
    waitlist,
    checkedInPercentage: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
    checkedInList: checkedInList.sort((a, b) => b.checkedInAt - a.checkedInAt),
  };
}

/**
 * Get user's teams for tournament registration
 * If no altId is provided, returns teams for the current authenticated user
 */
export async function getUserTeams(supabase: TypedClient, altId?: number) {
  let targetAltId: number | undefined = altId;

  if (!targetAltId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: alt } = await supabase
      .from("alts")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!alt) return [];
    targetAltId = alt.id as number;
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("created_by", targetAltId!);

  if (!teams?.length) return [];

  // Get pokemon count for each team
  const teamsWithCounts = await Promise.all(
    teams.map(async (team) => {
      const { count } = await supabase
        .from("team_pokemon")
        .select("*", { count: "exact", head: true })
        .eq("team_id", team.id);

      return {
        ...team,
        pokemonCount: count ?? 0,
      };
    })
  );

  return teamsWithCounts.filter((team) => team.pokemonCount > 0);
}

/**
 * Get match details by ID
 */
export async function getMatchDetails(supabase: TypedClient, matchId: number) {
  const { data: match, error } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      player1:alts!tournament_matches_alt1_id_fkey(*),
      player2:alts!tournament_matches_alt2_id_fkey(*),
      round:tournament_rounds(*)
    `
    )
    .eq("id", matchId)
    .single();

  if (error || !match) return null;

  const { data: phase } = await supabase
    .from("tournament_phases")
    .select("*, tournament:tournaments(*)")
    .eq("id", match.round?.phase_id)
    .single();

  return {
    match,
    player1: match.player1,
    player2: match.player2,
    round: match.round,
    phase,
    tournament: phase?.tournament,
  };
}

/**
 * Get all matches for a player in a tournament
 */
export async function getPlayerMatches(
  supabase: TypedClient,
  tournamentId: number,
  altId: number
) {
  const { data: phases } = await supabase
    .from("tournament_phases")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (!phases?.length) return [];

  const phaseIds = phases.map((p) => p.id);

  const { data: rounds } = await supabase
    .from("tournament_rounds")
    .select("id")
    .in("phase_id", phaseIds);

  if (!rounds?.length) return [];

  const roundIds = rounds.map((r) => r.id);

  const { data, error } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      player1:alts!tournament_matches_alt1_id_fkey(*),
      player2:alts!tournament_matches_alt2_id_fkey(*),
      round:tournament_rounds(*)
    `
    )
    .in("round_id", roundIds)
    .or(`alt1_id.eq.${altId},alt2_id.eq.${altId}`)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get dashboard data for current user
 * Returns tournaments, organizations, stats, recent activity, and achievements
 */
export async function getMyDashboardData(
  supabase: TypedClient,
  profileId: number
) {
  // Fetch all registrations for this user
  const { data: tournamentRegistrations } = await supabase
    .from("tournament_registrations")
    .select(
      `
      *,
      tournament:tournaments(*)
    `
    )
    .eq("profile_id", profileId);

  // Build myTournaments list (exclude archived)
  const myTournaments: {
    id: number;
    name: string;
    startDate: string | null;
    status: string;
  }[] = [];
  let activeTournamentsCount = 0;

  for (const reg of tournamentRegistrations ?? []) {
    const tournament = reg.tournament as {
      id: number;
      name: string;
      start_date: string | null;
      status: string;
      archived_at: string | null;
    } | null;

    if (tournament && !tournament.archived_at) {
      myTournaments.push({
        id: tournament.id,
        name: tournament.name,
        startDate: tournament.start_date,
        status: tournament.status,
      });

      if (tournament.status === "active" || tournament.status === "upcoming") {
        activeTournamentsCount++;
      }
    }
  }

  // Fetch player stats
  const { data: playerStats } = await supabase
    .from("tournament_player_stats")
    .select("*")
    .eq("profile_id", profileId);

  let totalMatches = 0;
  let totalWins = 0;
  let totalChampionPoints = 0;

  for (const stats of playerStats ?? []) {
    totalMatches += stats.matches_played ?? 0;
    totalWins += stats.match_wins ?? 0;
    if (stats.final_ranking === 1) {
      totalChampionPoints += 100;
    } else if (stats.final_ranking === 2) {
      totalChampionPoints += 75;
    } else if (stats.final_ranking === 3 || stats.final_ranking === 4) {
      totalChampionPoints += 50;
    } else if (stats.final_ranking && stats.final_ranking <= 8) {
      totalChampionPoints += 25;
    }
  }

  const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

  // Fetch recent completed matches
  const { data: recentMatchesRaw } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      player1:profiles!tournament_matches_profile1_id_fkey(id, display_name),
      player2:profiles!tournament_matches_profile2_id_fkey(id, display_name),
      round:tournament_rounds(
        id,
        phase:tournament_phases(
          id,
          tournament:tournaments(id, name)
        )
      )
    `
    )
    .eq("status", "completed")
    .or(`profile1_id.eq.${profileId},profile2_id.eq.${profileId}`)
    .order("updated_at", { ascending: false })
    .limit(5);

  // Build recent activity
  const recentActivity: {
    id: number;
    tournamentName: string;
    opponentName: string;
    result: "won" | "lost";
    date: number;
  }[] = [];

  for (const match of recentMatchesRaw ?? []) {
    const round = match.round as {
      id: number;
      phase: {
        id: number;
        tournament: { id: number; name: string } | null;
      } | null;
    } | null;

    const tournament = round?.phase?.tournament;
    if (!tournament) continue;

    const isPlayer1 = match.profile1_id === profileId;
    const opponent = isPlayer1 ? match.player2 : match.player1;
    // player1/player2 are arrays from Supabase join, take first element
    const opponentArr = opponent as
      | { id: number; display_name: string }[]
      | null;
    const opponentProfile = opponentArr?.[0] ?? null;
    const won = match.winner_profile_id === profileId;

    recentActivity.push({
      id: match.id,
      tournamentName: tournament.name,
      opponentName: opponentProfile?.display_name || "Unknown",
      result: won ? "won" : "lost",
      date: match.end_time ? new Date(match.end_time).getTime() : Date.now(),
    });
  }

  // Build achievements
  const achievements: {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
  }[] = [];

  const championshipsWon = (playerStats ?? []).filter(
    (s) => s.final_ranking === 1
  ).length;
  const top4Finishes = (playerStats ?? []).filter(
    (s) => s.final_ranking && s.final_ranking <= 4
  ).length;

  if (championshipsWon > 0) {
    achievements.push({
      id: "tournament_champion",
      title: "Tournament Champion",
      description: `Won ${championshipsWon} tournament${championshipsWon > 1 ? "s" : ""}`,
      icon: "Trophy",
      color: "text-amber-500",
    });
  }

  if (winRate >= 60 && totalMatches >= 10) {
    achievements.push({
      id: "win_rate_milestone",
      title: "Win Rate Milestone",
      description: `Maintained ${Math.round(winRate)}%+ win rate`,
      icon: "Star",
      color: "text-blue-500",
    });
  }

  if (top4Finishes >= 3) {
    achievements.push({
      id: "consistent_performer",
      title: "Consistent Performer",
      description: `Finished top 4 in ${top4Finishes} tournaments`,
      icon: "Award",
      color: "text-green-500",
    });
  }

  return {
    myTournaments,
    recentActivity,
    achievements,
    stats: {
      winRate: Math.round(winRate * 10) / 10,
      winRateChange: 0,
      currentRating: 1500,
      ratingRank: 0,
      activeTournaments: activeTournamentsCount,
      totalEnrolled: tournamentRegistrations?.length ?? 0,
      championPoints: totalChampionPoints,
    },
  };
}

/**
 * Get registration status for a tournament (for current user)
 * Includes tournament info, registration stats, and user's registration status
 */
export async function getRegistrationStatus(
  supabase: TypedClient,
  tournamentId: number
) {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileId: number | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("alts")
      .select("id")
      .eq("user_id", user.id)
      .single();
    profileId = (profile?.id as number) ?? null;
  }

  // Get tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (tournamentError || !tournament) {
    throw new Error("Tournament not found");
  }

  // Get registration counts
  const { data: registrations } = await supabase
    .from("tournament_registrations")
    .select("status")
    .eq("tournament_id", tournamentId);

  const regs = registrations ?? [];
  const registeredCount = regs.filter(
    (r) =>
      r.status === "registered" ||
      r.status === "confirmed" ||
      r.status === "checked_in"
  ).length;
  const waitlistCount = regs.filter((r) => r.status === "waitlist").length;

  // Get user's registration if logged in
  let userStatus: {
    status: string;
    waitlistPosition?: number;
  } | null = null;

  if (profileId) {
    const { data: userReg } = await supabase
      .from("tournament_registrations")
      .select("status")
      .eq("tournament_id", tournamentId)
      .eq("profile_id", profileId)
      .single();

    if (userReg) {
      let waitlistPosition: number | undefined;
      if (userReg.status === "waitlist") {
        // Calculate waitlist position
        const { data: waitlistRegs } = await supabase
          .from("tournament_registrations")
          .select("profile_id, registered_at")
          .eq("tournament_id", tournamentId)
          .eq("status", "waitlist")
          .order("registered_at", { ascending: true });

        const position = waitlistRegs?.findIndex(
          (r) => r.profile_id === profileId
        );
        waitlistPosition =
          position !== undefined && position >= 0 ? position + 1 : undefined;
      }

      userStatus = {
        status: userReg.status ?? "unknown",
        waitlistPosition,
      };
    }
  }

  // Determine registration status
  const isFull = tournament.max_participants
    ? registeredCount >= tournament.max_participants
    : false;

  const now = Date.now();
  const registrationDeadline = tournament.registration_deadline
    ? new Date(tournament.registration_deadline).getTime()
    : null;
  const isRegistrationOpen =
    tournament.status === "upcoming" &&
    (!registrationDeadline || now < registrationDeadline);

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      maxParticipants: tournament.max_participants,
      registrationDeadline: registrationDeadline,
    },
    registrationStats: {
      registered: registeredCount,
      waitlist: waitlistCount,
    },
    userStatus,
    isRegistrationOpen,
    isFull,
  };
}

/**
 * Get tournament invitations sent for a tournament
 */
export async function getTournamentInvitationsSent(
  supabase: TypedClient,
  tournamentId: number
) {
  const { data, error } = await supabase
    .from("tournament_invitations")
    .select(
      `
      *,
      invitedPlayer:profiles!tournament_invitations_invited_profile_id_fkey(
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq("tournament_id", tournamentId)
    .order("invited_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((inv) => ({
    ...inv,
    invitedPlayer: inv.invitedPlayer
      ? {
          id: inv.invitedPlayer.id,
          username: inv.invitedPlayer.username,
          displayName: inv.invitedPlayer.display_name,
          avatarUrl: inv.invitedPlayer.avatar_url,
        }
      : null,
  }));
}

/**
 * Get tournament invitations received by current user
 */
export async function getTournamentInvitationsReceived(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return [];

  const { data, error } = await supabase
    .from("tournament_invitations")
    .select(
      `
      *,
      tournament:tournaments(*),
      invitedBy:profiles!tournament_invitations_invited_by_profile_id_fkey(
        id,
        display_name,
        username,
        avatar_url
      )
    `
    )
    .eq("invited_profile_id", profile.id)
    .order("invited_at", { ascending: false });

  if (error) throw error;

  const now = Date.now();

  return (data ?? []).map((inv) => ({
    ...inv,
    id: inv.id,
    status: inv.status,
    message: inv.message,
    invitedAt: inv.invited_at ? new Date(inv.invited_at).getTime() : Date.now(),
    expiresAt: inv.expires_at ? new Date(inv.expires_at).getTime() : null,
    respondedAt: inv.responded_at ? new Date(inv.responded_at).getTime() : null,
    isExpired: inv.expires_at
      ? new Date(inv.expires_at).getTime() < now
      : false,
    tournament: inv.tournament,
    invitedBy: inv.invitedBy
      ? {
          id: inv.invitedBy.id,
          displayName: inv.invitedBy.display_name,
          username: inv.invitedBy.username,
          avatarUrl: inv.invitedBy.avatar_url,
        }
      : null,
  }));
}
