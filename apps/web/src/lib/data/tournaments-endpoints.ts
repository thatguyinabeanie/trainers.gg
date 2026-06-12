/**
 * Cached data-fetching functions for tournament S-bucket endpoints.
 *
 * This file is the Phase 2 (Task 5) counterpart to `standings-endpoint.ts` —
 * it extends the same pattern to every tournament-family S-bucket read that a
 * web client component currently makes via `useSupabaseQuery`.
 *
 * All fetchers follow the canonical pattern:
 *  - `'use cache'` + `cacheTag(CacheTags.tournament(id))` + `cacheLife("max")`
 *  - `createServiceRoleClient()` inside the cache scope (see rationale below)
 *  - Function arguments are the cache key — every distinguishing value is a param
 *
 * **Why `createServiceRoleClient()` inside `'use cache'`** (Phase 2 Task 9 mechanical
 * swap — `docs/decisions/architecture-phase2-task9-revoke-plan.md` §0.2):
 * S-bucket base tables (`tournament_phases`, `tournament_player_stats`, `alts`, etc.)
 * are having `REVOKE SELECT ... FROM anon, authenticated` applied. After the revoke,
 * an anon-keyed client (`createStaticClient`) returns zero rows silently. Service-role
 * bypasses grants entirely and always reads. It is safe inside `'use cache'` here
 * because service-role is a constant identity (not per-user) — it does not introduce
 * any cache-key variance. The data cached is genuinely public S-bucket data, identical
 * for every viewer. Do NOT revert these calls to `createStaticClient()`.
 *
 * The route handlers in `apps/web/src/app/api/v1/tournaments/…` call these
 * fetchers. Per-user auth is checked outside the cache scope in the route handler
 * (`resolveApiAuth`).
 */

import { cacheTag, cacheLife } from "next/cache";

import {
  getTournamentPhases,
  getPhaseRoundsWithStats,
  getPhaseRoundsWithMatches,
  getRoundMatches,
  getTournamentPlayerStats,
  getTournamentRegistrations,
  getTournamentInvitationsSent,
  getUnpairedCheckedInPlayers,
} from "@trainers/supabase";
import { getTournamentAuditLog } from "@trainers/supabase";
import { listCommunityTournaments } from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";

// =============================================================================
// Type exports — derived from query return shapes
// =============================================================================

/** A single tournament phase row. */
export type TournamentPhaseRow = Awaited<
  ReturnType<typeof getTournamentPhases>
>[number];

/** A round with match stats (for round selection dropdowns). */
export type PhaseRoundWithStats = Awaited<
  ReturnType<typeof getPhaseRoundsWithStats>
>[number];

/** A round with full match detail (for bracket/pairing views). */
export type PhaseRoundWithMatches = Awaited<
  ReturnType<typeof getPhaseRoundsWithMatches>
>[number];

/** A single match row (for the judge pairings view). */
export type RoundMatchRow = Awaited<
  ReturnType<typeof getRoundMatches>
>[number];

/** Player stats row for standings (with joined alt). */
export type TournamentPlayerStatRow = Awaited<
  ReturnType<typeof getTournamentPlayerStats>
>[number];

/** A registration row with joined alt and team. */
export type TournamentRegistrationRow = Awaited<
  ReturnType<typeof getTournamentRegistrations>
>[number];

/** A sent invitation row with joined invited player. */
export type TournamentInvitationRow = Awaited<
  ReturnType<typeof getTournamentInvitationsSent>
>[number];

/** An audit log entry for a tournament. */
export type TournamentAuditLogRow = NonNullable<
  Awaited<ReturnType<typeof getTournamentAuditLog>>
>[number];

/** A community tournament listing row. */
export type CommunityTournamentRow = Awaited<
  ReturnType<typeof listCommunityTournaments>
>["tournaments"][number];

// =============================================================================
// Tournament phases
// =============================================================================

/**
 * Cached fetch of the ordered phases for one tournament.
 *
 * @param tournamentId - Numeric tournament id (validated at route boundary).
 */
export async function getCachedTournamentPhases(
  tournamentId: number
): Promise<TournamentPhaseRow[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getTournamentPhases(supabase, tournamentId);
}

// =============================================================================
// Phase rounds with stats
// =============================================================================

/**
 * Cached fetch of rounds (with match-count stats) for one phase.
 *
 * @param phaseId - Numeric phase id (validated at route boundary).
 * @param tournamentId - Parent tournament id — used to apply the tournament tag
 *   so this cache busts whenever the tournament is invalidated.
 */
export async function getCachedPhaseRoundsWithStats(
  phaseId: number,
  tournamentId: number
): Promise<PhaseRoundWithStats[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getPhaseRoundsWithStats(supabase, phaseId);
}

// =============================================================================
// Phase rounds with full match detail
// =============================================================================

