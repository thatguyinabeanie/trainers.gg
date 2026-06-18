"use client";

import { useState } from "react";

import {
  getSpeciesTypes,
  getTypeColor,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { useCalcEnabled } from "../calc/calc-state-context";
import { CalcReverseColumn } from "../lanes/calc-reverse-card";
import { MovesLane } from "../lanes/moves-lane";
import { RadialStatEditor } from "../stats/radial-stat-editor";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { AbilityCell } from "../shared/fields/ability";
import { ItemCell } from "../shared/fields/item";
import { filterCurrentTeam } from "../shared/identity-layout-props";
import { MetaBar } from "../shared/meta-bar";
import { SpriteSection } from "../shared/sprite-section";
import { useIdentityState } from "../shared/use-identity-state";
import { errorsForFields, type ValidationError } from "../validation-hooks";
import { FieldErrors } from "../validation/field-error";

// =============================================================================
// FocusCard — immersive single-Pokémon showcase for the single-focus view
//
// Layout (≥md, wide):
//   ┌──────────────────────────────────────────────────────────────────────────┐
//   │  [LEFT PANEL]          [CENTER COLUMN]           [RIGHT PANEL]          │
//   │  RadialStatEditor      SpriteSection (big)       MovesLane              │
//   │  (translucent,         identity cluster:         presentation=          │
//   │   blur backdrop)         nickname · gender ·       "cards-2x2"          │
//   │                          shiny · level                                  │
//   │                          item · ability           When calc ON:         │
//   │                                                   table + CalcReverse   │
//   └──────────────────────────────────────────────────────────────────────────┘
//
//  Below `md`: vertical stack
//    sprite+identity → stats panel → moves panel
//
// Visual chrome: dotted canvas background, soft type-tint wash behind the
// center, translucent panels (backdrop-blur + faint border) for left/right.
//
// Nature lives entirely in RadialStatEditor (spoke cycle buttons); it is NOT
// shown in the center identity cluster.
// =============================================================================

interface FocusCardProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  /** Sibling item names — for the item deduplication hint in ItemCell. */
  teamItems?: string[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  onRemove?: () => void;
  slotErrors?: ValidationError[];
}

export function FocusCard({
  pokemon,
  format,
  teamItems = [],
  onUpdate,
  onRemove,
  slotErrors = [],
}: FocusCardProps) {
  // ── Field-error partitions ─────────────────────────────────────────────────
  const identityErrors = errorsForFields(slotErrors, [
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
  const movesErrors = errorsForFields(slotErrors, [
    "move1",
    "move2",
    "move3",
    "move4",
    "moves",
  ]);
  const statsErrors = errorsForFields(slotErrors, [
    "evs",
    "evTotal",
    "ev_hp",
    "ev_attack",
    "ev_defense",
    "ev_special_attack",
    "ev_special_defense",
    "ev_speed",
  ]);

  // ── Identity state ─────────────────────────────────────────────────────────
  const id = useIdentityState(pokemon, format, identityErrors, onUpdate);
  const [speciesOpen, setSpeciesOpen] = useState(false);
  const calcEnabled = useCalcEnabled();

  // ── Type-derived chrome ────────────────────────────────────────────────────
  const types = getSpeciesTypes(pokemon.species ?? "");

  // Type-tint wash for the canvas background (very low opacity sweep)
  const canvasWash = (() => {
    if (types.length === 0) return undefined;
    const alpha = "18"; // ~9% opacity — subtle background tint
    const c1 = getTypeColor(types[0]!);
    if (types.length === 1)
      return `radial-gradient(ellipse at center, ${c1}${alpha} 0%, transparent 70%)`;
    const c2 = getTypeColor(types[1]!);
    return `radial-gradient(ellipse at center, ${c1}${alpha} 0%, ${c2}${alpha} 50%, transparent 80%)`;
  })();

  // Panel border tint (very faint — panels are translucent, not solid)
  const borderColor = (() => {
    if (types.length === 0) return undefined;
    const c1 = getTypeColor(types[0]!);
    if (types.length === 1) return c1;
    const c2 = getTypeColor(types[1]!);
    return `color-mix(in oklch, ${c1}, ${c2})`;
  })();

  // Translucent panel style — backdrop blur + faint type-tinted border
  const panelStyle = borderColor
    ? { borderColor: `color-mix(in oklch, ${borderColor} 30%, var(--border))` }
    : undefined;

  // ── Derived team siblings (for species picker) ─────────────────────────────
  const currentTeam = filterCurrentTeam([]);

  return (
    <>
      {/* Shared species picker dialog (single instance per card) */}
      <SpeciesPickerDialog
        open={speciesOpen}
        onOpenChange={setSpeciesOpen}
        value={pokemon.species ?? null}
        format={format}
        currentTeam={currentTeam}
        onPick={id.handleSpeciesPick}
      />

      {/*
        Canvas — dotted grid background + type-wash overlay.
        Full bleed, relative so the three-column layout sits on top.
      */}
      <div
        className={cn(
          "relative flex min-h-0 w-full flex-col",
          // Dotted canvas texture
          "bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-[length:24px_24px]",
          "bg-card/60 rounded-xl"
        )}
      >
        {/* Type-tint wash (decorative, pointer-none) */}
        {canvasWash && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{ background: canvasWash }}
          />
        )}

        {/* Optional remove button — top-right corner */}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${pokemon.species ?? "Pokémon"}`}
            className={cn(
              "absolute top-2 right-2 z-10",
              "text-muted-foreground hover:bg-destructive/15 hover:text-destructive",
              "flex size-7 items-center justify-center rounded transition-colors"
            )}
          >
            ×
          </button>
        )}

        {/*
          Three-column layout at ≥md.
          Below md: single-column vertical stack.
          Left + right panels share the same min-height for symmetry.
        */}
        <div className="relative z-0 flex flex-col gap-4 p-4 md:flex-row md:items-start md:gap-3">
          {/* ── LEFT PANEL — RadialStatEditor ──────────────────────────────── */}
          <div
            className={cn(
              // Translucent floating panel
              "w-full rounded-lg border backdrop-blur-sm md:w-auto md:shrink-0",
              "bg-background/50 border-border/40",
              // Matched height: label pinned top, body flex-centered
              "flex flex-col",
              // Width: enough to contain the hexagon at max-w-xs (320px)
              "md:w-80"
            )}
            style={panelStyle}
          >
            <p className="text-muted-foreground/70 border-border/30 border-b px-3 pt-2.5 pb-1.5 text-xs font-semibold tracking-widest uppercase">
              Stats
            </p>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-3">
              <RadialStatEditor
                pokemon={pokemon}
                format={format}
                onUpdate={onUpdate}
              />
              {/* Stat-scoped validation errors */}
              {statsErrors.length > 0 && (
                <div className="mt-2 w-full">
                  <FieldErrors errors={statsErrors} />
                </div>
              )}
            </div>
          </div>

          {/* ── CENTER COLUMN — sprite + identity cluster ──────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-3 py-2">
            {/* Sprite (showcase — larger than grid-row) */}
            <div className="flex flex-col items-center gap-2">
              <SpriteSection
                pokemon={pokemon}
                onSpeciesClick={() => setSpeciesOpen(true)}
                variant="pill-bottom"
                speciesHasError={id.speciesErrors.length > 0}
                types={id.types}
                isShiny={id.isShiny}
              />
              <FieldErrors errors={id.speciesErrors} />
            </div>

            {/* Identity cluster: nickname · gender · shiny · level */}
            <div className="w-full max-w-56">
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
            </div>

            {/* Loadout strip: item · ability only (nature is in RadialStatEditor) */}
            <div className="w-full max-w-56 space-y-1">
              <ItemCell
                pokemon={pokemon}
                format={format}
                teamItems={teamItems}
                errors={id.itemErrors}
                isMegaStone={id.isMegaStone}
                onUpdate={onUpdate}
                variant="grid"
              />
              <AbilityCell
                pokemon={pokemon}
                format={format}
                errors={id.abilityErrors}
                onUpdate={onUpdate}
                variant="grid"
              />
              <FieldErrors errors={id.itemErrors} />
              <FieldErrors errors={id.abilityErrors} />
            </div>
          </div>

          {/* ── RIGHT PANEL — MovesLane + (calc ON) CalcReverseColumn ──────── */}
          <div
            className={cn(
              // Translucent floating panel — matched height with left
              "w-full rounded-lg border backdrop-blur-sm md:w-auto md:shrink-0",
              "bg-background/50 border-border/40",
              "flex flex-col",
              // Width: moves lane is naturally narrower; min-w ensures readability
              "md:max-w-xs md:min-w-64"
            )}
            style={panelStyle}
          >
            <p className="text-muted-foreground/70 border-border/30 border-b px-3 pt-2.5 pb-1.5 text-xs font-semibold tracking-widest uppercase">
              Moves
            </p>
            <div className="flex min-h-0 flex-1 flex-col justify-center">
              {/*
                calc OFF → 2×2 card grid (MovesLane handles this internally
                when presentation="cards-2x2" and calcEnabled is false).
                calc ON  → standard table with calc columns.
              */}
              <MovesLane
                pokemon={pokemon}
                format={format}
                onUpdate={onUpdate}
                fieldErrors={movesErrors}
                presentation="cards-2x2"
              />
            </div>

            {/* Incoming damage strip — only when calc is ON */}
            {calcEnabled && (
              <div className="border-border/30 border-t">
                <CalcReverseColumn pokemon={pokemon} teammates={[]} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
