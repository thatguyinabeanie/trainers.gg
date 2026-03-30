"use client";

import { use } from "react";
import { TournamentManageClient } from "@/app/(app)/to-dashboard/[orgSlug]/tournaments/[tournamentSlug]/manage/tournament-manage-client";

interface PageProps {
  params: Promise<{
    orgSlug: string;
    tournamentSlug: string;
  }>;
}

export default function DashboardTournamentManagePage({ params }: PageProps) {
  const { orgSlug: communitySlug, tournamentSlug } = use(params);

  return (
    <TournamentManageClient
      communitySlug={communitySlug}
      tournamentSlug={tournamentSlug}
    />
  );
}
