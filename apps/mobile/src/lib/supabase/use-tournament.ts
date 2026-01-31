import { useState, useEffect } from "react";
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
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTournament = async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      const data = await getTournamentBySlug(supabase, slug);
      setTournament(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch tournament")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
  }, [slug]);

  return {
    tournament,
    loading,
    error,
    refetch: fetchTournament,
  };
}

/**
 * Hook to fetch the current user's submitted team for a tournament.
 * Returns null if the user is not registered or has no team submitted.
 */
export function useTeamForRegistration(tournamentId: number | undefined) {
  const [team, setTeam] = useState<TeamForRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeam = async () => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      const data = await getTeamForRegistration(supabase, tournamentId);
      setTeam(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch team"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [tournamentId]);

  return {
    team,
    loading,
    error,
    refetch: fetchTeam,
  };
}
