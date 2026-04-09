"use client";

import { useState } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Import } from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface TeamWorkspaceProps {
  team: TeamWithPokemon;
  handle: string;
  format: GameFormat | undefined;
}

// =============================================================================
// TeamWorkspace
// =============================================================================

/**
 * Client component that orchestrates the team editor workspace.
 * Manages selected pokemon state and composes the team strip,
 * editor panel, and context panel.
 *
 * Layout:
 *   - Team strip across the top (6 pokemon slots)
 *   - Split panel below: editor (left 50%) and context (right 50%)
 */
export function TeamWorkspace({
  team,
  handle: _handle,
  format: _format,
}: TeamWorkspaceProps) {
  // Sort pokemon by position and get the first one as default selection
  const sortedPokemon = [...team.team_pokemon].sort(
    (a, b) => a.team_position - b.team_position
  );

  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(
    sortedPokemon[0]?.id ?? null
  );

  const selectedEntry = sortedPokemon.find((tp) => tp.id === selectedPokemonId);
  const hasPokemon = sortedPokemon.length > 0;

  if (!hasPokemon) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">No Pokémon yet</p>
          <p className="mt-1 text-sm">
            Import a Showdown paste or add Pokémon one by one to get started.
          </p>
        </div>
        {/* Import trigger — placeholder until the Import sheet is wired in Task 3+ */}
        <Button variant="outline" size="sm">
          <Import className="size-4" />
          Import Paste
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Team strip — Task 3 will replace this placeholder */}
      <div className={cn("border-b px-4 py-3", "flex items-center gap-2")}>
        {/* TeamStrip component — Task 3 */}
        {sortedPokemon.map((tp) => (
          <button
            key={tp.id}
            type="button"
            onClick={() => setSelectedPokemonId(tp.id)}
            className={cn(
              "bg-muted size-12 rounded-md border-2 transition-colors",
              tp.id === selectedPokemonId
                ? "border-primary"
                : "hover:border-border border-transparent"
            )}
            aria-label={tp.pokemon?.species ?? `Slot ${tp.team_position}`}
            aria-pressed={tp.id === selectedPokemonId}
          >
            <span className="text-muted-foreground text-xs">
              {tp.pokemon?.species?.slice(0, 3) ?? "?"}
            </span>
          </button>
        ))}
        {/* Fill remaining empty slots up to 6 */}
        {Array.from(
          { length: Math.max(0, 6 - sortedPokemon.length) },
          (_, i) => (
            <div
              key={`empty-${i}`}
              className="bg-muted/50 size-12 rounded-md border-2 border-dashed border-transparent"
            />
          )
        )}
      </div>

      {/* Split panel — editor left, context right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor panel (left 50%) — Task 4 will replace this placeholder */}
        <div className="flex w-1/2 flex-col border-r">
          {selectedEntry ? (
            <div className="flex flex-1 flex-col gap-4 p-4">
              {/* PokemonEditor component — Task 4 */}
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  Selected Pokémon
                </p>
                <p className="text-lg font-semibold">
                  {selectedEntry.pokemon?.species ?? "Unknown"}
                </p>
              </div>
              <div
                className="bg-muted/30 flex flex-1 items-center justify-center rounded-lg border border-dashed"
                aria-label="Pokemon editor — coming in Task 4"
              >
                <p className="text-muted-foreground text-sm">
                  {/* PokemonEditor component — Task 4 */}
                  Editor panel
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Select a Pokémon to edit
              </p>
            </div>
          )}
        </div>

        {/* Context panel (right 50%) — Task 5 will replace this placeholder */}
        <div className="flex w-1/2 flex-col">
          <div
            className="flex flex-1 items-center justify-center p-4"
            aria-label="Context panel — coming in Task 5"
          >
            {/* ContextPanel component — Task 5 */}
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Context panel</p>
              <p className="text-muted-foreground mt-1 text-xs">
                (Type chart, usage stats, moveset info)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
