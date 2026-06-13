import { getCachedTournamentPairings } from "@/lib/data/tournament-pairings-endpoint";

import { PublicPairingsView } from "./public-pairings-view";

interface PublicPairingsProps {
  tournamentId: number;
  tournamentSlug: string;
  canManage?: boolean;
}

/**
 * Server component for tournament pairings (anon-reachable).
 *
 * Phase 2 Task 9 (A-S1): converted from a browser `useSupabaseQuery` client
 * component to SSR. The revoke-set base-table reads (tournament_phases /
 * tournament_rounds / tournament_player_stats) now run server-side through the
 * cached service-role fetcher `getCachedTournamentPairings`, so they survive the
 * `REVOKE SELECT ... FROM anon, authenticated` migration. It does NOT call
 * `/api/v1` — that path 401s logged-out visitors, and pairings are public.
 *
 * The presentational child (`PublicPairingsView`) is a `"use client"` component
 * fed entirely by props; it owns the click-to-navigate interactivity and reads
 * the current user's own alt via `useCurrentUser` for match-access control.
 *
 * NOTE: this is a Server Component (no `"use client"`). Its parent must render
 * it from a Server Component so the cached fetcher runs server-side — see the
 * render-chain note for `tournament-tabs.tsx`.
 */
export async function PublicPairings({
  tournamentId,
  tournamentSlug,
  canManage = false,
}: PublicPairingsProps) {
  const data = await getCachedTournamentPairings(tournamentId);

  return (
    <PublicPairingsView
      tournamentSlug={tournamentSlug}
      data={data}
      canManage={canManage}
    />
  );
}
