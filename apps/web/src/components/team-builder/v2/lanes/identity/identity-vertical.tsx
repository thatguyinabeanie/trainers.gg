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
// IdentityVertical — 2×3-vertical and 3×2-vertical grid modes
//
// Visual structure:
//   ┌─ MetaBar ─────────────────────────────────────────────────┐
//   ├─ vertSpriteCol ──────┬─ vertFormCol ──────────────────────┤
//   │  sprite image        │  form cells (item / ability /      │
//   │  species pill        │              nature / tera)        │
//   └──────────────────────┴───────────────────────────────────-┘
//
// The entire identity column sits above stats+moves because the parent
// active-row wraps both in .rowVerticalContent, which becomes a flex-column
// in vertical grid modes (controlled by builder.module.css).
// =============================================================================

export function IdentityVertical({
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
    <div className={s.vertRoot}>
      <SpeciesPickerDialog
        open={speciesOpen}
        onOpenChange={setSpeciesOpen}
        value={pokemon.species ?? null}
        format={format}
        currentTeam={currentTeam}
        onPick={handleSpeciesPick}
      />

      <div className={s.vertSpriteFormRow}>
        <div className={s.vertSpriteCol}>
          <SpriteSection
            pokemon={pokemon}
            onSpeciesClick={() => setSpeciesOpen(true)}
            variant="pill-bottom"
            speciesHasError={speciesErrors.length > 0}
            types={types}
            isShiny={isShiny}
          />
        </div>

        <div className={s.vertFormCol}>
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
            variant="grid"
          />
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
