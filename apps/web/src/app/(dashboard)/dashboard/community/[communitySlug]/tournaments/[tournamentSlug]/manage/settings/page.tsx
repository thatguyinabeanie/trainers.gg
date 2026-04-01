"use client";

import { use } from "react";
import { TournamentSettingsPageClient } from "./tournament-settings-page-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
    tournamentSlug: string;
  }>;
}

export default function TournamentSettingsPage({ params }: PageProps) {
  const { communitySlug, tournamentSlug } = use(params);

  return (
    <TournamentSettingsPageClient
      communitySlug={communitySlug}
      tournamentSlug={tournamentSlug}
    />
  );
}
