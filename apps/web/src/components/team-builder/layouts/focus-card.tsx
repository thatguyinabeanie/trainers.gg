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
//   │  RadialStatEditor      SpriteSection (hero)      MovesLane              │
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
// Visual chrome: type-tint wash behind the center column only (decorative).
// The dotted-canvas background now lives in single-focus-view — this component
// renders ONLY the 3-column grid (no outer canvas wrapper).
//
// Nature lives entirely in RadialStatEditor (spoke cycle buttons); it is NOT
// shown in the center identity cluster.
// =============================================================================

interface FocusCardProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  /** Sibling item names — for the item deduplication hint in ItemCell. */
  teamItems?: string[];
  /** All 6 team slots — used to populate the species picker's currentTeam exclusion list. */
  slots?: (Tables<"pokemon"> | null)[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  onRemove?: () => void;
  slotErrors?: ValidationError[];
}

export function FocusCard({
  pokemon,
  format,
  teamItems = [],
  slots,
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

  // Type-tint wash scoped to the CENTER column only (decorative, pointer-none)
  const centerWash = (() => {
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
  // Pass the full team slots so the species picker can exclude already-picked
  // species from suggestions. Filter out null (empty) slots; falls back to []
  // when the parent doesn't supply slots.
  const currentTeam = filterCurrentTeam(
    (slots ?? []).filter((s): s is Tables<"pokemon"> => s !== null)
  );

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
        Stage grid — the dotted-canvas background lives in single-focus-view.
        This component renders only the 3-column layout (or vertical stack below md).
        Position relative so the optional remove button can anchor top-right.
      */}
      <div
        className={cn(
          "relative mx-auto w-full max-w-7xl",
          // Below md: vertical stack
          "flex flex-col gap-4",
          // At md+: 3-column grid, stretch so all three columns share the same height
          "md:grid md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)_minmax(0,20rem)]",
          "md:items-stretch md:gap-6"
        )}
      >
        {/* Optional remove button — top-right corner of the grid */}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${pokemon.species ?? "Pokémon"}`}
            className={cn(
              "absolute top-0 right-0 z-10",
              "text-muted-foreground hover:bg-destructive/15 hover:text-destructive",
              "flex size-7 items-center justify-center rounded transition-colors"
            )}
          >
            ×
          </button>
        )}

        {/* ── CENTER COLUMN — sprite hero + identity cluster ───────────────── */}
        {/*
          DOM-first so mobile (flex-col, no order overrides) shows sprite before
          stats and moves. Desktop grid placement restored via md:order-2.
          Relative so the type-tint wash can be absolute behind the content.
        */}
        <div
          className={cn(
            "relative flex flex-col items-center justify-center gap-3",
            "md:order-2"
          )}
        >
          {/* Type-tint wash — decorative, scoped to this column only */}
          {centerWash && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl"
              style={{ background: centerWash }}
            />
          )}

          {/* Sprite (showcase hero) — size=240 makes it the visual centerpiece. */}
          <div className="relative z-0 flex flex-col items-center gap-2">
            <SpriteSection
              pokemon={pokemon}
              onSpeciesClick={() => setSpeciesOpen(true)}
              variant="pill-bottom"
              speciesHasError={id.speciesErrors.length > 0}
              types={id.types}
              isShiny={id.isShiny}
              size={240}
            />
            <FieldErrors errors={id.speciesErrors} />
          </div>

          {/* Identity cluster: nickname · gender · shiny · level */}
          <div className="relative z-0 w-full max-w-56">
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
          <div className="relative z-0 w-full max-w-56 space-y-1">
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

        {/* ── LEFT PANEL — RadialStatEditor ────────────────────────────────── */}
        {/* Desktop grid placement: md:order-1 (left column). Mobile: second. */}
        <div
          className={cn(
            // Translucent floating panel
            "w-full rounded-lg border backdrop-blur-sm",
            "bg-background/50 border-border/40",
            // Matched height via items-stretch: label pinned top, body flex-centered
            "flex flex-col",
            "md:order-1"
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

        {/* ── RIGHT PANEL — MovesLane + (calc ON) CalcReverseColumn ────────── */}
        {/* Desktop grid placement: md:order-3 (right column). Mobile: third. */}
        <div
          className={cn(
            // Translucent floating panel — matched height with left via items-stretch
            "w-full rounded-lg border backdrop-blur-sm",
            "bg-background/50 border-border/40",
            "flex flex-col",
            "md:order-3"
          )}
          style={panelStyle}
        >
          <p className="text-muted-foreground/70 border-border/30 border-b px-3 pt-2.5 pb-1.5 text-xs font-semibold tracking-widest uppercase">
            Moves
          </p>
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            {/*
              calc OFF → vertical list of move rows (type icon · category ·
              name · BP · ACC, with NAME/BP/ACC header row) matching the mock.
              calc ON  → standard table with calc columns (MovesLane switches
              internally when calcEnabled is true).
            */}
            <MovesLane
              pokemon={pokemon}
              format={format}
              onUpdate={onUpdate}
              fieldErrors={movesErrors}
              presentation="list"
            />
          </div>

          {/* Incoming damage strip — only when calc is ON */}
          {calcEnabled && (
            <div className="border-border/30 border-t">
              <CalcReverseColumn
                pokemon={pokemon}
                teammates={(slots ?? []).filter(
                  (s): s is Tables<"pokemon"> => s !== null
                )}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
