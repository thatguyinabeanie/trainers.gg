import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { getFormatById } from "@trainers/pokemon";
import { getAltByUsername, getTeamWithPokemon } from "@trainers/supabase";

import { getUser, createClientReadOnly } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { WorkspaceActions } from "@/components/team-builder/workspace-actions";

// =============================================================================
// Layout
// =============================================================================

interface TeamWorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ handle: string; teamId: string }>;
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

  // Fetch alt and team in parallel
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
  const teamsUrl = `/dashboard/alts/${handle}/teams`;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header bar */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        {/* Breadcrumb — "← Teams / Team Name" */}
        <Link
          href={teamsUrl}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          aria-label="Back to Teams"
        >
          <ChevronLeft className="size-4" />
          <span>Teams</span>
        </Link>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="text-sm font-medium">{team.name}</span>

        {/* Format badge */}
        {format && (
          <Badge variant="secondary" className="text-xs">
            {format.label}
          </Badge>
        )}

        {/* Action buttons — pushed to the right */}
        <div className="ml-auto">
          <WorkspaceActions team={team} altId={alt.id} handle={handle} />
        </div>
      </header>

      {/* Page content */}
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
