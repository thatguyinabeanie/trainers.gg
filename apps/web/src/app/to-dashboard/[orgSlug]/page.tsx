import { createClient } from "@/lib/supabase/server";
import {
  getOrganizationWithTournamentStats,
  listOrganizationTournaments,
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
  const organization = await getOrganizationWithTournamentStats(
    supabase,
    orgSlug
  );

  if (!organization) {
    return null; // Layout handles 404
  }

  // Get recent tournaments (limit 6)
  const { tournaments: recentTournaments } = await listOrganizationTournaments(
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
