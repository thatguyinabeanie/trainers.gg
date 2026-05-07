import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  getCommunityBySlug,
  getDiscordServerByCommunityId,
} from "@trainers/supabase";

import { createClientReadOnly } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { CreateTournamentClient } from "./create-tournament-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
  }>;
}

export default async function DashboardCreateTournamentPage({
  params,
}: PageProps) {
  const { communitySlug } = await params;

  const supabase = await createClientReadOnly();
  const community = await getCommunityBySlug(supabase, communitySlug);
  const discordInstalled = community
    ? !!(await getDiscordServerByCommunityId(supabase, community.id))
    : false;

  return (
    <>
      <PageHeader>
        <Link
          href={`/dashboard/community/${communitySlug}/tournaments`}
          className="text-muted-foreground hover:text-foreground -ml-1 flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tournaments
        </Link>
      </PageHeader>
      <DashboardContent>
        <CreateTournamentClient
          communitySlug={communitySlug}
          discordInstalled={discordInstalled}
        />
      </DashboardContent>
    </>
  );
}
