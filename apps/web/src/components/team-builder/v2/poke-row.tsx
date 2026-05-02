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
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
// EmptyRow
// =============================================================================

interface EmptyRowProps {
  idx: number;
  density: "comfy" | "compact";
  format?: GameFormat;
  onAdd?: (idx: number, species: string) => void;
}

const GHOST_STATS = [
  { key: "hp", label: "HP", colorClass: "text-rose-500 dark:text-rose-400" },
  { key: "attack", label: "ATK", colorClass: "text-orange-500 dark:text-orange-400" },
  { key: "defense", label: "DEF", colorClass: "text-amber-500 dark:text-amber-400" },
  { key: "specialAttack", label: "SPA", colorClass: "text-sky-500 dark:text-sky-400" },
  { key: "specialDefense", label: "SPD", colorClass: "text-emerald-500 dark:text-emerald-400" },
  { key: "speed", label: "SPE", colorClass: "text-fuchsia-500 dark:text-fuchsia-400" },
] as const;

function EmptyRow({ idx, format: _format, onAdd }: EmptyRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full min-w-0 flex-wrap items-stretch overflow-hidden rounded-lg border border-dashed border-border bg-card",
          "text-left transition-colors hover:border-primary/40 hover:bg-muted/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        )}
      >
        {/* RIB — slot number on left edge */}
        <div className="flex w-8 shrink-0 flex-col items-center justify-between border-r border-dashed border-border/60 bg-muted/20 py-2">
          <span className="font-mono text-[10px] font-medium tracking-wide text-muted-foreground">
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span className="flex size-5 items-center justify-center rounded text-muted-foreground/20">
            ×
          </span>
        </div>

        {/* Identity ghost — sprite + form fields */}
        <div className="flex min-w-0 gap-3 p-3">
          <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
            {/* Species pill ghost */}
            <div className="border-border bg-background flex w-36 items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-left text-xs sm:w-40 md:w-44">
              <span className="min-w-0 flex-1 truncate text-muted-foreground/50">
                + Add Pokémon
              </span>
              <span aria-hidden className="text-[9px] text-muted-foreground/30">▾</span>
            </div>
            {/* Sprite ghost */}
            <div className="size-[144px] rounded-xl bg-muted/40" />
          </div>

          {/* Form column ghost */}
          <div className="flex w-64 min-w-0 shrink-0 flex-col justify-center gap-0.5">
            {/* Banner ghost */}
            <div className={s.idBanner}>
              <div className="h-[22px] flex items-center">
                <span className="text-sm font-normal text-muted-foreground/20 italic">Nickname (optional)</span>
              </div>
              <div className="flex h-[18px] items-center gap-1">
                <div className="h-3.5 w-10 rounded bg-muted/30" />
              </div>
            </div>
            {/* Loadout rows ghost */}
            {(["Item", "Abil", "Nat"] as const).map((label) => (
              <div key={label} className={s.formRow}>
                <span className={s.formLabel}>{label}</span>
                <span className={cn(s.formValue, "text-muted-foreground/25 italic")}>—</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats ghost */}
        <div
          className="flex flex-1 flex-col justify-center gap-0.5 border-r border-dashed border-border/60 px-3 py-2"
          style={{ minWidth: 340 }}
        >
          {/* Column headers ghost */}
          <div className={cn("mb-0.5 py-0", s.spreadRow)}>
            <span />
            <span className="text-center font-mono text-[8.5px] font-medium uppercase tracking-wide text-muted-foreground/30">Base</span>
            <span />
            <span className="text-center font-mono text-[8.5px] font-medium uppercase tracking-wide text-muted-foreground/30">EVs</span>
            <span className="text-right font-mono text-[8.5px] text-muted-foreground/30">0/508</span>
            <span />
          </div>
          {/* Six stat rows ghost */}
          {GHOST_STATS.map(({ key, label, colorClass }) => (
            <div key={key} className={cn(s.spreadRow, colorClass)}>
              <span className={cn(s.spreadLabel, "opacity-30")}>{label}</span>
              <span className={cn(s.spreadBase, "opacity-25")}>—</span>
              <div className={s.spreadVbar} />
              <div className="h-[18px] w-9 rounded border border-dashed border-border/30" />
              <div className={s.spreadSliderWrap}>
                <div className={cn(s.spreadSliderTrack, "opacity-25")} />
              </div>
              <span className={cn(s.spreadFinal, "opacity-25")}>—</span>
            </div>
          ))}
        </div>

        {/* Moves ghost */}
        <div className="flex w-[440px] shrink-0 flex-col justify-center gap-1 border-r border-dashed border-border/60 p-3">
          <div className="mb-1 flex items-baseline">
            <span className="font-mono text-[9.5px] font-medium uppercase tracking-widest text-muted-foreground/30">
              Moves
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {([0, 1, 2, 3] as const).map((i) => (
              <div key={i} className="mvline mvline--empty">
                <span className="mvline-type-cat" />
                <span className="mvline-name text-muted-foreground/30">+ Add move</span>
                <span className="mvline-stat">
                  <span className="mvline-stat-label">BP</span>
                  <span className="mvline-stat-value mvline-stat-value--bp" />
                </span>
                <span className="mvline-stat">
                  <span className="mvline-stat-label">ACC</span>
                  <span className="mvline-stat-value mvline-stat-value--acc" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100vw-2rem)] overflow-hidden p-0 sm:max-w-[920px]"
          style={{ height: "min(70vh, 640px)" }}
        >
          <SpeciesPicker
            value={null}
            format={_format}
            onPick={(species) => {
              onAdd?.(idx, species);
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
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
    <div className="rounded-lg">
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
