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
// IdentitySingleRow — compact layout (slot ≥ 1240px)
//
// Renders the existing compact branch: sprite column on the left, form
// column (banner + loadout rows) on the right, all in a horizontal flex row.
// =============================================================================

export function IdentitySingleRow({
  pokemon,
  format,
  teamItems,
  currentTeam,
  onUpdate,
  fieldErrors,
}: IdentityLayoutProps) {
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

  const [speciesOpen, setSpeciesOpen] = useState(false);

  return (
    <div className={s.root}>
      <SpeciesPickerDialog
        open={speciesOpen}
        onOpenChange={setSpeciesOpen}
        value={pokemon.species ?? null}
        format={format}
        currentTeam={currentTeam}
        onPick={handleSpeciesPick}
      />

      <div className="flex min-w-0 gap-3 p-3">
        {/* Sprite column */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 self-center">
          <SpriteSection
            pokemon={pokemon}
            onSpeciesClick={() => setSpeciesOpen(true)}
            variant="pill-top"
            speciesHasError={speciesErrors.length > 0}
            types={types}
            isShiny={isShiny}
          />
        </div>

        {/* Form column */}
        <div className="flex w-64 min-w-0 shrink-0 flex-col justify-center gap-0.5">
          {/* BANNER — nickname + chips rows */}
          <div className={s.banner}>
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
              variant="banner"
            />
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
  );
}
