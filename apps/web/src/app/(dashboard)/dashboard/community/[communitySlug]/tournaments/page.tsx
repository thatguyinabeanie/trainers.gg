import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCommunityBySlug } from "@trainers/supabase";

import { TournamentsListClient } from "@/app/(app)/to-dashboard/[communitySlug]/tournaments/tournaments-list-client";
import { PageHeader } from "@/components/dashboard/page-header";

interface PageProps {
  params: Promise<{
    communitySlug: string;
  }>;
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function DashboardTournamentsPage({
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
    <>
      <PageHeader title="Tournaments">
        <Link
          href={`/dashboard/community/${communitySlug}/tournaments/create`}
          className="bg-primary text-primary-foreground hover:bg-primary/80 ml-auto inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-medium"
        >
          <Plus className="h-4 w-4" />
          Create Tournament
        </Link>
      </PageHeader>
      <div className="bg-muted flex flex-1 flex-col gap-3 p-4 md:p-6">
        <TournamentsListClient
          communityId={organization.id}
          communitySlug={communitySlug}
          initialStatus={status}
        />
      </div>
    </>
  );
}
