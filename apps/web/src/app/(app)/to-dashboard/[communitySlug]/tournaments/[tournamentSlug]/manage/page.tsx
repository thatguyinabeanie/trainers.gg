"use client";

import { use } from "react";
import { TournamentManageClient } from "./tournament-manage-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
    tournamentSlug: string;
  }>;
}

export default function TournamentManagePage({ params }: PageProps) {
  const { communitySlug, tournamentSlug } = use(params);

  return (
    <TournamentManageClient
      communitySlug={communitySlug}
      tournamentSlug={tournamentSlug}
    />
  );
}
