/**
 * Ability data utilities for Pokemon team builder.
 * Wraps @pkmn/dex ability lookups for descriptions.
 */

import { Dex } from "@pkmn/dex";

const gen9 = Dex.forGen(9);

/**
 * Get the short description of an ability.
 * Returns null if the ability is not found or has no description.
 */
export function getAbilityShortDesc(abilityName: string): string | null {
  const ability = gen9.abilities.get(abilityName);
  return ability?.shortDesc ?? ability?.desc ?? null;
}
