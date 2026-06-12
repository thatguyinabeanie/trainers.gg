import { notFound, redirect } from "next/navigation";

import {
  getAltByUsername,
  getTeamWithPokemon,
  hasTeamBuilderAccess,
} from "@trainers/supabase";

import { getUser, createServiceRoleClient } from "@/lib/supabase/server";

// =============================================================================
// Layout
// =============================================================================

interface TeamWorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ username: string; teamId: string }>;
}

/**
 * Team workspace layout.
 * Renders a sticky header bar with breadcrumb, format badge, and action buttons,
 * then passes children through below it.
 */
export default async function TeamWorkspaceLayout({
  children,
  params,
}: TeamWorkspaceLayoutProps) {
  const { username, teamId } = await params;

  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const numericTeamId = Number(teamId);
  if (Number.isNaN(numericTeamId)) {
    notFound();
  }

  // Service-role client: bypasses anon/authenticated GRANT restrictions on S-bucket tables
  // (teams, team_pokemon, alts, feature_flags via hasTeamBuilderAccess) after the Phase 2
  // Task 9 revoke. The user identity check is done above via getUser(); userId is passed
  // explicitly to hasTeamBuilderAccess and ownership is verified in application code
  // (team.created_by !== alt.id). No per-user cookie context is needed for these reads.
  // See docs/decisions/architecture-phase2-task9-revoke-plan.md §0.2 for rationale.
  const supabase = createServiceRoleClient();

  // Gate on team builder feature flag (direct DB query — no stale JWT issues).
  const accessResult = await hasTeamBuilderAccess(supabase, user.id);
  if (accessResult.access === "error") {
    throw new Error(accessResult.reason);
  }
  if (!accessResult.access) {
    notFound();
  }

  // Fetch alt and team in parallel
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

  // Verify the team belongs to the alt from the URL
  if (team.created_by !== alt.id) {
    notFound();
  }

  // absolute inset-0: pins to SidebarInset (position: relative) without contributing
  // to its height — breaks the circular h-full chain that causes min-h-svh to grow.
  return <div className="absolute inset-0 flex flex-col">{children}</div>;
}
