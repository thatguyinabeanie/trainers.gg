import { notFound } from "next/navigation";

import { getFormatById } from "@trainers/pokemon";
import { getTeamWithPokemon } from "@trainers/supabase";

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
  const { teamId } = await params;

  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericTeamId)) {
    notFound();
  }

  // Layout validates auth and ownership. Re-fetch here because App Router can't pass data from layout to page.
  // The alt fetch is intentionally omitted — the page does not use it; the
  // layout already fetched it and enforced ownership.
  const supabase = await createClientReadOnly();
  const team = await getTeamWithPokemon(supabase, numericTeamId);

  if (!team) {
    notFound();
  }

  const format = team.format ? getFormatById(team.format) : undefined;

  return <TeamWorkspace team={team} format={format} />;
}
