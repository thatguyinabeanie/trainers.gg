/**
 * GET /api/v1/admin/audit-log
 *
 * Paginated, filterable audit log endpoint for the admin Activity tab.
 *
 * This route replaces the browser `useQuery(getAuditLog(supabase, ...))` call in
 * `admin/activity-tab.tsx`. Once S-bucket base-table SELECT grants are revoked
 * from `anon`/`authenticated`, the browser-keyed read of `audit_log` returns zero
 * rows. This auth-gated + admin-gated route keeps it working AND populates the
 * `piiMap` so actor first/last names appear in the audit log table.
 *
 * ADMIN-ONLY (NOT cacheable):
 *   After `resolveApiAuth` (401 for anon), `isSiteAdmin()` is called — any
 *   authenticated user who is NOT a site admin receives 403. Audit log contains
 *   PII-adjacent data (actor identities, actions); it is never shareable via CDN.
 *
 * AUTH (dual-mode, required — no anonymous open Data API):
 *   `resolveApiAuth` accepts a web cookie session OR a mobile
 *   `Authorization: Bearer <supabase access JWT>`. Anonymous → 401.
 *   Non-admin authenticated user → 403.
 *
 * QUERY PARAMS:
 *   - `actions`     — optional, comma-separated audit_action values to filter by
 *   - `entityType`  — optional, "tournament" | "match" | "community"
 *   - `page`        — optional, 0-indexed page number (default 0)
 *   - `limit`       — optional, page size (default 50, max 200)
 *
 * RESPONSE SHAPE:
 *   `{ data: AuditLogEntry[], count: number }` — matches getAuditLog return shape.
 *   Actor objects include `first_name` and `last_name` when available (PII merged
 *   via `getPiiByUserIds` using the service-role client).
 *
 * CACHE-CONTROL header:
 *   `private, no-store` — admin/PII-bearing data must never be stored by a shared
 *   CDN or the browser cache.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  isSiteAdmin,
  getAuditLog,
  getPiiByUserIds,
  type AuditLogEntry,
  type Database,
} from "@trainers/supabase";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/server";

type AuditAction = Database["public"]["Enums"]["audit_action"];

/** Per-user/admin data: never cache in a shared CDN or the browser. */
const CACHE_CONTROL = "private, no-store";

/** Maximum page size to prevent runaway queries. */
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth required (no anonymous open Data API).
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Admin gate — read-only admin check (not sudo/mutation gate).
  // Use a service-role client so the user_roles lookup bypasses RLS.
  const serviceRole = createServiceRoleClient();
  const isAdmin = await isSiteAdmin(serviceRole, auth.userId);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate-limit: keyed on userId when authed, request IP as fallback.
  const identifier = auth.userId ?? extractRequestIp(request);
  const { allowed, resetAt } = await enforceRateLimit({
    identifier,
    limit: DEFAULT_API_LIMIT,
    windowMs: DEFAULT_WINDOW_MS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": resetAt.toUTCString() },
      }
    );
  }

  // Parse query params.
  const url = new URL(request.url);
  const actionsParam = url.searchParams.get("actions") ?? undefined;
  const entityTypeParam = url.searchParams.get("entityType") ?? undefined;
  const pageParam = Number(url.searchParams.get("page") ?? "0");
  const limitParam = Number(
    url.searchParams.get("limit") ?? String(DEFAULT_LIMIT)
  );

  const page = Number.isNaN(pageParam) ? 0 : Math.max(0, pageParam);
  const limit = Number.isNaN(limitParam)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(1, limitParam), MAX_LIMIT);

  const actions: AuditAction[] | undefined = actionsParam
    ? (actionsParam.split(",").filter(Boolean) as AuditAction[])
    : undefined;

  const entityType =
    entityTypeParam === "tournament" ||
    entityTypeParam === "match" ||
    entityTypeParam === "community"
      ? (entityTypeParam as "tournament" | "match" | "community")
      : undefined;

  // First pass: fetch the audit log entries to collect distinct actor user IDs.
  // Service-role client bypasses the anon/authenticated SELECT revoke on audit_log.
  const rawResult = await getAuditLog(serviceRole, {
    actions,
    entityType,
    limit,
    offset: page * limit,
  });

  // Build PII map from the distinct actor user IDs in this page, then re-fetch
  // with the map so getAuditLog's built-in merge logic populates first/last names.
  // getPiiByUserIds degrades gracefully on RPC error (returns empty Map), so this
  // never throws and the page always renders — names simply remain null on failure.
  const actorIds = [
    ...new Set(
      rawResult.data
        .map((row) => row.actor_user?.id)
        .filter((id): id is string => id != null)
    ),
  ];

  let result: { data: AuditLogEntry[]; count: number | null } = rawResult;

  if (actorIds.length > 0) {
    const piiMap = await getPiiByUserIds(serviceRole, actorIds).catch(
      () => null
    );
    if (piiMap) {
      result = await getAuditLog(serviceRole, {
        actions,
        entityType,
        limit,
        offset: page * limit,
        piiMap,
      });
    }
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
