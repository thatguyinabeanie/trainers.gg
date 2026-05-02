import { notFound, redirect } from "next/navigation";

import {
  getAltByUsername,
  getTeamWithPokemon,
  hasTeamBuilderAccess,
} from "@trainers/supabase";

import { getUser, createClientReadOnly } from "@/lib/supabase/server";

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

  const supabase = await createClientReadOnly();

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
