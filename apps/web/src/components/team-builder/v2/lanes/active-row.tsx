"use client";

import {
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";

import { type GameFormat } from "@trainers/pokemon";
import {
  type Tables,
  type TablesUpdate,
  type TeamWithPokemon,
} from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { type ValidationError } from "../../validation-hooks";
import { useCalcEnabled } from "../calc/calc-state-context";
import s from "../builder.module.css";
import { CalcColumn } from "./calc-column";
import { IdentityLane } from "./identity-lane";
import { MovesLane } from "./moves-lane";
import { RibDecorations } from "./rib-decorations";
import { StatsLane } from "./stats-lane";

// =============================================================================
// Types
// =============================================================================

interface ActiveRowProps {
  idx: number;
  pokemon: Tables<"pokemon">;
  teamPokemon: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  /** True when this row is the workspace's active row. Used by PokeRow to gate
   *  expand/collapse — ActiveRow itself doesn't read it (CalcColumn now computes
   *  per-row outputs against the shared defender, so every row's CALC populates
   *  regardless of which row is workspace-active). */
  isActive: boolean;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  onRemove: () => void;
  /** All validation errors for this Pokemon — filtered per lane by field. */
  fieldErrors?: ValidationError[];
  /** DnD-kit drag attributes — attached to the drag handle element. */
  dragAttributes?: DraggableAttributes;
  /** DnD-kit drag listeners — attached to the drag handle element. */
  dragListeners?: DraggableSyntheticListeners;
  /** Whether the row is currently being dragged. */
  isDragging?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Filter the flat fieldErrors list to only those matching any of the given field keys.
 */
function errorsForFields(
  errors: ValidationError[],
  fields: string[]
): ValidationError[] {
  return errors.filter((e) => fields.includes(e.field));
}

// =============================================================================
// ActiveRow
// =============================================================================

/**
 * Full expanded row for the active/selected Pokémon slot.
 * Composes the lanes: RIB | IDENTITY+LOADOUT | MOVES | STATS.
 * Identity lane now includes all loadout fields (item, ability, nature, tera).
 */
export function ActiveRow({
  idx,
  pokemon,
  teamPokemon,
  format,
  isActive: _isActive,
  onUpdate,
  onRemove,
  fieldErrors = [],
  dragAttributes,
  dragListeners,
  isDragging = false,
}: ActiveRowProps) {
  const calcEnabled = useCalcEnabled();

  // Collect held items from sibling pokemon for the item picker duplicate warning
  const teamItems = teamPokemon
    .filter((tp) => tp.pokemon && tp.pokemon.id !== pokemon.id)
    .map((tp) => tp.pokemon!.held_item)
    .filter((item): item is string => item !== null);

  // Identity lane receives both identity and loadout errors
  const identityErrors = errorsForFields(fieldErrors, [
    "species",
    "nickname",
    "gender",
    "level",
    "item",
    "heldItem",
    "ability",
    "nature",
    "tera_type",
  ]);
  const movesErrors = errorsForFields(fieldErrors, [
    "move1",
    "move2",
    "move3",
    "move4",
    "moves",
  ]);
  const statsErrors = errorsForFields(fieldErrors, [
    "evs",
    "evTotal",
    "ev_hp",
    "ev_attack",
    "ev_defense",
    "ev_special_attack",
    "ev_special_defense",
    "ev_speed",
  ]);

  return (
    <div
      className={cn(
        s.rowActive,
        "bg-card flex w-fit min-w-0 flex-wrap items-stretch self-center overflow-hidden rounded-lg border",
        "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_8px_28px_-16px_hsl(var(--primary)/0.4)]",
        isDragging && s.rowDragging
      )}
    >
      {/* RIB — slot number (drag handle) + decorations + remove button */}
      <div
        className={cn(
          s.rib,
          "border-border/60 bg-muted/20 flex w-10 shrink-0 flex-col items-center justify-between border-r border-dashed py-2"
        )}
      >
        <span
          {...dragAttributes}
          {...dragListeners}
          className={cn(
            "text-muted-foreground font-mono text-[10px] font-medium tracking-wide",
            dragListeners && s.dragHandle
          )}
          aria-label={`Drag to reorder slot ${idx + 1}`}
        >
          {String(idx + 1).padStart(2, "0")}
        </span>

        {/* Type pills (rotated), gender, shiny, level controls */}
        <RibDecorations pokemon={pokemon} format={format} onUpdate={onUpdate} />

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${pokemon.species ?? "Pokémon"} from slot ${idx + 1}`}
          className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex size-5 items-center justify-center rounded transition-colors"
        >
          ×
        </button>
      </div>

      <IdentityLane
        pokemon={pokemon}
        format={format}
        teamItems={teamItems}
        onUpdate={onUpdate}
        fieldErrors={identityErrors}
        teamSiblings={teamPokemon
          .filter((tp) => tp.pokemon && tp.pokemon.id !== pokemon.id)
          .map((tp) => ({ species: tp.pokemon!.species }))}
      />

      {/* Right column — at compact widths stats and moves sit side-by-side
          as direct children of the row; at mid-stack widths this wrapper
          stacks them vertically on the right of the identity panel. CSS
          (.rowRight) flips between display: contents and flex-column based
          on container query. */}
      <div className={s.rowRight}>
        <StatsLane
          pokemon={pokemon}
          format={format}
          onUpdate={onUpdate}
          fieldErrors={statsErrors}
        />

        <MovesLane
          pokemon={pokemon}
          format={format}
          onUpdate={onUpdate}
          fieldErrors={movesErrors}
        />
      </div>

      {/* Calc column — fixed 160px, aligns row-for-row with move tiles */}
      {calcEnabled && <CalcColumn pokemon={pokemon} />}
    </div>
  );
}
