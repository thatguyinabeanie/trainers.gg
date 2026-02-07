import type { Database } from "@trainers/supabase/types";
import { createQuery, createMutation } from "./query-factory";
import { apiCall } from "./client";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];

/**
 * Tournament API hooks using TanStack Query
 *
 * All hooks follow consistent patterns:
 * - Queries return { data, isLoading, error }
 * - Mutations return { mutate, mutateAsync, isLoading, error }
 * - Mutations automatically invalidate related queries on success
 */

/**
 * Query hook: Get tournament by ID
 *
 * @example
 * ```tsx
 * const { data: tournament, isLoading } = useTournament('123');
 * ```
 */
export function useTournament(id: string) {
  return createQuery<Tournament>(["tournament", id], `api-tournaments/${id}`, {
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Query hook: List tournaments grouped by status
 *
 * @example
 * ```tsx
 * const { data: tournaments } = useTournaments();
 * // tournaments.active, tournaments.upcoming, tournaments.completed
 * ```
 */
export function useTournaments() {
  return createQuery<{
    active: Tournament[];
    upcoming: Tournament[];
    completed: Tournament[];
  }>(["tournaments"], "api-tournaments", {
    staleTime: 30_000, // 30 seconds
  });
}

/**
 * Mutation hook: Register for tournament
 *
 * @example
 * ```tsx
 * const register = useRegisterTournament();
 *
 * await register.mutateAsync({
 *   tournamentId: '123',
 *   altId: '456',
 * });
 * ```
 */
export function useRegisterTournament() {
  return createMutation<
    { success: true },
    { tournamentId: string; altId: string }
  >(
    ({ tournamentId, altId }) =>
      apiCall(`api-tournaments/${tournamentId}/register`, {
        method: "POST",
        body: JSON.stringify({ altId }),
      }),
    {
      invalidates: (variables) => [
        ["tournament", variables.tournamentId],
        ["tournaments"],
      ],
    }
  );
}

/**
 * Mutation hook: Cancel tournament registration
 *
 * @example
 * ```tsx
 * const cancel = useCancelRegistration();
 * await cancel.mutateAsync({ tournamentId: '123' });
 * ```
 */
export function useCancelRegistration() {
  return createMutation<{ success: true }, { tournamentId: string }>(
    ({ tournamentId }) =>
      apiCall(`api-tournaments/${tournamentId}/registration`, {
        method: "DELETE",
      }),
    {
      invalidates: (variables) => [
        ["tournament", variables.tournamentId],
        ["tournaments"],
      ],
    }
  );
}

/**
 * Mutation hook: Check in to tournament
 *
 * @example
 * ```tsx
 * const checkIn = useCheckInTournament();
 * await checkIn.mutateAsync({ tournamentId: '123' });
 * ```
 */
export function useCheckInTournament() {
  return createMutation<{ success: true }, { tournamentId: string }>(
    ({ tournamentId }) =>
      apiCall(`api-tournaments/${tournamentId}/check-in`, {
        method: "POST",
      }),
    {
      invalidates: (variables) => [["tournament", variables.tournamentId]],
    }
  );
}
