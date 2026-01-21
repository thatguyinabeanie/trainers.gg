import { use } from "react";
import { TournamentDetailClient } from "./tournament-detail-client";

interface TournamentPageProps {
  params: Promise<{
    orgSlug: string;
    tournamentSlug: string;
  }>;
}

export default function TournamentPage({ params }: TournamentPageProps) {
  const { orgSlug, tournamentSlug } = use(params);

  return (
    <TournamentDetailClient orgSlug={orgSlug} tournamentSlug={tournamentSlug} />
  );
}
