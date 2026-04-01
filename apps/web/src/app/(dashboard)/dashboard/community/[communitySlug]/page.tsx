import { createClient } from "@/lib/supabase/server";
import {
  getCommunityWithTournamentStats,
  listCommunityTournaments,
} from "@trainers/supabase";
import { OverviewClient } from "@/app/(app)/to-dashboard/[communitySlug]/overview-client";
import { PageHeader } from "@/components/dashboard/page-header";

interface PageProps {
  params: Promise<{
    communitySlug: string;
  }>;
}

export default async function DashboardCommunityOverviewPage({
  params,
}: PageProps) {
  const { communitySlug } = await params;
  const supabase = await createClient();

  // Get community with stats
  const organization = await getCommunityWithTournamentStats(
    supabase,
    communitySlug
  );

  if (!organization) {
    return null; // Layout handles 404
  }

  // Get recent tournaments (limit 6)
  const { tournaments: recentTournaments } = await listCommunityTournaments(
    supabase,
    organization.id,
    { limit: 6 }
  );

  return (
    <>
      <PageHeader title={organization.name} />
      <div className="bg-muted flex flex-1 flex-col gap-3 p-4 md:p-6">
        <OverviewClient
          organization={organization}
          recentTournaments={recentTournaments}
          communitySlug={communitySlug}
        />
      </div>
    </>
  );
}
