import type { Database } from "../types";
import type { TypedClient } from "../client";
import { checkRegistrationOpen, checkCheckInOpen } from "../utils/registration";

type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

// Base tournament type from query
type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];
type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];

export type TournamentWithOrg = TournamentRow & {
  organization: Pick<OrganizationRow, "id" | "name" | "slug"> | null;
  registrationCount: number;
  winner: { id: number; username: string } | null;
};

export type GroupedTournaments = {
  active: TournamentWithOrg[];
  upcoming: TournamentWithOrg[];
  completed: TournamentWithOrg[];
};

/**
 * List tournaments grouped by status for the public browse page
 * Returns active, upcoming, and recently completed tournaments in a single call
 */
export async function listTournamentsGrouped(
  supabase: TypedClient,
  options: {
    completedLimit?: number;
  } = {}
): Promise<GroupedTournaments> {
  const { completedLimit = 10 } = options;

  // Fetch all non-archived tournaments that are active, upcoming, or completed
  const { data, error } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      organization:organizations(id, name, slug)
    `
    )
    .is("archived_at", null)
    .in("status", ["active", "upcoming", "completed"])
    .order("start_date", { ascending: true, nullsFirst: false });

  if (error) throw error;

  const tournaments = data ?? [];

  // Get registration counts for all tournaments using RPC function
  // This avoids the PostgREST 1000-row pagination limit
  const tournamentIds = tournaments.map((t) => t.id);

  // Count registrations per tournament
  const countMap: Record<string, number> = {};

  if (tournamentIds.length > 0) {
    const { data: regCounts, error: regError } = await supabase.rpc(
      "get_registration_counts",
      { tournament_ids: tournamentIds }
    );

    if (regError) {
      console.error("Error fetching registration counts:", regError);
    }

    for (const row of regCounts ?? []) {
      countMap[String(row.tournament_id)] = Number(row.registration_count);
    }
  }

  // Get winners for completed tournaments
  const completedTournamentIds = tournaments
    .filter((t) => t.status === "completed")
    .map((t) => t.id);

  const winnerMap: Record<string, { id: number; username: string }> = {};

  if (completedTournamentIds.length > 0) {
    const { data: standings, error: standingsError } = await supabase
      .from("tournament_standings")
      .select(
        `
        tournament_id,
        alt:alts(id, username)
      `
      )
      .in("tournament_id", completedTournamentIds)
      .eq("rank", 1);

    if (standingsError) {
      console.error("Error fetching tournament winners:", standingsError);
    }

    for (const standing of standings ?? []) {
      if (standing.alt) {
        winnerMap[String(standing.tournament_id)] = {
          id: standing.alt.id,
          username: standing.alt.username,
        };
      }
    }
  }

  // Add counts and winners to tournaments
  const tournamentsWithCounts: TournamentWithOrg[] = tournaments.map((t) => ({
    ...t,
    registrationCount: countMap[String(t.id)] ?? 0,
    winner: t.status === "completed" ? (winnerMap[String(t.id)] ?? null) : null,
  }));

  // Group by status
  const active = tournamentsWithCounts.filter((t) => t.status === "active");

  const upcoming = tournamentsWithCounts
    .filter((t) => t.status === "upcoming")
    .sort((a, b) => {
      // Sort upcoming by start_date ascending (soonest first)
      const dateA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return dateA - dateB;
    });

  const completed = tournamentsWithCounts
    .filter((t) => t.status === "completed")
    .sort((a, b) => {
      // Sort completed by end_date or start_date descending (most recent first)
      const dateA = a.end_date || a.start_date;
      const dateB = b.end_date || b.start_date;
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, completedLimit);

  return { active, upcoming, completed };
}

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

  // Get registration counts for all tournaments in a single query
  const tournamentIds = (data ?? []).map((t) => t.id);
  const { data: regCounts } = tournamentIds.length
    ? await supabase.rpc("get_registration_counts", {
        tournament_ids: tournamentIds,
      })
    : { data: [] };

  // Build a map of tournament_id -> count
  const countMap: Record<string, number> = {};
  for (const row of regCounts ?? []) {
    countMap[String(row.tournament_id)] = Number(row.registration_count);
  }

  const tournamentsWithCounts = (data ?? []).map((tournament) => ({
    ...tournament,
    participants: Array(countMap[String(tournament.id)] ?? 0).fill(null), // Mimic Convex structure
    registrationCount: countMap[String(tournament.id)] ?? 0,
  }));

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

  // Get registration counts for all tournaments in a single query
  const tournamentIds = (data ?? []).map((t) => t.id);
  const { data: regCounts } = tournamentIds.length
    ? await supabase.rpc("get_registration_counts", {
        tournament_ids: tournamentIds,
      })
    : { data: [] };

  // Build a map of tournament_id -> count
  const countMap: Record<string, number> = {};
  for (const row of regCounts ?? []) {
    countMap[String(row.tournament_id)] = Number(row.registration_count);
  }

  const tournamentsWithCounts = (data ?? []).map((tournament) => ({
    ...tournament,
    registrationCount: countMap[String(tournament.id)] ?? 0,
  }));

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
  };
}

/**
 * Check if a tournament slug is available (globally unique)
 * Returns true if the slug is available, false if taken
 */
export async function checkTournamentSlugAvailable(
  supabase: TypedClient,
  slug: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data === null;
}

/**
 * Get tournament by slug (globally unique)
 * Used for /tournaments/{slug} public view
 */
export async function getTournamentBySlug(
  supabase: TypedClient,
  tournamentSlug: string
) {
  // Get the tournament by slug (now globally unique)
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      organization:organizations(*)
    `
    )
    .eq("slug", tournamentSlug)
    .is("archived_at", null)
    .single();

  if (error || !tournament) return null;

  // Get additional details including tournament rounds for schedule calculation
  const [registrations, phases, currentPhase] = await Promise.all([
    supabase
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", tournament.id),
    supabase
      .from("tournament_phases")
      .select(
        `
        *,
        tournament_rounds(id, round_number, status, start_time, end_time)
      `
      )
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
 * Get all tournament IDs the current user is registered for
 * Returns a Set of tournament IDs for efficient lookup
 */
export async function getCurrentUserRegisteredTournamentIds(
  supabase: TypedClient
): Promise<Set<number>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Set();

  // Get all alts for this user
  const { data: alts } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", user.id);

  if (!alts || alts.length === 0) return new Set();

  const altIds = alts.map((a) => a.id);

  // Get all registrations for any of the user's alts
  const { data: registrations } = await supabase
    .from("tournament_registrations")
    .select("tournament_id")
    .in("alt_id", altIds);

  if (!registrations) return new Set();

  return new Set(registrations.map((r) => r.tournament_id));
}

/**
 * Get registration details for the current user in a tournament.
 * Returns the user's registration preferences (alt, in-game name, display options).
 */
export async function getUserRegistrationDetails(
  supabase: TypedClient,
  tournamentId: number
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: alts } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", user.id);

  if (!alts || alts.length === 0) return null;
  const altIds = alts.map((a) => a.id);

  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select(
      "id, alt_id, in_game_name, display_name_option, show_country_flag, status"
    )
    .eq("tournament_id", tournamentId)
    .in("alt_id", altIds)
    .limit(1)
    .maybeSingle();

  return registration;
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
 * Get all player stats for a tournament (for standings display)
 * Returns players sorted by current_standing (rank)
 */
export async function getTournamentPlayerStats(
  supabase: TypedClient,
  tournamentId: number,
  options: { includeDropped?: boolean } = {}
) {
  const { includeDropped = false } = options;

  let query = supabase
    .from("tournament_player_stats")
    .select(
      `
      *,
      alt:alts(id, username, avatar_url)
    `
    )
    .eq("tournament_id", tournamentId)
    .order("current_standing", { ascending: true, nullsFirst: false });

  if (!includeDropped) {
    query = query.or("is_dropped.is.null,is_dropped.eq.false");
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

/**
 * Get rounds with match counts for a tournament phase
 * Useful for round selection dropdowns and status display
 */
export async function getPhaseRoundsWithStats(
  supabase: TypedClient,
  phaseId: number
) {
  const { data: rounds, error } = await supabase
    .from("tournament_rounds")
    .select("*")
    .eq("phase_id", phaseId)
    .order("round_number", { ascending: true });

  if (error) throw error;
  if (!rounds || rounds.length === 0) return [];

  // Single query for all match statuses across all rounds
  const roundIds = rounds.map((r) => r.id);
  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("round_id, status, is_bye")
    .in("round_id", roundIds);

  // Group and count by round
  const countsByRound = new Map<
    number,
    { total: number; completed: number; active: number; pending: number }
  >();
  for (const m of matches ?? []) {
    const counts = countsByRound.get(m.round_id) ?? {
      total: 0,
      completed: 0,
      active: 0,
      pending: 0,
    };
    counts.total++;
    // Bye matches count as completed regardless of status (they never activate)
    if (m.status === "completed" || m.is_bye) counts.completed++;
    else if (m.status === "active") counts.active++;
    else counts.pending++;
    countsByRound.set(m.round_id, counts);
  }

  return rounds.map((round) => {
    const counts = countsByRound.get(round.id) ?? {
      total: 0,
      completed: 0,
      active: 0,
      pending: 0,
    };
    return {
      ...round,
      matchCount: counts.total,
      completedCount: counts.completed,
      inProgressCount: counts.active,
      pendingCount: counts.pending,
    };
  });
}

/**
 * Get matches for a round with player stats
 * Includes current record for each player
 */
export async function getRoundMatchesWithStats(
  supabase: TypedClient,
  roundId: number,
  tournamentId: number
) {
  const { data: matches, error } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      player1:alts!tournament_matches_alt1_id_fkey(id, username, avatar_url),
      player2:alts!tournament_matches_alt2_id_fkey(id, username, avatar_url),
      winner:alts!tournament_matches_winner_alt_id_fkey(id, username)
    `
    )
    .eq("round_id", roundId)
    .order("table_number", { ascending: true });

  if (error) throw error;

  // Get player stats for record display
  const altIds = new Set<number>();
  for (const match of matches ?? []) {
    if (match.alt1_id) altIds.add(match.alt1_id);
    if (match.alt2_id) altIds.add(match.alt2_id);
  }

  const { data: stats } = await supabase
    .from("tournament_player_stats")
    .select("alt_id, match_wins, match_losses, match_points")
    .eq("tournament_id", tournamentId)
    .in("alt_id", Array.from(altIds));

  const statsMap = new Map<
    number,
    { wins: number; losses: number; points: number }
  >();
  for (const stat of stats ?? []) {
    statsMap.set(stat.alt_id, {
      wins: stat.match_wins ?? 0,
      losses: stat.match_losses ?? 0,
      points: stat.match_points ?? 0,
    });
  }

  // Enrich matches with player records
  const matchesWithStats = (matches ?? []).map((match) => ({
    ...match,
    player1Stats: match.alt1_id ? (statsMap.get(match.alt1_id) ?? null) : null,
    player2Stats: match.alt2_id ? (statsMap.get(match.alt2_id) ?? null) : null,
  }));

  return matchesWithStats;
}

/**
 * Get all rounds with their matches for a phase (bracket visualization).
 * Fetches matches for every round in a single pass.
 */
export async function getPhaseRoundsWithMatches(
  supabase: TypedClient,
  phaseId: number,
  tournamentId: number
) {
  const { data: rounds, error } = await supabase
    .from("tournament_rounds")
    .select("*")
    .eq("phase_id", phaseId)
    .order("round_number", { ascending: true });

  if (error) throw error;

  const roundIds = (rounds ?? []).map((r) => r.id);
  if (roundIds.length === 0) return [];

  const { data: allMatches, error: mErr } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      player1:alts!tournament_matches_alt1_id_fkey(id, username),
      player2:alts!tournament_matches_alt2_id_fkey(id, username)
    `
    )
    .in("round_id", roundIds)
    .order("table_number", { ascending: true });

  if (mErr) throw mErr;

  // Enrich with player stats
  const statsMap = new Map<number, { wins: number; losses: number }>();

  if (allMatches && allMatches.length > 0) {
    const altIds = new Set<number>();
    for (const m of allMatches) {
      if (m.alt1_id) altIds.add(m.alt1_id);
      if (m.alt2_id) altIds.add(m.alt2_id);
    }

    if (altIds.size > 0) {
      const { data: stats } = await supabase
        .from("tournament_player_stats")
        .select("alt_id, match_wins, match_losses")
        .eq("tournament_id", tournamentId)
        .in("alt_id", Array.from(altIds));

      for (const s of stats ?? []) {
        statsMap.set(s.alt_id, {
          wins: s.match_wins ?? 0,
          losses: s.match_losses ?? 0,
        });
      }
    }
  }

  // Group matches by round_id
  const matchesByRound = new Map<
    number,
    (typeof allMatches extends (infer T)[] | null ? T : never)[]
  >();
  for (const match of allMatches ?? []) {
    const list = matchesByRound.get(match.round_id) ?? [];
    list.push(match);
    matchesByRound.set(match.round_id, list);
  }

  return (rounds ?? []).map((round) => ({
    ...round,
    matches: (matchesByRound.get(round.id) ?? []).map((match) => ({
      ...match,
      player1Stats: match.alt1_id
        ? (statsMap.get(match.alt1_id) ?? null)
        : null,
      player2Stats: match.alt2_id
        ? (statsMap.get(match.alt2_id) ?? null)
        : null,
    })),
  }));
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
        lateMaxRound: null,
        registrationStatus: null,
      };
    }

    const { data: alt } = await supabase
      .from("alts")
      .select("id")
      .eq("user_id", user.id)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!alt) {
      return {
        isRegistered: false,
        isCheckedIn: false,
        checkInOpen: false,
        lateMaxRound: null,
        registrationStatus: null,
      };
    }
    targetAltId = alt.id as number;
  }

  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      "status, allow_late_registration, current_round, late_check_in_max_round"
    )
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

  const {
    isOpen: checkInOpen,
    isLateCheckIn,
    lateMaxRound,
  } = checkCheckInOpen(tournament);

  return {
    isRegistered: !!registration,
    isCheckedIn: registration?.status === "checked_in",
    checkInOpen,
    isLateCheckIn,
    lateMaxRound,
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
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

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
    .select("*, tournament:tournaments!tournament_phases_tournament_id_fkey(*)")
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
 * Get match details by tournament slug, round number, and table number.
 *
 * Looks up the tournament by slug, then finds the match through the
 * phase/round chain using round_number and table_number. Returns the
 * same shape as getMatchDetails().
 */
export async function getMatchByRoundAndTable(
  supabase: TypedClient,
  tournamentSlug: string,
  roundNumber: number,
  tableNumber: number
) {
  // Step 1: Look up tournament by slug
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", tournamentSlug)
    .maybeSingle();

  if (!tournament) return null;

  // Step 2: Get all phase IDs for this tournament
  const { data: phases } = await supabase
    .from("tournament_phases")
    .select("id")
    .eq("tournament_id", tournament.id);

  if (!phases?.length) return null;

  const phaseIds = phases.map((p) => p.id);

  // Step 3: Find the round by round_number within this tournament's phases
  const { data: round } = await supabase
    .from("tournament_rounds")
    .select("*")
    .in("phase_id", phaseIds)
    .eq("round_number", roundNumber)
    .maybeSingle();

  if (!round) return null;

  // Step 4: Find the match by table_number within this round
  const { data: match } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      player1:alts!tournament_matches_alt1_id_fkey(*),
      player2:alts!tournament_matches_alt2_id_fkey(*)
    `
    )
    .eq("round_id", round.id)
    .eq("table_number", tableNumber)
    .maybeSingle();

  if (!match) return null;

  // Step 5: Get the phase with tournament info
  const { data: phase } = await supabase
    .from("tournament_phases")
    .select("*, tournament:tournaments!tournament_phases_tournament_id_fkey(*)")
    .eq("id", round.phase_id)
    .single();

  return {
    match,
    player1: match.player1,
    player2: match.player2,
    round,
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
 * Get all matches for a tournament across all rounds.
 * Used by the judge/staff views to see all active and pending matches.
 * Supports filtering by status and staff_requested flag.
 */
type PhaseStatus = Database["public"]["Enums"]["phase_status"];

export async function getTournamentMatchesForStaff(
  supabase: TypedClient,
  tournamentId: number,
  options: {
    status?: PhaseStatus;
    staffRequested?: boolean;
    limit?: number;
  } = {}
) {
  const { status, staffRequested, limit = 200 } = options;

  // Get all phase IDs for this tournament
  const { data: phases } = await supabase
    .from("tournament_phases")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (!phases?.length) return [];

  const phaseIds = phases.map((p) => p.id);

  // Get all round IDs for those phases
  const { data: rounds } = await supabase
    .from("tournament_rounds")
    .select("id, round_number, phase_id, status")
    .in("phase_id", phaseIds)
    .order("round_number", { ascending: true });

  if (!rounds?.length) return [];

  const roundIds = rounds.map((r) => r.id);

  let query = supabase
    .from("tournament_matches")
    .select(
      `
      *,
      player1:alts!tournament_matches_alt1_id_fkey(id, username, avatar_url),
      player2:alts!tournament_matches_alt2_id_fkey(id, username, avatar_url),
      winner:alts!tournament_matches_winner_alt_id_fkey(id, username)
    `
    )
    .in("round_id", roundIds)
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  if (staffRequested !== undefined) {
    query = query.eq("staff_requested", staffRequested);
  }

  // Order: staff_requested first, then by staff_requested_at (oldest first), then table_number
  query = query
    .order("staff_requested", { ascending: false })
    .order("staff_requested_at", { ascending: true, nullsFirst: false })
    .order("table_number", { ascending: true });

  const { data, error } = await query;

  if (error) throw error;

  // Attach round info to each match
  const roundMap = new Map(rounds.map((r) => [r.id, r]));
  return (data ?? []).map((match) => ({
    ...match,
    roundInfo: roundMap.get(match.round_id) ?? null,
  }));
}

/**
 * Get dashboard data for current user
 * Returns tournaments, organizations, stats, recent activity, and achievements
 */
/**
 * Get the user's active (pending or in-progress) match
 * - pending: match is ready but not started
 * - active: match is in progress
 */
export async function getActiveMatch(supabase: TypedClient, altId: number) {
  const { data: match } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      player1:alts!tournament_matches_alt1_id_fkey(id, username),
      player2:alts!tournament_matches_alt2_id_fkey(id, username),
      round:tournament_rounds(
        id,
        round_number,
        phase:tournament_phases(
          id,
          name,
          tournament:tournaments(id, name, slug)
        )
      )
    `
    )
    .in("status", ["pending", "active"])
    .or(`alt1_id.eq.${altId},alt2_id.eq.${altId}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!match) return null;

  // Extract tournament and round info
  const round = match.round as {
    id: number;
    round_number: number;
    phase: {
      id: number;
      name: string;
      tournament: { id: number; name: string; slug: string } | null;
    } | null;
  } | null;

  const tournament = round?.phase?.tournament;
  if (!tournament) return null;

  // Determine opponent
  const isPlayer1 = match.alt1_id === altId;
  const opponent = isPlayer1 ? match.player2 : match.player1;
  const opponentArr = opponent as { id: number; username: string }[] | null;
  const opponentProfile = opponentArr?.[0] ?? null;

  return {
    id: match.id,
    status: match.status as "pending" | "active",
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    tournamentSlug: tournament.slug,
    roundNumber: round?.round_number ?? 0,
    phaseName: round?.phase?.name ?? "",
    opponent: opponentProfile
      ? {
          id: opponentProfile.id,
          displayName: opponentProfile.username,
          username: opponentProfile.username,
        }
      : null,
    table: match.table_number,
  };
}

export async function getMyDashboardData(supabase: TypedClient, altId: number) {
  // Fetch all registrations for this user
  const { data: tournamentRegistrations } = await supabase
    .from("tournament_registrations")
    .select(
      `
      *,
      tournament:tournaments(*)
    `
    )
    .eq("alt_id", altId);

  // Build myTournaments list (exclude archived)
  const myTournaments: {
    id: number;
    name: string;
    startDate: string | null;
    status: string;
    hasTeam: boolean;
    registrationStatus: string;
    registrationId: number;
    lateCheckInMaxRound: number | null;
  }[] = [];
  let activeTournamentsCount = 0;

  for (const reg of tournamentRegistrations ?? []) {
    const tournament = reg.tournament as {
      id: number;
      name: string;
      start_date: string | null;
      status: string;
      archived_at: string | null;
      late_check_in_max_round: number | null;
    } | null;

    if (tournament && !tournament.archived_at) {
      myTournaments.push({
        id: tournament.id,
        name: tournament.name,
        startDate: tournament.start_date,
        status: tournament.status,
        hasTeam: reg.team_id != null,
        registrationStatus: reg.status ?? "registered",
        registrationId: reg.id,
        lateCheckInMaxRound: tournament.late_check_in_max_round ?? null,
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
    .eq("alt_id", altId);

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
      player1:alts!tournament_matches_alt1_id_fkey(id),
      player2:alts!tournament_matches_alt2_id_fkey(id),
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
    .or(`alt1_id.eq.${altId},alt2_id.eq.${altId}`)
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

    const isPlayer1 = match.alt1_id === altId;
    const opponent = isPlayer1 ? match.player2 : match.player1;
    // player1/player2 are arrays from Supabase join, take first element
    const opponentArr = opponent as { id: number; username: string }[] | null;
    const opponentProfile = opponentArr?.[0] ?? null;
    const won = match.winner_alt_id === altId;

    recentActivity.push({
      id: match.id,
      tournamentName: tournament.name,
      opponentName: opponentProfile?.username || "Unknown",
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
  // Get current user (may fail if signed out or session expired)
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Auth unavailable — continue as unauthenticated
  }

  let altId: number | null = null;
  if (user) {
    const { data: alt } = await supabase
      .from("alts")
      .select("id")
      .eq("user_id", user.id)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    altId = (alt?.id as number) ?? null;
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
    hasTeam: boolean;
    waitlistPosition?: number;
  } | null = null;

  if (altId) {
    const { data: userReg } = await supabase
      .from("tournament_registrations")
      .select("status, team_id")
      .eq("tournament_id", tournamentId)
      .eq("alt_id", altId)
      .single();

    if (userReg) {
      let waitlistPosition: number | undefined;
      if (userReg.status === "waitlist") {
        // Calculate waitlist position
        const { data: waitlistRegs } = await supabase
          .from("tournament_registrations")
          .select("alt_id, registered_at")
          .eq("tournament_id", tournamentId)
          .eq("status", "waitlist")
          .order("registered_at", { ascending: true });

        const position = waitlistRegs?.findIndex((r) => r.alt_id === altId);
        waitlistPosition =
          position !== undefined && position >= 0 ? position + 1 : undefined;
      }

      userStatus = {
        status: userReg.status ?? "unknown",
        hasTeam: !!userReg.team_id,
        waitlistPosition,
      };
    }
  }

  // Determine registration status
  const isFull = tournament.max_participants
    ? registeredCount >= tournament.max_participants
    : false;

  const { isOpen: isRegistrationOpen, isLateRegistration } =
    checkRegistrationOpen(tournament);

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      maxParticipants: tournament.max_participants,
      lateCheckInMaxRound: tournament.late_check_in_max_round,
      currentRound: tournament.current_round,
      allowLateRegistration: tournament.allow_late_registration,
      startDate: tournament.start_date,
    },
    registrationStats: {
      registered: registeredCount,
      waitlist: waitlistCount,
    },
    userStatus,
    isRegistrationOpen,
    isLateRegistration,
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
      invitedPlayer:alts!tournament_invitations_invited_alt_id_fkey(
        id,
        username,
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
          displayName: inv.invitedPlayer.username,
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

  const { data: alt } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", user.id)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!alt) return [];

  const { data, error } = await supabase
    .from("tournament_invitations")
    .select(
      `
      *,
      tournament:tournaments(*),
      invitedBy:alts!tournament_invitations_invited_by_alt_id_fkey(
        id,
        username,
        avatar_url
      )
    `
    )
    .eq("invited_alt_id", alt.id)
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
          displayName: inv.invitedBy.username,
          username: inv.invitedBy.username,
          avatarUrl: inv.invitedBy.avatar_url,
        }
      : null,
  }));
}

/**
 * Get the submitted team for a player's tournament registration.
 * Returns null if no team is submitted.
 * RLS policies enforce visibility (own team, or open teamsheets).
 */
export async function getTeamForRegistration(
  supabase: TypedClient,
  tournamentId: number,
  altId?: number
) {
  let targetAltId: number | undefined = altId;

  if (!targetAltId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: alt } = await supabase
      .from("alts")
      .select("id")
      .eq("user_id", user.id)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!alt) return null;
    targetAltId = alt.id as number;
  }

  // Get registration with team info
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, team_id, team_submitted_at, team_locked")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", targetAltId!)
    .single();

  if (!registration?.team_id) return null;

  // Get team with pokemon
  const { data: team } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", registration.team_id)
    .single();

  if (!team) return null;

  const { data: teamPokemon } = await supabase
    .from("team_pokemon")
    .select(
      `
      team_position,
      pokemon:pokemon (
        id, species, nickname, level, ability, nature, held_item,
        move1, move2, move3, move4,
        ev_hp, ev_attack, ev_defense, ev_special_attack, ev_special_defense, ev_speed,
        iv_hp, iv_attack, iv_defense, iv_special_attack, iv_special_defense, iv_speed,
        tera_type, gender, is_shiny
      )
    `
    )
    .eq("team_id", registration.team_id)
    .order("team_position");

  return {
    teamId: team.id,
    teamName: team.name,
    submittedAt: registration.team_submitted_at,
    locked: registration.team_locked,
    pokemon:
      teamPokemon?.map((tp) => ({
        position: tp.team_position,
        ...tp.pokemon,
      })) ?? [],
  };
}

/**
 * Get checked-in players who are NOT paired in a given round.
 * Used to surface late arrivals who registered/checked-in after pairings
 * were generated, so TOs know to include them in the next round.
 */
export async function getUnpairedCheckedInPlayers(
  supabase: TypedClient,
  tournamentId: number,
  roundId: number
) {
  // Get all checked-in registrations
  const { data: registrations, error: regErr } = await supabase
    .from("tournament_registrations")
    .select("alt_id, registered_at, checked_in_at")
    .eq("tournament_id", tournamentId)
    .eq("status", "checked_in");

  if (regErr) throw regErr;
  if (!registrations || registrations.length === 0) return [];

  // Get all alt IDs that are paired in this round
  const { data: matches, error: matchErr } = await supabase
    .from("tournament_matches")
    .select("alt1_id, alt2_id")
    .eq("round_id", roundId);

  if (matchErr) throw matchErr;

  const pairedAltIds = new Set<number>();
  for (const match of matches ?? []) {
    if (match.alt1_id) pairedAltIds.add(match.alt1_id);
    if (match.alt2_id) pairedAltIds.add(match.alt2_id);
  }

  // Filter to unpaired players
  const unpairedAltIds = registrations
    .filter((r) => r.alt_id !== null && !pairedAltIds.has(r.alt_id))
    .map((r) => r.alt_id as number);

  if (unpairedAltIds.length === 0) return [];

  // Fetch alt details for display
  const { data: alts, error: altErr } = await supabase
    .from("alts")
    .select("id, username")
    .in("id", unpairedAltIds);

  if (altErr) throw altErr;

  // Merge registration info with alt details
  const altMap = new Map(alts?.map((a) => [a.id, a]) ?? []);

  return registrations
    .filter((r) => r.alt_id !== null && !pairedAltIds.has(r.alt_id))
    .map((r) => {
      const alt = altMap.get(r.alt_id!);
      return {
        altId: r.alt_id!,
        username: alt?.username ?? "Unknown",
        displayName: alt?.username ?? null,
        checkedInAt: r.checked_in_at,
      };
    });
}

/**
 * Get tournament history for the current user across all their alts.
 * Returns completed tournaments with full participation details including
 * placement, record, team, and organization info.
 */
export async function getUserTournamentHistory(supabase: TypedClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get all alts for this user
  const { data: alts } = await supabase
    .from("alts")
    .select("id, username")
    .eq("user_id", user.id);

  if (!alts || alts.length === 0) return [];

  const altIds = alts.map((a) => a.id);

  // Get all registrations for user's alts with tournament and org info
  const { data: registrations, error } = await supabase
    .from("tournament_registrations")
    .select(
      `
      id,
      alt_id,
      status,
      registered_at,
      team_id,
      tournament:tournaments!tournament_registrations_tournament_id_fkey (
        id,
        name,
        slug,
        start_date,
        end_date,
        status,
        format,
        organization:organizations!tournaments_organization_id_fkey (
          id,
          name,
          slug
        )
      )
    `
    )
    .in("alt_id", altIds)
    .order("registered_at", { ascending: false });

  if (error) throw error;
  if (!registrations || registrations.length === 0) return [];

  // Get tournament IDs for completed tournaments
  const completedTournamentIds = registrations
    .filter(
      (r) =>
        r.tournament &&
        typeof r.tournament === "object" &&
        "status" in r.tournament &&
        r.tournament.status === "completed"
    )
    .map((r) =>
      typeof r.tournament === "object" && "id" in r.tournament
        ? (r.tournament.id as number)
        : 0
    )
    .filter((id) => id > 0);

  // Get standings for completed tournaments
  const standingsMap = new Map<
    number,
    { rank: number; wins: number; losses: number; ties: number }
  >();

  if (completedTournamentIds.length > 0) {
    const { data: standings } = await supabase
      .from("tournament_standings")
      .select("tournament_id, alt_id, rank, game_wins, game_losses")
      .in("tournament_id", completedTournamentIds)
      .in("alt_id", altIds);

    for (const standing of standings ?? []) {
      standingsMap.set(Number(`${standing.tournament_id}_${standing.alt_id}`), {
        rank: standing.rank ?? 0,
        wins: standing.game_wins ?? 0,
        losses: standing.game_losses ?? 0,
        ties: 0, // tournament_standings doesn't track ties separately
      });
    }
  }

  // Get team Pokemon for registrations that have teams
  const registrationTeamIds = registrations
    .filter((r) => r.team_id)
    .map((r) => r.team_id as number);

  const teamPokemonMap = new Map<number, string[]>();

  if (registrationTeamIds.length > 0) {
    const { data: teamPokemon } = await supabase
      .from("team_pokemon")
      .select(
        `
        team_id,
        team_position,
        pokemon:pokemon!team_pokemon_pokemon_id_fkey(species)
      `
      )
      .in("team_id", registrationTeamIds)
      .order("team_position", { ascending: true });

    for (const tp of teamPokemon ?? []) {
      const existing = teamPokemonMap.get(tp.team_id) ?? [];
      const species =
        tp.pokemon && typeof tp.pokemon === "object" && "species" in tp.pokemon
          ? (tp.pokemon.species as string)
          : "";
      if (species) {
        existing.push(species);
      }
      teamPokemonMap.set(tp.team_id, existing);
    }
  }

  // Build alt lookup map
  const altMap = new Map(alts.map((a) => [a.id, a]));

  // Map registrations to history records
  return registrations
    .filter(
      (r) =>
        r.tournament &&
        typeof r.tournament === "object" &&
        "status" in r.tournament &&
        r.tournament.status === "completed"
    )
    .map((r) => {
      const tournament =
        r.tournament && typeof r.tournament === "object" ? r.tournament : null;
      const org =
        tournament &&
        "organization" in tournament &&
        tournament.organization &&
        typeof tournament.organization === "object"
          ? tournament.organization
          : null;

      const standing = standingsMap.get(
        Number(`${tournament?.id}_${r.alt_id}`)
      );
      const alt = altMap.get(r.alt_id);
      const teamPokemon = r.team_id
        ? (teamPokemonMap.get(r.team_id) ?? [])
        : [];

      return {
        id: r.id,
        tournamentId:
          tournament && "id" in tournament ? (tournament.id as number) : 0,
        tournamentName:
          tournament && "name" in tournament ? (tournament.name as string) : "",
        tournamentSlug:
          tournament && "slug" in tournament ? (tournament.slug as string) : "",
        organizationName: org && "name" in org ? (org.name as string) : "",
        organizationSlug: org && "slug" in org ? (org.slug as string) : "",
        startDate:
          tournament && "start_date" in tournament
            ? (tournament.start_date as string | null)
            : null,
        endDate:
          tournament && "end_date" in tournament
            ? (tournament.end_date as string | null)
            : null,
        format:
          tournament && "format" in tournament
            ? (tournament.format as string | null)
            : null,
        altId: r.alt_id,
        altUsername: alt?.username ?? "",
        altDisplayName: alt?.username ?? null,
        placement: standing?.rank ?? null,
        wins: standing?.wins ?? 0,
        losses: standing?.losses ?? 0,
        ties: standing?.ties ?? 0,
        teamPokemon,
        registeredAt: r.registered_at,
      };
    });
}

/**
 * Get tournament history for a player's public profile.
 * Unlike getUserTournamentHistory, this takes altIds directly (no auth required)
 * and only returns completed tournaments.
 */
export async function getPlayerTournamentHistory(
  supabase: TypedClient,
  altIds: number[]
) {
  if (altIds.length === 0) return [];

  // Get all registrations for the given alts with tournament and org info
  const { data: registrations, error } = await supabase
    .from("tournament_registrations")
    .select(
      `
      id,
      alt_id,
      status,
      registered_at,
      team_id,
      tournament:tournaments!tournament_registrations_tournament_id_fkey (
        id,
        name,
        slug,
        start_date,
        status,
        format,
        organization:organizations!tournaments_organization_id_fkey (
          id,
          name,
          slug
        )
      )
    `
    )
    .in("alt_id", altIds)
    .order("registered_at", { ascending: false });

  if (error) throw error;
  if (!registrations || registrations.length === 0) return [];

  // Filter to completed tournaments only
  const completedRegistrations = registrations.filter(
    (r) =>
      r.tournament &&
      typeof r.tournament === "object" &&
      "status" in r.tournament &&
      r.tournament.status === "completed"
  );

  if (completedRegistrations.length === 0) return [];

  // Get tournament IDs for completed tournaments
  const completedTournamentIds = completedRegistrations
    .map((r) =>
      typeof r.tournament === "object" && r.tournament && "id" in r.tournament
        ? (r.tournament.id as number)
        : 0
    )
    .filter((id) => id > 0);

  // Get standings for completed tournaments
  const standingsMap = new Map<
    number,
    { rank: number; wins: number; losses: number }
  >();

  if (completedTournamentIds.length > 0) {
    const { data: standings } = await supabase
      .from("tournament_standings")
      .select("tournament_id, alt_id, rank, game_wins, game_losses")
      .in("tournament_id", completedTournamentIds)
      .in("alt_id", altIds);

    for (const standing of standings ?? []) {
      standingsMap.set(Number(`${standing.tournament_id}_${standing.alt_id}`), {
        rank: standing.rank ?? 0,
        wins: standing.game_wins ?? 0,
        losses: standing.game_losses ?? 0,
      });
    }
  }

  // Get team Pokemon for registrations that have teams
  const registrationTeamIds = completedRegistrations
    .filter((r) => r.team_id)
    .map((r) => r.team_id as number);

  const teamPokemonMap = new Map<number, string[]>();

  if (registrationTeamIds.length > 0) {
    const { data: teamPokemon } = await supabase
      .from("team_pokemon")
      .select(
        `
        team_id,
        team_position,
        pokemon:pokemon!team_pokemon_pokemon_id_fkey(species)
      `
      )
      .in("team_id", registrationTeamIds)
      .order("team_position", { ascending: true });

    for (const tp of teamPokemon ?? []) {
      const existing = teamPokemonMap.get(tp.team_id) ?? [];
      const species =
        tp.pokemon && typeof tp.pokemon === "object" && "species" in tp.pokemon
          ? (tp.pokemon.species as string)
          : "";
      if (species) {
        existing.push(species);
      }
      teamPokemonMap.set(tp.team_id, existing);
    }
  }

  // Get player counts for completed tournaments
  const playerCountMap: Record<string, number> = {};

  if (completedTournamentIds.length > 0) {
    const { data: regCounts } = await supabase.rpc("get_registration_counts", {
      tournament_ids: completedTournamentIds,
    });

    for (const row of regCounts ?? []) {
      playerCountMap[String(row.tournament_id)] = Number(
        row.registration_count
      );
    }
  }

  // Map registrations to history records
  return completedRegistrations.map((r) => {
    const tournament =
      r.tournament && typeof r.tournament === "object" ? r.tournament : null;
    const org =
      tournament &&
      "organization" in tournament &&
      tournament.organization &&
      typeof tournament.organization === "object"
        ? tournament.organization
        : null;

    const standing = standingsMap.get(Number(`${tournament?.id}_${r.alt_id}`));
    const teamPokemon = r.team_id ? (teamPokemonMap.get(r.team_id) ?? []) : [];

    const tournamentId =
      tournament && "id" in tournament ? (tournament.id as number) : 0;

    return {
      id: r.id,
      tournamentId,
      tournamentName:
        tournament && "name" in tournament ? (tournament.name as string) : "",
      tournamentSlug:
        tournament && "slug" in tournament ? (tournament.slug as string) : "",
      organizationName: org && "name" in org ? (org.name as string) : "",
      organizationSlug: org && "slug" in org ? (org.slug as string) : "",
      startDate:
        tournament && "start_date" in tournament
          ? (tournament.start_date as string | null)
          : null,
      format:
        tournament && "format" in tournament
          ? (tournament.format as string | null)
          : null,
      playerCount: playerCountMap[String(tournamentId)] ?? null,
      placement: standing?.rank ?? null,
      wins: standing?.wins ?? 0,
      losses: standing?.losses ?? 0,
      teamPokemon,
    };
  });
}

// Return type for getPlayerLifetimeStats
export type PlayerLifetimeStats = {
  tournamentCount: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  bestPlacement: number | null;
  formats: string[];
};

const EMPTY_LIFETIME_STATS: PlayerLifetimeStats = {
  tournamentCount: 0,
  totalWins: 0,
  totalLosses: 0,
  winRate: 0,
  bestPlacement: null,
  formats: [],
};

/**
 * Aggregate lifetime stats across all tournament_player_stats rows for the given alt IDs.
 * Returns total wins, losses, win rate, best placement, and unique formats.
 */
export async function getPlayerLifetimeStats(
  supabase: TypedClient,
  altIds: number[]
): Promise<PlayerLifetimeStats> {
  // Return empty stats immediately if no alt IDs provided
  if (altIds.length === 0) {
    return EMPTY_LIFETIME_STATS;
  }

  const { data, error } = await supabase
    .from("tournament_player_stats")
    .select(
      "tournament_id, alt_id, match_wins, match_losses, final_ranking, tournament:tournaments!tournament_player_stats_tournament_id_fkey(format)"
    )
    .in("alt_id", altIds);

  if (error) throw error;

  const rows = data ?? [];

  if (rows.length === 0) {
    return EMPTY_LIFETIME_STATS;
  }

  // Aggregate across all rows
  let totalWins = 0;
  let totalLosses = 0;
  let bestPlacement: number | null = null;
  const formatSet = new Set<string>();

  for (const row of rows) {
    totalWins += row.match_wins ?? 0;
    totalLosses += row.match_losses ?? 0;

    // Track best (lowest) non-null final_ranking
    if (row.final_ranking != null) {
      if (bestPlacement === null || row.final_ranking < bestPlacement) {
        bestPlacement = row.final_ranking;
      }
    }

    // Collect unique formats from the joined tournament
    const tournament = row.tournament as { format: string | null } | null;
    if (tournament && tournament.format) {
      formatSet.add(tournament.format);
    }
  }

  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

  return {
    tournamentCount: rows.length,
    totalWins,
    totalLosses,
    winRate,
    bestPlacement,
    formats: Array.from(formatSet),
  };
}
