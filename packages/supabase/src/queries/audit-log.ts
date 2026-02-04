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
