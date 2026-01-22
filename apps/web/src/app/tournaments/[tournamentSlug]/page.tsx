"use client";

import { use } from "react";
import { TournamentDetailClient } from "./tournament-detail-client";

interface PageProps {
  params: Promise<{
    tournamentSlug: string;
  }>;
}

export default function TournamentPage({ params }: PageProps) {
  const { tournamentSlug } = use(params);

  return <TournamentDetailClient tournamentSlug={tournamentSlug} />;
}
