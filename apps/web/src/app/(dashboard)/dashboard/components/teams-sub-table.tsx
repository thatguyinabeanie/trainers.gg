"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  ExternalLink,
  Trophy,
  Swords,
  ChevronRight,
  History,
  AlertTriangle,
} from "lucide-react";

import { getPokemonSprite } from "@trainers/pokemon/sprites";
import {
  type AltTeam,
  getPlayerTournamentHistory,
} from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";
import { type ActionResult } from "@trainers/validators";
import { formatShortDate } from "@trainers/utils";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSupabaseQuery } from "@/lib/supabase";
import { useApiQuery } from "@trainers/supabase/react-query";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Team Card (replaces nested table row)
// ---------------------------------------------------------------------------

function TeamCard({
  team,
  altUsername,
}: {
  team: { id: number; name: string; pokemonSpecies: string[] };
  altUsername: string;
}) {
  return (
    <Link
      href={`/dashboard/alts/${altUsername}/teams/${team.id}`}
      className="group flex items-center gap-3 rounded-lg bg-background/60 px-3 py-2 transition-colors hover:bg-background"
    >
      {/* Team name */}
      <span className="min-w-0 flex-1 truncate text-xs font-medium">
        {team.name}
      </span>

      {/* Pokemon sprites — pushed right */}
      <div className="ml-auto flex shrink-0 items-center">
        {team.pokemonSpecies.map((species, i) => {
          const sprite = getPokemonSprite(species);
          return (
            <Image
              key={i}
              src={sprite.url}
              alt={species}
              width={36}
              height={36}
              className="object-contain"
              style={
                sprite.pixelated ? { imageRendering: "pixelated" } : undefined
              }
              unoptimized
            />
          );
        })}
      </div>

      {/* Arrow */}
      <ChevronRight className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Recent results for an alt (lazy-loaded on expand)
// ---------------------------------------------------------------------------

function RecentResults({
  altId,
  refreshKey = 0,
}: {
  altId: number;
  refreshKey?: number;
}) {
  const queryFn = (client: TypedSupabaseClient) =>
    getPlayerTournamentHistory(client, [altId]);
  const {
    data: results,
    isLoading,
    error: resultsError,
  } = useSupabaseQuery(queryFn, ["altRecentResults", altId, refreshKey]);

  // Show at most 3 recent results
  const recentResults = (results ?? []).slice(0, 3);

  if (resultsError) {
    return (
      <p className="text-destructive py-4 text-center text-xs">
        Failed to load results
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
      </div>
    );
  }

  if (recentResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <Swords className="text-muted-foreground size-5" />
        <p className="text-muted-foreground mt-2 text-xs">No results yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {recentResults.map((item) => {
        const isFirst = item.placement === 1;
        const placementText =
          item.placement != null ? `#${item.placement}` : "—";

        const dateText = item.startDate ? formatShortDate(item.startDate) : "";

        return (
          <Link
            key={item.id}
            href={`/tournaments/${item.tournamentSlug}`}
            className="group flex items-center gap-2.5 rounded-lg bg-background/60 px-3 py-2 transition-colors hover:bg-background"
          >
            {/* Placement badge */}
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
                isFirst
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isFirst ? (
                <Trophy className="size-3.5" />
              ) : (
                placementText
              )}
            </span>

            {/* Tournament name + date */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium group-hover:underline">
                {item.tournamentName}
              </p>
              {dateText && (
                <p className="text-muted-foreground text-[11px]">{dateText}</p>
              )}
            </div>

            {/* Pokemon sprites */}
            {item.teamPokemon.length > 0 && (
              <div className="hidden shrink-0 items-center sm:flex">
                {item.teamPokemon.slice(0, 6).map((species, i) => {
                  const sprite = getPokemonSprite(species);
                  return (
                    <Image
                      key={i}
                      src={sprite.url}
                      alt={species}
                      width={18}
                      height={18}
                      className="shrink-0 object-contain"
                      style={
                        sprite.pixelated
                          ? { imageRendering: "pixelated" }
                          : undefined
                      }
                      unoptimized
                    />
                  );
                })}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TeamsSubTableProps {
  altId: number;
  altUsername: string;
  isMain: boolean;
  onDeleteAlt: () => void;
  isDeletePending: boolean;
  refreshKey: number;
}

// ---------------------------------------------------------------------------
// Fetcher for the teams API route
// ---------------------------------------------------------------------------

function fetchAltTeams(altId: number): Promise<ActionResult<AltTeam[]>> {
  return fetch(`/api/v1/me/teams?altId=${altId}`).then((r) => r.json());
}

// ---------------------------------------------------------------------------
// TeamsSubTable (redesigned expanded panel)
// ---------------------------------------------------------------------------

export function TeamsSubTable({
  altId,
  altUsername,
  isMain,
  onDeleteAlt,
  isDeletePending,
  refreshKey,
}: TeamsSubTableProps) {
  const {
    data: teams,
    isLoading,
    isError,
    error: teamsError,
  } = useApiQuery<AltTeam[]>(
    // refreshKey in the query key ensures a new fetch when the parent
    // increments it after a delete (preserving the previous refetch-after-delete
    // behavior that was provided by useSupabaseQuery).
    ["altTeams", altId, refreshKey],
    () => fetchAltTeams(altId),
    { staleTime: 30_000 }
  );

  return (
    <div className="rounded-lg">
      {/* Two-column layout: Teams + Recent Results */}
      <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2">
        {/* Left: Teams */}
        <div>
          <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Teams
          </p>
          {isError ? (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">
                {teamsError instanceof Error
                  ? teamsError.message
                  : "Failed to load teams"}
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            </div>
          ) : !teams || teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Swords className="text-muted-foreground size-5" />
              <p className="text-muted-foreground mt-2 text-xs">
                No teams yet
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  altUsername={altUsername}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Results */}
        <div>
          <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Recent Results
          </p>
          <RecentResults altId={altId} refreshKey={refreshKey} />
        </div>
      </div>

      {/* Footer — softened buttons */}
      <div className="flex items-center justify-between bg-muted/50 px-3 py-2.5">
        <div className="flex gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            render={<Link href={`/dashboard/alts/${altUsername}`} />}
          >
            <ExternalLink className="size-3" />
            View alt
          </Button>
          <Button
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            render={
              <Link href={`/dashboard/alts/${altUsername}/tournaments`} />
            }
          >
            <History className="size-3" />
            History
          </Button>
        </div>
        {/* TODO: Replace deleteAltAction with archiveAltAction when archive system is built */}
        {!isMain && (
          <button
            className="text-muted-foreground cursor-pointer text-[11px] hover:text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onDeleteAlt}
            disabled={isDeletePending}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
