/**
 * GET /api/v1/admin/users
 *
 * Phase 2 Task 9 (Part A, T3g) — paginated admin user list.
 *
 * This route replaces the browser `useSupabaseQuery(listUsersAdmin)` read in
 * `admin/users/page.tsx`. Once the S-bucket base-table SELECT grants are revoked
 * from `anon`/`authenticated`, the browser anon-keyed read of `users` returns zero
 * rows; this auth-gated + admin-gated route keeps it working.
 *
 * ADMIN-ONLY (NOT cacheable):
 *   After `resolveApiAuth` (401 for anon), `isSiteAdmin()` is called — any
 *   authenticated user who is NOT a site admin receives 403. This is the
 *   canonical read-only admin gate (not `requireAdminWithSudo`, which is the
 *   mutation gate). Per-user/admin data is never shareable via CDN.
 *
 * AUTH (dual-mode, required — no anonymous open Data API):
 *   `resolveApiAuth` accepts a web cookie session OR a mobile
 *   `Authorization: Bearer <supabase access JWT>`. Anonymous → 401.
 *   Non-admin authenticated user → 403.
 *
 * QUERY PARAMS:
 *   - `search`  — optional, partial username match (case-insensitive). Email
 *                 search is not supported: email lives in auth.users and cannot
 *                 be filtered via a PostgREST query.
 *   - `status`  — optional, "active" | "suspended" | "all" (default "all")
 *   - `page`    — optional, 0-indexed page number (default 0)
 *   - `limit`   — optional, page size (default 25, max 100)
 *
 * CACHE-CONTROL header:
 *   `private, no-store` — admin data must never be stored by a shared CDN or
 *   the browser cache. This data contains user PII.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  listUsersAdmin,
  isSiteAdmin,
  type ListUsersAdminOptions,
} from "@trainers/supabase";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Per-user/admin data: never cache in a shared CDN or the browser. */
const CACHE_CONTROL = "private, no-store";

/** Maximum page size to prevent runaway queries. */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  // Auth required (no anonymous open Data API).
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  // Admin gate — read-only admin check (not sudo/mutation gate).
  //    Use a service-role client so the user_roles lookup bypasses RLS.
  const serviceRole = createServiceRoleClient();
  const isAdmin = await isSiteAdmin(serviceRole, auth.userId);
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
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
  const search = url.searchParams.get("search") ?? undefined;
  const statusParam = url.searchParams.get("status") ?? "all";
  const pageParam = Number(url.searchParams.get("page") ?? "0");
  const limitParam = Number(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT));

  const page = Number.isNaN(pageParam) ? 0 : Math.max(0, pageParam);
  const limit = Number.isNaN(limitParam)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(1, limitParam), MAX_LIMIT);

  const isLocked: boolean | undefined =
    statusParam === "active"
      ? false
      : statusParam === "suspended"
        ? true
        : undefined;

  const options: ListUsersAdminOptions = {
    search: search || undefined,
    isLocked,
    limit,
    offset: page * limit,
  };

  // Reuse the service-role client created for the admin gate above.
  // Reads admin-only data safely behind the isSiteAdmin() check.
  const result = await listUsersAdmin(serviceRole, options);

  return NextResponse.json(result, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
