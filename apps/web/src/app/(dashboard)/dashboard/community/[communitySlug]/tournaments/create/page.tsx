import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  getCommunityBySlug,
  getDiscordServerByCommunityId,
} from "@trainers/supabase";

import { createServiceRoleClient } from "@/lib/supabase/server";
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

  // Service-role bypasses anon/authenticated grants (§0.2 of architecture-phase2-task9-revoke-plan.md).
  // getCommunityBySlug reads `communities`, `community_staff`, and `tournaments` — all in the
  // Phase 2 Task 9 Step-4 revoke set. getDiscordServerByCommunityId reads `discord_servers` (not
  // in the revoke set, but service-role is fine for it too). Both reads are community-level public
  // S-bucket data (same for all staff viewing this page), not user-specific — safe to use
  // service-role. No 'use cache' here: the page is auth-gated (dashboard layout) and renders
  // a client component island (CreateTournamentClient) that drives the form interactivity.
  const supabase = createServiceRoleClient();
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
