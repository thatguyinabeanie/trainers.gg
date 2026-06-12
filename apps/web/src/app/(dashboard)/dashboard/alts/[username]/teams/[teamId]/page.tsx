import { notFound } from "next/navigation";

import { getFormatById } from "@trainers/pokemon";
import { getCurrentUserAlts, getTeamWithPokemon } from "@trainers/supabase";

import { createClientReadOnly, createServiceRoleClient } from "@/lib/supabase/server";
import { DashboardBuilderWrapper } from "@/components/team-builder/dashboard-builder-wrapper";

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

  // Service-role client for S-bucket table reads (teams, team_pokemon, pokemon): bypasses
  // anon/authenticated GRANT restrictions after the Phase 2 Task 9 revoke. The team is
  // S-bucket public data — identical for all viewers. Ownership is already validated by the
  // layout above. See docs/decisions/architecture-phase2-task9-revoke-plan.md §0.2.
  const supabasePublic = createServiceRoleClient();

  // FLAG (Phase 2 Task 9): getCurrentUserAlts calls supabase.auth.getUser() internally
  // to resolve the session user — it cannot use the service-role client because service-role
  // has no session context (auth.getUser() returns null). Kept on the cookie-based client
  // until getCurrentUserAlts is refactored to accept an explicit userId parameter (or
  // the team builder page is migrated to /api/v1/me/alts in a later wave).
  const supabaseCookie = await createClientReadOnly();

  const [team, alts] = await Promise.all([
    getTeamWithPokemon(supabasePublic, numericTeamId),
    getCurrentUserAlts(supabaseCookie),
  ]);

  if (!team) {
    notFound();
  }

  const format = team.format ? getFormatById(team.format) : undefined;

  return (
    <DashboardBuilderWrapper
      team={team}
      format={format}
      username={username}
      alts={alts}
    />
  );
}
