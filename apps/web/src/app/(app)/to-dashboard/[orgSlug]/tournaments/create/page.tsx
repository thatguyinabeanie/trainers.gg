"use client";

import { use } from "react";
import { CreateTournamentClient } from "./create-tournament-client";

interface PageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default function CreateTournamentPage({ params }: PageProps) {
  const { orgSlug: communitySlug } = use(params);

  return <CreateTournamentClient communitySlug={communitySlug} />;
}
