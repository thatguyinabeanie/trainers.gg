"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  type GameFormat,
  getFormatLabel,
  MAX_TEAM_SIZE,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { getTeamsForAltList, type TeamListItem } from "@trainers/supabase";
import { formatTimeAgo } from "@trainers/utils";

import { useSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

import { NewTeamDialog } from "./new-team-dialog";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const teamKeys = {
  all: (altId: number) => ["teams", altId] as const,
  detail: (teamId: number) => ["team", teamId] as const,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of sprite slots to render per team row. */
const SPRITE_SLOTS = MAX_TEAM_SIZE;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TeamsListClientProps {
  initialTeams: Awaited<ReturnType<typeof getTeamsForAltList>>;
  altId: number;
  handle: string;
  activeFormats: GameFormat[];
}

/**
 * Client component for the alt-scoped team list page.
 * Hydrates from SSR data via initialData and keeps the cache warm via useQuery.
 * Uses the same data table layout as the cross-alt /dashboard/teams page.
 */
export function TeamsListClient({
  initialTeams,
  altId,
  handle,
  activeFormats,
}: TeamsListClientProps) {
  const supabase = useSupabase();
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"empty" | "import">("empty");

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

  // Unique game names in the order they appear in activeFormats
  const uniqueGames = activeFormats.reduce<string[]>((acc, fmt) => {
    if (!acc.includes(fmt.game)) acc.push(fmt.game);
    return acc;
  }, []);

  // Formats filtered to the selected game (or all formats when no game is selected)
  const formatsForGame = selectedGame
    ? activeFormats.filter((fmt) => fmt.game === selectedGame)
    : activeFormats;

  // Filter teams by selected format
  const filteredTeams = selectedFormat
    ? teams.filter((t) => t.format === selectedFormat)
    : teams;

  function openDialog(mode: "empty" | "import") {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Toolbar: filters + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Game selector */}
          <select
            value={selectedGame}
            onChange={(e) => {
              setSelectedGame(e.target.value);
              setSelectedFormat(null);
            }}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="">All Games</option>
            {uniqueGames.map((game) => (
              <option key={game} value={game}>
                {game}
              </option>
            ))}
          </select>

          {/* Format selector — filtered by selected game */}
          <select
            value={selectedFormat ?? ""}
            onChange={(e) => setSelectedFormat(e.target.value || null)}
            className="rounded-md border px-2 py-1 text-sm"
          >
            <option value="">All Formats</option>
            {formatsForGame.map((fmt) => (
              <option key={fmt.id} value={fmt.id}>
                {fmt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDialog("import")}
          >
            <Upload className="size-4" />
            Import Paste
          </Button>
          <Button size="sm" onClick={() => openDialog("empty")}>
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
            !selectedFormat
              ? "Create your first team or import a Showdown paste to get started."
              : "No teams for this format yet."
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => openDialog("import")}>
                <Upload className="size-4" />
                Import Paste
              </Button>
              <Button onClick={() => openDialog("empty")}>
                <Plus className="size-4" />
                New Team
              </Button>
            </div>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Pokemon</th>
                <th className="px-3 py-2 font-medium">Format</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 text-right font-medium">Record</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map((team) => (
                <AltTeamRow key={team.id} team={team} handle={handle} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewTeamDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activeFormats={activeFormats}
        defaultFormat={selectedFormat ?? undefined}
        initialMode={dialogMode}
        altId={altId}
        altUsername={handle}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AltTeamRow — same layout as cross-alt TeamRow but without the Alt column
// ---------------------------------------------------------------------------

function AltTeamRow({ team, handle }: { team: TeamListItem; handle: string }) {
  const sortedPokemon = [...team.team_pokemon].sort(
    (a, b) => a.team_position - b.team_position
  );

  const href = `/dashboard/alts/${handle}/teams/${team.id}`;

  return (
    <tr className="hover:bg-muted/50 border-b transition-colors last:border-0">
      <td className="px-3 py-2.5">
        <Link href={href} className="font-medium hover:underline">
          {team.name}
        </Link>
      </td>
      <td className="px-3 py-2.5">
        <Link href={href} className="flex gap-0.5">
          {Array.from({ length: SPRITE_SLOTS }, (_, i) => {
            const pokemon = sortedPokemon[i]?.pokemon;
            const species = pokemon?.species ?? null;
            const isShiny = pokemon?.is_shiny ?? false;

            if (!species) {
              return (
                <span
                  key={i}
                  className="bg-muted inline-block size-5 rounded"
                />
              );
            }

            const sprite = getPokemonSprite(species, { shiny: isShiny });
            return (
              <Image
                key={i}
                src={sprite.url}
                alt={species}
                width={20}
                height={20}
                className="size-5 rounded object-contain"
                unoptimized
              />
            );
          })}
        </Link>
      </td>
      <td className="px-3 py-2.5">
        {team.format && (
          <Badge variant="secondary" className="text-xs">
            {getFormatLabel(team.format)}
          </Badge>
        )}
      </td>
      <td className="text-muted-foreground px-3 py-2.5 text-xs">
        {team.updated_at ? formatTimeAgo(team.updated_at) : "—"}
      </td>
      <td className="text-muted-foreground px-3 py-2.5 text-right text-xs">
        —
      </td>
    </tr>
  );
}
