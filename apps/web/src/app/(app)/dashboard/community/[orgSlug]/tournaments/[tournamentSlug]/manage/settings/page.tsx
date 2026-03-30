"use client";

import { use } from "react";
import { TournamentSettingsPageClient } from "./tournament-settings-page-client";

interface PageProps {
  params: Promise<{
    orgSlug: string;
    tournamentSlug: string;
  }>;
}

export default function TournamentSettingsPage({ params }: PageProps) {
  const { orgSlug, tournamentSlug } = use(params);

  return (
    <TournamentSettingsPageClient
      communitySlug={orgSlug}
      tournamentSlug={tournamentSlug}
    />
  );
}
