import { unstable_cache } from "next/cache";
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
  createStaticClient,
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

// On-demand revalidation only — no time-based revalidation
export const revalidate = false;

// =============================================================================
// Cached Fetchers (public data — anonymous client, no cookies)
// =============================================================================

function getCachedBulkStats(altIds: number[]) {
  return unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getAltsBulkStats(supabase, altIds);
    },
    [`dashboard-bulk-stats-${[...altIds].sort((a, b) => a - b).join(",")}`],
    { tags: [CacheTags.DASHBOARD_STATS] }
  )();
}

function getCachedBulkRatings(altIds: number[]) {
  return unstable_cache(
    async () => {
      const supabase = createStaticClient();
      return getPlayerRatingsBulk(supabase, altIds, "overall");
    },
    [`dashboard-bulk-ratings-${[...altIds].sort((a, b) => a - b).join(",")}`],
    { tags: [CacheTags.DASHBOARD_RATINGS] }
  )();
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

  // Extract alt IDs for bulk queries
  const altIds = alts.map((a) => a.id);

  // Parallel fetch: cached bulk stats/ratings + uncached active match + dashboard data
  let bulkStats: Record<number, AltStats> | undefined;
  let bulkRatings: Record<number, PlayerRating> | undefined;
  let activeMatch: ActiveMatch | null = null;
  let dashboardData: Awaited<ReturnType<typeof getMyDashboardData>> | null =
    null;

  if (altIds.length > 0) {
    const [statsResult, ratingsResult, matchResult, dashboardResult] =
      await Promise.allSettled([
        getCachedBulkStats(altIds),
        getCachedBulkRatings(altIds),
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
