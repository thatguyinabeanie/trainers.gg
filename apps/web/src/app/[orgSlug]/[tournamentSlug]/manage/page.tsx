import { use } from "react";
import { TournamentManageClient } from "./tournament-manage-client";

interface TournamentManagePageProps {
  params: Promise<{
    orgSlug: string;
    tournamentSlug: string;
  }>;
}

export default function TournamentManagePage({
  params,
}: TournamentManagePageProps) {
  const { orgSlug, tournamentSlug } = use(params);

  return (
    <TournamentManageClient orgSlug={orgSlug} tournamentSlug={tournamentSlug} />
  );
}
