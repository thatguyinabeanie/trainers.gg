import { cacheTag, cacheLife } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getCurrentUserAlts,
  getAltsBulkStats,
  getPlayerRatingsBulk,
  getActiveMatch,
  getMyDashboardData,
  listMyCommunities,
  getUserMainAltId,
  getLiveTournamentCommunityIds,
  type AltStats,
  type PlayerRating,
} from "@trainers/supabase";

import {
  getUser,
  createServiceRoleClient,
  createClientReadOnly,
} from "@/lib/supabase/server";
import { CacheTags } from "@/lib/cache";
import { DASHBOARD_ALT_COOKIE } from "@/components/dashboard/sidebar-helpers";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

import { HomeClient } from "./home-client";
import { LiveMatchBar, type ActiveMatch } from "./components/live-match-bar";
import { EnhancedStats } from "./components/enhanced-stats";
import { WelcomeHeader } from "./components/welcome-header";
import { DashboardActivity } from "./components/dashboard-activity";
import { CommunityHighlights } from "./components/community-highlights";
import { computeStats } from "./compute-stats";

// =============================================================================
// Cached Fetchers (public S-bucket data — service-role client, no cookies)
//
// Phase 2 Task 9 (§0.2): `createStaticClient()` (anon key) swapped to
// `createServiceRoleClient()` so these reads survive the upcoming REVOKE of
// anon/authenticated SELECT on S-bucket base tables. Service-role bypasses
// RLS/GRANTs and does NOT vary per user, so using it inside `'use cache'` is
// safe — the data is public S-bucket (same for all viewers) and the cache key
// is formed from function arguments only (not from the client identity).
// =============================================================================

/**
 * Returns bulk tournament/match stats for the given alt IDs.
 * Reads public S-bucket tables (tournament_player_stats, alts) via
 * service-role so the read survives the Phase 2 Task 9 anon REVOKE.
 *
 * _userId scopes the cache key to the requesting user so alt-ID reuse or
 * ownership changes can never cause cross-user cache collisions. It is not
 * used inside the function body — its presence as a parameter is what
 * participates in the Next.js Cache Components cache key.
 *
 * sortedAltIds must be pre-sorted (ascending) by the caller so the cache key
 * is stable regardless of the order alts are returned from the DB.
 */
async function getCachedBulkStats(_userId: string, sortedAltIds: number[]) {
  "use cache";
  cacheTag(CacheTags.DASHBOARD_STATS);
  cacheLife("max");
  // Service-role: bypasses anon/authenticated GRANT; safe inside 'use cache'
  // because this is public S-bucket data identical for all viewers (§0.2).
  const supabase = createServiceRoleClient();
  return getAltsBulkStats(supabase, sortedAltIds);
}

/**
 * Returns bulk player ratings for the given alt IDs.
 * Reads public S-bucket tables (player_ratings) via service-role so the read
 * survives the Phase 2 Task 9 anon REVOKE.
 *
 * _userId scopes the cache key to the requesting user so alt-ID reuse or
 * ownership changes can never cause cross-user cache collisions. It is not
 * used inside the function body — its presence as a parameter is what
 * participates in the Next.js Cache Components cache key.
 *
 * sortedAltIds must be pre-sorted (ascending) by the caller so the cache key
 * is stable regardless of the order alts are returned from the DB.
 */
async function getCachedBulkRatings(_userId: string, sortedAltIds: number[]) {
  "use cache";
  cacheTag(CacheTags.DASHBOARD_RATINGS);
  cacheLife("max");
  // Service-role: bypasses anon/authenticated GRANT; safe inside 'use cache'
  // because this is public S-bucket data identical for all viewers (§0.2).
  const supabase = createServiceRoleClient();
  return getPlayerRatingsBulk(supabase, sortedAltIds, "overall");
}

// =============================================================================
// Page Component (Server Component)
// =============================================================================

