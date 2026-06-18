/**
 * Ability data utilities for Pokemon team builder.
 * Wraps @pkmn/dex ability lookups for descriptions.
 *
 * Custom ability descriptions from Champions regulation bundles are checked
 * BEFORE the @pkmn/dex lookup — bundles may define short-descs for synthetic
 * abilities not present in the standard dex (e.g. Champions-exclusive mega
 * abilities like "Piercing Drill" or "Mega Sol").
 */

import { Dex } from "@pkmn/dex";

import { REG_MA_BUNDLE } from "./champions-reg-ma";

const gen9 = Dex.forGen(9);

/**
 * Get the short description of an ability.
 * Returns null if the ability is not found or has no description.
 *
 * Resolution order:
 *   1. Champions bundle custom descriptions (covers synthetic mega abilities
 *      absent from @pkmn/dex — currently none in M-A but wired for future regs)
 *   2. @pkmn/dex Gen 9 ability lookup
 */
export function getAbilityShortDesc(abilityName: string): string | null {
  // 1. Check Champions-exclusive custom descriptions first
  const customDesc = REG_MA_BUNDLE.abilityDescs.get(abilityName);
  if (customDesc !== undefined) return customDesc;

  // 2. Fall back to @pkmn/dex
  const ability = gen9.abilities.get(abilityName);
  return ability?.shortDesc ?? ability?.desc ?? null;
}
