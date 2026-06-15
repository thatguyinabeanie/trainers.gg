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
    /** Platform-wide audit statistics (total events, by-entity breakdown). */
    auditStats: (refreshKey: number) =>
      ["admin", "audit-stats", refreshKey] as const,
    /** Paginated audit log filtered by action type, entity type, and page. */
    auditLog: (
      action: string,
      entity: string,
      page: number,
      refreshKey: number
    ) => ["admin", "audit-log", action, entity, page, refreshKey] as const,
    /** Admin user search results for a given search string. */
    userSearch: (search: string) => ["admin", "user-search", search] as const,
    /** Discord access record for a community (admin view). */
    communityDiscordAccess: (communityId: number | null | undefined) =>
      ["admin", "community-discord-access", communityId] as const,
    /** Batch user lookup by a pre-joined ID string (deduplication key). */
    usersByIds: (joinedIds: string) =>
      ["admin", "users-by-ids", joinedIds] as const,
  },

  sudo: {
    all: ["sudo-status"] as const,
    status: () => ["sudo-status"] as const,
  },

  /**
   * "community" domain — community-level data fetched client-side.
   */
  community: {
    all: ["community"] as const,
    /** Discord server/guild data for a community org. */
    discordServer: (orgId: number | undefined) =>
      ["community", orgId, "discord-server"] as const,
  },

  tournament: {
    all: ["tournament"] as const,
    currentMatchBanner: (
      tournamentId: number | undefined,
      userId: string | undefined
    ) => ["current-match-banner", tournamentId, userId] as const,
    userTeams: (tournamentId: number | undefined, gameFormat?: string | null) =>
      ["user-teams-for-tournament", tournamentId, gameFormat ?? null] as const,
    /** Tournament lookup by URL slug. */
    bySlug: (slug: string) => ["tournament", "by-slug", slug] as const,
    /** Phases belonging to a tournament. */
    phases: (tournamentId: number | null | undefined) =>
      ["tournament", "phases", tournamentId] as const,
    /** Rounds belonging to a phase. */
    phaseRounds: (phaseId: number | null) =>
      ["tournament", "phase-rounds", phaseId] as const,
    /** Paginated audit log for a tournament, filtered by category. */
    auditLog: (tournamentId: number, category: string, refreshKey: number) =>
      ["tournament", "audit-log", tournamentId, category, refreshKey] as const,
    /** All registrations for a tournament. */
    registrations: (tournamentId: number) =>
      ["tournament", "registrations", tournamentId] as const,
    /** Invitations sent for a tournament (staff view). */
    invitationsSent: (tournamentId: number) =>
      ["tournament", "invitations-sent", tournamentId] as const,
    /** Coach badge data for a set of alt IDs. */
    coachBadges: (altIds: number[]) =>
      ["tournament", "coach-badges", altIds] as const,
    /** Judge-board pairings read for a tournament (auth-gated API + realtime). */
    pairingsJudge: (tournamentId: number) =>
      ["tournament", tournamentId, "pairings-judge"] as const,
  },

  match: {
    all: ["match"] as const,
    postMatchSummary: (
      tournamentId: number | undefined,
      matchId: number | undefined,
      userAltId: number | null | undefined
    ) => ["post-match-summary", tournamentId, matchId, userAltId] as const,
    /**
     * Live chat messages for a match.
     * Phase 3: realtime `setQueryData` targets this key when match_messages
     * rows are inserted.
     */
    messages: (matchId: number | undefined) =>
      ["match-messages", matchId] as const,
    /**
     * Game results / outcomes for a match.
     * Phase 3: realtime `setQueryData` targets this key when match_games
     * rows are inserted or updated.
     */
    games: (matchId: number | undefined) => ["match-games", matchId] as const,
    /** Coach badge data for a set of alt IDs (match context). */
    coachBadges: (altIds: number[]) =>
      ["match", "coach-badges", altIds] as const,
  },

  /**
   * Notifications domain.
   *
   * Keys match the local factory previously defined inside
   * `notifications-popover.tsx` so the popover can import from here instead
   * and `setQueryData` / `invalidateQueries` targets agree on the shape.
   */
  notifications: {
    all: (userId: string | undefined) => ["notifications", userId] as const,
    recent: (userId: string | undefined) =>
      ["notifications", userId, "recent"] as const,
    /** Paginated notification list filtered by tab and page. */
    list: (userId: string, tab: string, page: number, refreshKey: number) =>
      ["notifications", userId, "list", tab, page, refreshKey] as const,
    /** Total notification count for a tab. */
    count: (userId: string, tab: string, refreshKey: number) =>
      ["notifications", userId, "count", tab, refreshKey] as const,
    /** Unread notification count (used for badge display). */
    unreadCount: (userId: string, refreshKey: number) =>
      ["notifications", userId, "unread-count", refreshKey] as const,
  },

  /**
   * "me" domain — the authenticated caller's own data.
   *
   * All keys are scoped to the currently-authenticated user; no explicit userId
   * discriminator is needed because these routes use session-based auth and are
   * never shared across users in the TanStack Query cache.
   */
  me: {
    all: ["me"] as const,
    /** Caller's own user/alt profile (`/api/v1/me/profile`). */
    profile: () => ["me", "profile"] as const,
    /** Communities the caller manages or belongs to. */
    communities: () => ["me", "communities"] as const,
    /** Caller's received tournament invitations (`/api/v1/me/invitations`). */
    invitations: () => ["me", "invitations"] as const,
    /** Invitations the caller sent for a specific tournament. */
    invitationsSent: (tournamentId: number | undefined) =>
      ["me", "invitations", "sent", tournamentId] as const,
    /** Paginated/filtered tournament history for the caller's dashboard. */
    tournamentHistory: () => ["me", "tournament-history"] as const,
    /** Dashboard overview stats for a specific alt profile. */
    dashboard: (profileId: number | undefined) =>
      ["me", "dashboard", profileId] as const,
    /** Active match banner data for a specific alt profile. */
    activeMatch: (profileId: number | undefined) =>
      ["me", "active-match", profileId] as const,
    /** Pending organization/community membership request for the caller. */
    organizationRequest: (userId: string) =>
      ["me", userId, "organization-request"] as const,
  },

  /**
   * "user" domain — per-user settings data fetched client-side.
   *
   * Unlike the "me" domain (which is the caller's own identity data), these
   * keys cover settings surfaces that are scoped by userId in the query cache
   * because they may be fetched before a full profile is resolved.
   */
  user: {
    all: (userId: string | null | undefined) => ["user", userId] as const,
    /**
     * Whether the user has an active Bluesky / AT Protocol account linked.
     * Sourced from `atproto_sessions`; fetched in `linked-identities-section`.
     */
    blueskyStatus: (userId: string | null | undefined) =>
      ["user", userId, "bluesky-status"] as const,
    /**
     * Count of enabled Discord DM event preferences for the user.
     * Sourced from `discord_dm_preferences`; fetched in
     * `linked-identities-section` to show the badge count.
     */
    discordDmPreferencesCount: (userId: string | null | undefined) =>
      ["user", userId, "discord-dm-preferences-count"] as const,
    /** Whether the user holds a specific named permission. */
    permission: (userId: string | null | undefined, permission: string) =>
      ["user", userId, "permission", permission] as const,
    /** Full permission set for a user. */
    permissions: (userId: string | null | undefined) =>
      ["user", userId, "permissions"] as const,
  },

  /**
   * "player" domain — public player/alt profile data fetched client-side.
   */
  player: {
    all: ["player"] as const,
    /** Recent tournament results for a player alt. */
    recentResults: (altId: number) =>
      ["player", altId, "recent-results"] as const,
  },
} as const;
