import { notFound } from "next/navigation";

import { getFormatById } from "@trainers/pokemon";
import { getAltByUsername, getTeamWithPokemon } from "@trainers/supabase";

import { createClientReadOnly } from "@/lib/supabase/server";
import { TeamWorkspace } from "@/components/team-builder/team-workspace";

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

  // Layout validates auth and ownership. Re-fetch here because App Router can't pass data from layout to page.
  const supabase = await createClientReadOnly();

  // Fetch the alt and team in parallel — they are independent
  const [alt, team] = await Promise.all([
    getAltByUsername(supabase, username),
    getTeamWithPokemon(supabase, numericTeamId),
  ]);

  if (!alt) {
    notFound();
  }

  if (!team) {
    notFound();
  }

  const format = team.format ? getFormatById(team.format) : undefined;

  return <TeamWorkspace team={team} handle={username} format={format} />;
}
