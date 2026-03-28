import { createClient } from "@/lib/supabase/server";
import {
  getCommunityWithTournamentStats,
  listCommunityTournaments,
} from "@trainers/supabase";
import { OverviewClient } from "./overview-client";

interface PageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default async function TODashboardOverviewPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  // Get org with stats
  const organization = await getCommunityWithTournamentStats(supabase, orgSlug);

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
    <OverviewClient
      organization={organization}
      recentTournaments={recentTournaments}
      orgSlug={orgSlug}
    />
  );
}