/**
 * Cached fetch of rounds (with all matches + player join) for one phase.
 * Used by the public bracket/pairing view.
 *
 * @param phaseId - Numeric phase id (validated at route boundary).
 * @param tournamentId - Parent tournament id (required by the query and for cache tag).
 */
export async function getCachedPhaseRoundsWithMatches(
  phaseId: number,
  tournamentId: number
): Promise<PhaseRoundWithMatches[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getPhaseRoundsWithMatches(supabase, phaseId, tournamentId);
}

// =============================================================================
// Round matches
// =============================================================================

/**
 * Cached fetch of all matches in one round.
 *
 * @param roundId - Numeric round id (validated at route boundary).
 * @param tournamentId - Parent tournament id (for cache tag).
 */
export async function getCachedRoundMatches(
  roundId: number,
  tournamentId: number
): Promise<RoundMatchRow[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getRoundMatches(supabase, roundId);
}

// =============================================================================
// Player stats (standings)
// =============================================================================

/**
 * Cached fetch of player stats for the manage-standings view.
 * Includes dropped players (`includeDropped: true`) so staff see the full list.
 *
 * @param tournamentId - Numeric tournament id.
 */
export async function getCachedTournamentPlayerStats(
  tournamentId: number
): Promise<TournamentPlayerStatRow[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getTournamentPlayerStats(supabase, tournamentId, {
    includeDropped: true,
  });
}

// =============================================================================
// Registrations
// =============================================================================

/**
 * Cached fetch of all registrations for one tournament (staff view).
 *
 * NOTE: `tournament_registrations` is a realtime-six table and keeps its
 * authenticated SELECT. This cached snapshot is for the initial-load read;
 * real-time updates in the manage view are handled by the existing subscription.
 *
 * @param tournamentId - Numeric tournament id.
 */
export async function getCachedTournamentRegistrations(
  tournamentId: number
): Promise<TournamentRegistrationRow[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getTournamentRegistrations(supabase, tournamentId);
}

// =============================================================================
// Invitations sent
// =============================================================================

/**
 * Cached fetch of invitations sent for one tournament.
 *
 * @param tournamentId - Numeric tournament id.
 */
export async function getCachedTournamentInvitationsSent(
  tournamentId: number
): Promise<TournamentInvitationRow[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getTournamentInvitationsSent(supabase, tournamentId);
}

// =============================================================================
// Audit log
// =============================================================================

/**
 * Cached fetch of the tournament audit log.
 *
 * @param tournamentId - Numeric tournament id.
 * @param limit - Maximum number of entries to return (default 50).
 * @param offset - Pagination offset (default 0).
 * @param categoryFilter - Optional audit action category filter.
 */
export async function getCachedTournamentAuditLog(
  tournamentId: number,
  limit: number,
  offset: number,
  categoryFilter: string | null
): Promise<TournamentAuditLogRow[]> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();

  // The `actions` option filters by category name prefix — pass null to get all.
  // Category filtering is done in the component after fetching.
  const result = await getTournamentAuditLog(supabase, tournamentId, {
    limit,
    offset,
    // Pass undefined when no filter to get all actions.
    actions: categoryFilter ? undefined : undefined,
  });
  return result ?? [];
}

// =============================================================================
// Unpaired checked-in players
// =============================================================================

/**
 * Cached fetch of unpaired checked-in players for a round.
 * Used by the tournament pairings management view.
 *
 * @param tournamentId - Numeric tournament id.
 * @param roundId - Numeric round id.
 */
export async function getCachedUnpairedCheckedInPlayers(
  tournamentId: number,
  roundId: number
): Promise<Awaited<ReturnType<typeof getUnpairedCheckedInPlayers>>> {
  "use cache";
  cacheTag(CacheTags.tournament(tournamentId));
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return getUnpairedCheckedInPlayers(supabase, tournamentId, roundId);
}

// =============================================================================
// Community tournament list
// =============================================================================

/**
 * Cached fetch of the tournament list for one community.
 * Used by the community tournaments dashboard tab.
 *
 * @param communityId - Numeric community id.
 * @param status - Optional status filter.
 * @param limit - Maximum number of results to return (default 50).
 * @param offset - Pagination offset (default 0).
 */
export async function getCachedCommunityTournaments(
  communityId: number,
  status: string | null,
  limit: number,
  offset: number
): Promise<ReturnType<typeof listCommunityTournaments>> {
  "use cache";
  // Tag with TOURNAMENTS_LIST so this busts when any tournament changes.
  cacheTag(CacheTags.TOURNAMENTS_LIST);
  cacheLife("max");

  const supabase = createServiceRoleClient();
  return listCommunityTournaments(supabase, communityId, {
    status: status as
      | "draft"
      | "upcoming"
      | "active"
      | "completed"
      | "cancelled"
      | undefined,
    limit,
    offset,
  });
}
