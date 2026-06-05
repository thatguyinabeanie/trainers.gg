"use client";

import {
  type GameFormat,
  type PokemonType,
  type StatKey,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { type ValidationError } from "../../validation-hooks";
import { AbilityCell } from "./ability";
import { type CellVariant } from "./shared";
import { ItemCell } from "./item";
import { NatureCell } from "./nature";
import { TypeCell } from "./type";

// =============================================================================
// FormCells — thin wrapper that renders the loadout cells in order
//
// Both branches of IdentityLaneReal use this:
//   compact:  <FormCells variant="row" ... />
//   hero:     <FormCells variant="grid" ... />
// =============================================================================

interface FormCellsProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  teamItems: string[];
  isMegaStone: boolean;
  natUp: StatKey | null | undefined;
  natDown: StatKey | null | undefined;
  types: PokemonType[];
  itemErrors: ValidationError[];
  abilityErrors: ValidationError[];
  natureErrors: ValidationError[];
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  variant: CellVariant;
}

export function FormCells({
  pokemon,
  format,
  teamItems,
  isMegaStone,
  natUp,
  natDown,
  types,
  itemErrors,
  abilityErrors,
  natureErrors,
  onUpdate,
  variant,
}: FormCellsProps) {
  return (
    <>
      <ItemCell
        pokemon={pokemon}
        format={format}
        teamItems={teamItems}
        errors={itemErrors}
        isMegaStone={isMegaStone}
        onUpdate={onUpdate}
        variant={variant}
      />
      <AbilityCell
        pokemon={pokemon}
        format={format}
        errors={abilityErrors}
        onUpdate={onUpdate}
        variant={variant}
      />
      <NatureCell
        pokemon={pokemon}
        format={format}
        natUp={natUp}
        natDown={natDown}
        errors={natureErrors}
        onUpdate={onUpdate}
        variant={variant}
      />
      <TypeCell
        types={types}
        variant={variant}
        pokemon={pokemon}
        format={format}
        onUpdate={onUpdate}
      />
    </>
  );
}
