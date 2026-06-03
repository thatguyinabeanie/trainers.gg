"use client";

import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { type GameFormat } from "@trainers/pokemon";
import {
  type Tables,
  type TablesUpdate,
  type TeamWithPokemon,
} from "@trainers/supabase";

import { CompactRow } from "./layouts/compact-row";
import { CompactRowGhost } from "./layouts/compact-row-ghost";
import { GridRow } from "./layouts/grid-row";
import { GridRowGhost } from "./layouts/grid-row-ghost";
import { SpeciesPickerDialog } from "./pickers/species-picker-dialog";
import { useTeamLayoutMode } from "./use-team-layout";
import { type ValidationError } from "./validation-hooks";

// =============================================================================
// PokeRow — thin layout router
//
// Picks CompactRow (1×6) or GridRow (2×3-vertical) based on the team layout
// mode. Empty slots render an inline EmptyPokeRow that mirrors the legacy
// EmptyRow ghost UI.
// =============================================================================

interface PokeRowProps {
  idx: number;
  /** Stable ID used by dnd-kit for sorting. Pass `pokemon.id` for filled slots
   *  or a stable placeholder like `"__empty__0"` for empty slots. */
  sortableId: string;
  pokemon: Tables<"pokemon"> | null;
  /** Whether this slot is the currently active/selected row in the workspace. */
  isActive: boolean;
  /** Called when the user clicks this row — updates the workspace's active slot
   *  index which the calc panel uses as a fallback attacker. */
  onActivate: (idx: number) => void;
  /** Called with the slot index and the chosen species when a species is picked
   *  for an empty slot. */
  onAdd?: (idx: number, species: string) => void;
  onRemove?: (idx: number) => void;
  teamPokemon?: TeamWithPokemon["team_pokemon"];
  format?: GameFormat;
  onPokemonUpdate?: (
    pokemonId: number,
    fields: Partial<TablesUpdate<"pokemon">>
  ) => void;
  /** Validation errors for this slot's pokemon. */
  slotErrors?: ValidationError[];
}

export function PokeRow({
  idx,
  sortableId,
  pokemon,
  isActive,
  onActivate,
  onAdd,
  onRemove,
  teamPokemon,
  format,
  onPokemonUpdate,
  slotErrors = [],
}: PokeRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    // Empty slots must not be draggable — they have no pokemon to reorder.
    disabled: pokemon === null,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const layoutMode = useTeamLayoutMode();

  if (!pokemon) {
    return (
      <div ref={setNodeRef} style={style} className="mx-auto w-full">
        <EmptyPokeRow idx={idx} format={format} onAdd={onAdd} />
      </div>
    );
  }

  const Variant = layoutMode === "2x3-vertical" ? GridRow : CompactRow;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mx-auto w-full"
      data-selected={isActive}
      onClick={() => onActivate(idx)}
    >
      <Variant
        idx={idx}
        pokemon={pokemon}
        teamPokemon={teamPokemon ?? []}
        format={format}
        onUpdate={(fields) => onPokemonUpdate?.(pokemon.id, fields)}
        onRemove={() => onRemove?.(idx)}
        fieldErrors={slotErrors}
        dragAttributes={attributes}
        dragListeners={listeners}
        isDragging={isDragging}
      />
    </div>
  );
}

// =============================================================================
// EmptyPokeRow — inline ghost shell for empty slots
//
// Inlined from the legacy EmptyRow in this file. No visual change yet — the
// ghost-rendering responsibility will move into CompactRow/GridRow in a
// future polish pass. For now this preserves the existing empty-slot UI.
// =============================================================================

interface EmptyPokeRowProps {
  idx: number;
  format: GameFormat | undefined;
  onAdd?: (idx: number, species: string) => void;
}

function EmptyPokeRow({ idx, format, onAdd }: EmptyPokeRowProps) {
  const [open, setOpen] = useState(false);
  const layoutMode = useTeamLayoutMode();
  const Ghost = layoutMode === "2x3-vertical" ? GridRowGhost : CompactRowGhost;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Add Pokémon to slot ${String(idx + 1).padStart(2, "0")}`}
        className="focus-visible:ring-primary block w-full rounded-lg text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <Ghost idx={idx} />
      </button>

      <SpeciesPickerDialog
        open={open}
        onOpenChange={setOpen}
        value={null}
        format={format}
        onPick={(species) => onAdd?.(idx, species)}
      />
    </>
  );
}
