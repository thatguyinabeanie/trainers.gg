"use client";

import { use } from "react";
import { TournamentManageClient } from "@/app/(app)/to-dashboard/[communitySlug]/tournaments/[tournamentSlug]/manage/tournament-manage-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
    tournamentSlug: string;
  }>;
}

export default function DashboardTournamentManagePage({ params }: PageProps) {
  const { communitySlug, tournamentSlug } = use(params);

  return (
    <TournamentManageClient
      communitySlug={communitySlug}
      tournamentSlug={tournamentSlug}
    />
  );
}
