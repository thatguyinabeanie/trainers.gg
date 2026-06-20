"use client";

import { type Tables, type TablesUpdate } from "@trainers/supabase";

import {
  type DefenderEvs,
  type DefenderIvs,
  type UseCalcStateReturn,
} from "../use-calc-state";

// =============================================================================
// Types
// =============================================================================

/**
 * The subset of UseCalcStateReturn that this adapter reads and writes.
 * Accepting the narrowed type lets callers pass either the full return value
 * or any object satisfying this contract (e.g. in tests).
 */
interface CalcDefenderState {
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  defenderTera: string;
  defenderEvs: DefenderEvs;
  defenderIvs: DefenderIvs;
  defenderMoves: UseCalcStateReturn["defenderMoves"];
  resetDefenderForSpecies: UseCalcStateReturn["resetDefenderForSpecies"];
  setDefenderAbility: (v: string) => void;
  setDefenderItem: (v: string) => void;
  setDefenderNature: (v: string) => void;
  setDefenderTera: (v: string) => void;
  setDefenderEv: (stat: keyof DefenderEvs, v: number) => void;
  setDefenderIv: (stat: keyof DefenderIvs, v: number) => void;
  setDefenderMove: (slotIdx: number, name: string) => void;
}

export interface UseTargetAsPokemonReturn {
  /** Synthetic DB row representing the calc target. id is -1 (never persisted). */
  pokemon: Tables<"pokemon">;
  /**
   * Fan each provided field out to the matching calc-state setter. Only keys
   * present in `fields` trigger setter calls. Fields with no defender
   * equivalent (level, gender, is_shiny, nickname, notes, format_legal,
   * created_at) are silently ignored — they are hidden on the target.
   */
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
}

// =============================================================================
// Mapping tables
// =============================================================================

/**
 * Maps pokemon column names for EVs (long form) → DefenderEvs short key.
 *
 * Defender state uses Showdown stat abbreviations; the DB row uses long names
 * with the `ev_` prefix.
 */
const EV_COLUMN_TO_SHORT: Record<string, keyof DefenderEvs> = {
  ev_hp: "hp",
  ev_attack: "atk",
  ev_defense: "def",
  ev_special_attack: "spa",
  ev_special_defense: "spd",
  ev_speed: "spe",
};

/**
 * Maps pokemon column names for IVs (long form) → DefenderIvs short key.
 */
