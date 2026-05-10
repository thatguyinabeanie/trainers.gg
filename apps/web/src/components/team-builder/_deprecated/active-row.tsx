"use client";

import {
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";

import { getSpeciesTypes, getTypeColor, type GameFormat } from "@trainers/pokemon";
import {
  type Tables,
  type TablesUpdate,
  type TeamWithPokemon,
} from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { useCalcEnabled } from "../calc/calc-state-context";
import { errorsForFields, type ValidationError } from "../validation-hooks";
import { CalcReverseColumn } from "../lanes/calc-reverse-card";
import { IdentityLane } from "./identity-lane";
import { MovesLane } from "../lanes/moves-lane";
import { StatsLane } from "../lanes/stats-lane";

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

  // Derive type-based rib background (20% opacity type colors)
  const types = getSpeciesTypes(pokemon.species ?? "");
  const ribBackground = (() => {
    if (types.length === 0) return undefined;
    const alpha = "33"; // ~20% opacity
    const c1 = getTypeColor(types[0]!);
    if (types.length === 1) return `${c1}${alpha}`;
    const c2 = getTypeColor(types[1]!);
    return { left: `linear-gradient(135deg, ${c1}${alpha}, ${c2}${alpha})`, right: `linear-gradient(45deg, ${c1}${alpha}, ${c2}${alpha})` };
  })();

  const leftBg = typeof ribBackground === "string" ? ribBackground : ribBackground?.left;
  const rightBg = typeof ribBackground === "string" ? ribBackground : ribBackground?.right;
  const calcEnabled = useCalcEnabled();

  // Border color derived from types
  const borderColor = (() => {
    if (types.length === 0) return undefined;
    const c1 = getTypeColor(types[0]!);
    if (types.length === 1) return c1;
    // For dual types, blend via color-mix
    const c2 = getTypeColor(types[1]!);
    return `color-mix(in oklch, ${c1}, ${c2})`;
  })();

  return (
    <div
      className={cn(
        "row-active bg-card flex h-full w-full min-w-0 items-stretch self-center overflow-hidden rounded-lg border",
        !borderColor && "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_8px_28px_-16px_hsl(var(--primary)/0.4)]",
        isDragging && "opacity-50"
      )}
      style={borderColor ? {
        borderColor,
        boxShadow: [
          `0 0 0 1px color-mix(in oklch, ${borderColor} 20%, transparent)`,
          `0 8px 28px -16px color-mix(in oklch, ${borderColor} 40%, transparent)`,
        ].join(", "),
      } : undefined}
    >
      {/* RIB LEFT — slot number + drag handle */}
      <div
        className={cn(
          "flex flex-col items-center justify-between shrink-0 w-7 border-r transition-[padding] duration-300 ease-in-out",
          "rib border-border/60 flex shrink-0 border-dashed",
          calcEnabled ? "py-2" : "py-1",
          !leftBg && "bg-muted/20"
        )}
        style={leftBg ? { background: leftBg } : undefined}
      >
        <span
          {...dragAttributes}
          {...dragListeners}
          className={cn(
            "text-muted-foreground font-mono text-[10px] font-medium tracking-wide",
            dragListeners && "cursor-grab touch-none active:cursor-grabbing"
          )}
          aria-label={`Drag to reorder slot ${idx + 1}`}
        >
          {String(idx + 1).padStart(2, "0")}
        </span>

        {/* Remove button — shown only when right rib is hidden (stacked layouts) */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${pokemon.species ?? "Pokémon"} from slot ${idx + 1}`}
          className={cn(
            "rib-remove-fallback",
            "text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex size-5 items-center justify-center rounded transition-colors"
          )}
        >
          ×
        </button>
      </div>

      {/* Center content — flex-col: main horizontal row on top, incoming strip below */}
      <div className="flex flex-col min-w-0 flex-1">
        {/* Main horizontal row content */}
        <div className="flex items-stretch flex-nowrap min-w-0 overflow-visible">
          {/* rowVerticalContent — transparent wrapper (display: contents) in
              horizontal modes; flips to flex-column in 2×3-vertical and
              3×2-vertical modes so identity sits above stats+moves. CSS in
              globals.css controls the switch via data-layout attribute. */}
          <div className="row-vertical-content">
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
          <div className="row-right">
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
        </div>
        </div>

        {/* Incoming damage strip — inside ribs, below main content */}
        {calcEnabled && (
          <CalcReverseColumn
            pokemon={pokemon}
            teammates={teamPokemon
              .map((tp) => tp.pokemon)
              .filter((p): p is NonNullable<typeof p> => p !== null)}
          />
        )}
      </div>

      {/* RIB RIGHT — mirrored gradient + remove button (wide layout only) */}
      <div
        className={cn(
          "flex flex-col items-center justify-start shrink-0 w-7 border-l transition-[padding] duration-300 ease-in-out",
          "rib-right border-border/60 flex shrink-0 border-dashed",
          calcEnabled ? "py-2" : "py-1",
          !rightBg && "bg-muted/20"
        )}
        style={rightBg ? { background: rightBg } : undefined}
      >
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${pokemon.species ?? "Pokémon"} from slot ${idx + 1}`}
          className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex size-5 items-center justify-center rounded transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
}
