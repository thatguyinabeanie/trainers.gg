"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import { type GameFormat, getFormatLabel } from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";
import { type CrossAltTeamListItem } from "@trainers/supabase";
import { formatTimeAgo } from "@trainers/utils";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

import { NewTeamDialog } from "./new-team-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AllTeamsClientProps {
  initialTeams: CrossAltTeamListItem[];
  alts: Array<{ id: number; username: string }>;
  activeFormats: GameFormat[];
  userId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of sprite slots to render per team row. */
const SPRITE_SLOTS = 6;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AllTeamsClient({
  initialTeams,
  alts,
  activeFormats,
}: AllTeamsClientProps) {
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"empty" | "import">("empty");

  // Unique game names in the order they appear in activeFormats
  const uniqueGames = activeFormats.reduce<string[]>((acc, fmt) => {
    if (!acc.includes(fmt.game)) acc.push(fmt.game);
    return acc;
  }, []);

  // Formats filtered to the selected game (or all formats when no game is selected)
  const formatsForGame = selectedGame
    ? activeFormats.filter((fmt) => fmt.game === selectedGame)
    : activeFormats;

  const filteredTeams = initialTeams.filter((team) => {
    if (selectedFormat && team.format !== selectedFormat) return false;
    if (selectedAlt && team.alt_username !== selectedAlt) return false;
    return true;
  });

  function openDialog(mode: "empty" | "import") {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  const dialog = (
    <NewTeamDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      activeFormats={activeFormats}
      defaultFormat={selectedFormat ?? undefined}
      initialMode={dialogMode}
      alts={alts}
    />
  );

  if (initialTeams.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <EmptyState
          title="No teams yet"
          description="Create your first team or import a Showdown paste."
          action={
            <div className="flex gap-2">
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
        {dialog}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      {/* Toolbar: filters + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Divider — only shown when there are multiple alts */}
          {alts.length > 1 && (
            <div className="border-border mx-1 h-5 border-l" />
          )}

          {/* Alt chips */}
          {alts.length > 1 &&
            alts.map((alt) => (
              <button
                key={alt.id}
                onClick={() =>
                  setSelectedAlt(
                    selectedAlt === alt.username ? null : alt.username
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                  selectedAlt === alt.username
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent border-transparent"
                )}
              >
                {alt.username}
              </button>
            ))}
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

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Pokemon</th>
              <th className="px-3 py-2 font-medium">Alt</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Updated</th>
              <th className="px-3 py-2 text-right font-medium">Record</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((team) => (
              <TeamRow key={team.id} team={team} />
            ))}
            {filteredTeams.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-3 py-8 text-center"
                >
                  No teams match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {dialog}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TeamRow
// ---------------------------------------------------------------------------

interface TeamRowProps {
  team: CrossAltTeamListItem;
}

function TeamRow({ team }: TeamRowProps) {
  const sortedPokemon = [...team.team_pokemon].sort(
    (a, b) => a.team_position - b.team_position
  );

  const href = `/dashboard/alts/${team.alt_username}/teams/${team.id}`;

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
      <td className="text-muted-foreground px-3 py-2.5">{team.alt_username}</td>
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
