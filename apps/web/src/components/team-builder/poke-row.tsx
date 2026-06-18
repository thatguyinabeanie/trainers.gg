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

import { GridRow } from "./layouts/grid-row";
import { GridRowGhost } from "./layouts/grid-row-ghost";
import { SpeciesPickerDialog } from "./pickers/species-picker-dialog";
import { type ValidationError } from "./validation-hooks";

// =============================================================================
// PokeRow — filled slot renderer
//
// Always renders GridRow (2×3-vertical). Single-focus mode renders via the
// workspace branch, not through PokeRow. Empty slots render an inline
// EmptyPokeRow that mirrors the legacy EmptyRow ghost UI.
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

  if (!pokemon) {
    return (
      <div ref={setNodeRef} style={style} className="mx-auto w-full">
        <EmptyPokeRow idx={idx} format={format} onAdd={onAdd} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mx-auto w-full"
      data-selected={isActive}
      onClick={() => onActivate(idx)}
    >
      <GridRow
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
// Inlined from the legacy EmptyRow in this file. Always renders GridRowGhost
// (the 2×3-vertical placeholder). The legacy CompactRow/1×6 layout has been
// retired; single-focus mode renders via the workspace branch.
// =============================================================================

interface EmptyPokeRowProps {
  idx: number;
  format: GameFormat | undefined;
  onAdd?: (idx: number, species: string) => void;
}

function EmptyPokeRow({ idx, format, onAdd }: EmptyPokeRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Add Pokémon to slot ${String(idx + 1).padStart(2, "0")}`}
        className="focus-visible:ring-primary block w-full rounded-lg text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <GridRowGhost idx={idx} />
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
