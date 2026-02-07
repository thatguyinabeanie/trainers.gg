import type { Database } from "@trainers/supabase/types";
import { createQuery, createMutation } from "./query-factory";
import { apiCall } from "./client";

type Match = Database["public"]["Tables"]["tournament_matches"]["Row"];
type Game = Database["public"]["Tables"]["match_games"]["Row"];

/**
 * Match API hooks using TanStack Query
 */

/**
 * Query hook: Get match by ID
 *
 * @example
 * ```tsx
 * const { data: match, isLoading } = useMatch('123');
 * ```
 */
export function useMatch(id: string) {
  return createQuery<Match>(["match", id], `api-matches/${id}`, {
    staleTime: 30_000, // 30 seconds - matches update frequently during tournaments
  });
}

/**
 * Mutation hook: Report game result
 *
 * @example
 * ```tsx
 * const reportGame = useReportGame();
 *
 * await reportGame.mutateAsync({
 *   matchId: '123',
 *   winnerId: '456',
 *   loserId: '789',
 * });
 * ```
 */
export function useReportGame() {
  return createMutation<
    Game,
    {
      matchId: string;
      winnerId: string;
      loserId: string;
    }
  >(
    ({ matchId, winnerId, loserId }) =>
      apiCall(`api-matches/${matchId}/games`, {
        method: "POST",
        body: JSON.stringify({ winnerId, loserId }),
      }),
    {
      invalidates: (variables) => [
        ["match", variables.matchId],
        ["tournament"], // Invalidate tournament queries to update standings
      ],
    }
  );
}

/**
 * Mutation hook: Update game result
 *
 * @example
 * ```tsx
 * const updateGame = useUpdateGame();
 *
 * await updateGame.mutateAsync({
 *   matchId: '123',
 *   gameId: '456',
 *   winnerId: '789',
 * });
 * ```
 */
export function useUpdateGame() {
  return createMutation<
    Game,
    {
      matchId: string;
      gameId: string;
      winnerId: string;
      loserId: string;
    }
  >(
    ({ matchId, gameId, winnerId, loserId }) =>
      apiCall(`api-matches/${matchId}/games/${gameId}`, {
        method: "PATCH",
        body: JSON.stringify({ winnerId, loserId }),
      }),
    {
      invalidates: (variables) => [
        ["match", variables.matchId],
        ["tournament"],
      ],
    }
  );
}

/**
 * Mutation hook: Request judge assistance
 *
 * @example
 * ```tsx
 * const callJudge = useCallJudge();
 * await callJudge.mutateAsync({
 *   matchId: '123',
 *   reason: 'Rules question',
 * });
 * ```
 */
export function useCallJudge() {
  return createMutation<{ success: true }, { matchId: string; reason: string }>(
    ({ matchId, reason }) =>
      apiCall(`api-matches/${matchId}/judge-call`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    {
      invalidates: (variables) => [["match", variables.matchId]],
    }
  );
}
