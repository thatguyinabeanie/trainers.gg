"use client";

import { use } from "react";
import { CreateTournamentClient } from "./create-tournament-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
  }>;
}

export default function CreateTournamentPage({ params }: PageProps) {
  const { communitySlug } = use(params);

  return <CreateTournamentClient communitySlug={communitySlug} />;
}
