"use client";

import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { type GameFormat, getFormatLabel } from "@trainers/pokemon";
import { getTeamsForAltList } from "@trainers/supabase";

import { useSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamCard } from "@/components/team-builder/team-card";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const teamKeys = {
  all: (altId: number) => ["teams", altId] as const,
  detail: (teamId: number) => ["team", teamId] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Group teams by format for the "All" view.
 * Returns a Map<format, teams[]> preserving insertion order.
 */
function groupByFormat(
  teams: Awaited<ReturnType<typeof getTeamsForAltList>>
): Map<string, typeof teams> {
  const map = new Map<string, typeof teams>();
  for (const team of teams) {
    const key = team.format ?? "No Format";
    const existing = map.get(key);
    if (existing) {
      existing.push(team);
    } else {
      map.set(key, [team]);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TeamsListClientProps {
  initialTeams: Awaited<ReturnType<typeof getTeamsForAltList>>;
  altId: number;
  handle: string;
  activeFormats: GameFormat[];
  selectedFormat: string | undefined;
}

/**
 * Client component for the team list page.
 * Hydrates from SSR data via initialData and keeps the cache warm via useQuery.
 */
export function TeamsListClient({
  initialTeams,
  altId,
  handle,
  activeFormats,
  selectedFormat,
}: TeamsListClientProps) {
  const supabase = useSupabase();

  const {
    data: teams = [],
    isError,
    error,
  } = useQuery({
    queryKey: teamKeys.all(altId),
    queryFn: () => getTeamsForAltList(supabase, altId),
    initialData: initialTeams,
    staleTime: 30_000,
  });

  // Filter logic
  const isAll = !selectedFormat || selectedFormat === "all";
  const filteredTeams = isAll
    ? teams
    : teams.filter((t) => t.format === selectedFormat);

  const groupedTeams = isAll ? groupByFormat(filteredTeams) : null;

  const newTeamUrl = `/dashboard/alts/${handle}/teams/new`;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {/* Format filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/dashboard/alts/${handle}/teams`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              isAll
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent border-transparent"
            )}
          >
            All
          </Link>
          {activeFormats.map((fmt) => (
            <Link
              key={fmt.id}
              href={`/dashboard/alts/${handle}/teams?format=${fmt.id}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                selectedFormat === fmt.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-accent border-transparent"
              )}
            >
              {fmt.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`${newTeamUrl}?mode=import`} />}
          >
            <Upload className="size-4" />
            Import Paste
          </Button>
          <Button size="sm" render={<Link href={newTeamUrl} />}>
            <Plus className="size-4" />
            New Team
          </Button>
        </div>
      </div>

      {/* Error banner — shown when a background refetch fails */}
      {isError && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2 text-sm">
          Failed to refresh teams.{" "}
          {error instanceof Error ? error.message : "Please try again later."}
        </div>
      )}

      {/* Teams content */}
      {filteredTeams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description={
            isAll
              ? "Create your first team or import a Showdown paste to get started."
              : "No teams for this format yet."
          }
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                render={<Link href={`${newTeamUrl}?mode=import`} />}
              >
                <Upload className="size-4" />
                Import Paste
              </Button>
              <Button render={<Link href={newTeamUrl} />}>
                <Plus className="size-4" />
                New Team
              </Button>
            </div>
          }
        />
      ) : isAll && groupedTeams ? (
        // Grouped by format
        <div className="flex flex-col gap-8">
          {Array.from(groupedTeams.entries()).map(([format, formatTeams]) => (
            <section key={format}>
              <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">
                {format === "No Format" ? "No Format" : getFormatLabel(format)}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {formatTeams.map((team) => (
                  <TeamCard key={team.id} team={team} handle={handle} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        // Flat list for filtered view
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <TeamCard key={team.id} team={team} handle={handle} />
          ))}
        </div>
      )}
    </div>
  );
}
