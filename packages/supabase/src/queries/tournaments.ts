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
  } = {},
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
      { count: "exact" },
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
    }),
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
    organizationId?: string;
    status?: TournamentStatus;
    includeArchived?: boolean;
  } = {},
) {
  const { limit = 10, offset = 0, includeArchived = false } = options;

  let query = supabase
    .from("tournaments")
    .select(
      `
      *,
      organization:organizations(*)
    `,
      { count: "exact" },
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
    }),
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
  tournamentSlug: string,
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
    `,
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
export async function getTournamentById(supabase: TypedClient, id: string) {
  const { data, error } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      organization:organizations(*)
    `,
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
  tournamentId: string,
) {
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select(
      `
      *,
      profile:profiles(*),
      team:teams(*)
    `,
    )
    .eq("tournament_id", tournamentId)
    .order("registered_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Check if profile is registered for tournament
 */
export async function isRegisteredForTournament(
  supabase: TypedClient,
  tournamentId: string,
  profileId: string,
) {
  const { data } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("profile_id", profileId)
    .single();

  return !!data;
}

/**
 * Get tournament phases
 */
export async function getTournamentPhases(
  supabase: TypedClient,
  tournamentId: string,
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
  phaseId: string,
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
export async function getRoundMatches(supabase: TypedClient, roundId: string) {
  const { data, error } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      player1:profiles!tournament_matches_player1_profile_id_fkey(*),
      player2:profiles!tournament_matches_player2_profile_id_fkey(*),
      winner:profiles!tournament_matches_winner_profile_id_fkey(*)
    `,
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
  tournamentId: string,
) {
  const { data, error } = await supabase
    .from("tournament_standings")
    .select(
      `
      *,
      profile:profiles(*)
    `,
    )
    .eq("tournament_id", tournamentId)
    .order("standing", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Get player stats for a tournament
 */
export async function getPlayerTournamentStats(
  supabase: TypedClient,
  tournamentId: string,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("tournament_player_stats")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("profile_id", profileId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get all matches for a player in a tournament
 */
export async function getPlayerMatches(
  supabase: TypedClient,
  tournamentId: string,
  profileId: string,
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
      player1:profiles!tournament_matches_player1_profile_id_fkey(*),
      player2:profiles!tournament_matches_player2_profile_id_fkey(*),
      round:tournament_rounds(*)
    `,
    )
    .in("round_id", roundIds)
    .or(`player1_profile_id.eq.${profileId},player2_profile_id.eq.${profileId}`)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