export default async function DashboardHomePage() {
  // Auth check
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard");
  }

  // Read selected alt cookie
  const cookieStore = await cookies();
  const rawCookieValue = cookieStore.get(DASHBOARD_ALT_COOKIE)?.value ?? null;
  let selectedAltUsername: string | null = null;
  if (rawCookieValue) {
    try {
      selectedAltUsername = decodeURIComponent(rawCookieValue);
    } catch {
      selectedAltUsername = null;
    }
  }

  // Fetch user's alts (auth-required — not cached)
  const supabase = await createClientReadOnly();
  let alts: Awaited<ReturnType<typeof getCurrentUserAlts>>;
  try {
    alts = await getCurrentUserAlts(supabase);
  } catch (err) {
    console.error("[DashboardHomePage] Failed to load alts:", err);
    alts = [];
  }

  // Fetch user's communities (auth-required — not cached)
  let myCommunities: Awaited<ReturnType<typeof listMyCommunities>> = [];
  try {
    myCommunities = await listMyCommunities(supabase, user.id);
  } catch (err) {
    console.error("[DashboardHomePage] Failed to load communities:", err);
  }

  // Fetch main_alt_id from users table
  const mainAltId = await getUserMainAltId(supabase, user.id);

  // Extract alt IDs for bulk queries — sort ascending for stable cache keys
  const altIds = alts.map((a) => a.id);
  const sortedAltIds = [...altIds].sort((a, b) => a - b);

  // Parallel fetch: cached bulk stats/ratings + uncached active match + dashboard data
  let bulkStats: Record<number, AltStats> | undefined;
  let bulkRatings: Record<number, PlayerRating> | undefined;
  let activeMatch: ActiveMatch | null = null;
  let dashboardData: Awaited<ReturnType<typeof getMyDashboardData>> | null =
    null;

  if (altIds.length > 0) {
    const [statsResult, ratingsResult, matchResult, dashboardResult] =
      await Promise.allSettled([
        getCachedBulkStats(user.id, sortedAltIds),
        getCachedBulkRatings(user.id, sortedAltIds),
        mainAltId ? getActiveMatch(supabase, mainAltId) : Promise.resolve(null),
        mainAltId
          ? getMyDashboardData(supabase, mainAltId)
          : Promise.resolve(null),
      ]);

    bulkStats =
      statsResult.status === "fulfilled" ? statsResult.value : undefined;
    if (statsResult.status === "rejected") {
      console.error(
        "[DashboardHomePage] Failed to load bulk stats:",
        statsResult.reason
      );
    }

    bulkRatings =
      ratingsResult.status === "fulfilled" ? ratingsResult.value : undefined;
    if (ratingsResult.status === "rejected") {
      console.error(
        "[DashboardHomePage] Failed to load bulk ratings:",
        ratingsResult.reason
      );
    }

    activeMatch = matchResult.status === "fulfilled" ? matchResult.value : null;
    if (matchResult.status === "rejected") {
      console.error(
        "[DashboardHomePage] Failed to load active match:",
        matchResult.reason
      );
    }

    dashboardData =
      dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
    if (dashboardResult.status === "rejected") {
      console.error(
        "[DashboardHomePage] Failed to load dashboard data:",
        dashboardResult.reason
      );
    }
  }

  // Compute stats for server-rendered stat cards
  const altCount = alts.length;
  const stats =
    altCount > 0
      ? computeStats(bulkStats, bulkRatings, altCount)
      : {
          winRate: "0.0%",
          winRateSub: "no games played",
          rating: "—",
          ratingSub: "no rating yet",
          record: "0-0",
          recordSub: "no matches",
          tournaments: "0",
          tournamentsSub: "no alts yet",
          tournamentsSubAccent: false,
        };

  // Prepare tournament data for UpcomingTournaments component
  const myTournaments = (dashboardData?.myTournaments ?? [])
    .filter((t) => t.status === "upcoming" || t.status === "active")
    .map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      startDate: t.startDate ? new Date(t.startDate).getTime() : null,
      status: t.status,
      hasTeam: t.hasTeam,
      registrationStatus: t.registrationStatus ?? null,
      registrationId: t.registrationId ?? null,
      lateCheckInMaxRound: t.lateCheckInMaxRound ?? null,
    }));

  // Prepare activity data
  const recentActivity = dashboardData?.recentActivity ?? [];

  // Username for welcome header
  const username = (user.user_metadata?.username as string) ?? "";

  // Prepare community highlights data
  const communityIds = myCommunities.map((c) => c.id);
  const liveTournamentCommunityIds = await getLiveTournamentCommunityIds(
    supabase,
    communityIds
  );

  const communityHighlights = myCommunities.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logo_url,
    hasLiveTournament: liveTournamentCommunityIds.has(c.id),
  }));

  return (
    <>
      <PageHeader title="Dashboard" />
      <DashboardContent>
        <div className="space-y-6">
          {/* Welcome header with greeting + quick actions */}
          <WelcomeHeader
            username={username}
            hasAlts={alts.length > 0}
            hasTeamBuilderAccess
          />

          {/* Live match bar — server-rendered */}
          {activeMatch && <LiveMatchBar match={activeMatch} />}

          {/* Stats row — server-rendered with icons and contextual color */}
          <EnhancedStats
            winRate={stats.winRate}
            winRateSub={stats.winRateSub}
            rating={stats.rating}
            ratingSub={stats.ratingSub}
            record={stats.record}
            recordSub={stats.recordSub}
            tournaments={stats.tournaments}
            tournamentsSub={stats.tournamentsSub}
            tournamentsSubAccent={stats.tournamentsSubAccent}
          />

          {/* Tournaments + Activity — two-column on desktop */}
          <DashboardActivity
            myTournaments={myTournaments}
            recentActivity={recentActivity}
          />

          {/* Community highlights — shows user's communities with live indicators */}
          <CommunityHighlights communities={communityHighlights} />

          {/* Alt management — kept prominent */}
          <HomeClient
            alts={alts.map((a) => ({
              id: a.id,
              username: a.username,
              avatar_url: a.avatar_url,
              is_public: a.is_public,
            }))}
            mainAltId={mainAltId}
            initialBulkStats={bulkStats}
            initialBulkRatings={bulkRatings}
            selectedAltUsername={selectedAltUsername}
            username={username}
          />
        </div>
      </DashboardContent>
    </>
  );
}
