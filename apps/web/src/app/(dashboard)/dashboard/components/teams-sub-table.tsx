"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Hammer, ArrowUpRight, Copy } from "lucide-react";

import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { getTeamsForAlt, getPlayerTournamentHistory } from "@trainers/supabase";
import type { TypedSupabaseClient } from "@trainers/supabase";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useSupabaseQuery } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spriteUrl(species: string): string {
  return getPokemonSprite(species).url;
}

// ---------------------------------------------------------------------------
// TeamActions
// ---------------------------------------------------------------------------

function TeamActions({ altUsername }: { altUsername: string }) {
  return (
    <div className="flex justify-end gap-1">
      {/* TODO: link to builder page when available */}
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <Link
            href={`/dashboard/alts/${altUsername}`}
            className="bg-muted hover:bg-muted/80 inline-flex size-6 items-center justify-center rounded transition-colors"
            aria-label="Open in Builder"
          >
            <Hammer className="text-muted-foreground size-3" />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Open in Builder</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <button
            className="bg-muted hover:bg-muted/80 inline-flex size-6 cursor-not-allowed items-center justify-center rounded transition-colors"
            aria-label="Share (coming soon)"
            disabled
          >
            <ArrowUpRight className="text-muted-foreground size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Share (coming soon)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <button
            className="bg-muted hover:bg-muted/80 inline-flex size-6 cursor-not-allowed items-center justify-center rounded transition-colors"
            aria-label="Clone (coming soon)"
            disabled
          >
            <Copy className="text-muted-foreground size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Clone (coming soon)</TooltipContent>
      </Tooltip>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent results for an alt (lazy-loaded on expand)
// ---------------------------------------------------------------------------

function RecentResults({ altId }: { altId: number }) {
  const queryFn = (client: TypedSupabaseClient) =>
    getPlayerTournamentHistory(client, [altId]);
  const { data: results, isLoading } = useSupabaseQuery(queryFn, [
    "altRecentResults",
    altId,
  ]);

  // Show at most 3 recent results
  const recentResults = (results ?? []).slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
      </div>
    );
  }

  if (recentResults.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-xs">
        No results yet
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {recentResults.map((item) => {
        const isFirst = item.placement === 1;
        const placementText =
          item.placement != null
            ? `#${item.placement}${isFirst ? " 🏆" : ""}`
            : "—";

        // Format date as "Mar 28"
        const dateText = item.startDate
          ? new Date(item.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "";

        return (
          <div
            key={item.id}
            className="border-border/50 flex items-center gap-2 border-b py-1.5 text-xs last:border-0"
          >
            {/* Tournament name */}
            <Link
              href={`/tournaments/${item.tournamentSlug}`}
              className="min-w-0 shrink-0 font-medium hover:underline"
            >
              {item.tournamentName}
            </Link>

            {/* Pokemon sprites */}
            {item.teamPokemon.length > 0 && (
              <div className="ml-auto flex shrink-0 items-center">
                {item.teamPokemon.slice(0, 6).map((species, i) => (
                  <Image
                    key={i}
                    src={spriteUrl(species)}
                    alt={species}
                    width={18}
                    height={18}
                    className="shrink-0 object-contain"
                    style={{ imageRendering: "pixelated" }}
                    unoptimized
                  />
                ))}
              </div>
            )}

            {/* Placement */}
            <span
              className={cn(
                "shrink-0 font-mono text-[11px]",
                isFirst
                  ? "font-semibold text-teal-600"
                  : "text-muted-foreground"
              )}
            >
              {placementText}
            </span>

            {/* Date */}
            {dateText && (
              <span className="text-muted-foreground shrink-0 text-[10px]">
                {dateText}
              </span>
            )}
          </div>
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
// TeamsSubTable
// ---------------------------------------------------------------------------

export function TeamsSubTable({
  altId,
  altUsername,
  isMain,
  onDeleteAlt,
  isDeletePending,
  refreshKey,
}: TeamsSubTableProps) {
  const teamsQueryFn = (client: TypedSupabaseClient) =>
    getTeamsForAlt(client, altId);
  const { data: teams, isLoading } = useSupabaseQuery(teamsQueryFn, [
    "altTeams",
    altId,
    refreshKey,
  ]);

  return (
    <div className="rounded-lg">
      {/* Two-column layout: Teams + Recent Results */}
      <div className="grid grid-cols-1 gap-6 p-3 sm:grid-cols-2">
        {/* Left: Teams */}
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Teams
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-muted-foreground px-2 py-1 text-left text-[10px] font-medium tracking-wider uppercase">
                    Team
                  </th>
                  <th className="text-muted-foreground px-2 py-1 text-left text-[10px] font-medium tracking-wider uppercase">
                    Pokemon
                  </th>
                  <th className="w-24 px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-4 text-center">
                      <Loader2 className="text-muted-foreground mx-auto size-4 animate-spin" />
                    </td>
                  </tr>
                ) : !teams || teams.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="text-muted-foreground px-2 py-6 text-center text-xs"
                    >
                      No teams yet
                    </td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <tr
                      key={team.id}
                      className="hover:bg-muted/30 border-b transition-colors last:border-0"
                    >
                      <td className="px-2 py-1.5 font-medium">{team.name}</td>
                      <td className="px-2 py-1">
                        <div className="flex">
                          {team.pokemonSpecies.map((species, i) => (
                            <Image
                              key={i}
                              src={spriteUrl(species)}
                              alt={species}
                              width={28}
                              height={28}
                              className="object-contain"
                              style={{ imageRendering: "pixelated" }}
                              unoptimized
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <TeamActions altUsername={altUsername} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Results */}
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Recent Results
          </p>
          <RecentResults altId={altId} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-3 py-2">
        <div className="flex gap-1.5">
          <Button
            nativeButton={false}
            size="sm"
            className="h-7 text-xs"
            render={<Link href={`/dashboard/alts/${altUsername}`} />}
          >
            View as this alt
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            render={
              <Link href={`/dashboard/alts/${altUsername}/tournaments`} />
            }
          >
            View history
          </Button>
        </div>
        {/* TODO: Replace deleteAltAction with archiveAltAction — alts should be archived, not deleted */}
        {!isMain && (
          <button
            className="text-muted-foreground cursor-pointer text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onDeleteAlt}
            disabled={isDeletePending}
          >
            Archive alt
          </button>
        )}
      </div>
    </div>
  );
}
