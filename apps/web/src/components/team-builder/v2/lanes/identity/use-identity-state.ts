"use client";

import { useRef, useState } from "react";

import {
  NATURE_EFFECTS,
  getFormsForSpecies,
  getMegaAbilityForSpecies,
  getMegaStoneForSpecies,
  getSpeciesTypes,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { type ValidationError } from "../../../validation-hooks";
import { formatSupportsLevel, formatSupportsTera } from "../../format-gating";

// =============================================================================
// Helpers (file-private — not re-exported)
// =============================================================================

function errorsForField(
  errors: ValidationError[],
  field: string
): ValidationError[] {
  return errors.filter((e) => e.field === field);
}

function errorsForFields(
  errors: ValidationError[],
  fields: string[]
): ValidationError[] {
  return errors.filter((e) => fields.includes(e.field));
}

// =============================================================================
// useIdentityState
// =============================================================================

export function useIdentityState(
  pokemon: Tables<"pokemon">,
  format: GameFormat | undefined,
  fieldErrors: ValidationError[],
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void
) {
  const nicknameRef = useRef<HTMLInputElement>(null);
  const [nickDraft, setNickDraft] = useState(pokemon.nickname ?? "");

  // ── Derived data ───────────────────────────────────────────────────────────

  const types = getSpeciesTypes(pokemon.species ?? "");
  const gender = pokemon.gender as "Male" | "Female" | null;
  const isShiny = pokemon.is_shiny ?? false;
  const level = pokemon.level ?? 50;
  const showLevel = formatSupportsLevel(format);
  const showTera = formatSupportsTera(format);

  // Nature effect labels for the mini suffix
  const natureEffect = pokemon.nature
    ? NATURE_EFFECTS[pokemon.nature]
    : undefined;
  const natUp = natureEffect?.boost;
  const natDown = natureEffect?.reduce;

  // Mega flags
  const megaAbility = getMegaAbilityForSpecies(pokemon.species ?? "");
  // True when the held item is a mega stone for ANY form of this species
  const isMegaStone = (() => {
    if (!pokemon.held_item || !pokemon.species) return false;
    const forms = getFormsForSpecies(pokemon.species);
    return forms.some(
      (f) => getMegaStoneForSpecies(f) === pokemon.held_item
    );
  })();

  // ── Error partitions ───────────────────────────────────────────────────────

  const nicknameErrors = errorsForField(fieldErrors, "nickname");
  const speciesErrors = errorsForField(fieldErrors, "species");
  const genderErrors = errorsForField(fieldErrors, "gender");
  const itemErrors = errorsForFields(fieldErrors, ["item", "heldItem"]);
  const abilityErrors = errorsForField(fieldErrors, "ability");
  const natureErrors = errorsForField(fieldErrors, "nature");

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleNickBlur() {
    const trimmed = nickDraft.trim();
    // Treat "empty" OR "matches species" as "no nickname" so the displayed
    // name falls back to the species without storing a redundant override.
    const next = trimmed === "" || trimmed === pokemon.species ? null : trimmed;
    if (next !== pokemon.nickname) {
      onUpdate({ nickname: next });
      // Reflect the canonical state — if the user typed the species name, snap
      // the field back to empty so future edits start clean.
      if (next === null && nickDraft !== "") {
        setNickDraft("");
      }
    }
  }

  function handleGenderToggle() {
    const current = gender;
    let next: "Male" | "Female" | null;
    if (current === null) next = "Male";
    else if (current === "Male") next = "Female";
    else next = null;
    onUpdate({ gender: next });
  }

  function handleShinyToggle() {
    onUpdate({ is_shiny: !isShiny });
  }

  function handleSpeciesPick(species: string) {
    if (species === pokemon.species) return;
    setNickDraft("");
    onUpdate({
      species,
      nickname: null,
      held_item: null,
      ability: "",
      nature: "Serious",
      tera_type: null,
      gender: null,
      is_shiny: false,
      move1: "",
      move2: null,
      move3: null,
      move4: null,
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 0,
      ev_special_defense: 0,
      ev_speed: 0,
      iv_hp: 31,
      iv_attack: 31,
      iv_defense: 31,
      iv_special_attack: 31,
      iv_special_defense: 31,
      iv_speed: 31,
    });
  }

  return {
    // derived
    types,
    gender,
    isShiny,
    level,
    showLevel,
    showTera,
    natUp,
    natDown,
    megaAbility,
    isMegaStone,
    // error partitions
    nicknameErrors,
    speciesErrors,
    genderErrors,
    itemErrors,
    abilityErrors,
    natureErrors,
    // nickname draft
    nickDraft,
    setNickDraft,
    nicknameRef,
    // handlers
    handleNickBlur,
    handleGenderToggle,
    handleShinyToggle,
    handleSpeciesPick,
  };
}
