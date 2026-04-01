import { createClient } from "@/lib/supabase/server";
import { getCommunityBySlug } from "@trainers/supabase";
import { TournamentsListClient } from "./tournaments-list-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
  }>;
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function TournamentsPage({
  params,
  searchParams,
}: PageProps) {
  const { communitySlug } = await params;
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
