"use client";

import { useRef, useState } from "react";

import {
  speciesHasForms,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { type ValidationError } from "../../validation-hooks";
import { useIdentityState } from "./identity/use-identity-state";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { FieldErrors } from "../validation/field-error";
import { useContainerCompact } from "../use-container-compact";
import { FormCells } from "./identity/cells/form-cells";
import { FormChips } from "./identity/cells/form-chips";
import { MetaBar } from "./identity/cells/meta-bar";
import { SpriteSection } from "./identity/cells/sprite-section";
import s from "../builder.module.css";


// =============================================================================
// Types
// =============================================================================

interface IdentityLaneProps {
  pokemon: Tables<"pokemon"> | null;
  format?: GameFormat;
  /** Held items from sibling pokemon — passed to ItemPicker for dup warning. */
  teamItems?: string[];
  onUpdate?: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Validation errors scoped to identity + loadout fields. */
  fieldErrors?: ValidationError[];
  /** Sibling pokemon on the same team — used for species-picker synergy hints. */
  teamSiblings?: { species: string }[];
}

interface IdentityLaneRealProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  teamItems: string[];
  teamSiblings: { species: string }[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  fieldErrors: ValidationError[];
}

// =============================================================================
// IdentityLaneGhost — static visual placeholder (no interactive elements)
// =============================================================================

function IdentityLaneGhost() {
  return (
    <div className="flex min-w-0 gap-3 p-3">
      {/* Sprite column */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
        {/* Species pill ghost — static div, NOT a button */}
        <div className="border-border bg-background flex w-36 items-center gap-1 rounded-md border border-dashed px-2 py-1.5 text-left text-xs sm:w-40 md:w-44">
          <span className="text-muted-foreground/50 min-w-0 flex-1 truncate">
            + Add Pokémon
          </span>
          <span aria-hidden className="text-muted-foreground/30 text-[9px]">
            ▾
          </span>
        </div>
        {/* Sprite ghost — static div, NOT a button */}
        <div className="bg-muted/40 size-[144px] rounded-xl" />
      </div>

      {/* Form column */}
      <div className="flex w-56 min-w-0 shrink-0 flex-col justify-center gap-0.5">
        {/* Banner ghost — same className as real banner */}
        <div className={s.idBanner}>
          <div className="flex h-[22px] items-center">
            <span className="text-muted-foreground/20 text-sm font-normal italic">
              Nickname
            </span>
          </div>
          <div className="flex h-[18px] items-center gap-1">
            <div className="bg-muted/30 h-3.5 w-10 rounded" />
          </div>
        </div>
        {/* Loadout rows ghost — Item / Abil / Nat with em-dashes, static divs */}
        {(["Item", "Abil", "Nat"] as const).map((label) => (
          <div key={label} className={s.formRow}>
            <span className={s.formLabel}>{label}</span>
            <span
              className={cn(s.formValue, "text-muted-foreground/25 italic")}
            >
              —
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// IdentityLaneReal — full interactive lane (existing logic, unchanged)
// =============================================================================

function IdentityLaneReal({
  pokemon,
  format,
  teamItems,
  teamSiblings,
  onUpdate,
  fieldErrors,
}: IdentityLaneRealProps) {
  const {
    types,
    gender,
    isShiny,
    level,
    showLevel,
    natUp,
    natDown,
    isMegaStone,
    nicknameErrors,
    speciesErrors,
    genderErrors,
    itemErrors,
    abilityErrors,
    natureErrors,
    nickDraft,
    setNickDraft,
    nicknameRef,
    handleNickBlur,
    handleGenderToggle,
    handleShinyToggle,
    handleSpeciesPick,
  } = useIdentityState(pokemon, format, fieldErrors, onUpdate);
  const rootRef = useRef<HTMLDivElement>(null);
  const isCompact = useContainerCompact(rootRef);
  const [speciesOpen, setSpeciesOpen] = useState(false);

  const currentTeam = (teamSiblings ?? []).filter(
    (p): p is { species: string } =>
      typeof p.species === "string" && p.species.length > 0
  );

  // Shared species picker — rendered once, opened from both compact and hero
  const speciesPicker = (
    <SpeciesPickerDialog
      open={speciesOpen}
      onOpenChange={setSpeciesOpen}
      value={pokemon.species ?? null}
      format={format}
      currentTeam={currentTeam}
      onPick={handleSpeciesPick}
    />
  );

  return (
    <div ref={rootRef} className="contents">
      {speciesPicker}

      {/* ── COMPACT layout (≥1240px slot) — sprite-left + form-right ── */}
      {isCompact && (
      <div className={s.identCompact}>
        <div className="flex min-w-0 gap-3 p-3">
          {/* Sprite column */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
            <SpriteSection
              pokemon={pokemon}
              onSpeciesClick={() => setSpeciesOpen(true)}
              variant="pill-top"
              speciesHasError={speciesErrors.length > 0}
              types={types}
            />
          </div>

          {/* Form column */}
          <div className="flex w-56 min-w-0 shrink-0 flex-col justify-center gap-0.5">
        {/* BANNER — nickname + chips rows */}
        <div className={s.idBanner}>
          <MetaBar
            pokemon={pokemon}
            format={format}
            nickDraft={nickDraft}
            setNickDraft={setNickDraft}
            nicknameRef={nicknameRef}
            gender={gender}
            isShiny={isShiny}
            level={level}
            showLevel={showLevel}
            handleNickBlur={handleNickBlur}
            handleGenderToggle={handleGenderToggle}
            handleShinyToggle={handleShinyToggle}
            onUpdate={onUpdate}
            nicknameErrors={nicknameErrors}
            genderErrors={genderErrors}
            variant="banner"
          />

          {/* Row 2: form chips. Disabled until the matching mega stone is held;
              click → swap species only (no auto-item-attach). */}
          {pokemon.species && speciesHasForms(pokemon.species) && (
            <FormChips
              currentSpecies={pokemon.species}
              currentItem={pokemon.held_item}
              onPick={(nextSpecies) => {
                if (nextSpecies === pokemon.species) return;
                onUpdate({ species: nextSpecies });
              }}
            />
          )}
        </div>

        {/* LOADOUT FORM ROWS */}
        <FormCells
          pokemon={pokemon}
          format={format}
          teamItems={teamItems}
          isMegaStone={isMegaStone}
          natUp={natUp}
          natDown={natDown}
          itemErrors={itemErrors}
          abilityErrors={abilityErrors}
          natureErrors={natureErrors}
          onUpdate={onUpdate}
          variant="row"
        />

          {/* Species validation errors */}
          <FieldErrors errors={speciesErrors} />
          </div>
        </div>
      </div>
      )}

      {/* ── HERO layout (<1240px slot) — full-width centered panel ──── */}
      {!isCompact && (
      <div className={s.identHero}>
        <div className={s.heroPanel}>
          {/* Meta row: gender | shiny | Lv | nickname */}
          <MetaBar
            pokemon={pokemon}
            format={format}
            nickDraft={nickDraft}
            setNickDraft={setNickDraft}
            nicknameRef={nicknameRef}
            gender={gender}
            isShiny={isShiny}
            level={level}
            showLevel={showLevel}
            handleNickBlur={handleNickBlur}
            handleGenderToggle={handleGenderToggle}
            handleShinyToggle={handleShinyToggle}
            onUpdate={onUpdate}
            nicknameErrors={nicknameErrors}
            genderErrors={genderErrors}
            variant="row"
          />

          {/* Sprite + species pill — centered, click to open species picker */}
          <SpriteSection
            pokemon={pokemon}
            onSpeciesClick={() => setSpeciesOpen(true)}
            variant="pill-bottom"
            speciesHasError={speciesErrors.length > 0}
            types={types}
          />

          {/* Type pills omitted in hero mode — types are already conveyed
              by the sprite's tinted background and the type dots in the
              rib decorations. Adding pills here clutters the panel. */}

          {/* Form chips deliberately omitted in hero mode — alt-form
              switching happens via the species picker dialog opened by
              clicking the sprite or species pill. The compact-mode
              FormChips strip below the held-item row is still wired. */}
        </div>

        {/* Form grid — sibling of heroPanel inside identHero so it gets
            its share of identHero's flex width (heroPanel is fixed at
            200px, this fills the rest). */}
        <div className={s.heroForm}>
          <FormCells
            pokemon={pokemon}
            format={format}
            teamItems={teamItems}
            isMegaStone={isMegaStone}
            natUp={natUp}
            natDown={natDown}
            itemErrors={itemErrors}
            abilityErrors={abilityErrors}
            natureErrors={natureErrors}
            onUpdate={onUpdate}
            variant="grid"
          />
          {/* Validation errors — sit below the form, still inside heroForm */}
          <FieldErrors errors={speciesErrors} />
          <FieldErrors errors={nicknameErrors} />
          <FieldErrors errors={genderErrors} />
          <FieldErrors errors={itemErrors} />
          <FieldErrors errors={abilityErrors} />
          <FieldErrors errors={natureErrors} />
        </div>
      </div>
      )}
    </div>
  );
}

// =============================================================================
// IdentityLane — public dispatcher
// =============================================================================

/**
 * Combined IDENTITY + LOADOUT lane — sprite column on the left, form sheet on
 * the right.
 *
 * When `pokemon` is null, renders a purely static ghost placeholder (no
 * buttons, inputs, or popovers) so an outer `<button>` wrapper (EmptyRow) can
 * safely contain it without nested-button violations.
 *
 * Sprite column:
 *   - 128×128 sprite with type-tinted background (click → species picker)
 *   - Species pill below (click → species picker, responsive width)
 *
 * Form column (w-56):
 *   Banner (2 rows):
 *     Row 1 — nickname input
 *     Row 2 — gender + shiny chips
 *
 *   Labeled form rows for loadout:
 *     Item | Ability | Nature | Tera (gen-gated)
 *
 * Note: Type pills and level have moved to RibDecorations inside the
 * active-row rib. Gender and shiny remain here.
 */
export function IdentityLane({
  pokemon,
  format,
  teamItems,
  teamSiblings,
  onUpdate,
  fieldErrors = [],
}: IdentityLaneProps) {
  if (!pokemon) return <IdentityLaneGhost />;
  return (
    <IdentityLaneReal
      pokemon={pokemon}
      format={format}
      teamItems={teamItems ?? []}
      teamSiblings={teamSiblings ?? []}
      onUpdate={onUpdate ?? (() => {})}
      fieldErrors={fieldErrors}
    />
  );
}
