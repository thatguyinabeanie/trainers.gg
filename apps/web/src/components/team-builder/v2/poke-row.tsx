"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";

import { getSpeciesTypes, type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate, type TeamWithPokemon } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { Sprite } from "./sprite";
import { TypePill } from "./type-pill";
import { ActiveRow } from "./lanes/active-row";

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
  onAdd?: (idx: number) => void;
  onRemove?: (idx: number) => void;
  /** Required for Phase 2 active row editor. */
  teamPokemon?: TeamWithPokemon["team_pokemon"];
  format?: GameFormat;
  onPokemonUpdate?: (pokemonId: number, fields: Partial<TablesUpdate<"pokemon">>) => void;
}

// =============================================================================
// Slot rib — "01", "02", … left-edge label
// =============================================================================

function SlotRib({ idx }: { idx: number }) {
  return (
    <span className="w-7 shrink-0 font-mono text-xs font-medium text-muted-foreground">
      {String(idx + 1).padStart(2, "0")}
    </span>
  );
}

// =============================================================================
// EmptyRow
// =============================================================================

interface EmptyRowProps {
  idx: number;
  density: "comfy" | "compact";
  onAdd?: (idx: number) => void;
}

function EmptyRow({ idx, density, onAdd }: EmptyRowProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (onAdd) {
          onAdd(idx);
        }
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-dashed border-border px-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30",
        density === "comfy" ? "py-3" : "py-2"
      )}
    >
      <SlotRib idx={idx} />
      <span className="text-sm text-muted-foreground">+ Add Pokémon</span>
      <span className="text-xs text-muted-foreground/60">
        or paste a Showdown set
      </span>
    </button>
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
}

function CollapsedRow({
  idx,
  pokemon,
  density,
  onActivate,
  onRemove,
}: CollapsedRowProps) {
  const types = getSpeciesTypes(pokemon.species ?? "");
  const moves = [
    pokemon.move1,
    pokemon.move2,
    pokemon.move3,
    pokemon.move4,
  ] as const;

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 transition-colors hover:bg-muted/30",
        density === "comfy" ? "py-2" : "py-1.5"
      )}
    >
      {/* Slot rib */}
      <SlotRib idx={idx} />

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

      {/* BST / SPE / WR meta */}
      <div className="hidden shrink-0 items-center gap-3 font-mono text-xs text-muted-foreground lg:flex">
        {/* TODO Phase 2: compute actual BST and base SPE from species data */}
        <span>BST —</span>
        <span>SPE —</span>
        <span>WR —%</span>
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
  density: "comfy" | "compact";
  onActivate: (idx: number) => void;
  onRemove?: (idx: number) => void;
  teamPokemon: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  onPokemonUpdate?: (pokemonId: number, fields: Partial<TablesUpdate<"pokemon">>) => void;
}

function ActiveRowShell({
  idx,
  pokemon,
  density,
  onActivate,
  onRemove,
  teamPokemon,
  format,
  onPokemonUpdate,
}: ActiveRowShellProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg",
        density === "comfy" ? "" : ""
      )}
    >
      {/* Collapse chevron bar at the top */}
      <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/5 px-3 py-1.5">
        <span className="font-mono text-[10px] text-muted-foreground">
          Slot {idx + 1}
        </span>
        <button
          type="button"
          onClick={() => onActivate(idx)}
          className="ml-auto flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
          aria-label="Collapse"
        >
          <ChevronUp className="size-3.5" />
        </button>
      </div>

      {/* Full lane editor */}
      <ActiveRow
        idx={idx}
        pokemon={pokemon}
        teamPokemon={teamPokemon}
        format={format}
        onUpdate={(fields) => onPokemonUpdate?.(pokemon.id, fields)}
        onRemove={() => onRemove?.(idx)}
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
}: PokeRowProps) {
  if (!pokemon) {
    return <EmptyRow idx={idx} density={density} onAdd={onAdd} />;
  }

  const showExpanded = isActive || expandMode === "all";

  if (showExpanded) {
    return (
      <ActiveRowShell
        idx={idx}
        pokemon={pokemon}
        density={density}
        onActivate={onActivate}
        onRemove={onRemove}
        teamPokemon={teamPokemon ?? []}
        format={format}
        onPokemonUpdate={onPokemonUpdate}
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
    />
  );
}
