import { notFound, redirect } from "next/navigation";

import { getFormatById } from "@trainers/pokemon";
import { getAltByUsername, getTeamWithPokemon } from "@trainers/supabase";

import { getUser, createClientReadOnly } from "@/lib/supabase/server";
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
  params: Promise<{ handle: string; teamId: string }>;
}

export default async function TeamWorkspacePage({
  params,
}: TeamWorkspacePageProps) {
  const { handle, teamId } = await params;

  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericTeamId)) {
    notFound();
  }

  const supabase = await createClientReadOnly();

  // Fetch the alt and team in parallel — they are independent
  const [alt, team] = await Promise.all([
    getAltByUsername(supabase, handle),
    getTeamWithPokemon(supabase, numericTeamId),
  ]);

  if (!alt) {
    notFound();
  }

  if (!team) {
    notFound();
  }

  // Verify the team belongs to the alt from the URL
  if (team.created_by !== alt.id) {
    notFound();
  }

  const format = team.format ? getFormatById(team.format) : undefined;

  return <TeamWorkspace team={team} handle={handle} format={format} />;
}
