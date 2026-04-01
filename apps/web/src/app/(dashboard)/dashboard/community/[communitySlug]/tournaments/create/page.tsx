"use client";

import { use } from "react";
import { CreateTournamentClient } from "@/app/(app)/to-dashboard/[communitySlug]/tournaments/create/create-tournament-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
  }>;
}

export default function DashboardCreateTournamentPage({ params }: PageProps) {
  const { communitySlug } = use(params);

  return <CreateTournamentClient communitySlug={communitySlug} />;
}
