import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getCurrentUserAlts,
  getAltsBulkStats,
  getPlayerRatingsBulk,
  getActiveMatch,
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

import { HomeClient } from "./home-client";
import HomeLoading from "./home-loading";
import { LiveMatchBar, type ActiveMatch } from "./components/live-match-bar";
import { DashboardStats } from "./components/dashboard-stats";

// On-demand revalidation only — no time-based revalidation
export const revalidate = false;

// =============================================================================
// Cached Fetchers (public data — anonymous client, no cookies)
// =============================================================================

/**
 * Fetch bulk match stats for a list of alt IDs.
 * Cache key includes sorted alt IDs for stable deduplication.
 */
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

/**
 * Fetch bulk ratings for a list of alt IDs.
 * Cache key includes sorted alt IDs for stable deduplication.
 */
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
// Stats Computation
// =============================================================================

interface ComputedStats {
  winRate: string;
  winRateSub: string;
  rating: string;
  ratingSub: string;
  record: string;
  recordSub: string;
  tournaments: string;
  tournamentsSub: string;
  tournamentsSubAccent: boolean;
}

/**
 * Compute aggregated display strings from bulk stats and ratings.
 * Extracted here so the server component renders DashboardStats directly.
 */
function computeStats(
  bulkStats: Record<number, AltStats> | undefined,
  bulkRatings: Record<number, PlayerRating> | undefined,
  altCount: number
): ComputedStats {
  const aggregateWins = bulkStats
    ? Object.values(bulkStats).reduce((sum, s) => sum + s.matchWins, 0)
    : 0;
  const aggregateLosses = bulkStats
    ? Object.values(bulkStats).reduce((sum, s) => sum + s.matchLosses, 0)
    : 0;
  const aggregateTotal = aggregateWins + aggregateLosses;
  const aggregateWinRate =
    aggregateTotal > 0 ? (aggregateWins / aggregateTotal) * 100 : 0;

  const bestRating = bulkRatings
    ? Math.max(...Object.values(bulkRatings).map((r) => r.rating ?? 0), 0)
    : 0;

  const aggregateTournaments = bulkStats
    ? Object.values(bulkStats).reduce((sum, s) => sum + s.tournamentCount, 0)
    : 0;

  return {
    winRate: aggregateTotal > 0 ? `${aggregateWinRate.toFixed(1)}%` : "0.0%",
    winRateSub:
      aggregateTotal > 0 ? `${aggregateTotal} games` : "across all alts",
    rating: bestRating > 0 ? bestRating.toLocaleString() : "—",
    ratingSub: bestRating > 0 ? "best across alts" : "across all alts",
    record: aggregateTotal > 0 ? `${aggregateWins}-${aggregateLosses}` : "0-0",
    recordSub: "across all alts",
    tournaments: `${aggregateTournaments}`,
    tournamentsSub: `${altCount} alt${altCount !== 1 ? "s" : ""}`,
    tournamentsSubAccent: false,
  };
}

// =============================================================================
// Page Component (Server Component)
// =============================================================================

export default async function DashboardHomePage() {
  // Auth check — layout already redirects, but guard just in case
  const user = await getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard");
  }

  // Read selected alt cookie
  const cookieStore = await cookies();
  const selectedAltUsername =
    cookieStore.get(DASHBOARD_ALT_COOKIE)?.value ?? null;

  // Fetch user's alts (auth-required — not cached)
  const supabase = await createClientReadOnly();
  const alts = await getCurrentUserAlts(supabase);

  // Fetch main_alt_id from users table (auth-required — not cached)
  const { data: userRow, error: userRowError } = await supabase
    .from("users")
    .select("main_alt_id")
    .eq("id", user.id)
    .single();

  if (userRowError) {
    console.error(
      "[DashboardHomePage] Failed to fetch main_alt_id:",
      userRowError
    );
  }
  const mainAltId: number | null = userRow?.main_alt_id ?? null;

  // Extract alt IDs for bulk queries
  const altIds = alts.map((a) => a.id);

  // Parallel fetch: cached bulk stats/ratings + active match (public data)
  let bulkStats: Record<number, AltStats> | undefined;
  let bulkRatings: Record<number, PlayerRating> | undefined;
  let activeMatch: ActiveMatch | null = null;

  if (altIds.length > 0) {
    const [statsResult, ratingsResult, matchResult] = await Promise.all([
      getCachedBulkStats(altIds),
      getCachedBulkRatings(altIds),
      mainAltId
        ? (() => {
            const staticClient = createStaticClient();
            return getActiveMatch(staticClient, mainAltId);
          })()
        : Promise.resolve(null),
    ]);
    bulkStats = statsResult;
    bulkRatings = ratingsResult;
    activeMatch = matchResult;
  }

  // Compute stats for server-rendered DashboardStats
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

  // Extract username for welcome toast detection in client component
  const username = (user.user_metadata?.username as string) ?? "";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Suspense fallback={<HomeLoading />}>
        <div className="space-y-6">
          {/* Live match bar — server-rendered */}
          {activeMatch && <LiveMatchBar match={activeMatch} />}

          {/* Stats row — server-rendered */}
          <DashboardStats
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

          {/* Client component — handles interactivity only */}
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
            initialActiveMatch={activeMatch}
            selectedAltUsername={selectedAltUsername}
            username={username}
          />
        </div>
      </Suspense>
    </div>
  );
}
