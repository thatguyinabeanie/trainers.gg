/**
 * GET /api/v1/me/invitations
 *
 * Phase 2 Task 9 (Part A, T3l) — the caller's own tournament invitations.
 *
 * Two modes controlled by the optional `tournamentId` query param:
 *
 * - Without `?tournamentId`:
 *     Returns `getTournamentInvitationsReceived` — all invitations received by
 *     the authenticated user's alts (player-facing view).
 *
 * - With `?tournamentId=N`:
 *     Returns `getTournamentInvitationsSent` for that tournament — invitations
 *     sent by community staff to players (organiser/staff-facing view).
 *
 * This replaces the `useSupabaseQuery(getTournamentInvitationsReceived)` read
 * in `tournament-invitations-view.tsx` and the `useSupabaseQuery(
 * getTournamentInvitationsSent)` read in `invite/invitation-list.tsx`. Both
 * queries touch `alts` which will have its `authenticated` SELECT revoked in
 * Phase 2 Step 4; moving the reads here runs them server-side as the caller's
 * identity instead.
 *
 * PER-USER (NOT cacheable):
 *   This reads the *caller's own* data — invitations they received or sent for
 *   a tournament they manage. It must NOT be wrapped in `'use cache'` and must
 *   NOT use a service-role or static (anon) client. RLS evaluates as the caller
 *   via `auth.supabase` (the identity-bound client from `resolveApiAuth`).
 *
 * CACHE-CONTROL header:
 *   `private, no-store` — per-user data must never be stored by a shared CDN or
 *   the browser cache. Client-side freshness is handled by TanStack Query
 *   (`staleTime`) in consumers.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  getTournamentInvitationsReceived,
  getTournamentInvitationsSent,
} from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";

import { resolveApiAuth } from "@/lib/api/auth";
import {
  enforceRateLimit,
  extractRequestIp,
  DEFAULT_API_LIMIT,
  DEFAULT_WINDOW_MS,
} from "@/lib/api/rate-limit";

/** Per-user data: never cache in a shared CDN or the browser. */
const CACHE_CONTROL = "private, no-store";

/** Shape returned when no tournamentId is provided (received invitations). */
type ReceivedInvitationsResult = Awaited<
  ReturnType<typeof getTournamentInvitationsReceived>
>;

/** Shape returned when a tournamentId is provided (sent invitations). */
type SentInvitationsResult = Awaited<
  ReturnType<typeof getTournamentInvitationsSent>
>;

type InvitationsResult = ReceivedInvitationsResult | SentInvitationsResult;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ActionResult<InvitationsResult>>> {
  // Auth required (no anonymous open Data API).
  const auth = await resolveApiAuth(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
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
      { success: false, error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": resetAt.toUTCString() },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const tournamentIdParam = searchParams.get("tournamentId");

  if (tournamentIdParam !== null) {
    // Staff view: sent invitations for a specific tournament.
    const tournamentId = Number(tournamentIdParam);
    if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
      return NextResponse.json(
        { success: false, error: "tournamentId must be a positive integer" },
        { status: 400 }
      );
    }

    const invitations = await getTournamentInvitationsSent(
      auth.supabase,
      tournamentId
    );

    return NextResponse.json(
      { success: true, data: invitations },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  }

  // Player view: received invitations for the caller.
  const invitations = await getTournamentInvitationsReceived(auth.supabase);

  return NextResponse.json(
    { success: true, data: invitations },
    { headers: { "Cache-Control": CACHE_CONTROL } }
  );
}
