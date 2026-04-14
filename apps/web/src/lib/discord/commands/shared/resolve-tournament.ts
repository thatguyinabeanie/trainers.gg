/**
 * Shared helper — resolve an optional tournament argument to a concrete row.
 *
 * If no argument is supplied the helper looks for the single active tournament
 * in the community. If there are zero or multiple active tournaments it returns
 * an `{ ok: false, message }` result that the caller embeds directly.
 */

import {
  listActiveTournaments,
  getTournamentByNameOrSlugInCommunity,
  type DiscordTournamentRow,
  type TypedClient,
} from "@trainers/supabase";

export type ResolveTournamentResult =
  | { ok: true; value: DiscordTournamentRow }
  | { ok: false; message: string };

/**
 * Resolve an optional tournament identifier to a specific tournament row.
 *
 * @param supabase    - Service-role Supabase client
 * @param communityId - Community to scope the lookup to
 * @param slugOrName  - Optional user-supplied tournament slug or name fragment
 */
export async function resolveTournament(
  supabase: TypedClient,
  communityId: number,
  slugOrName?: string
): Promise<ResolveTournamentResult> {
  if (slugOrName) {
    const tournament = await getTournamentByNameOrSlugInCommunity(
      supabase,
      communityId,
      slugOrName
    );
    if (!tournament) {
      return {
        ok: false,
        message: `No tournament matching "${slugOrName}" in this community.`,
      };
    }
    return { ok: true, value: tournament };
  }

  // No argument — find the single active tournament
  const active = await listActiveTournaments(supabase, communityId);

  if (active.length === 0) {
    return {
      ok: false,
      message: "No active tournaments. Try `/events` to see upcoming.",
    };
  }
  if (active.length > 1) {
    const names = active.map((t) => t.name).join(", ");
    return {
      ok: false,
      message: `Multiple tournaments active: ${names}. Specify with \`tournament:<name>\`.`,
    };
  }

  return { ok: true, value: active[0]! };
}
