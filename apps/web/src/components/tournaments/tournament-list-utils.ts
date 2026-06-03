import type { TournamentWithOrg } from "@trainers/supabase";

/**
 * Determines the correct href for a tournament winner link:
 * - Main alt → /@username (user profile)
 * - Public non-main alt → /@parentUsername/alts/altUsername
 * - Private alt → /alts/altUsername (standalone, no parent reveal)
 * - Unknown (no link data) → null (render as plain text)
 */
export function getWinnerHref(
  winner: NonNullable<TournamentWithOrg["winner"]>
): string | null {
  if (winner.isMainAlt) {
    return `/@${winner.username}`;
  }
  if (winner.isPublic && winner.parentUsername) {
    return `/@${winner.parentUsername}/alts/${winner.username}`;
  }
  if (winner.isPublic === false) {
    return `/alts/${winner.username}`;
  }
  // No link data available (e.g. dashboard context)
  return null;
}
