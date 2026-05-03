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
import {
  type Tables,
  type TablesUpdate,
  type TeamWithPokemon,
} from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { type ValidationError } from "../validation-hooks";
import { Sprite } from "./sprite";
import { TypePill } from "./type-pill";
import { ActiveRow } from "./lanes/active-row";
import { CalcColumn } from "./lanes/calc-column";
import { IdentityLane } from "./lanes/identity";
import { StatsLane } from "./lanes/stats-lane";
import { MovesLane } from "./lanes/moves-lane";
import { useCalcEnabled } from "./calc/calc-state-context";
import { SpeciesPickerDialog } from "./pickers/species-picker-dialog";
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
  onPokemonUpdate?: (
    pokemonId: number,
    fields: Partial<TablesUpdate<"pokemon">>
  ) => void;
  /** Validation errors for this slot's pokemon. */
  slotErrors?: ValidationError[];
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

function EmptyRow({ idx, format: _format, onAdd }: EmptyRowProps) {
  const [open, setOpen] = useState(false);
  const calcEnabled = useCalcEnabled();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Add Pokémon to slot ${String(idx + 1).padStart(2, "0")}`}
        className={cn(
          s.rowActive,
          "border-border bg-card flex h-full w-full min-w-0 items-stretch overflow-hidden rounded-lg border border-dashed",
          "hover:border-primary/40 hover:bg-muted/10 text-left transition-colors",
          "focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none"
        )}
      >
        {/* RIB — slot number + × placeholder */}
        <div className={cn(s.rib, "border-border/60 bg-muted/20 flex shrink-0 border-dashed")}>
          <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-wide">
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground/20 flex size-5 items-center justify-center rounded">
            ×
          </span>
        </div>

        <div className={s.rowVerticalContent}>
          <IdentityLane pokemon={null} format={_format} />
          <div className={s.rowRight}>
            <StatsLane pokemon={null} format={_format} />
            <MovesLane pokemon={null} format={_format} />
          </div>
        </div>
        {calcEnabled && <CalcColumn pokemon={null} />}
      </button>

      <SpeciesPickerDialog
        open={open}
        onOpenChange={setOpen}
        value={null}
        format={_format}
        onPick={(species) => onAdd?.(idx, species)}
      />
    </>
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
        "group border-border bg-card hover:bg-muted/30 flex w-full items-center gap-3 rounded-lg border px-3 transition-colors",
        density === "comfy" ? "py-2" : "py-1.5",
        isDragging && s.rowDragging
      )}
    >
      {/* Slot rib — drag handle when filled */}
      <span
        {...dragAttributes}
        {...dragListeners}
        className={cn(
          "text-muted-foreground relative w-7 shrink-0 font-mono text-xs font-medium",
          dragListeners && s.dragHandle
        )}
        aria-label={
          dragListeners ? `Drag to reorder slot ${idx + 1}` : undefined
        }
      >
        {String(idx + 1).padStart(2, "0")}
        {hasError && (
          <span
            className="bg-destructive absolute -top-0.5 -right-0.5 size-1.5 rounded-full"
            aria-label="Has validation errors"
          />
        )}
        {!hasError && hasWarning && (
          <span
            className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber-500"
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
        className="text-muted-foreground hover:text-foreground ml-auto flex size-6 shrink-0 items-center justify-center transition-colors"
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
        className="text-muted-foreground hover:text-destructive flex size-6 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
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
  onPokemonUpdate?: (
    pokemonId: number,
    fields: Partial<TablesUpdate<"pokemon">>
  ) => void;
  slotErrors: ValidationError[];
  /** Forwarded to <ActiveRow> so CalcColumn can suppress non-active outputs. */
  isActive: boolean;
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
  isActive,
  dragAttributes,
  dragListeners,
  isDragging = false,
}: ActiveRowShellProps) {
  return (
    <div className="h-full rounded-lg">
      <ActiveRow
        idx={idx}
        pokemon={pokemon}
        teamPokemon={teamPokemon}
        format={format}
        isActive={isActive}
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
      <div ref={setNodeRef} style={style} className={cn("mx-auto w-full", s.slotHost)} data-slot-host>
        <EmptyRow idx={idx} density={density} format={format} onAdd={onAdd} />
      </div>
    );
  }

  const showExpanded = isActive || expandMode === "all";

  if (showExpanded) {
    return (
      <div ref={setNodeRef} style={style} className={cn("mx-auto w-full", s.slotHost)} data-slot-host>
        <ActiveRowShell
          idx={idx}
          pokemon={pokemon}
          onRemove={onRemove}
          teamPokemon={teamPokemon ?? []}
          format={format}
          onPokemonUpdate={onPokemonUpdate}
          slotErrors={slotErrors}
          isActive={isActive}
          dragAttributes={attributes}
          dragListeners={listeners}
          isDragging={isDragging}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("mx-auto w-full", s.slotHost)} data-slot-host>
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
