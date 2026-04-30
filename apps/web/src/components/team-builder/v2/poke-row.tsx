"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";

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

// =============================================================================
// Types
// =============================================================================

interface PokeRowProps {
  idx: number;
  pokemon: Tables<"pokemon"> | null;
  isActive: boolean;
  density: "comfy" | "compact";
  expandMode: "active" | "all";
  onActivate: (idx: number) => void;
  /** Called with the slot index and the chosen species when a species is picked
   *  for an empty slot. */
  onAdd?: (idx: number, species: string) => void;
  onRemove?: (idx: number) => void;
  /** Required for Phase 2 active row editor. */
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
        className="w-[720px] max-w-[calc(100vw-2rem)] p-0"
        style={{ maxHeight: "min(60vh, 460px)" }}
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
}

function CollapsedRow({
  idx,
  pokemon,
  density,
  onActivate,
  onRemove,
  slotErrors,
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
        density === "comfy" ? "py-2" : "py-1.5"
      )}
    >
      {/* Slot rib with error/warning dot */}
      <SlotRib idx={idx} hasError={hasError} hasWarning={hasWarning} />

      {/* Sprite + species */}
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

      {/* 4 move names */}
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

      {/* Chevron */}
      <button
        type="button"
        onClick={() => onActivate(idx)}
        className="ml-auto flex size-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Expand"
      >
        <ChevronDown className="size-4" />
      </button>

      {/* Remove */}
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
}

function ActiveRowShell({
  idx,
  pokemon,
  onRemove,
  teamPokemon,
  format,
  onPokemonUpdate,
  slotErrors,
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
      />
    </div>
  );
}

// =============================================================================
// PokeRow
// =============================================================================

/**
 * A single horizontal slot row in the v2 team builder.
 * Phase 1: empty state and collapsed state.
 * Phase 2: active/expanded state with full lane editor.
 * Phase 7: shows error/warning dot on slot rib; passes field errors to active row.
 */
export function PokeRow({
  idx,
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
  if (!pokemon) {
    return (
      <EmptyRow idx={idx} density={density} format={format} onAdd={onAdd} />
    );
  }

  const showExpanded = isActive || expandMode === "all";

  if (showExpanded) {
    return (
      <ActiveRowShell
        idx={idx}
        pokemon={pokemon}
        onRemove={onRemove}
        teamPokemon={teamPokemon ?? []}
        format={format}
        onPokemonUpdate={onPokemonUpdate}
        slotErrors={slotErrors}
      />
    );
  }

  return (
    <CollapsedRow
      idx={idx}
      pokemon={pokemon}
      density={density}
      onActivate={onActivate}
      onRemove={onRemove}
      slotErrors={slotErrors}
    />
  );
}
