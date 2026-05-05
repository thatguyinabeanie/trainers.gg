import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "./client";
import {
  getTournamentBySlug,
  getTeamForRegistration,
} from "@trainers/supabase/queries";

// Tournament detail type from the query return
export type TournamentDetail = NonNullable<
  Awaited<ReturnType<typeof getTournamentBySlug>>
>;

// Team data type from the query return
export type TeamForRegistration = NonNullable<
  Awaited<ReturnType<typeof getTeamForRegistration>>
>;

/**
 * Hook to fetch a single tournament by slug.
 * Returns tournament details including registrations, phases, and counts.
 */
export function useTournament(slug: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery<
    TournamentDetail | null,
    Error
  >({
    queryKey: ["tournament-detail", slug],
    queryFn: async () => {
      const supabase = getSupabase();
      return getTournamentBySlug(supabase, slug!);
    },
    enabled: !!slug,
  });

  return {
    tournament: data ?? null,
    loading: isLoading,
    error: error ?? null,
    refetch,
  };
}

/**
 * Hook to fetch the current user's submitted team for a tournament.
 * Returns null if the user is not registered or has no team submitted.
 */
export function useTeamForRegistration(tournamentId: number | undefined) {
  const { data, isLoading, error, refetch } = useQuery<
    TeamForRegistration | null,
    Error
  >({
    queryKey: ["team-for-registration", tournamentId],
    queryFn: async () => {
      const supabase = getSupabase();
      return getTeamForRegistration(supabase, tournamentId!);
    },
    enabled: !!tournamentId,
  });

  return {
    team: data ?? null,
    loading: isLoading,
    error: error ?? null,
    refetch,
  };
}
