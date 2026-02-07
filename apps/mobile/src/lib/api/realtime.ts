import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabase } from "../supabase";

/**
 * Supabase Realtime hooks for live updates
 *
 * These hooks subscribe to database changes and automatically invalidate
 * TanStack Query caches to trigger refetches.
 *
 * Critical updates use Realtime (near-instant):
 * - Match started
 * - Judge call received
 * - Round started
 * - Game result reported
 *
 * Non-critical updates use TanStack Query polling (30s intervals):
 * - Standings changes
 * - Registration counts
 */

/**
 * Generic Realtime subscription hook
 *
 * @param channelName - Unique channel identifier
 * @param config - Postgres changes configuration
 * @param onInvalidate - Query keys to invalidate on change
 *
 * @example
 * ```ts
 * useRealtimeSubscription(
 *   `tournament:${tournamentId}`,
 *   {
 *     event: 'UPDATE',
 *     schema: 'public',
 *     table: 'tournament_rounds',
 *     filter: `tournament_id=eq.${tournamentId}`,
 *   },
 *   () => [['tournament', tournamentId]]
 * );
 * ```
 */
export function useRealtimeSubscription(
  channelName: string,
  config: {
    event: "INSERT" | "UPDATE" | "DELETE" | "*";
    schema: string;
    table: string;
    filter?: string;
  },
  onInvalidate: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ) => string[][]
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = getSupabase()
      .channel(channelName)
      .on<Record<string, unknown>>(
        "postgres_changes" as const,
        config as never,
        (payload) => {
          console.log("[Realtime]", channelName, payload.eventType);

          // Invalidate specified queries
          const queryKeys = onInvalidate(
            payload as RealtimePostgresChangesPayload<Record<string, unknown>>
          );
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [channelName, queryClient]);
}

/**
 * Subscribe to tournament updates (rounds, matches)
 *
 * @example
 * ```tsx
 * function TournamentScreen({ tournamentId }) {
 *   useTournamentRealtime(tournamentId);
 *   const { data: tournament } = useTournament(tournamentId);
 *   // ... tournament will auto-update when rounds change
 * }
 * ```
 */
export function useTournamentRealtime(tournamentId: string) {
  useRealtimeSubscription(
    `tournament:${tournamentId}`,
    {
      event: "*",
      schema: "public",
      table: "tournament_rounds",
      filter: `tournament_id=eq.${tournamentId}`,
    },
    () => [["tournament", tournamentId]]
  );
}

/**
 * Subscribe to match updates (games, judge calls)
 *
 * @example
 * ```tsx
 * function MatchScreen({ matchId }) {
 *   useMatchRealtime(matchId);
 *   const { data: match } = useMatch(matchId);
 *   // ... match will auto-update when games are reported
 * }
 * ```
 */
export function useMatchRealtime(matchId: string) {
  useRealtimeSubscription(
    `match:${matchId}`,
    {
      event: "*",
      schema: "public",
      table: "match_games",
      filter: `match_id=eq.${matchId}`,
    },
    () => [["match", matchId]]
  );

  // Also subscribe to match updates (judge calls, status changes)
  useRealtimeSubscription(
    `match:${matchId}:updates`,
    {
      event: "UPDATE",
      schema: "public",
      table: "tournament_matches",
      filter: `id=eq.${matchId}`,
    },
    () => [["match", matchId]]
  );
}

/**
 * Subscribe to notification updates
 *
 * @example
 * ```tsx
 * function NotificationsScreen() {
 *   useNotificationsRealtime();
 *   const { data: notifications } = useNotifications();
 *   // ... notifications will auto-update in real-time
 * }
 * ```
 */
export function useNotificationsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to user's notifications (RLS filters by user_id automatically)
    const channel = getSupabase()
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [queryClient]);
}
