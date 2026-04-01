import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCommunityBySlug } from "@trainers/supabase";

import { TournamentsListClient } from "@/app/(app)/to-dashboard/[communitySlug]/tournaments/tournaments-list-client";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

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
          className={cn(buttonVariants({ size: "sm" }), "ml-auto")}
        >
          <Plus className="mr-1 h-4 w-4" />
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
