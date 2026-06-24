"use client";

/**
 * @smogon/calc engine module — loaded lazily via dynamic import so the
 * package stays out of the team-builder's initial JS chunk.
 *
 * use-calc-state.ts imports this module only when calcEnabled is true.
 * All @smogon/calc imports are isolated here; nothing in the always-loaded
 * path (team-workspace.tsx, calc-state-provider.tsx, use-calc-state.ts top-level)
 * may statically import @smogon/calc.
 */

import {
  calculate,
  Field,
  Generations,
  Move,
  Pokemon,
  Side,
} from "@smogon/calc";

import {
  type GameFormat,
  type PokemonType,
  getBaseStats,
  getCanonicalBaseSpecies,
  getMegaAbilityForSpecies,
  getMegaSpeciesForBaseAndItem,
  getSpeciesTypes,
  isChampionsFormat,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";
import { logError } from "@trainers/utils";

import { getMoveEffectiveness } from "./move-effectiveness";
import { getRecoveryAwareVerdict } from "./recovery";
import type {
  AttackerBoosts,
  BaseSideState,
  CalcDirection,
  CalcOutput,
  DefenderBoosts,
  DefenderEvs,
  DefenderIvs,
  StatusLabel,
} from "../use-calc-state";
import { STATUS_MAP } from "../use-calc-state";

// =============================================================================
// Generation cache
// =============================================================================

// Cached Generations instances keyed by generation number so we don't
// re-construct them on every render. Defaults to Gen 9 when format is absent.
const generationsCache = new Map<number, ReturnType<typeof Generations.get>>();

function getCachedGen(num: number) {
  let gen = generationsCache.get(num);
  if (!gen) {
    gen = Generations.get(num as Parameters<typeof Generations.get>[0]);
    generationsCache.set(num, gen);
  }
  return gen;
}

/**
 * Resolve the calc generation for a given format.
 *
 * Champions dispatches to gen.num === 0 — our forked @smogon/calc has
 * dedicated mechanics there that read SP from the `evs` field directly,
 * force IV=31, and lock level=50. That matches the deployed Showdown
 * Champions calculator. Every other format clamps to gen 1–9 (the engine
 * doesn't ship past gen 9 yet).
 */
export function getGen(
  format: GameFormat | undefined
): ReturnType<typeof Generations.get> {
  if (isChampionsFormat(format)) {
    return getCachedGen(0);
  }
  const safeGen = Math.min(Math.max(format?.generation ?? 9, 1), 9);
  return getCachedGen(safeGen);
}

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Check whether @smogon/calc's gen data can resolve a species name.
 * `getBaseStats` (from @pkmn/dex) may know about species that @smogon/calc's
 * internal Generations data doesn't — particularly for gen 0 (Champions) or
 * species with `exists: false` in certain gens. This guard prevents the
 * Pokemon constructor from constructing with `undefined` baseStats.
 */
function calcGenKnowsSpecies(
  gen: ReturnType<typeof Generations.get>,
  species: string
): boolean {
  try {
    // The gen species lookup expects a branded ID type; cast to satisfy TS
    // while using the same toID normalization the Pokemon constructor applies.
    const id = species.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const entry = gen.species.get(id as Parameters<typeof gen.species.get>[0]);
    return entry?.baseStats != null;
  } catch {
    return false;
  }
}

/**
 * Brand-cast a UI string into one of @smogon/calc's branded name types
 * (`AbilityName`, `ItemName`, etc.). The runtime values are plain strings;
 * this helper exists solely so the call site type-checks against the
 * engine's nominal types.
 *
 * UNSAFE: there is no runtime validation that the input is a name the
 * engine recognises. Where possible, narrow at the source (we already do
 * this for `StatusLabel`, `EngineWeather`, `EngineTerrain`, `Nature`, and
 * `PokemonType`). For ability/item/species/move strings — which are open
 * sets across the entire Pokemon dex — the cast remains the boundary.
 */
function asSmogon<T>(v: string | null | undefined): T {
  return (v ?? undefined) as unknown as T;
}

/**
 * Convert a DB row's stat-investment fields to the EV/IV shape the engine
 * expects, applying format-aware clamping.
 *
 * For Champions (gen.num === 0), the engine treats `evs[stat]` as Stat Points
 * (0–32 / 66 total) and forces IV=31 internally. Champions UI write-paths
 * already clamp at edit time, but stale or imported DB rows may carry classic
 * 252-EV spreads — without defensive clamping here those blow through the
 * Champions mechanics and produce nonsense damage. We clamp per-stat to 32 and
 * running-total to 66, leading-stat-first.
 *
 * For every other generation we pass the DB values through unchanged.
 */
function buildEngineStats(
  gen: ReturnType<typeof Generations.get>,
  db: Tables<"pokemon">
): {
  ivs: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  evs: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
} {
  if (gen.num === 0) {
    // Champions: clamp ev_* fields to 32/stat, 66 total. IVs are forced 31 by
    // the engine; we still pass 31 for clarity.
    const raw = {
      hp: db.ev_hp ?? 0,
      atk: db.ev_attack ?? 0,
      def: db.ev_defense ?? 0,
      spa: db.ev_special_attack ?? 0,
      spd: db.ev_special_defense ?? 0,
      spe: db.ev_speed ?? 0,
    };
    let runningTotal = 0;
    const clamped = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    for (const k of ["hp", "atk", "def", "spa", "spd", "spe"] as const) {
      const perStat = Math.max(0, Math.min(raw[k], 32));
      const allowed = Math.max(0, Math.min(perStat, 66 - runningTotal));
      clamped[k] = allowed;
      runningTotal += allowed;
    }
    return {
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: clamped,
    };
  }
  return {
    ivs: {
      hp: db.iv_hp ?? 31,
      atk: db.iv_attack ?? 31,
      def: db.iv_defense ?? 31,
      spa: db.iv_special_attack ?? 31,
      spd: db.iv_special_defense ?? 31,
      spe: db.iv_speed ?? 31,
    },
    evs: {
      hp: db.ev_hp ?? 0,
      atk: db.ev_attack ?? 0,
      def: db.ev_defense ?? 0,
      spa: db.ev_special_attack ?? 0,
      spd: db.ev_special_defense ?? 0,
      spe: db.ev_speed ?? 0,
    },
  };
}

// =============================================================================
// Public engine functions
// =============================================================================

export function buildAttackerFromDb(
  gen: ReturnType<typeof Generations.get>,
  db: Tables<"pokemon">,
  boosts: AttackerBoosts,
  status: StatusLabel,
  megaActive: boolean
): Pokemon | null {
  if (!db.species) return null;
  // Bail early if the species has no known base stats — prevents the Smogon
  // calc Pokemon constructor from throwing when it can't resolve stats.
  if (!getBaseStats(db.species)) return null;
  try {
    const { ivs, evs } = buildEngineStats(gen, db);
    // Per-calc mega toggle: when ON and species is a mega form, use the
    // mega's species + post-evolution ability. When OFF, simulate as the
    // base form (pre-mega turn 1, or two-megas scenario where THIS Pokemon
    // doesn't mega this match).
    // Mega handling: the species itself is the source of truth — the builder's
    // MEGA chip sets the mega form explicitly. When the species is a mega form
    // and the per-calc mega toggle is OFF, simulate the base form (pre-mega
    // turn 1 / two-megas scenario). We do NOT auto-upgrade a base species that
    // merely holds its mega stone — toggling the MEGA chip must drive the calc.
    const isMegaForm = getMegaAbilityForSpecies(db.species) !== null;
    const effectiveSpecies =
      isMegaForm && !megaActive
        ? getCanonicalBaseSpecies(db.species)
        : db.species;
    // Verify the effective species has known base stats before constructing.
    if (!getBaseStats(effectiveSpecies)) return null;
    // Also verify the species exists in @smogon/calc's gen data — @pkmn/dex
    // and @smogon/calc have different species coverage per gen.
    if (!calcGenKnowsSpecies(gen, effectiveSpecies)) return null;
    const calcAbility =
      isMegaForm && megaActive
        ? (getMegaAbilityForSpecies(db.species) ?? db.ability ?? null)
        : (db.ability ?? null);
    return new Pokemon(gen, effectiveSpecies, {
      level: db.level ?? 50,
      nature: asSmogon(db.nature ?? "Hardy"),
      ability: asSmogon(calcAbility),
      item: asSmogon(db.held_item),
      teraType: asSmogon(db.tera_type),
      ivs,
      evs,
      boosts,
      status: asSmogon(STATUS_MAP[status] ?? ""),
      moves: [db.move1, db.move2, db.move3, db.move4].filter((m): m is string =>
        Boolean(m)
      ) as unknown as string[],
    });
  } catch (error) {
    logError("calc.buildAttacker", error, {
      species: db.species,
      ability: db.ability,
      megaActive,
    });
    return null;
  }
}

export function buildDefenderPokemon(
  gen: ReturnType<typeof Generations.get>,
  species: string,
  ability: string,
  item: string,
  nature: string,
  teraType: string,
  evs: DefenderEvs,
  ivs: DefenderIvs,
  boosts: DefenderBoosts,
  status: StatusLabel,
  hpPercent: number,
  megaActive: boolean
): Pokemon | null {
  if (!species) return null;
  try {
    // Mega handling — species is the source of truth (see buildAttackerFromDb).
    const isMegaForm = getMegaAbilityForSpecies(species) !== null;
    // When a base species holds its mega stone, resolve the mega form so the
    // calc uses mega stats — matching what calc-defender-header.tsx displays.
    const megaFromItem =
      !isMegaForm && megaActive
        ? getMegaSpeciesForBaseAndItem(species, item)
        : null;
    const effectiveSpecies =
      isMegaForm && !megaActive
        ? getCanonicalBaseSpecies(species)
        : megaFromItem
          ? megaFromItem
          : species;
    const calcAbility =
      isMegaForm && megaActive
        ? (getMegaAbilityForSpecies(species) ?? ability)
        : megaFromItem
          ? (getMegaAbilityForSpecies(megaFromItem) ?? ability)
          : ability;
    // Bail if the species has no base stats in @pkmn/dex.
    if (!getBaseStats(effectiveSpecies)) return null;
    // Bail if the species is unknown to @smogon/calc's gen data.
    if (!calcGenKnowsSpecies(gen, effectiveSpecies)) return null;
    // Build without curHP first so we can call maxHP() to compute the real value.
    const mon = new Pokemon(gen, effectiveSpecies, {
      level: 50,
      nature: asSmogon(nature),
      ability: asSmogon(calcAbility || null),
      item: asSmogon(item || null),
      teraType: asSmogon(teraType || null),
      ivs,
      evs,
      boosts,
      status: asSmogon(STATUS_MAP[status] ?? ""),
    });
    // Clamp hpPercent to [0, 100] before computing current HP.
    const clampedPct = Math.min(100, Math.max(0, hpPercent));
    const hpValue = Math.max(1, Math.round((clampedPct / 100) * mon.maxHP()));
    return new Pokemon(gen, effectiveSpecies, {
      level: 50,
      nature: asSmogon(nature),
      ability: asSmogon(calcAbility || null),
      item: asSmogon(item || null),
      teraType: asSmogon(teraType || null),
      ivs,
      evs,
      boosts,
      status: asSmogon(STATUS_MAP[status] ?? ""),
      curHP: hpValue,
    });
  } catch (error) {
    logError("calc.buildDefender", error, {
      species,
      ability,
      megaActive,
    });
    return null;
  }
}

export function buildField(
  gameType: "Doubles" | "Singles",
  weather: string,
  terrain: string,
  gravity: boolean,
  fairyAura: boolean,
  magicRoom: boolean,
  wonderRoom: boolean,
  attackerSide: BaseSideState,
  defenderSide: BaseSideState,
  direction: CalcDirection
): Field {
  const aSide = direction === "offense" ? attackerSide : defenderSide;
  const dSide = direction === "offense" ? defenderSide : attackerSide;

  const aSmogon = new Side({
    isReflect: aSide.reflect,
    isLightScreen: aSide.lightScreen,
    isAuroraVeil: aSide.auroraVeil,
    isTailwind: aSide.tailwind,
    isHelpingHand: aSide.helpingHand,
    isFriendGuard: aSide.friendGuard,
    isProtected: aSide.protect,
    isSR: aSide.stealthRock,
    spikes: aSide.spikes,
    isSaltCured: aSide.saltCure,
    isSeeded: aSide.leechSeed,
  });

  const dSmogon = new Side({
    isReflect: dSide.reflect,
    isLightScreen: dSide.lightScreen,
    isAuroraVeil: dSide.auroraVeil,
    isTailwind: dSide.tailwind,
    isHelpingHand: dSide.helpingHand,
    isFriendGuard: dSide.friendGuard,
    isProtected: dSide.protect,
    isSR: dSide.stealthRock,
    spikes: dSide.spikes,
    isSaltCured: dSide.saltCure,
    isSeeded: dSide.leechSeed,
  });

  return new Field({
    gameType,
    weather: asSmogon(weather || null),
    terrain: asSmogon(terrain || null),
    isGravity: gravity,
    isFairyAura: fairyAura,
    isMagicRoom: magicRoom,
    isWonderRoom: wonderRoom,
    attackerSide: aSmogon,
    defenderSide: dSmogon,
  });
}

// =============================================================================
// Last Respects / Triumphant Wave BP scaling
// =============================================================================

/** Move names that scale with fainted ally count. */
const LAST_RESPECTS_MOVES = new Set(["Last Respects", "Triumphant Wave"]);

/**
 * Compute the effective base power for Last Respects / Triumphant Wave.
 * BP = min(250, 50 + 50 × faintedCount)
 */
function lastRespectsBP(faintedCount: number): number {
  return Math.min(250, 50 + 50 * Math.max(0, Math.min(5, faintedCount)));
}

export function runCalc(
  gen: ReturnType<typeof Generations.get>,
  attacker: Pokemon,
  defender: Pokemon,
  moveName: string,
  isCrit: boolean,
  field: Field,
  faintedForMove?: number,
  weather?: string,
  singleTarget?: boolean,
  formatId?: string | null
): CalcOutput | null {
  try {
    const basePowerOverride =
      LAST_RESPECTS_MOVES.has(moveName) && faintedForMove !== undefined
        ? lastRespectsBP(faintedForMove)
        : undefined;
    const moveOpts =
      basePowerOverride !== undefined
        ? { isCrit, basePower: basePowerOverride }
        : { isCrit };
    const move = new Move(gen, moveName, moveOpts);
    // Single Target: override the move's target so the Doubles spread-move
    // reduction (×0.75) is not applied. The engine gates that on
    // move.target being allAdjacent/allAdjacentFoes (gen789).
    if (singleTarget) move.target = "normal";
    const result = calculate(gen, attacker, defender, move, field);
    const damage = result.damage;
    // Distinguish "calc failed" (damage is undefined/null) from "damage is 0"
    // (immune defender). The latter should produce a valid 0% output so the
    // UI can render "Immune" / "0%" instead of falling back to "no calc".
    // Empty arrays still mean the engine produced no roll data → null.
    if (damage === undefined || damage === null) return null;
    if (Array.isArray(damage) && damage.length === 0) return null;

    const defHP = defender.maxHP();
    if (defHP === 0) return null;

    // For immunities the engine returns the literal `0` and `result.range()`
    // returns `[0, 0]`. We compute percents the same way for both paths so
    // the 0%/0% case flows through naturally — but `result.desc()` throws
    // inside @smogon/calc's getKOChance when damage is 0 (it tries to
    // compute KO chance on an immune hit), so we synthesise a description
    // for that case instead of letting the throw bubble up to the catch
    // and collapse the whole result to null.
    const isImmune = damage === 0;
    const [minDmg, maxDmg] = isImmune ? [0, 0] : result.range();
    const minPercent = Math.floor((minDmg / defHP) * 1000) / 10;
    const maxPercent = Math.floor((maxDmg / defHP) * 1000) / 10;

    const rolls: readonly number[] = Array.isArray(damage)
      ? Array.isArray(damage[0])
        ? ((damage as number[][])[0] ?? [])
        : (damage as number[])
      : [];

    // Recovery-aware verdict suffix (Sitrus Berry, Leftovers, Black Sludge).
    // The engine's roll array isn't always sorted; sort defensively so the
    // recovery sim sees a true min→max range.
    const sortedRolls = [...rolls].sort((a, b) => a - b);
    const defenderItemName =
      typeof defender.item === "string" ? defender.item : "";
    const defenderSpeciesName =
      typeof defender.species?.name === "string" ? defender.species.name : "";
    const defenderTypes = getSpeciesTypes(
      defenderSpeciesName
    ) as readonly PokemonType[];
    const defenderAbilityName =
      typeof defender.ability === "string" ? defender.ability : "";
    // Move type effectiveness gates Enigma Berry (heals only on
    // super-effective hits). getMoveEffectiveness handles weather-dependent
    // moves like Weather Ball — pass the active effective weather so moves
    // like Weather Ball resolve to the correct type (e.g. Fire under Sun).
    const moveEffectiveness = isImmune
      ? 0
      : getMoveEffectiveness(moveName, defenderSpeciesName, weather, formatId);
    const isSuperEffective = moveEffectiveness > 1;
    const recoveryVerdict = isImmune
      ? { tier: null, suffix: "" }
      : getRecoveryAwareVerdict({
          rolls: sortedRolls,
          maxHP: defHP,
          item: defenderItemName,
          defenderTypes,
          ability: defenderAbilityName,
          isSuperEffective,
        });
    const recoverySuffix = recoveryVerdict.suffix;
    // Only expose recoveryTier when recovery actually changed the verdict
    // (suffix is non-empty). Consumers can fall back to the percent-based
    // tier when recoveryTier is null.
    const recoveryTier = recoverySuffix ? recoveryVerdict.tier : null;

    // Compute OHKO chance: percentage of rolls that KO the defender at
    // current HP. The engine produces 16 equally-likely damage rolls.
    // Use the defender's originalCurHP (the numeric value we passed in via
    // the constructor) — accessing curHP() could return maxHP if unset.
    const defenderCurrentHP: number =
      typeof defender.originalCurHP === "number"
        ? defender.originalCurHP
        : defHP;
    let koChance: number | null = null;
    if (!isImmune && rolls.length > 0) {
      const koingRolls = rolls.filter((r) => r >= defenderCurrentHP).length;
      koChance = (koingRolls / rolls.length) * 100;
    }

    return {
      minPercent,
      maxPercent,
      desc: isImmune ? `${moveName}: 0 - 0 (0 - 0%) -- immune` : result.desc(),
      recoverySuffix,
      recoveryTier,
      koChance,
      rolls,
      defenderMaxHP: defHP,
    };
  } catch (error) {
    logError("calc.runCalc", error, { moveName });
    return null;
  }
}
