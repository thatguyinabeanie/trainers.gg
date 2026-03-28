"use client";

import { use } from "react";
import { TournamentManageClient } from "./tournament-manage-client";

interface PageProps {
  params: Promise<{
    orgSlug: string;
    tournamentSlug: string;
  }>;
}

export default function TournamentManagePage({ params }: PageProps) {
  const { orgSlug: communitySlug, tournamentSlug } = use(params);

  return (
    <TournamentManageClient
      communitySlug={communitySlug}
      tournamentSlug={tournamentSlug}
    />
  );
}
