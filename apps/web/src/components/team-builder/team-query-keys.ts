/**
 * team-query-keys.ts
 *
 * TanStack Query key factories for team + folder data on the builder landing
 * and remaining team surfaces. Extracted to survive the /builder consolidation
 * (teams-list-client.tsx removed in Phase 2).
 */

export const teamKeys = {
  all: (altId: number) => ["teams", altId] as const,
  detail: (teamId: number) => ["team", teamId] as const,
  /** Enriched per-user unified list (account teams for the /builder landing). */
  enriched: (userId: string) => ["teams", "enriched", userId] as const,
};

export const folderKeys = {
  /** Manual + smart folders owned by the user. */
  all: (userId: string) => ["team-folders", userId] as const,
};
