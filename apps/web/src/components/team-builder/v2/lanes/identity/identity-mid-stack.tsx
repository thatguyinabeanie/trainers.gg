"use client";

import { useState } from "react";

import { FieldErrors } from "../../validation/field-error";
import { SpeciesPickerDialog } from "../../pickers/species-picker-dialog";
import { useIdentityState } from "./use-identity-state";
import { FormCells } from "./cells/form-cells";
import { MetaBar } from "./cells/meta-bar";
import { SpriteSection } from "./cells/sprite-section";
import { type IdentityLayoutProps } from "./identity-layout-props";
import s from "./identity-lane.module.css";

// =============================================================================
// IdentityMidStack — MidStack layout (slot < 1240px)
//
// Identity panel structure:
//   ┌─ MetaBar ──────────────────────────────┐  ← dedicated top bar
//   ├─ sprite-col ─┬─ form-col ──────────────┤  ← body row
//   │  sprite      │  ITEM / ABIL / NAT / TERA│
//   │  species pill│                          │
//
// MetaBar sits ABOVE the sprite section (not inside it), giving it its own
// dedicated bar with the auto 1fr auto grid: Lv pill left, nickname centered,
// gender + shiny grouped right.
// =============================================================================

export function IdentityMidStack({
  pokemon,
  format,
  teamItems,
  currentTeam,
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

  return (
    <div className={s.midRoot}>
      <SpeciesPickerDialog
        open={speciesOpen}
        onOpenChange={setSpeciesOpen}
        value={pokemon.species ?? null}
        format={format}
        currentTeam={currentTeam}
        onPick={handleSpeciesPick}
      />

      {/* MetaBar sits at the top of the identity panel, outside the sprite
          section. Layout: Lv pill (left) | nickname (center) | gender+shiny (right) */}
      <MetaBar
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

      {/* Body: sprite-col (left) + form-col (right), both vertically centered */}
      <div className={s.midBody}>
        <div className={s.midSpriteCol}>
          <SpriteSection
            pokemon={pokemon}
            onSpeciesClick={() => setSpeciesOpen(true)}
            variant="pill-top"
            speciesHasError={speciesErrors.length > 0}
            types={types}
            isShiny={isShiny}
          />
        </div>

        <div className={s.midFormCol}>
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

          {/* Validation errors — sit below the form cells, inside form-col */}
          <FieldErrors errors={speciesErrors} />
          <FieldErrors errors={nicknameErrors} />
          <FieldErrors errors={genderErrors} />
          <FieldErrors errors={itemErrors} />
          <FieldErrors errors={abilityErrors} />
          <FieldErrors errors={natureErrors} />
        </div>
      </div>
    </div>
  );
}
