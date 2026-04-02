import type { CommunityStats } from "@trainers/supabase";
import {
  getCommunityBySlug,
  getCommunityStats,
  getTopReturningPlayers,
  getCommunityActivity,
  listCommunityTournaments,
} from "@trainers/supabase";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";

import { OverviewClient } from "./overview-client";

interface PageProps {
  params: Promise<{ communitySlug: string }>;
}

/** Empty stats for graceful degradation when queries fail */
const EMPTY_STATS: CommunityStats = {
  totalTournaments: 0,
  activeTournaments: 0,
  uniquePlayers: 0,
  totalEntries: 0,
  staffCount: 0,
  adminCount: 0,
  judgeCount: 0,
};

export default async function DashboardCommunityOverviewPage({
  params,
}: PageProps) {
  const { communitySlug } = await params;

  const supabase = await createClient();
  const community = await getCommunityBySlug(supabase, communitySlug);
  if (!community) return null;

  // Fetch overview data in parallel. Gracefully degrade on failure —
  // a transient DB error shouldn't block the entire dashboard.
  let stats = EMPTY_STATS;
  let topPlayers: Awaited<ReturnType<typeof getTopReturningPlayers>> = [];
  let activity: Awaited<ReturnType<typeof getCommunityActivity>> = [];
  let upcomingTournaments: Awaited<
    ReturnType<typeof listCommunityTournaments>
  >["tournaments"] = [];

  try {
    const [s, tp, a, t] = await Promise.all([
      getCommunityStats(supabase, community.id),
      getTopReturningPlayers(supabase, community.id, 5),
      getCommunityActivity(supabase, community.id, 5),
      listCommunityTournaments(supabase, community.id, {
        status: "upcoming",
        limit: 3,
      }),
    ]);
    stats = s;
    topPlayers = tp;
    activity = a;
    upcomingTournaments = t.tournaments;
  } catch (error) {
    // Log but don't throw — the page renders with empty states
    console.error("[community-overview] Failed to fetch overview data:", error);
  }

  return (
    <>
      <PageHeader title="Overview" />
      <div className="flex flex-1 flex-col gap-3 p-4 md:p-6">
        <OverviewClient
          communitySlug={communitySlug}
          stats={stats}
          topPlayers={topPlayers}
          activity={activity}
          upcomingTournaments={upcomingTournaments}
        />
      </div>
    </>
  );
}
