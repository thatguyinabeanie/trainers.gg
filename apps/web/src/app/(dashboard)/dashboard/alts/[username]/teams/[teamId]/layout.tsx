import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { getFormatById } from "@trainers/pokemon";
import {
  getAltByUsername,
  getTeamWithPokemon,
  hasTeamBuilderAccess,
} from "@trainers/supabase";

import { getUser, createClientReadOnly } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { WorkspaceActions } from "@/components/team-builder/workspace-actions";

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

  const format = team.format ? getFormatById(team.format) : undefined;
  const teamsUrl = `/dashboard/alts/${username}/teams`;

  return (
    <div className="flex h-full min-h-dvh flex-col">
      {/* Header bar — stacks to two rows on phones (breadcrumb above actions)
          since SidebarTrigger + breadcrumb + name + format badge + 3 action
          buttons can't fit in one h-12 row at 393px. Single row at md+. */}
      <header className="bg-background/95 sticky top-0 z-30 shrink-0 border-b backdrop-blur">
        <div className="flex flex-col gap-1 px-3 py-2 md:h-12 md:flex-row md:items-center md:gap-2 md:px-4 md:py-0">
          {/* Identity row — breadcrumb + name + format badge */}
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Link
              href={teamsUrl}
              className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-sm transition-colors"
              aria-label="Back to Teams"
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">Teams</span>
            </Link>
            <span className="text-muted-foreground shrink-0 text-sm">/</span>
            <span className="min-w-0 truncate text-sm font-medium">
              {team.name}
            </span>
            {format && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {format.label}
              </Badge>
            )}
          </div>

          {/* Action buttons — own row on phone, right-aligned at md+ */}
          <div className="md:ml-auto">
            <WorkspaceActions
              team={team}
              altId={alt.id}
              handle={username}
              formatId={format?.id}
            />
          </div>
        </div>
      </header>

      {/* Page content — scrolls naturally; workspace owns its own padding/max-w */}
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
