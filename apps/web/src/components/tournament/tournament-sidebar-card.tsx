import {
  getRegistrationStatus,
  getCheckInStatus,
  getCheckInStats,
} from "@trainers/supabase";
import { createServiceRoleClient, getUserId } from "@/lib/supabase/server";
import {
  TournamentSidebarCardClient,
  type TournamentSidebarCardProps,
  type SidebarRegistrationStatus,
  type SidebarCheckInStatus,
  type SidebarCheckInStats,
} from "./tournament-sidebar-card-client";

// ---------------------------------------------------------------------------
// Server wrapper (SSR)
// ---------------------------------------------------------------------------
//
// Phase 2 Task 9 (T3e): this card is ANON-reachable (a logged-out visitor sees
// the public registration counts on the tournament detail page). The registration
// data lives in S-bucket base tables (`tournament_registrations`, `alts`) whose
// `anon`/`authenticated` SELECT grant is revoked in this phase. A browser
// `useSupabaseQuery` read of those tables would silently return zero rows after the
// revoke, so the read is moved server-side and fetched with `createServiceRoleClient()`
// (which bypasses the grant). The previous `registrations-${id}` realtime
// subscription is removed entirely — per the simplification decision (D1) a live
// check-in board is not a needed feature, so the count is rendered from this
// server fetch and refreshed via `router.refresh()` after the viewer's own
// mutations (the client island calls it on check-in / withdraw / drop).
//
// The per-user portions (`userStatus`, `checkInStatus`) require the caller's alt,
// which a cookie-less service-role client cannot resolve via `auth.getUser()`. We
// resolve the caller's user id from the request cookie (outside any cache scope),
// look up their primary alt with the service-role client, and pass the explicit
// `altId` into the queries that accept one. For `getRegistrationStatus` (which has
// no `altId` parameter) we derive the caller's `userStatus` inline from the same
// service-role read. This component is therefore NOT cached — it reads per-user
// data and must run per request.

/**
 * Resolve the caller's primary alt id from the request cookie.
 *
 * Returns `null` for logged-out visitors (they only see public counts). The alt
 * lookup itself uses the service-role client so it survives the `alts` SELECT
 * revoke; the user id comes from the cookie-bound session.
 */
async function resolveCallerAltId(): Promise<number | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const supabase = createServiceRoleClient();
  const { data: alt } = await supabase
    .from("alts")
    .select("id")
    .eq("user_id", userId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (alt?.id as number | undefined) ?? null;
}

/**
 * Derive the caller's own registration status (status / hasTeam / waitlist
 * position) from a service-role read. Mirrors the `userStatus` shape that
 * `getRegistrationStatus` would have produced for an authenticated browser
 * client, which is unavailable here because the read runs server-side.
 */
async function resolveUserStatus(
  tournamentId: number,
  altId: number
): Promise<SidebarRegistrationStatus["userStatus"]> {
  const supabase = createServiceRoleClient();

  const { data: userReg } = await supabase
    .from("tournament_registrations")
    .select("status, team_id")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", altId)
    .maybeSingle();

  if (!userReg) return null;

  let waitlistPosition: number | undefined;
  if (userReg.status === "waitlist") {
    const { data: waitlistRegs } = await supabase
      .from("tournament_registrations")
      .select("alt_id, registered_at")
      .eq("tournament_id", tournamentId)
      .eq("status", "waitlist")
      .order("registered_at", { ascending: true });

    const position = waitlistRegs?.findIndex((r) => r.alt_id === altId);
    waitlistPosition =
      position !== undefined && position >= 0 ? position + 1 : undefined;
  }

  return {
    status: userReg.status ?? "unknown",
    hasTeam: !!userReg.team_id,
    waitlistPosition,
  };
}

/**
 * Tournament registration / check-in sidebar card.
 *
 * Server component that fetches public registration data via service-role and
 * the caller's per-user status, then hands everything to the interactive client
 * island. Drop-in: the export name and props are unchanged from the previous
 * client component, so the parent tournament page needs no edit.
 */
export async function TournamentSidebarCard(
  props: TournamentSidebarCardProps
) {
  const { tournamentId } = props;

  // Service-role client survives the S-bucket SELECT revoke (it bypasses grants).
  const supabase = createServiceRoleClient();
  const altId = await resolveCallerAltId();

  // Public counts + tournament status come from the service-role read. The
  // caller's own status is derived separately (service-role has no session).
  const [registrationStatus, checkInStatus, checkInStats, userStatus] =
    await Promise.all([
      getRegistrationStatus(supabase, tournamentId),
      altId !== null
        ? getCheckInStatus(supabase, tournamentId, altId)
        : Promise.resolve(null),
      getCheckInStats(supabase, tournamentId),
      altId !== null
        ? resolveUserStatus(tournamentId, altId)
        : Promise.resolve(null),
    ]);

  // Merge the caller's derived status onto the public registration payload.
  const initialRegistration: SidebarRegistrationStatus = {
    ...registrationStatus,
    userStatus,
  };

  return (
    <TournamentSidebarCardClient
      {...props}
      initialRegistration={initialRegistration}
      initialCheckIn={checkInStatus as SidebarCheckInStatus | null}
      initialCheckInStats={checkInStats as SidebarCheckInStats | null}
    />
  );
}
