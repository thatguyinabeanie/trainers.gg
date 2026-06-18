import type { Database } from "../types";
import type { TypedClient, ServiceRoleClient } from "../client";
import { getPiiByUserIds } from "./admin-users";

type AuditAction = Database["public"]["Enums"]["audit_action"];

/** PII data for a single user, fetched from private.user_pii via a service-role client. */
export type UserPii = { first_name: string | null; last_name: string | null };

/** Single audit log row with joined actor user, as returned by getAuditLog. */
export type AuditLogEntry = NonNullable<
  Awaited<ReturnType<typeof getAuditLog>>["data"]
>[number];

/**
 * Get audit log entries for a tournament, ordered by newest first.
 * RLS ensures only community staff with tournament.manage or site admins can read.
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
 * Joins the actor user record (id, username, image) for display purposes.
 * Returns `{ data, count }` where count is the total matching rows.
 *
 * `first_name` and `last_name` are no longer stored on `public.users` — they
 * live in `private.user_pii`, which requires a service-role client to read.
 * Pass an optional `piiMap` (keyed by user_id) to merge names into the actor
 * objects. Callers using a browser authenticated client cannot reach
 * `private.user_pii` and should omit `piiMap`; actor names will be `null`.
 *
 * @param supabase - Typed Supabase client (service-role recommended for SSR)
 * @param options  - Filter and pagination options, plus optional PII map
 */
export async function getAuditLog(
  supabase: TypedClient,
  options: {
    actions?: AuditAction[];
    actorUserId?: string;
    dateRange?: { start: string; end: string };
    entityType?: "tournament" | "match" | "community";
    limit?: number;
    offset?: number;
    /**
     * Pre-fetched PII keyed by user_id. Merge first/last names into actor
     * objects when available. Populate via `getPiiByUserIds` from a service-role
     * client before calling `getAuditLog`; omit when calling from the browser.
     */
    piiMap?: Map<string, UserPii>;
  } = {}
) {
  const {
    actions,
    actorUserId,
    dateRange,
    entityType,
    limit = 50,
    offset = 0,
    piiMap,
  } = options;

  // Select all audit_log fields + joined actor user for display.
  // Only columns that exist on public.users — first_name/last_name moved to
  // private.user_pii and are merged below via the optional piiMap.
  let query = supabase
    .from("audit_log")
    .select(
      "*, actor_user:users!audit_log_actor_user_id_fkey(id, username, image)",
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
  } else if (entityType === "community") {
    query = query.not("community_id", "is", null);
  }

  const { data, count, error } = await query;

  if (error) throw error;

  // Merge PII (first_name / last_name) into every actor object.
  // When piiMap is absent (browser client path) both fields default to null.
  // Always return the enriched shape so AuditLogEntry has a consistent type.
  const enrichedData = (data ?? []).map((row) => {
    const actor = row.actor_user;
    const pii = actor ? (piiMap?.get(actor.id) ?? null) : null;
    return {
      ...row,
      actor_user: actor
        ? {
            ...actor,
            first_name: pii?.first_name ?? null,
            last_name: pii?.last_name ?? null,
          }
        : null,
    };
  });

  return { data: enrichedData, count };
}

/**
 * Run `getAuditLog` once, derive distinct actor IDs from the returned rows,
 * fetch PII in a single batch via `getPiiByUserIds`, and merge names onto the
 * actor objects in-process.
 *
 * This replaces the previous two-call pattern in route handlers and server
 * components (raw fetch → collect actor IDs → re-fetch with piiMap) which paid
 * the cost of a second DB round-trip — including a duplicate exact-count scan —
 * and introduced a pagination race (a row inserted between the two reads could
 * shift the window). The new helper runs the DB query exactly once and enriches
 * entirely in JavaScript.
 *
 * `getPiiByUserIds` degrades gracefully on RPC error (`.catch(() => null)`), so
 * actor first/last names remain `null` on failure rather than bubbling an error.
 *
 * @param supabase - Service-role client (required — audit_log has anon SELECT revoked)
 * @param options  - Same filter/pagination options as `getAuditLog`, minus `piiMap`
 */
export async function getAuditLogWithPii(
  supabase: ServiceRoleClient,
  options: Omit<Parameters<typeof getAuditLog>[1], "piiMap"> = {}
): Promise<Awaited<ReturnType<typeof getAuditLog>>> {
  // Single DB round-trip — no second pass for PII.
  const result = await getAuditLog(supabase, options);

  if (result.data.length === 0) return result;

  // Collect distinct actor user IDs from this page.
  const actorIds = [
    ...new Set(
      result.data
        .map((row) => row.actor_user?.id)
        .filter((id): id is string => id != null)
    ),
  ];

  if (actorIds.length === 0) return result;

  // Batch-fetch PII, degrade gracefully on failure.
  const piiMap = await getPiiByUserIds(supabase, actorIds).catch(() => null);
  if (!piiMap) return result;

  // Merge first_name / last_name onto each actor object in-process.
  const enriched = result.data.map((row) => {
    const actor = row.actor_user;
    if (!actor) return row;
    const pii = piiMap.get(actor.id) ?? null;
    return {
      ...row,
      actor_user: {
        ...actor,
        first_name: pii?.first_name ?? null,
        last_name: pii?.last_name ?? null,
      },
    };
  });

  return { data: enriched, count: result.count };
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