const IV_COLUMN_TO_SHORT: Record<string, keyof DefenderIvs> = {
  iv_hp: "hp",
  iv_attack: "atk",
  iv_defense: "def",
  iv_special_attack: "spa",
  iv_special_defense: "spd",
  iv_speed: "spe",
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Presents the calc defender state as a synthetic `Tables<"pokemon">` row with
 * a matching `onUpdate` callback, allowing the versus view to render the target
 * with the same showcase components used for team Pokémon — with zero changes
 * to those components.
 *
 * The synthetic row uses `id: -1` to ensure it never collides with the
 * `selectedPokemon?.id === rowPokemon.id` focus-check in computeForwardOutputsForRow.
 *
 * Fields with no defender equivalent (level, gender, is_shiny, nickname,
 * notes, format_legal, created_at) are set to safe inert defaults and are
 * not surfaced in the versus target UI. Patches to those fields via onUpdate
 * are no-ops — they are never persisted.
 *
 * @param calc - The calc state object from useCalcState or CalcStateContext.
 *   Accepts the full UseCalcStateReturn (or the narrowed CalcDefenderState
 *   interface) so callers can pass either the hook return value or destructured
 *   context fields.
 */
export function useTargetAsPokemon(
  calc: CalcDefenderState
): UseTargetAsPokemonReturn {
  const {
    defenderSpecies,
    defenderAbility,
    defenderItem,
    defenderNature,
    defenderTera,
    defenderEvs,
    defenderIvs,
    defenderMoves,
    resetDefenderForSpecies,
    setDefenderAbility,
    setDefenderItem,
    setDefenderNature,
    setDefenderTera,
    setDefenderEv,
    setDefenderIv,
    setDefenderMove,
  } = calc;

  // Build the synthetic pokemon row from current defender state.
  // The engine hard-locks the defender at level 50; we reflect that here.
  // Fields with no defender equivalent are set to safe inert defaults.
  const pokemon: Tables<"pokemon"> = {
    // Sentinel id — collision-safe vs the selectedPokemon?.id focus check.
    id: -1,
    // Core identity fields
    species: defenderSpecies,
    ability: defenderAbility,
    nature: defenderNature,
    held_item: defenderItem || null,
    tera_type: defenderTera || null,
    // EVs (null means 0 in the engine; use explicit null when 0 for DB compat)
    ev_hp: defenderEvs.hp,
    ev_attack: defenderEvs.atk,
    ev_defense: defenderEvs.def,
    ev_special_attack: defenderEvs.spa,
    ev_special_defense: defenderEvs.spd,
    ev_speed: defenderEvs.spe,
    // IVs
    iv_hp: defenderIvs.hp,
    iv_attack: defenderIvs.atk,
    iv_defense: defenderIvs.def,
    iv_special_attack: defenderIvs.spa,
    iv_special_defense: defenderIvs.spd,
    iv_speed: defenderIvs.spe,
    // Moves — slot 1 required, 2–4 nullable
    move1: defenderMoves[0] || "",
    move2: defenderMoves[1] || null,
    move3: defenderMoves[2] || null,
    move4: defenderMoves[3] || null,
    // Engine hard-locks level 50 for the defender; surfaced here for completeness.
    level: 50,
    // Fields hidden on the target — inert safe defaults, never persisted.
    gender: null,
    is_shiny: false,
    nickname: null,
    notes: null,
    format_legal: null,
    created_at: null,
  };

  /**
   * Fan the provided field patch out to the matching calc-state setter.
   *
   * Column → setter mapping:
   * | DB column              | Setter                                        |
   * |------------------------|-----------------------------------------------|
   * | species                | resetDefenderForSpecies(species)              |
   * | ability                | setDefenderAbility(ability ?? "")             |
   * | held_item              | setDefenderItem(held_item ?? "")              |
   * | nature                 | setDefenderNature(nature)                     |
   * | tera_type              | setDefenderTera(tera_type ?? "")              |
   * | ev_hp / ev_attack …    | setDefenderEv(shortKey, value)                |
   * | iv_hp / iv_attack …    | setDefenderIv(shortKey, value)                |
   * | move1 … move4          | setDefenderMove(slotIdx, name)                |
   * | level, gender,         | no-op (hidden, not persisted)                 |
   * |   is_shiny, nickname,  |                                               |
   * |   notes, format_legal, |                                               |
   * |   created_at           |                                               |
   */
  function onUpdate(fields: Partial<TablesUpdate<"pokemon">>) {
    // Species reset — mirrors the handleSpeciesPick semantics in
    // CalcDefenderBlock: picks a new species and resets spread/boosts/status.
    if (fields.species !== undefined && fields.species !== null) {
      resetDefenderForSpecies(fields.species);
      return; // resetDefenderForSpecies blanks all other fields; skip further patches
    }

    // Loadout fields — coerce null → "" (calc state stores empty string, not null)
    if (fields.ability !== undefined) {
      setDefenderAbility(fields.ability ?? "");
    }
    if (fields.held_item !== undefined) {
      setDefenderItem(fields.held_item ?? "");
    }
    if (fields.tera_type !== undefined) {
      setDefenderTera(fields.tera_type ?? "");
    }
    if (fields.nature !== undefined && fields.nature !== null) {
      setDefenderNature(fields.nature);
    }

    // EVs — call setDefenderEv per changed stat (respects format-aware clamping
    // built into the setter: per-stat cap + total budget guardrail)
    for (const [col, shortKey] of Object.entries(EV_COLUMN_TO_SHORT)) {
      const raw = fields[col as keyof typeof fields];
      if (raw !== undefined) {
        // raw is string | number | boolean from the wide union — coerce to number
        const numericValue =
          raw === null || raw === undefined ? 0 : Number(raw);
        setDefenderEv(shortKey, Number.isNaN(numericValue) ? 0 : numericValue);
      }
    }

    // IVs — call setDefenderIv per changed stat (clamps 0–31 in the setter)
    for (const [col, shortKey] of Object.entries(IV_COLUMN_TO_SHORT)) {
      const raw = fields[col as keyof typeof fields];
      if (raw !== undefined) {
        // raw is string | number | boolean from the wide union — coerce to number
        const numericValue =
          raw === null || raw === undefined ? 31 : Number(raw);
        setDefenderIv(shortKey, Number.isNaN(numericValue) ? 31 : numericValue);
      }
    }

    // Moves — call setDefenderMove per slot
    const moveSlots: Array<[keyof typeof fields, number]> = [
      ["move1", 0],
      ["move2", 1],
      ["move3", 2],
      ["move4", 3],
    ];
    for (const [col, slotIdx] of moveSlots) {
      const raw = fields[col];
      if (raw !== undefined) {
        // raw is string | number | boolean from the wide union — coerce to string
        setDefenderMove(slotIdx, raw == null ? "" : String(raw));
      }
    }

    // Ignored fields — level, gender, is_shiny, nickname, notes, format_legal,
    // created_at: no defender state corresponds to these; patches are no-ops.
  }

  return { pokemon, onUpdate };
}
