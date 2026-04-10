"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { type GameFormat } from "@trainers/pokemon";
import { type TeamWithPokemon } from "@trainers/supabase";

import { Button } from "@/components/ui/button";
import { Import } from "lucide-react";
import { updatePokemonAction } from "@/actions/teams";
import { ContextPanel } from "@/components/team-builder/context-panel";
import { PokemonEditor } from "@/components/team-builder/pokemon-editor";
import { TeamStrip } from "@/components/team-builder/team-strip";

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
export function TeamWorkspace({ team, handle, format }: TeamWorkspaceProps) {
  // Sort pokemon by position and get the first one as default selection
  const sortedPokemon = [...team.team_pokemon].sort(
    (a, b) => a.team_position - b.team_position
  );

  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(
    sortedPokemon[0]?.pokemon_id ?? null
  );
  const [activeTab, setActiveTab] = useState<"types" | "speed" | "calc">(
    "types"
  );
  const [_saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedEntry = sortedPokemon.find(
    (tp) => tp.pokemon_id === selectedPokemonId
  );
  const hasPokemon = sortedPokemon.length > 0;

  // ---------------------------------------------------------------------------
  // Auto-save handler — debounced 2s
  // ---------------------------------------------------------------------------

  function handlePokemonUpdate(
    pokemonId: number,
    field: string,
    value: unknown
  ) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      const result = await updatePokemonAction(
        pokemonId,
        { [field]: value } as Parameters<typeof updatePokemonAction>[1],
        team.id
      );
      if (result.success) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        toast.error(result.error ?? "Failed to save changes.");
      }
    }, 2000);
  }

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
        {/* Editor panel (left 50%) */}
        <div className="flex w-1/2 flex-col overflow-y-auto border-r">
          {selectedEntry?.pokemon ? (
            <PokemonEditor
              key={selectedEntry.pokemon.id}
              pokemon={selectedEntry.pokemon}
              format={format}
              teamPokemon={team.team_pokemon}
              onUpdate={(field, value) =>
                handlePokemonUpdate(selectedEntry.pokemon!.id, field, value)
              }
              onSpeciesClick={() => {
                // Session 3 will wire up the species picker here
              }}
            />
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
