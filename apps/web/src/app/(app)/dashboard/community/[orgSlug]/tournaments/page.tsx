import { createClient } from "@/lib/supabase/server";
import { getCommunityBySlug } from "@trainers/supabase";
import { TournamentsListClient } from "@/app/(app)/to-dashboard/[orgSlug]/tournaments/tournaments-list-client";

interface PageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function DashboardTournamentsPage({
  params,
  searchParams,
}: PageProps) {
  const { orgSlug: communitySlug } = await params;
  const { status } = await searchParams;
  const supabase = await createClient();

  const organization = await getCommunityBySlug(supabase, communitySlug);

  if (!organization) {
    return null; // Layout handles 404
  }

  return (
    <TournamentsListClient
      communityId={organization.id}
      communitySlug={communitySlug}
      initialStatus={status}
    />
  );
}
