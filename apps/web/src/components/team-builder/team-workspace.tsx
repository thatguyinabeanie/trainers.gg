"use client";

import { useState } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Import } from "lucide-react";
import { TeamStrip } from "@/components/team-builder/team-strip";
import { ContextPanel } from "@/components/team-builder/context-panel";

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
  handle,
  format: _format,
}: TeamWorkspaceProps) {
  // Sort pokemon by position and get the first one as default selection
  const sortedPokemon = [...team.team_pokemon].sort(
    (a, b) => a.team_position - b.team_position
  );

  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(
    sortedPokemon[0]?.id ?? null
  );
  const [activeTab, setActiveTab] = useState<"types" | "speed" | "calc">(
    "types"
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
      {/* Team strip */}
      <div className="border-b">
        <TeamStrip
          teamId={team.id}
          handle={handle}
          pokemon={team.team_pokemon}
          selectedPokemonId={selectedPokemonId}
          onSelect={setSelectedPokemonId}
          onAddNew={() => {
            // Session 3 will wire up the species picker here
          }}
        />
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
                className={cn(
                  "bg-muted/30 flex flex-1 items-center justify-center rounded-lg border border-dashed"
                )}
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

        {/* Context panel (right 50%) */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          <ContextPanel
            team={team}
            selectedPokemon={selectedEntry?.pokemon ?? null}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
}
