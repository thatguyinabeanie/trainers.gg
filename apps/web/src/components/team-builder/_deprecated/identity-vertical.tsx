"use client";

import { useState } from "react";

import { FieldErrors } from "../validation/field-error";
import { SpeciesPickerDialog } from "../pickers/species-picker-dialog";
import { useIdentityState } from "../shared/use-identity-state";
import { FormCells } from "../shared/fields";
import { MetaBar } from "../shared/meta-bar";
import { SpriteSection } from "../shared/sprite-section";
import { type IdentityLayoutProps } from "../shared/identity-layout-props";

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
// in vertical grid modes (controlled by globals.css).
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
    <div className="flex w-full flex-col border-b border-dashed border-border">
      <SpeciesPickerDialog
        open={speciesOpen}
        onOpenChange={setSpeciesOpen}
        value={pokemon.species ?? null}
        format={format}
        currentTeam={currentTeam}
        onPick={handleSpeciesPick}
      />

      <div className="flex flex-auto flex-row items-center justify-center min-w-0">
        <div className="flex shrink-0 grow-0 basis-[140px] flex-col items-center justify-center gap-1.5 px-1 py-2">
          <SpriteSection
            pokemon={pokemon}
            onSpeciesClick={() => setSpeciesOpen(true)}
            variant="pill-bottom"
            speciesHasError={speciesErrors.length > 0}
            types={types}
            isShiny={isShiny}
          />
        </div>

        <div className="flex min-w-0 shrink basis-auto flex-col justify-center gap-1 px-1.5 py-2 [&_input]:text-left">
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
