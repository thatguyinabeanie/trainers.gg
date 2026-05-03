"use client";

import { useState } from "react";

import { FieldErrors } from "../../validation/field-error";
import { SpeciesPickerDialog } from "../../pickers/species-picker-dialog";
import { useIdentityState } from "./use-identity-state";
import { FormCells } from "./cells/form-cells";
import { MetaBar } from "./cells/meta-bar";
import { SpriteSection } from "./cells/sprite-section";
import { type IdentityLayoutProps } from "./identity-layout-props";
import s from "../../builder.module.css";

// =============================================================================
// IdentityMidStack — hero layout (slot < 1240px)
//
// Renders the existing hero branch: a fixed-width heroPanel (sprite +
// meta bar) alongside a heroForm (full form grid) as flex siblings inside
// identHero. FormChips are intentionally omitted in this layout — alt-form
// switching happens via the species picker dialog.
// =============================================================================

export function IdentityMidStack({
  pokemon,
  format,
  teamItems,
  teamSiblings,
  onUpdate,
  fieldErrors,
}: IdentityLayoutProps) {
  const {
    gender,
    isShiny,
    level,
    showLevel,
    natUp,
    natDown,
    isMegaStone,
    speciesErrors,
    nicknameErrors,
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
    types,
  } = useIdentityState(pokemon, format, fieldErrors, onUpdate);

  const [speciesOpen, setSpeciesOpen] = useState(false);

  const currentTeam = (teamSiblings ?? []).filter(
    (p): p is { species: string } =>
      typeof p.species === "string" && p.species.length > 0
  );

  return (
    <div className={s.identHero}>
      <SpeciesPickerDialog
        open={speciesOpen}
        onOpenChange={setSpeciesOpen}
        value={pokemon.species ?? null}
        format={format}
        currentTeam={currentTeam}
        onPick={handleSpeciesPick}
      />

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
            clicking the sprite or species pill. */}
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
  );
}
