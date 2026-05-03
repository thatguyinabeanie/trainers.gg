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
// IdentityVertical — skeleton for vertical-orientation grid modes
//
// TODO (step 8): Wire this to data-layout="2x3-vertical" and "3x2-vertical"
// modes in the dispatcher. The visual arrangement will differ from MidStack
// (rib | stack(MetaBar / sprite+form row)), but the atomic cells are identical.
// For now, renders the same content as IdentityMidStack so the component tree
// is complete and type-safe before the new grid modes are added.
// =============================================================================

export function IdentityVertical({
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

        <SpriteSection
          pokemon={pokemon}
          onSpeciesClick={() => setSpeciesOpen(true)}
          variant="pill-bottom"
          speciesHasError={speciesErrors.length > 0}
          types={types}
        />
      </div>

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
