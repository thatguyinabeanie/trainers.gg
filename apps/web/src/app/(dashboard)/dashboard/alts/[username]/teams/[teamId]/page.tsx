import { notFound } from "next/navigation";

import { getFormatById } from "@trainers/pokemon";
import { getCurrentUserAlts, getTeamWithPokemon } from "@trainers/supabase";

import { createClientReadOnly } from "@/lib/supabase/server";
import { TeamWorkspaceV2 } from "@/components/team-builder/v2/team-workspace-v2";

// =============================================================================
// Metadata
// =============================================================================

export const metadata = {
  title: "Team Editor — trainers.gg",
  description: "Build and refine your competitive Pokémon team",
};

// =============================================================================
// Page
// =============================================================================

interface TeamWorkspacePageProps {
  params: Promise<{ username: string; teamId: string }>;
}

export default async function TeamWorkspacePage({
  params,
}: TeamWorkspacePageProps) {
  const { username, teamId } = await params;

  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericTeamId)) {
    notFound();
  }

  // Layout validates auth and ownership. Re-fetch here because App Router can't
  // pass data from layout to page.
  const supabase = await createClientReadOnly();
  const [team, alts] = await Promise.all([
    getTeamWithPokemon(supabase, numericTeamId),
    getCurrentUserAlts(supabase),
  ]);

  if (!team) {
    notFound();
  }

  const format = team.format ? getFormatById(team.format) : undefined;

  return (
    <TeamWorkspaceV2
      team={team}
      format={format}
      username={username}
      alts={alts}
    />
  );
}
