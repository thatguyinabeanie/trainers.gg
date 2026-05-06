import { getTypeEffectiveness, type PokemonType } from "@trainers/pokemon";

// =============================================================================
// Ability type-effect overrides
// =============================================================================

/**
 * Ability-driven type immunity / resist / weakness overrides.
 * Maps ability name (lowercase, no spaces — e.g. "flashfire") → type → multiplier override.
 *
 * Multiplier `0` means immune.
 * Multiplier `0.5` means resist (overrides any incoming weakness).
 * Multiplier `2` means newly weak (overrides any incoming neutral/resist).
 *
 * Wonder Guard handled separately: only super-effective hits land — see WONDER_GUARD_ABILITY.
 */
export const ABILITY_TYPE_OVERRIDES: Record<
  string,
  Partial<Record<PokemonType, number>>
> = {
  levitate: { Ground: 0 },
  flashfire: { Fire: 0 },
  waterabsorb: { Water: 0 },
  voltabsorb: { Electric: 0 },
  lightningrod: { Electric: 0 },
  stormdrain: { Water: 0 },
  motordrive: { Electric: 0 },
  sapsipper: { Grass: 0 },
  thickfat: { Fire: 0.5, Ice: 0.5 },
  heatproof: { Fire: 0.5 },
  dryskin: { Water: 0, Fire: 1.25 },
  fluffy: { Fire: 2 },
};

export const WONDER_GUARD_ABILITY = "wonderguard";

// =============================================================================
// Item type-effect overrides
// =============================================================================

/** Item overrides — same shape as ABILITY_TYPE_OVERRIDES. */
export const ITEM_TYPE_OVERRIDES: Record<
  string,
  Partial<Record<PokemonType, number>>
> = {
  airballoon: { Ground: 0 },
  ironball: {}, // disables Levitate; handled in effectiveDefensiveMult
};

/** Items that DISABLE ability immunities (caller composes). */
export const ABILITY_DISABLING_ITEMS = new Set(["ironball"]);

// =============================================================================
// Helpers
// =============================================================================

/**
 * Normalize an ability or item display name to the lookup key.
 * Strips punctuation and spaces, lowercases: "Flash Fire" → "flashfire".
 */
export function normalizeKey(name: string | null | undefined): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Compute the effective defensive multiplier for an attacking type vs. a single
 * Pokémon, accounting for tera, ability, and item.
 *
 * Caller passes:
 *   defenderTypes = teraActive ? [teraType] : speciesTypes
 *
 * Resolution order (consistent with in-game priority):
 *   1. Base type matchup via getTypeEffectiveness
 *   2. Item override (Air Balloon → Ground = 0)
 *   3. Ability override — skipped when ABILITY_DISABLING_ITEMS contains item
 *      (Iron Ball grounds holder: disables Levitate and other immunities)
 *   4. Wonder Guard: only multipliers > 1 land; everything else becomes 0
 *      Applied last so item effects (e.g. Iron Ball on Wonder Guard holder)
 *      are visible to the Wonder Guard filter.
 */
export function effectiveDefensiveMult(opts: {
  attackingType: PokemonType;
  defenderTypes: PokemonType[];
  ability?: string | null;
  item?: string | null;
}): number {
  const { attackingType, defenderTypes, ability, item } = opts;

  // 1. Base type matchup
  let mult = getTypeEffectiveness(attackingType, defenderTypes);

  // 2. Item override
  const itemKey = normalizeKey(item);
  const itemOverride = ITEM_TYPE_OVERRIDES[itemKey];
  if (itemOverride && attackingType in itemOverride) {
    mult = itemOverride[attackingType] ?? mult;
  }

  // 3. Ability override (disabled by Iron Ball)
  const abilityKey = normalizeKey(ability);
  if (!ABILITY_DISABLING_ITEMS.has(itemKey)) {
    const abilityOverride = ABILITY_TYPE_OVERRIDES[abilityKey];
    if (abilityOverride && attackingType in abilityOverride) {
      mult = abilityOverride[attackingType] ?? mult;
    }
  }

  // 4. Wonder Guard: block everything that isn't super-effective (applied after
  //    item/ability adjustments so Iron Ball + Wonder Guard combos resolve correctly)
  if (abilityKey === WONDER_GUARD_ABILITY) {
    return mult > 1 ? mult : 0;
  }

  return mult;
}
