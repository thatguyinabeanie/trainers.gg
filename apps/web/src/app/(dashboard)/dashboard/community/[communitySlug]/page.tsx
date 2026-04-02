import { unstable_cache } from "next/cache";

import {
  getCommunityBySlug,
  getCommunityStats,
  getTopReturningPlayers,
  getCommunityActivity,
  listCommunityTournaments,
} from "@trainers/supabase";

import { CacheTags } from "@/lib/cache";
import { createClient, createStaticClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";

import { OverviewClient } from "./overview-client";

// On-demand revalidation only (no time-based)
export const revalidate = false;

interface PageProps {
  params: Promise<{ communitySlug: string }>;
}

export default async function DashboardCommunityOverviewPage({
  params,
}: PageProps) {
  const { communitySlug } = await params;

  // Authenticated client for access check
  const supabase = await createClient();
  const community = await getCommunityBySlug(supabase, communitySlug);
  if (!community) return null;

  // Community stats are public data — cache with on-demand invalidation
  const getCachedStats = unstable_cache(
    async () => {
      const client = createStaticClient();
      return getCommunityStats(client, community.id);
    },
    [`community-stats-${community.id}`],
    { tags: [CacheTags.community(communitySlug)] }
  );

  const getCachedTopPlayers = unstable_cache(
    async () => {
      const client = createStaticClient();
      return getTopReturningPlayers(client, community.id, 5);
    },
    [`community-top-players-${community.id}`],
    { tags: [CacheTags.community(communitySlug)] }
  );

  const getCachedActivity = unstable_cache(
    async () => {
      const client = createStaticClient();
      return getCommunityActivity(client, community.id, 5);
    },
    [`community-activity-${community.id}`],
    { tags: [CacheTags.community(communitySlug)] }
  );

  const getCachedUpcoming = unstable_cache(
    async () => {
      const client = createStaticClient();
      return listCommunityTournaments(client, community.id, {
        status: "upcoming",
        limit: 3,
      });
    },
    [`community-upcoming-${community.id}`],
    { tags: [CacheTags.community(communitySlug)] }
  );

  const [stats, topPlayers, activity, { tournaments: upcomingTournaments }] =
    await Promise.all([
      getCachedStats(),
      getCachedTopPlayers(),
      getCachedActivity(),
      getCachedUpcoming(),
    ]);

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
