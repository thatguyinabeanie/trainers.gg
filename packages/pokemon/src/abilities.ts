/**
 * Ability data utilities for Pokemon team builder.
 * Wraps @pkmn/dex ability lookups for descriptions.
 *
 * Custom ability descriptions from Champions regulation bundles are checked
 * BEFORE the @pkmn/dex lookup — bundles may define short-descs for synthetic
 * abilities not present in the standard dex (e.g. Champions-exclusive mega
 * abilities like "Eelevate" or "Fire Mane").
 *
 * The merged map is built once at module load from all leaf bundle files.
 * Importing from the bundle leaf files (champions-reg-ma, champions-reg-mb)
 * rather than from format-legality avoids a circular dependency — format-legality
 * imports from these same leaf files and from abilities.ts (indirectly via
 * the package barrel).
 */

import { Dex } from "@pkmn/dex";

import { REG_MA_BUNDLE } from "./champions-reg-ma";
import { REG_MB_BUNDLE } from "./champions-reg-mb";

const gen9 = Dex.forGen(9);

/**
 * Merged ability descriptions from all registered Champions bundles.
 * Built once at module load — later bundles override earlier ones for any
 * duplicate keys (in practice there are none; each bundle owns distinct abilities).
 */
const MERGED_ABILITY_DESCS: ReadonlyMap<string, string> = new Map([
  ...REG_MA_BUNDLE.abilityDescs,
  ...REG_MB_BUNDLE.abilityDescs,
]);

/**
 * Get the short description of an ability.
 * Returns null if the ability is not found or has no description.
 *
 * Resolution order:
 *   1. Merged Champions bundle custom descriptions (covers synthetic mega
 *      abilities absent from @pkmn/dex, e.g. "Eelevate", "Fire Mane")
 *   2. @pkmn/dex Gen 9 ability lookup
 */
export function getAbilityShortDesc(abilityName: string): string | null {
  // 1. Check Champions-exclusive custom descriptions first
  const customDesc = MERGED_ABILITY_DESCS.get(abilityName);
  if (customDesc !== undefined) return customDesc;

  // 2. Fall back to @pkmn/dex
  const ability = gen9.abilities.get(abilityName);
  return ability?.shortDesc ?? ability?.desc ?? null;
}
