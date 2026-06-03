/**
 * Query Key Factories
 *
 * Centralizes TanStack Query keys so they can be shared across hooks,
 * prefetching, and invalidation call sites without copy-pasting strings.
 *
 * Convention:
 * - Each domain gets a factory object
 * - `.all` returns the broadest key (for bulk invalidation)
 * - Narrower keys extend `.all` with additional discriminators
 */

export const queryKeys = {
  admin: {
    all: ["admin"] as const,
    userDetail: (userId: string | null | undefined) =>
      ["admin-user-detail", userId] as const,
  },

  sudo: {
    all: ["sudo-status"] as const,
    status: () => ["sudo-status"] as const,
  },

  tournament: {
    all: ["tournament"] as const,
    currentMatchBanner: (
      tournamentId: number | undefined,
      userId: string | undefined
    ) => ["current-match-banner", tournamentId, userId] as const,
    userTeams: (tournamentId: number | undefined, gameFormat?: string | null) =>
      ["user-teams-for-tournament", tournamentId, gameFormat ?? null] as const,
  },

  match: {
    all: ["match"] as const,
    postMatchSummary: (
      tournamentId: number | undefined,
      matchId: number | undefined,
      userAltId: number | null | undefined
    ) => ["post-match-summary", tournamentId, matchId, userAltId] as const,
  },
} as const;
