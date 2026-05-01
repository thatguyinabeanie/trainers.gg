"use client";

import React, { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";

import { getSpeciesTypes, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate, type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { type ValidationError } from "../validation-hooks";
import { Sprite } from "./sprite";
import { TypePill } from "./type-pill";
import { ActiveRow } from "./lanes/active-row";
import { SpeciesPicker } from "./pickers/species-picker";
import s from "./builder.module.css";

// =============================================================================
// Types
// =============================================================================

interface PokeRowProps {
  idx: number;
  /** Stable ID used by dnd-kit for sorting. Pass `pokemon.id` for filled slots
   *  or a stable placeholder like `"__empty__0"` for empty slots. */
  sortableId: string;
  pokemon: Tables<"pokemon"> | null;
  isActive: boolean;
  density: "comfy" | "compact";
  expandMode: "active" | "all";
  onActivate: (idx: number) => void;
  /** Called with the slot index and the chosen species when a species is picked
   *  for an empty slot. */
  onAdd?: (idx: number, species: string) => void;
  onRemove?: (idx: number) => void;
  teamPokemon?: TeamWithPokemon["team_pokemon"];
  format?: GameFormat;
  onPokemonUpdate?: (pokemonId: number, fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Validation errors for this slot's pokemon. */
  slotErrors?: ValidationError[];
}

// =============================================================================
// Slot rib — "01", "02", … left-edge label + error dot
// =============================================================================

interface SlotRibProps {
  idx: number;
  hasError?: boolean;
  hasWarning?: boolean;
}

function SlotRib({ idx, hasError, hasWarning }: SlotRibProps) {
  return (
    <span className="relative w-7 shrink-0 font-mono text-xs font-medium text-muted-foreground">
      {String(idx + 1).padStart(2, "0")}
      {/* Error/warning dot — shown when this slot has validation issues */}
      {hasError && (
        <span
          className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-destructive"
          aria-label="Has validation errors"
        />
      )}
      {!hasError && hasWarning && (
        <span
          className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-amber-500"
          aria-label="Has validation warnings"
        />
      )}
    </span>
  );
}

// =============================================================================
// EmptyRow
// =============================================================================

interface EmptyRowProps {
  idx: number;
  density: "comfy" | "compact";
  format?: GameFormat;
  onAdd?: (idx: number, species: string) => void;
}

function EmptyRow({ idx, density, format, onAdd }: EmptyRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border border-dashed border-border px-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30",
              density === "comfy" ? "py-3" : "py-2"
            )}
          />
        }
      >
        <SlotRib idx={idx} />
        <span className="text-sm text-muted-foreground">+ Add Pokémon</span>
        <span className="text-xs text-muted-foreground/60">
          or paste a Showdown set
        </span>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-[920px] max-w-[calc(100vw-2rem)] p-0"
        style={{ maxHeight: "min(70vh, 640px)" }}
      >
        <SpeciesPicker
          value={null}
          format={format}
          onPick={(species) => {
            onAdd?.(idx, species);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// CollapsedRow
// =============================================================================

interface CollapsedRowProps {
  idx: number;
  pokemon: Tables<"pokemon">;
  density: "comfy" | "compact";
  onActivate: (idx: number) => void;
  onRemove?: (idx: number) => void;
  slotErrors: ValidationError[];
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
  isDragging?: boolean;
}

function CollapsedRow({
  idx,
  pokemon,
  density,
  onActivate,
  onRemove,
  slotErrors,
  dragAttributes,
  dragListeners,
  isDragging = false,
}: CollapsedRowProps) {
  const types = getSpeciesTypes(pokemon.species ?? "");
  const moves = [
    pokemon.move1,
    pokemon.move2,
    pokemon.move3,
    pokemon.move4,
  ] as const;

  const hasError = slotErrors.some((e) => e.severity === "error");
  const hasWarning = slotErrors.some((e) => e.severity === "warning");

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 transition-colors hover:bg-muted/30",
        density === "comfy" ? "py-2" : "py-1.5",
        isDragging && s.rowDragging
      )}
    >
      {/* Slot rib — drag handle when filled */}
      <span
        {...dragAttributes}
        {...dragListeners}
        className={cn(
          "relative w-7 shrink-0 font-mono text-xs font-medium text-muted-foreground",
          dragListeners && s.dragHandle
        )}
        aria-label={dragListeners ? `Drag to reorder slot ${idx + 1}` : undefined}
      >
        {String(idx + 1).padStart(2, "0")}
        {hasError && (
          <span
            className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-destructive"
            aria-label="Has validation errors"
          />
        )}
        {!hasError && hasWarning && (
          <span
            className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-amber-500"
            aria-label="Has validation warnings"
          />
        )}
      </span>

      <button
        type="button"
        onClick={() => onActivate(idx)}
        className="flex min-w-0 flex-1 items-center gap-2.5"
        aria-label={`Expand slot ${idx + 1}: ${pokemon.species ?? "Unknown"}`}
      >
        <Sprite
          species={pokemon.species ?? ""}
          size={density === "comfy" ? 44 : 36}
          types={types}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">
            {pokemon.nickname ? (
              <>
                {pokemon.nickname}{" "}
                <span className="text-muted-foreground">
                  ({pokemon.species ?? "?"})
                </span>
              </>
            ) : (
              (pokemon.species ?? "Unknown")
            )}
          </span>
          <div className="flex gap-1">
            {types.map((t) => (
              <TypePill key={t} t={t} />
            ))}
          </div>
        </div>
      </button>

      <div className="hidden w-52 shrink-0 grid-cols-2 gap-x-3 gap-y-0.5 md:grid">
        {moves.map((move, i) => (
          <span
            key={i}
            className={cn(
              "truncate text-xs",
              move ? "text-foreground" : "text-muted-foreground/40"
            )}
          >
            {move ?? "—"}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onActivate(idx)}
        className="ml-auto flex size-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Expand"
      >
        <ChevronDown className="size-4" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove?.(idx);
        }}
        className="flex size-6 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={`Remove ${pokemon.species ?? "Pokémon"} from slot ${idx + 1}`}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// =============================================================================
// ActiveRowShell — collapse header + ActiveRow lanes
// =============================================================================

interface ActiveRowShellProps {
  idx: number;
  pokemon: Tables<"pokemon">;
  onRemove?: (idx: number) => void;
  teamPokemon: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  onPokemonUpdate?: (pokemonId: number, fields: Partial<TablesUpdate<"pokemon">>) => void;
  slotErrors: ValidationError[];
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
  isDragging?: boolean;
}

function ActiveRowShell({
  idx,
  pokemon,
  onRemove,
  teamPokemon,
  format,
  onPokemonUpdate,
  slotErrors,
  dragAttributes,
  dragListeners,
  isDragging = false,
}: ActiveRowShellProps) {
  return (
    <div className="overflow-x-hidden rounded-lg">
      <ActiveRow
        idx={idx}
        pokemon={pokemon}
        teamPokemon={teamPokemon}
        format={format}
        onUpdate={(fields) => onPokemonUpdate?.(pokemon.id, fields)}
        onRemove={() => onRemove?.(idx)}
        fieldErrors={slotErrors}
        dragAttributes={dragAttributes}
        dragListeners={dragListeners}
        isDragging={isDragging}
      />
    </div>
  );
}

// =============================================================================
// PokeRow
// =============================================================================

/**
 * A single horizontal slot row in the v2 team builder.
 * Handles empty, collapsed, and active/expanded states.
 * Shows error/warning dot on slot rib and passes field errors to active row.
 * Supports drag-and-drop reordering via dnd-kit. Empty slots are non-draggable.
 */
export function PokeRow({
  idx,
  sortableId,
  pokemon,
  isActive,
  density,
  expandMode,
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
    // Empty slot — sortable ref still attached so it can act as a drop target,
    // but drag is disabled so it won't be picked up.
    return (
      <div ref={setNodeRef} style={style}>
        <EmptyRow idx={idx} density={density} format={format} onAdd={onAdd} />
      </div>
    );
  }

  const showExpanded = isActive || expandMode === "all";

  if (showExpanded) {
    return (
      <div ref={setNodeRef} style={style}>
        <ActiveRowShell
          idx={idx}
          pokemon={pokemon}
          onRemove={onRemove}
          teamPokemon={teamPokemon ?? []}
          format={format}
          onPokemonUpdate={onPokemonUpdate}
          slotErrors={slotErrors}
          dragAttributes={attributes}
          dragListeners={listeners}
          isDragging={isDragging}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <CollapsedRow
        idx={idx}
        pokemon={pokemon}
        density={density}
        onActivate={onActivate}
        onRemove={onRemove}
        slotErrors={slotErrors}
        dragAttributes={attributes}
        dragListeners={listeners}
        isDragging={isDragging}
      />
    </div>
  );
}
