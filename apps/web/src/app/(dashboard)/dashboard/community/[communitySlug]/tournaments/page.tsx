import Link from "next/link";
import { Plus } from "lucide-react";

import { getCommunityBySlug } from "@trainers/supabase";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { TournamentsListClient } from "./tournaments-list-client";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

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
        <Link href={`/dashboard/community/${communitySlug}/tournaments/create`}>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Create Tournament
          </Button>
        </Link>
      </PageHeader>
      <DashboardContent>
        <TournamentsListClient
          communityId={organization.id}
          communitySlug={communitySlug}
          initialStatus={status}
        />
      </DashboardContent>
    </>
  );
}
