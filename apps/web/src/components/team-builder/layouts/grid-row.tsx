"use client";

import { useState } from "react";

import {
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";

import {
  getSpeciesTypes,
  getTypeColor,
  type GameFormat,
} from "@trainers/pokemon";
import {
  type Tables,
  type TablesUpdate,
  type TeamWithPokemon,
} from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { useCalcEnabled } from "../calc/calc-state-context";
import { CalcReverseColumn } from "../lanes/calc-reverse-card";
import { MovesLane } from "../lanes/moves-lane";
import { StatsLane } from "../lanes/stats-lane";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { FormCells } from "../shared/fields";
import { filterCurrentTeam } from "../shared/identity-layout-props";
import { MetaBar } from "../shared/meta-bar";
import { SpriteSection } from "../shared/sprite-section";
import { useIdentityState } from "../shared/use-identity-state";
import { errorsForFields, type ValidationError } from "../validation-hooks";
import { FieldErrors } from "../validation/field-error";

// =============================================================================
// GridRow — filled active-row in GRID (2×3-vertical) layout mode
//
// Single Tailwind layout — ALWAYS vertical. The outer parent grid in
// team-workspace.tsx supplies the column width via
// `grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3`; this card just stacks
// content vertically inside whatever cell it lands in.
//
// Visual structure:
//   ┌─ rib (top, horizontal bar) ─────────────────────────────┐  ← 1
//   │ slot # · drag handle · (decorations) · remove button    │
//   ├─ identity (vertical) ───────────────────────────────────┤  ← 2
//   │ sprite (basis-36)        |  meta-bar + form-grid         │
//   ├─ stats + moves (stacked) ───────────────────────────────┤  ← 3
//   │ stats lane                                              │
//   │ moves lane                                              │
//   ├─ calc strip (if calcEnabled) ───────────────────────────┤  ← 4
//   └─────────────────────────────────────────────────────────┘
//
// Mirrors the existing globals.css [data-layout="2x3-vertical"] rules:
//   .rib                — flex-row, full-width, bottom dashed border
//   .rib-right          — display:none (no right rib at all)
//   .rib-decorations    — flex-row, gap:4px (visible — but RibDecorations
//                         itself is NOT rendered here because the existing
//                         active-row.tsx doesn't render it either)
// =============================================================================

interface GridRowProps {
  idx: number;
  pokemon: Tables<"pokemon">;
  teamPokemon: TeamWithPokemon["team_pokemon"];
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  onRemove: () => void;
  fieldErrors?: ValidationError[];
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
  isDragging?: boolean;
}

export function GridRow({
  idx,
  pokemon,
  teamPokemon,
  format,
  onUpdate,
  onRemove,
  fieldErrors = [],
  dragAttributes,
  dragListeners,
  isDragging = false,
}: GridRowProps) {
  // ── Field-error partitions (mirror compact-row / active-row) ───────────────
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

  // ── Sibling-derived inputs for identity/loadout pickers ────────────────────
  const teamSiblings = teamPokemon
    .filter((tp) => tp.pokemon && tp.pokemon.id !== pokemon.id)
    .map((tp) => ({ species: tp.pokemon!.species }));
  const teamItems = teamPokemon
    .filter((tp) => tp.pokemon && tp.pokemon.id !== pokemon.id)
    .map((tp) => tp.pokemon!.held_item)
    .filter((item): item is string => item !== null);
  const currentTeam = filterCurrentTeam(teamSiblings);

  // ── Shared identity state + species picker open state ──────────────────────
  const id = useIdentityState(pokemon, format, identityErrors, onUpdate);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const calcEnabled = useCalcEnabled();

  // ── Type-derived chrome (single horizontal rib bg + border color) ──────────
  const types = getSpeciesTypes(pokemon.species ?? "");
  const topRibBg = (() => {
    if (types.length === 0) return undefined;
    const alpha = "33"; // ~20% opacity
    const c1 = getTypeColor(types[0]!);
    if (types.length === 1) return `${c1}${alpha}`;
    const c2 = getTypeColor(types[1]!);
    return `linear-gradient(90deg, ${c1}${alpha}, ${c2}${alpha})`;
  })();

  const borderColor = (() => {
    if (types.length === 0) return undefined;
    const c1 = getTypeColor(types[0]!);
    if (types.length === 1) return c1;
    const c2 = getTypeColor(types[1]!);
    return `color-mix(in oklch, ${c1}, ${c2})`;
  })();

  return (
    <div
      className={cn(
        "bg-card flex h-full w-full min-w-0 flex-col self-center overflow-hidden rounded-lg border",
        !borderColor &&
          "border-primary/60 shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_8px_28px_-16px_hsl(var(--primary)/0.4)]",
        isDragging && "opacity-50"
      )}
      style={
        borderColor
          ? {
              borderColor,
              boxShadow: [
                `0 0 0 1px color-mix(in oklch, ${borderColor} 20%, transparent)`,
                `0 8px 28px -16px color-mix(in oklch, ${borderColor} 40%, transparent)`,
              ].join(", "),
            }
          : undefined
      }
    >
      {/* Shared species picker dialog (single instance) */}
      <SpeciesPickerDialog
        open={speciesOpen}
        onOpenChange={setSpeciesOpen}
        value={pokemon.species ?? null}
        format={format}
        currentTeam={currentTeam}
        onPick={id.handleSpeciesPick}
      />

      {/* RIB (top) — horizontal bar: slot # · drag handle | (decorations) | remove */}
      <div
        className={cn(
          "flex w-full shrink-0 flex-row items-center justify-between px-2 py-1",
          "border-border/60 border-b border-dashed",
          !topRibBg && "bg-muted/20"
        )}
        style={topRibBg ? { background: topRibBg } : undefined}
      >
        <span
          {...dragAttributes}
          {...dragListeners}
          className={cn(
            "text-muted-foreground font-mono text-xs font-medium tracking-wide",
            dragListeners && "cursor-grab touch-none active:cursor-grabbing"
          )}
          aria-label={
            dragListeners ? `Drag to reorder slot ${idx + 1}` : undefined
          }
        >
          {String(idx + 1).padStart(2, "0")}
        </span>

        {/*
          RibDecorations would sit here in vertical mode (per
          [data-layout="2x3-vertical"] .rib-decorations { flex-direction:row }
          in globals.css), but the legacy active-row.tsx never renders
          RibDecorations either — it's not imported there. To preserve
          structural parity with active-row, GridRow also omits it. If we
          later want type symbols in the top rib, render <RibDecorations />
          here.
        */}

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${pokemon.species ?? "Pokémon"} from slot ${idx + 1}`}
          className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive flex size-5 items-center justify-center rounded transition-colors"
        >
          ×
        </button>
      </div>

      {/* IDENTITY (vertical) — sprite (left, basis-36) | meta-bar + form-grid */}
      <div className="border-border flex w-full flex-col border-b border-dashed">
        <div className="flex min-w-0 flex-auto flex-row items-center justify-center">
          <div className="flex shrink-0 grow-0 basis-36 flex-col items-center justify-center gap-1.5 px-1 py-2">
            <SpriteSection
              pokemon={pokemon}
              onSpeciesClick={() => setSpeciesOpen(true)}
              variant="pill-bottom"
              speciesHasError={id.speciesErrors.length > 0}
              types={id.types}
              isShiny={id.isShiny}
            />
          </div>
          <div className="flex min-w-0 shrink basis-auto flex-col justify-center gap-1 px-1.5 py-2 [&_input]:text-left">
            <MetaBar
              nickDraft={id.nickDraft}
              setNickDraft={id.setNickDraft}
              nicknameRef={id.nicknameRef}
              gender={id.gender}
              isShiny={id.isShiny}
              level={id.level}
              showLevel={id.showLevel}
              handleNickBlur={id.handleNickBlur}
              handleGenderToggle={id.handleGenderToggle}
              handleShinyToggle={id.handleShinyToggle}
              onUpdate={onUpdate}
              nicknameErrors={id.nicknameErrors}
              genderErrors={id.genderErrors}
              variant="row"
            />
            <FormCells
              pokemon={pokemon}
              format={format}
              teamItems={teamItems}
              isMegaStone={id.isMegaStone}
              natUp={id.natUp}
              natDown={id.natDown}
              types={id.types}
              itemErrors={id.itemErrors}
              abilityErrors={id.abilityErrors}
              natureErrors={id.natureErrors}
              onUpdate={onUpdate}
              variant="grid"
            />
            <FieldErrors errors={id.speciesErrors} />
            <FieldErrors errors={id.nicknameErrors} />
            <FieldErrors errors={id.genderErrors} />
            <FieldErrors errors={id.itemErrors} />
            <FieldErrors errors={id.abilityErrors} />
            <FieldErrors errors={id.natureErrors} />
          </div>
        </div>
      </div>

      {/* STATS + MOVES — always stacked vertically, both stretch full width */}
      <div className="flex w-full min-w-0 flex-col">
        <StatsLane
          pokemon={pokemon}
          format={format}
          onUpdate={onUpdate}
          fieldErrors={statsErrors}
          borderRight={false}
        />
        <MovesLane
          pokemon={pokemon}
          format={format}
          onUpdate={onUpdate}
          fieldErrors={movesErrors}
        />
      </div>

      {/* CALC STRIP — incoming damage, full width at bottom */}
      {calcEnabled && (
        <CalcReverseColumn
          pokemon={pokemon}
          teammates={teamPokemon
            .map((tp) => tp.pokemon)
            .filter((p): p is NonNullable<typeof p> => p !== null)}
        />
      )}
    </div>
  );
}
