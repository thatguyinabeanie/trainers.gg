/**
 * GET /api/v1/admin/audit-log
 *
 * Paginated, filterable audit log endpoint for the admin Activity tab.
 *
 * This route replaces the browser `useQuery(getAuditLog(supabase, ...))` call in
 * `admin/activity-tab.tsx`. Once S-bucket base-table SELECT grants are revoked
 * from `anon`/`authenticated`, the browser-keyed read of `audit_log` returns zero
 * rows. This auth-gated + admin-gated route keeps it working AND populates actor
 * first/last names via the service-role client.
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
 *   `{ data: AuditLogEntry[], count: number }` — matches getAuditLogWithPii return
 *   shape. Actor objects include `first_name` and `last_name` when available.
 *
 * CACHE-CONTROL header:
 *   `private, no-store` — admin/PII-bearing data must never be stored by a shared
 *   CDN or the browser cache.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  getAuditLogWithPii,
  Constants,
  type AuditLogEntry,
  type Database,
} from "@trainers/supabase";

import { requireApiAdmin } from "@/lib/api/require-admin";

type AuditAction = Database["public"]["Enums"]["audit_action"];

/** Per-user/admin data: never cache in a shared CDN or the browser. */
const CACHE_CONTROL = "private, no-store";

/** Maximum page size to prevent runaway queries. */
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

/**
 * Runtime allowlist of valid `audit_action` enum values. Unknown values passed
 * via `?actions=` would otherwise reach Postgres and raise a 22P02, leaking the
 * enum/column name in the 500 response body. Sourced from the generated
 * Constants so it stays in sync on `pnpm generate-types`.
 */
const VALID_AUDIT_ACTIONS = new Set<AuditAction>(
  Constants.public.Enums.audit_action
);

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth + admin check + rate-limit in one call.
  const gate = await requireApiAdmin(request);
  if (gate instanceof NextResponse) return gate;
  const { serviceRole } = gate;

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

  // Validate requested actions against the enum allowlist. Unknown values are
  // dropped (rather than reaching the DB and raising a 22P02); if nothing valid
  // remains, apply no action filter.
  const validActions = actionsParam
    ? actionsParam
        .split(",")
        .filter((a): a is AuditAction =>
          VALID_AUDIT_ACTIONS.has(a as AuditAction)
        )
    : [];
  const actions: AuditAction[] | undefined =
    validActions.length > 0 ? validActions : undefined;

  const entityType =
    entityTypeParam === "tournament" ||
    entityTypeParam === "match" ||
    entityTypeParam === "community"
      ? (entityTypeParam as "tournament" | "match" | "community")
      : undefined;

  // Single DB round-trip: getAuditLogWithPii runs getAuditLog once, derives
  // distinct actor IDs from the returned rows, fetches PII in a single batch
  // RPC call, and merges names onto the actor objects in-process.
  // This avoids the previous two-call pattern that paid for a second exact-count
  // scan and introduced a pagination race (a row inserted between the two reads
  // could shift the window).
  const result: { data: AuditLogEntry[]; count: number | null } =
    await getAuditLogWithPii(serviceRole, {
      actions,
      entityType,
      limit,
      offset: page * limit,
    });

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
