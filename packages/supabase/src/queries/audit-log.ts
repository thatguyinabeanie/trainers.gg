import type { Database } from "../types";
import type { TypedClient } from "../client";

type AuditAction = Database["public"]["Enums"]["audit_action"];

/**
 * Get audit log entries for a tournament, ordered by newest first.
 * RLS ensures only org staff with tournament.manage or site admins can read.
 */
export async function getTournamentAuditLog(
  supabase: TypedClient,
  tournamentId: number,
  options: {
    limit?: number;
    offset?: number;
    actions?: AuditAction[];
  } = {}
) {
  const { limit = 50, offset = 0, actions } = options;

  let query = supabase
    .from("audit_log")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (actions && actions.length > 0) {
    query = query.in("action", actions);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Get audit log entries for a specific match.
 */
export async function getMatchAuditLog(supabase: TypedClient, matchId: number) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Paginated, general-purpose audit log query with filtering.
 *
 * Supports filtering by action types, actor, date range, and entity type.
 * Joins the actor user record for display purposes.
 * Returns `{ data, count }` where count is the total matching rows.
 */
export async function getAuditLog(
  supabase: TypedClient,
  options: {
    actions?: AuditAction[];
    actorUserId?: string;
    dateRange?: { start: string; end: string };
    entityType?: "tournament" | "match" | "organization";
    limit?: number;
    offset?: number;
  } = {}
) {
  const {
    actions,
    actorUserId,
    dateRange,
    entityType,
    limit = 50,
    offset = 0,
  } = options;

  // Select all audit_log fields + joined actor user for display
  let query = supabase
    .from("audit_log")
    .select(
      "*, actor_user:users!audit_log_actor_user_id_fkey(id, username, first_name, last_name, image)",
      { count: "exact", head: false }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by specific action types
  if (actions && actions.length > 0) {
    query = query.in("action", actions);
  }

  // Filter by the user who performed the action
  if (actorUserId) {
    query = query.eq("actor_user_id", actorUserId);
  }

  // Filter by created_at date range (inclusive)
  if (dateRange) {
    query = query
      .gte("created_at", dateRange.start)
      .lte("created_at", dateRange.end);
  }

  // Filter by entity type — selects rows where the relevant FK is not null
  if (entityType === "tournament") {
    query = query.not("tournament_id", "is", null);
  } else if (entityType === "match") {
    query = query.not("match_id", "is", null);
  } else if (entityType === "organization") {
    query = query.not("organization_id", "is", null);
  }

  const { data, count, error } = await query;

  if (error) throw error;
  return { data, count };
}

/**
 * Get aggregate audit log statistics for the last 24 hours, 7 days, and 30 days.
 *
 * Useful for admin dashboards to show recent activity volume.
 */
export async function getAuditLogStats(supabase: TypedClient) {
  const now = new Date();

  // ISO timestamps for each period boundary
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString();
  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Run all three count queries in parallel for efficiency
  const [result24h, result7d, result30d] = await Promise.all([
    supabase
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo),
    supabase
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
  ]);

  if (result24h.error) throw result24h.error;
  if (result7d.error) throw result7d.error;
  if (result30d.error) throw result30d.error;

  return {
    total24h: result24h.count ?? 0,
    total7d: result7d.count ?? 0,
    total30d: result30d.count ?? 0,
  };
}
