"use client";

import { use } from "react";
import { CreateTournamentClient } from "@/app/(app)/to-dashboard/[orgSlug]/tournaments/create/create-tournament-client";

interface PageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default function DashboardCreateTournamentPage({ params }: PageProps) {
  const { orgSlug: communitySlug } = use(params);

  return <CreateTournamentClient communitySlug={communitySlug} />;
}
