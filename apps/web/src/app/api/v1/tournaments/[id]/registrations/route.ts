/**
 * GET /api/v1/tournaments/[id]/registrations
 *
 * Auth-gated, STAFF-ONLY read of a tournament's registrations + sent
 * invitations for the manage Players tab (`manage/tournament-registrations.tsx`).
 *
 * ## Why this route exists (Phase 2 Task 9 — T3o)
 *
 * The manage Players tab reads STAFF-INTERNAL columns of `tournament_registrations`
 * (drop category, check-in state, registered_at) — not just the public columns
 * exposed by the `public_tournament_registrations` view. The public view covers
 * ANONYMOUS consumers; staff columns require auth. After Step 4 revokes
 * `SELECT … FROM anon, authenticated` on the `tournament_registrations` and `alts`
 * base tables, the old browser anon read (`useSupabaseQuery(getTournamentRegistrations)`)
 * would silently return zero rows.
 *
 * ## Why NOT `'use cache'` / service-role
 *
 * This is PER-STAFF, authorization-scoped data — not shared public S-bucket data.
 * It must NOT be cached in a shared `'use cache'` scope (would leak one staff
 * member's view to every viewer) and must NOT use a service-role fetcher (that
 * would bypass the manage-permission gate). The read runs against `auth.supabase`
 * (the identity-bound client from `resolveApiAuth`) AFTER an explicit
 * `has_community_permission('tournament.manage')` check, so RLS + authorization
 * both apply. Response is `private, no-store`.
 *
 * ## Authorization
 *
 *   1. `resolveApiAuth` → 401 anon (no anonymous open Data API).
 *   2. Look up the tournament's `community_id` via `auth.supabase`.
 *   3. `has_community_permission(community_id, 'tournament.manage')` → 403 if false.
 *
 * The shape mirrors the two reads the Players tab previously made on the client:
 *   `{ registrations: TournamentRegistrationRow[], invitations: TournamentInvitationSentRow[] }`.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  getTournamentRegistrations,
  getTournamentInvitationsSent,
  type TournamentRegistrationRow,
  type TournamentInvitationSentRow,
} from "@trainers/supabase";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";

/** Auth-gated, staff-scoped data — must never be cached by a shared CDN. */
const CACHE_CONTROL = "private, no-store";

/** Combined payload for the manage Players tab. */
export interface TournamentRegistrationsResponse {
  registrations: TournamentRegistrationRow[];
  invitations: TournamentInvitationSentRow[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Validate route param FIRST — a non-numeric id is a 404 before any auth/DB work.
  const { id } = await params;
  const tournamentId = Number(id);
  if (Number.isNaN(tournamentId)) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  // 2. Auth required (no anonymous open Data API).
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 3. Rate-limit: keyed on userId when authed, request IP as fallback.
  const identifier = auth.userId ?? extractRequestIp(request);
  const { allowed, resetAt } = await enforceRateLimit({
    identifier,
    limit: DEFAULT_API_LIMIT,
    windowMs: DEFAULT_WINDOW_MS,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": resetAt.toUTCString() } }
    );
  }

  // 4. Authorize: caller must manage this tournament's community. Read the
  //    tournament's community via the identity-bound client (RLS applies).
  const { data: tournament } = await auth.supabase
    .from("tournaments")
    .select("community_id")
    .eq("id", tournamentId)
    .maybeSingle();
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  const { data: canManage } = await auth.supabase.rpc(
    "has_community_permission",
    {
      p_community_id: tournament.community_id,
      permission_key: "tournament.manage",
    }
  );
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 5. Staff read via the identity-bound client (NOT service-role, NOT cached).
  const [registrations, invitations] = await Promise.all([
    getTournamentRegistrations(auth.supabase, tournamentId),
    getTournamentInvitationsSent(auth.supabase, tournamentId),
  ]);

  const body: TournamentRegistrationsResponse = { registrations, invitations };
  return NextResponse.json(body, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
