import { createClient } from "@/lib/supabase/server";
import {
  getCommunityBySlug,
  getCommunityStats,
  getTopReturningPlayers,
  getCommunityActivity,
  listCommunityTournaments,
} from "@trainers/supabase";

import { PageHeader } from "@/components/dashboard/page-header";

import { OverviewClient } from "./overview-client";

interface PageProps {
  params: Promise<{ communitySlug: string }>;
}

export default async function DashboardCommunityOverviewPage({
  params,
}: PageProps) {
  const { communitySlug } = await params;
  const supabase = await createClient();

  const community = await getCommunityBySlug(supabase, communitySlug);
  if (!community) return null;

  const [stats, topPlayers, activity, { tournaments: upcomingTournaments }] =
    await Promise.all([
      getCommunityStats(supabase, community.id),
      getTopReturningPlayers(supabase, community.id, 5),
      getCommunityActivity(supabase, community.id, 5),
      listCommunityTournaments(supabase, community.id, {
        status: "upcoming",
        limit: 3,
      }),
    ]);

  return (
    <>
      <PageHeader title="Overview" />
      <div className="bg-muted flex flex-1 flex-col gap-3 p-4 md:p-6">
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
