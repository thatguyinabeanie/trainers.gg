import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { hasPermission } from "./permissions";
import { PermissionKey } from "./permissionKeys";

export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  profileId: Id<"profiles">,
  permissionName: PermissionKey,
  resourceType?: string,
  resourceId?: string
) {
  const hasPerm = await hasPermission(
    ctx,
    profileId,
    permissionName,
    resourceType,
    resourceId
  );
  if (!hasPerm) {
    throw new Error(`Permission denied: ${permissionName}`);
  }
}

/**
 * Audit event types for tournament operations.
 */
export type TournamentAuditEventType =
  | "tournament_created"
  | "tournament_status_changed"
  | "tournament_archived"
  | "player_registered"
  | "player_withdrawn"
  | "player_checked_in"
  | "player_checkin_undone"
  | "player_promoted_from_waitlist"
  | "match_result_reported"
  | "match_status_changed"
  | "registration_waitlisted"
  | "admin_override";

/**
 * Log a tournament audit event.
 *
 * @param ctx - Mutation context for database access
 * @param eventType - Type of audit event
 * @param tournamentId - Tournament ID
 * @param profileId - User ID who triggered the event
 * @param eventData - Additional event-specific data
 */
export async function logTournamentEvent(
  ctx: MutationCtx,
  eventType: TournamentAuditEventType,
  tournamentId: Id<"tournaments">,
  profileId: Id<"profiles"> | undefined,
  eventData?: Record<string, string | number | boolean | null>
) {
  await ctx.db.insert("tournamentEvents", {
    tournamentId,
    eventType,
    createdBy: profileId,
    createdAt: Date.now(),
    eventData: eventData || undefined,
  });
}
