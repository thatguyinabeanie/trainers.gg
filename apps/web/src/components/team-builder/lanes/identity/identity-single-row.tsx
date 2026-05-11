"use client";

import { useState } from "react";

import { useCalcEnabled } from "../../calc/calc-state-context";
import { cn } from "@/lib/utils";
import { FieldErrors } from "../../validation/field-error";
import { SpeciesPickerDialog } from "../../pickers/species-picker-dialog";
import { useIdentityState } from "../../shared/use-identity-state";
import { FormCells } from "../../shared/fields";
import { MetaBar } from "../../shared/meta-bar";
import { SpriteSection } from "../../shared/sprite-section";
import { type IdentityLayoutProps } from "../../shared/identity-layout-props";

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
  const calcEnabled = useCalcEnabled();

  return (
    <div className="flex">
      <SpeciesPickerDialog
        open={speciesOpen}
        onOpenChange={setSpeciesOpen}
        value={pokemon.species ?? null}
        format={format}
        currentTeam={currentTeam}
        onPick={handleSpeciesPick}
      />

      <div className={cn("flex min-w-0 gap-3 transition-[padding] duration-300 ease-in-out", calcEnabled ? "p-3" : "p-2")}>
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
          <div className="mb-1 flex flex-col gap-[3px] border-b border-border pb-1.5">
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
            types={types}
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
