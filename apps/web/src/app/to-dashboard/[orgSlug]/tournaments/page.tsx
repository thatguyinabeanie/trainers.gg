import { createClient } from "@/lib/supabase/server";
import { getCommunityBySlug } from "@trainers/supabase";
import { TournamentsListClient } from "./tournaments-list-client";

interface PageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function TournamentsPage({
  params,
  searchParams,
}: PageProps) {
  const { orgSlug } = await params;
  const { status } = await searchParams;
  const supabase = await createClient();

  const organization = await getCommunityBySlug(supabase, orgSlug);

  if (!organization) {
    return null; // Layout handles 404
  }

  return (
    <TournamentsListClient
      communityId={organization.id}
      orgSlug={orgSlug}
      initialStatus={status}
    />
  );
}
