"use client";

import { useState } from "react";
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
  getCanonicalBaseSpecies,
  getMegaAbilityForSpecies,
  getSpeciesTypes,
  isChampionsFormat,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";
import { logError } from "@trainers/utils";

import { getMoveEffectiveness } from "./v2/calc/move-effectiveness";
import {
  getRecoveryAwareVerdict,
  type KoTierLabel,
} from "./calc/recovery";

export type { KoTierLabel };

// =============================================================================
// Types
// =============================================================================

export interface DefenderEvs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export type DefenderIvs = {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
};

export interface StatBoosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}
export type AttackerBoosts = StatBoosts;
export type DefenderBoosts = StatBoosts;

/**
 * Spikes count — 0 = none, 1-3 = stack height. The Pokemon engine supports
 * exactly 0-3 layers; rejecting other values at the type level lets the
 * stepper UI drop its `as 0 | 1 | 2 | 3` cast.
 */
export type SpikesCount = 0 | 1 | 2 | 3;

export interface BaseSideState {
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  tailwind: boolean;
  helpingHand: boolean;
  friendGuard: boolean;
  protect: boolean;
  stealthRock: boolean;
  spikes: SpikesCount;
  saltCure: boolean;
}
export type AttackerSideState = BaseSideState;

export interface CalcOutput {
  minPercent: number;
  maxPercent: number;
  desc: string;
  rolls: readonly number[];
  defenderMaxHP: number;
  /**
   * Item-recovery-aware suffix that the UI can append to the verdict, e.g.
   * "after Sitrus Berry recovery". Empty string when no recovery item is
   * held or when recovery wouldn't actually change the KO tier.
   */
  recoverySuffix: string;
  /**
   * Recovery-aware KO tier (e.g. "3HKO" when Sitrus Berry converts a 2HKO).
   * Only set when recovery actually changed the verdict — null otherwise.
   * Consumers should prefer this over the percent-derived verdict when
   * non-null, since the simulation accounts for mid-battle healing.
   */
  recoveryTier: KoTierLabel;
}

// Attacker's max HP — used in the "X–Y / HP" detail line for reverse calcs.
export type AttackerMaxHP = number;

export type CalcDirection = "offense" | "defense";

// =============================================================================
// Constants
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
function getGen(format: GameFormat | undefined) {
  if (isChampionsFormat(format)) {
    return getCachedGen(0);
  }
  const safeGen = Math.min(Math.max(format?.generation ?? 9, 1), 9);
  return getCachedGen(safeGen);
}

/** Status display label → Smogon status code mapping. */
export const STATUS_MAP = {
  Healthy: "",
  Burned: "brn",
  Poisoned: "psn",
  "Badly Poisoned": "tox",
  Paralyzed: "par",
  Asleep: "slp",
  Frozen: "frz",
} as const satisfies Record<
  string,
  "" | "brn" | "psn" | "tox" | "par" | "slp" | "frz"
>;

/** Display labels accepted by the calc status pickers. */
export type StatusLabel = keyof typeof STATUS_MAP;

/**
 * Engine-level weather names accepted by `@smogon/calc`. The UI string
 * representation also includes `""` (auto-infer from ability) and `"None"`
 * (explicit suppression) — see `parseWeatherString` for the conversion.
 */
export type EngineWeather = "Sun" | "Rain" | "Sand" | "Snow";

/** Engine-level terrain names accepted by `@smogon/calc`. */
export type EngineTerrain = "Grassy" | "Electric" | "Psychic" | "Misty";

/** Ability → inferred weather when no explicit weather is set. */
const ABILITY_WEATHER_MAP: Record<string, EngineWeather> = {
  Drought: "Sun",
  Drizzle: "Rain",
  "Sand Stream": "Sand",
  "Snow Warning": "Snow",
  "Orichalcum Pulse": "Sun",
};

/** Ability → inferred terrain when no explicit terrain is set. */
const ABILITY_TERRAIN_MAP: Record<string, EngineTerrain> = {
  "Hadron Engine": "Electric",
};

const ENGINE_WEATHER_SET: ReadonlySet<string> = new Set<EngineWeather>([
  "Sun",
  "Rain",
  "Sand",
  "Snow",
]);

const ENGINE_TERRAIN_SET: ReadonlySet<string> = new Set<EngineTerrain>([
  "Grassy",
  "Electric",
  "Psychic",
  "Misty",
]);

/**
 * Internal tri-state for weather/terrain. The UI passes a single `string`
 * around (empty / "None" / engine value) for legacy reasons; this union is
 * what the resolver actually branches on.
 *   - `auto` — infer from the attacker's ability (was `""`)
 *   - `none` — explicit suppression of inference (was `"None"`)
 *   - `set`  — user picked a specific weather/terrain
 */
type WeatherInput =
  | { kind: "auto" }
  | { kind: "none" }
  | { kind: "set"; value: EngineWeather };

type TerrainInput =
  | { kind: "auto" }
  | { kind: "none" }
  | { kind: "set"; value: EngineTerrain };

function parseWeatherString(s: string): WeatherInput {
  if (s === "" || s === "auto") return { kind: "auto" };
  if (s === "None") return { kind: "none" };
  if (ENGINE_WEATHER_SET.has(s)) return { kind: "set", value: s as EngineWeather };
  return { kind: "auto" };
}

function parseTerrainString(s: string): TerrainInput {
  if (s === "" || s === "auto") return { kind: "auto" };
  if (s === "None") return { kind: "none" };
  if (ENGINE_TERRAIN_SET.has(s)) return { kind: "set", value: s as EngineTerrain };
  return { kind: "auto" };
}

interface ResolvedWeather {
  /** Engine-level value to feed `@smogon/calc`. `null` = no weather active. */
  effective: EngineWeather | null;
  /** Ability-derived hint for the UI; `null` if not auto or not inferrable. */
  inferred: EngineWeather | null;
}

interface ResolvedTerrain {
  effective: EngineTerrain | null;
  inferred: EngineTerrain | null;
}

function resolveWeather(
  input: WeatherInput,
  ability: string | null
): ResolvedWeather {
  switch (input.kind) {
    case "set":
      return { effective: input.value, inferred: null };
    case "none":
      return { effective: null, inferred: null };
    case "auto": {
      const inferred = ability ? (ABILITY_WEATHER_MAP[ability] ?? null) : null;
      return { effective: inferred, inferred };
    }
  }
}

function resolveTerrain(
  input: TerrainInput,
  ability: string | null
): ResolvedTerrain {
  switch (input.kind) {
    case "set":
      return { effective: input.value, inferred: null };
    case "none":
      return { effective: null, inferred: null };
    case "auto": {
      const inferred = ability ? (ABILITY_TERRAIN_MAP[ability] ?? null) : null;
      return { effective: inferred, inferred };
    }
  }
}

const EMPTY_BOOSTS: StatBoosts = {
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};

/**
 * Symbol sentinel for `prevIsChampions` so the format-clamp branch fires on
 * the first render even when `isChampions` is `false`. Module-level so a new
 * Symbol isn't allocated on every render. See react-patterns.md
 * (set-state-in-effect → Symbol sentinel) for the pattern rationale.
 */
const FORMAT_UNINITIALIZED = Symbol("format-uninitialized");

// =============================================================================
// Helpers
// =============================================================================

/**
 * Brand-cast a UI string into one of `@smogon/calc`'s branded name types
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

function buildAttackerFromDb(
  gen: ReturnType<typeof Generations.get>,
  db: Tables<"pokemon">,
  boosts: AttackerBoosts,
  status: StatusLabel,
  megaActive: boolean
): Pokemon | null {
  if (!db.species) return null;
  try {
    const { ivs, evs } = buildEngineStats(gen, db);
    // Per-calc mega toggle: when ON and species is a mega form, use the
    // mega's species + post-evolution ability. When OFF, simulate as the
    // base form (pre-mega turn 1, or two-megas scenario where THIS Pokemon
    // doesn't mega this match).
    const isMegaForm = getMegaAbilityForSpecies(db.species) !== null;
    const effectiveSpecies =
      isMegaForm && !megaActive
        ? getCanonicalBaseSpecies(db.species)
        : db.species;
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

function buildDefenderPokemon(
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
    // Per-calc mega toggle (see buildAttackerFromDb).
    const isMegaForm = getMegaAbilityForSpecies(species) !== null;
    const effectiveSpecies =
      isMegaForm && !megaActive ? getCanonicalBaseSpecies(species) : species;
    const calcAbility =
      isMegaForm && megaActive
        ? (getMegaAbilityForSpecies(species) ?? ability)
        : ability;
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

function buildField(
  gameType: "Doubles" | "Singles",
  weather: string,
  terrain: string,
  gravity: boolean,
  fairyAura: boolean,
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
  });

  return new Field({
    gameType,
    weather: asSmogon(weather || null),
    terrain: asSmogon(terrain || null),
    isGravity: gravity,
    isFairyAura: fairyAura,
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

function runCalc(
  gen: ReturnType<typeof Generations.get>,
  attacker: Pokemon,
  defender: Pokemon,
  moveName: string,
  isCrit: boolean,
  field: Field,
  faintedForMove?: number,
  weather?: string
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
      : getMoveEffectiveness(moveName, defenderSpeciesName, weather);
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

    return {
      minPercent,
      maxPercent,
      desc: isImmune ? `${moveName}: 0 - 0 (0 - 0%) -- immune` : result.desc(),
      recoverySuffix,
      recoveryTier,
      rolls,
      defenderMaxHP: defHP,
    };
  } catch (error) {
    logError("calc.runCalc", error, { moveName });
    return null;
  }
}

/** Verdict label for a calc result. */
export type Verdict = "OHKO" | "2HKO" | "3HKO" | null;

export function getVerdict(minPercent: number, maxPercent: number): Verdict {
  if (minPercent >= 100) return "OHKO";
  if (maxPercent >= 50) return "2HKO";
  if (maxPercent >= 34) return "3HKO";
  return null;
}

// =============================================================================
// Hook
// =============================================================================

export interface UseCalcStateOptions {
  selectedPokemon: Tables<"pokemon"> | null;
  /** Active game format. Used to select the correct generation for damage calcs.
   *  Defaults to Generation 9 when absent. */
  format?: GameFormat;
  /**
   * Number of fainted Pokémon on YOUR team (0..5).
   * Applied as a base power multiplier for Last Respects / Triumphant Wave
   * when the attacker is on your side (forward direction).
   */
  faintedYours?: number;
  /**
   * Number of fainted Pokémon on THEIR team (0..5).
   * Applied as a base power multiplier for Last Respects / Triumphant Wave
   * when the defender fires the move (reverse direction).
   */
  faintedTheirs?: number;
}

export interface UseCalcStateReturn {
  // Direction
  direction: CalcDirection;
  setDirection: (v: CalcDirection) => void;
  // Active move
  selectedMoveIdx: number;
  setSelectedMoveIdx: (idx: number) => void;
  // Crit per move
  critMoves: readonly boolean[];
  toggleCrit: (idx: number) => void;
  // Attacker
  attackerStatus: StatusLabel;
  setAttackerStatus: (v: StatusLabel) => void;
  attackerBoosts: AttackerBoosts;
  setAttackerBoost: (stat: keyof AttackerBoosts, v: number) => void;
  // Defender
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  defenderTera: string;
  defenderEvs: DefenderEvs;
  defenderIvs: DefenderIvs;
  defenderBoosts: DefenderBoosts;
  defenderStatus: StatusLabel;
  defenderHpPercent: number;
  /** Defender's 4 move slots — used for defense-direction calcs. */
  defenderMoves: readonly [string, string, string, string];
  setDefenderSpecies: (v: string) => void;
  setDefenderAbility: (v: string) => void;
  setDefenderItem: (v: string) => void;
  setDefenderNature: (v: string) => void;
  setDefenderTera: (v: string) => void;
  setDefenderEv: (stat: keyof DefenderEvs, v: number) => void;
  setDefenderIv: (stat: keyof DefenderIvs, v: number) => void;
  setDefenderBoost: (stat: keyof DefenderBoosts, v: number) => void;
  setDefenderStatus: (v: StatusLabel) => void;
  setDefenderHpPercent: (v: number) => void;
  /** Per-calc toggle: simulate the attacker as its mega form vs base form. */
  attackerMegaActive: boolean;
  setAttackerMegaActive: (v: boolean) => void;
  /** Per-calc toggle: simulate the defender as its mega form vs base form. */
  defenderMegaActive: boolean;
  setDefenderMegaActive: (v: boolean) => void;
  setDefenderMove: (slotIdx: number, name: string) => void;
  /**
   * Resets defender stats (EVs, IVs, boosts, status, HP) and reasonable defaults
   * for a new species. Caller can pass overrides for ability/item/nature etc.
   */
  resetDefenderForSpecies: (
    species: string,
    overrides?: {
      ability?: string;
      item?: string;
      nature?: string;
      tera?: string;
      evs?: DefenderEvs;
    }
  ) => void;
  // Field
  gameType: "Doubles" | "Singles";
  weather: string;
  terrain: string;
  gravity: boolean;
  setGameType: (v: "Doubles" | "Singles") => void;
  setWeather: (v: string) => void;
  setTerrain: (v: string) => void;
  setGravity: (v: boolean) => void;
  fairyAura: boolean;
  setFairyAura: (v: boolean) => void;
  // Sides
  attackerSide: AttackerSideState;
  defenderSide: BaseSideState;
  setAttackerSide: (patch: Partial<AttackerSideState>) => void;
  setDefenderSide: (patch: Partial<BaseSideState>) => void;
  // Derived results — computed during render
  moves: readonly (string | null)[];
  moveCalcOutputs: readonly (CalcOutput | null)[];
  /**
   * Per-row forward calc — returns the 4 move outputs for any team row's
   * pokemon vs the configured defender. The CALC column on every row calls
   * this to populate, so all rows show calcs simultaneously when the calc
   * panel is open. The chip-pick "focused" row (id matches selectedPokemon.id)
   * inherits the panel's boosts/status/mega/crit tweaks; other rows compute
   * with neutral attacker settings.
   */
  computeForwardOutputsForRow: (
    rowPokemon: Tables<"pokemon"> | null
  ) => readonly (CalcOutput | null)[];
  selectedMoveName: string | null;
  selectedMoveOutput: CalcOutput | null;
  /**
   * Reverse-direction calc outputs: each defender move fired at the active
   * attacker. Parallel to defenderMoves (length 4). null for empty or
   * uncalculable slots.
   *
   * Note: only non-empty slots in defenderMoves are computed. If the moves
   * come from a preset default (resolved in useDefenderMoves), use
   * computeReverseOutput() directly with the effective move name.
   */
  moveCalcOutputsReverse: readonly (CalcOutput | null)[];
  /**
   * Compute a single reverse-direction calc output for any move name.
   * Useful when the caller has already resolved effective moves from defaults.
   */
  computeReverseOutput: (moveName: string) => CalcOutput | null;
  /**
   * Inferred weather from the attacker's ability (Drought, Drizzle, etc.).
   * Exposed so the UI can display a badge. null when ability doesn't set weather
   * or when the user has explicitly set weather.
   */
  inferredWeather: string | null;
  /**
   * Inferred terrain from the attacker's ability (Hadron Engine → Electric).
   * Exposed so the UI can display a badge. null when ability doesn't set terrain
   * or when the user has explicitly set terrain.
   */
  inferredTerrain: string | null;
}

const DEFAULT_DEFENDER_EVS: DefenderEvs = {
  hp: 252,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 4,
  spe: 0,
};

const DEFAULT_DEFENDER_IVS: DefenderIvs = {
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
};

const DEFAULT_DEFENDER_MOVES: [string, string, string, string] = [
  "",
  "",
  "",
  "",
];

/**
 * Owns the entire damage-calc state machine for the team builder.
 *
 * Consumed by {@link CalcPanel} so calc math stays in one place. State **does
 * not** reset on `selectedPokemon` change — callers should drive that with a
 * `key` on the consuming component (per `react-patterns.md`).
 */
export function useCalcState({
  selectedPokemon,
  format,
  faintedYours = 0,
  faintedTheirs = 0,
}: UseCalcStateOptions): UseCalcStateReturn {
  // Resolve the generation from the active format so calcs use the correct
  // damage mechanics. Falls back to Gen 9 when format is absent or when
  // @smogon/calc doesn't yet support the format's generation.
  const gen = getGen(format);

  // --- Direction ---
  const [direction, setDirection] = useState<CalcDirection>("offense");

  // --- Selected move (0-3) ---
  const [selectedMoveIdx, setSelectedMoveIdx] = useState(0);

  // --- Crit per move ---
  const [critMoves, setCritMoves] = useState<readonly boolean[]>([
    false,
    false,
    false,
    false,
  ]);

  // --- Attacker modifiers (calc-only) ---
  const [attackerStatus, setAttackerStatus] =
    useState<StatusLabel>("Healthy");
  const [attackerBoosts, setAttackerBoosts] =
    useState<AttackerBoosts>(EMPTY_BOOSTS);

  // --- Defender ---
  const [defenderSpecies, setDefenderSpecies] = useState("Incineroar");
  const [defenderAbility, setDefenderAbility] = useState("Intimidate");
  const [defenderItem, setDefenderItem] = useState("Sitrus Berry");
  const [defenderNature, setDefenderNature] = useState("Careful");
  const [defenderTera, setDefenderTera] = useState("");
  const [defenderEvs, setDefenderEvs] =
    useState<DefenderEvs>(DEFAULT_DEFENDER_EVS);
  const [defenderIvs, setDefenderIvs] =
    useState<DefenderIvs>(DEFAULT_DEFENDER_IVS);

  // Clamp defenderEvs to the active format's caps when format changes.
  // Champions M-A uses 32 per stat / 66 total Stat Points (vs VGC 252/510).
  // Without this, defaults like { hp: 252 } persist across format changes
  // and exceed the Champions caps. Render-time adjustment (Symbol sentinel)
  // per react-patterns.md — set-state-in-effect is forbidden.
  // FORMAT_UNINITIALIZED is module-level so it's stable across renders.
  const isChampions = isChampionsFormat(format);
  const [prevIsChampions, setPrevIsChampions] = useState<boolean | symbol>(
    FORMAT_UNINITIALIZED
  );
  if (prevIsChampions !== isChampions) {
    setPrevIsChampions(isChampions);
    const perStatCap = isChampions ? 32 : 252;
    const totalCap = isChampions ? 66 : 510;
    setDefenderEvs((prev) => {
      let runningTotal = 0;
      const next: DefenderEvs = { ...prev };
      for (const key of [
        "hp",
        "atk",
        "def",
        "spa",
        "spd",
        "spe",
      ] as const satisfies readonly (keyof DefenderEvs)[]) {
        const perStat = Math.min(prev[key], perStatCap);
        const allowed = Math.max(0, Math.min(perStat, totalCap - runningTotal));
        next[key] = allowed;
        runningTotal += allowed;
      }
      return next;
    });
  }
  const [defenderBoosts, setDefenderBoosts] =
    useState<DefenderBoosts>(EMPTY_BOOSTS);
  const [defenderStatus, setDefenderStatus] =
    useState<StatusLabel>("Healthy");
  const [defenderHpPercent, setDefenderHpPercent] = useState(100);
  const [defenderMoves, setDefenderMovesState] = useState<
    [string, string, string, string]
  >(DEFAULT_DEFENDER_MOVES);

  // --- Per-calc mega toggle ---
  // When the active species is a mega form, the calc engine uses the mega's
  // post-evolution stats and ability by default. Players sometimes want to
  // model the OTHER scenario (pre-mega turn 1, or two-megas-on-team where
  // THIS Pokemon doesn't mega this match) — flipping these to false makes
  // the calc engine treat the species as its base form.
  const [attackerMegaActive, setAttackerMegaActive] = useState(true);
  const [defenderMegaActive, setDefenderMegaActive] = useState(true);

  // --- Field ---
  const [gameType, setGameType] = useState<"Doubles" | "Singles">("Doubles");
  const [weather, setWeather] = useState("");
  const [terrain, setTerrain] = useState("");
  const [gravity, setGravity] = useState(false);
  const [fairyAura, setFairyAura] = useState(false);
  const [attackerSide, setAttackerSideState] = useState<AttackerSideState>({
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    protect: false,
    stealthRock: false,
    spikes: 0,
    saltCure: false,
  });
  const [defenderSide, setDefenderSideState] = useState<BaseSideState>({
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    protect: false,
    stealthRock: false,
    spikes: 0,
    saltCure: false,
  });

  // --- Helpers exposed to consumers ---
  function toggleCrit(idx: number) {
    setCritMoves((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }

  function setAttackerBoost(stat: keyof AttackerBoosts, v: number) {
    setAttackerBoosts((prev) => ({ ...prev, [stat]: v }));
  }

  function setDefenderIv(stat: keyof DefenderIvs, v: number) {
    setDefenderIvs((prev) => ({
      ...prev,
      [stat]: Math.min(31, Math.max(0, Math.round(v))),
    }));
  }

  function setDefenderMove(slotIdx: number, name: string) {
    if (slotIdx < 0 || slotIdx > 3) return;
    setDefenderMovesState((prev) => {
      const next = [...prev] as [string, string, string, string];
      next[slotIdx] = name;
      return next;
    });
  }

  function setDefenderEv(stat: keyof DefenderEvs, v: number) {
    setDefenderEvs((prev) => {
      // Cap depends on format: Champions (Reg M-A) uses 32 SP per stat / 66
      // total. Classic VGC uses 252 EV per stat / 510 total. Whether the
      // user calls this from a Champions-aware UI or not, the hook is the
      // source of truth — callers don't have to pre-clamp.
      const perStatCap = isChampions ? 32 : 252;
      const totalCap = isChampions ? 66 : 510;
      const otherTotal = Object.entries(prev)
        .filter(([k]) => k !== stat)
        .reduce((sum, [, val]) => sum + val, 0);
      const headroom = Math.max(0, totalCap - otherTotal);
      const capped = Math.min(v, perStatCap, headroom);
      return { ...prev, [stat]: Math.max(0, capped) };
    });
  }

  function setDefenderBoost(stat: keyof DefenderBoosts, v: number) {
    setDefenderBoosts((prev) => ({ ...prev, [stat]: v }));
  }

  function setAttackerSide(patch: Partial<AttackerSideState>) {
    setAttackerSideState((prev) => ({ ...prev, ...patch }));
  }

  function setDefenderSide(patch: Partial<BaseSideState>) {
    setDefenderSideState((prev) => ({ ...prev, ...patch }));
  }

  function resetDefenderForSpecies(
    species: string,
    overrides?: {
      ability?: string;
      item?: string;
      nature?: string;
      tera?: string;
      evs?: DefenderEvs;
    }
  ) {
    setDefenderSpecies(species);
    setDefenderAbility(overrides?.ability ?? "");
    setDefenderItem(overrides?.item ?? "");
    setDefenderNature(overrides?.nature ?? "Hardy");
    setDefenderTera(overrides?.tera ?? "");
    setDefenderEvs(
      overrides?.evs ?? { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    );
    setDefenderIvs(DEFAULT_DEFENDER_IVS);
    setDefenderBoosts(EMPTY_BOOSTS);
    setDefenderStatus("Healthy");
    setDefenderHpPercent(100);
    setDefenderMovesState(DEFAULT_DEFENDER_MOVES);
  }

  // --- Inferred weather / terrain from attacker ability ---
  // The UI string is parsed into a discriminated union and resolved against
  // the attacker's ability — `auto` infers, `none` suppresses inference,
  // `set` uses the picked value verbatim. See `parseWeatherString` /
  // `resolveWeather` above for the contract.
  const attackerAbility = selectedPokemon?.ability ?? null;
  const resolvedWeather = resolveWeather(
    parseWeatherString(weather),
    attackerAbility
  );
  const resolvedTerrain = resolveTerrain(
    parseTerrainString(terrain),
    attackerAbility
  );
  const inferredWeather = resolvedWeather.inferred;
  const inferredTerrain = resolvedTerrain.inferred;

  // --- Derived values — computed during render so result stays in sync ---
  const moves: readonly (string | null)[] = [
    selectedPokemon?.move1 ?? null,
    selectedPokemon?.move2 ?? null,
    selectedPokemon?.move3 ?? null,
    selectedPokemon?.move4 ?? null,
  ];

  // --- Shared calc objects — built once per render, reused across all move outputs ---
  // `effective*` are the engine-ready values (typed `EngineWeather|null` etc).
  // We pass the empty string when the field is absent so the engine treats
  // it as "no weather/terrain active".
  const effectiveWeather = resolvedWeather.effective ?? "";
  const effectiveTerrain = resolvedTerrain.effective ?? "";

  // Offense field: attacker fires at defender
  const sharedOffenseField = buildField(
    gameType,
    effectiveWeather,
    effectiveTerrain,
    gravity,
    fairyAura,
    attackerSide,
    defenderSide,
    direction
  );

  // Shared attacker (from the active DB row)
  const sharedAttacker = selectedPokemon
    ? buildAttackerFromDb(
        gen,
        selectedPokemon,
        attackerBoosts,
        attackerStatus,
        attackerMegaActive
      )
    : null;

  // Shared defender (with current HP percent for receiving hits)
  const sharedDefender = buildDefenderPokemon(
    gen,
    defenderSpecies,
    defenderAbility,
    defenderItem,
    defenderNature,
    defenderTera,
    defenderEvs,
    defenderIvs,
    defenderBoosts,
    defenderStatus,
    defenderHpPercent,
    defenderMegaActive
  );

  // Defender as attacker (built at full HP so offensive stats are correct)
  const sharedDefenderAsAttacker = buildDefenderPokemon(
    gen,
    defenderSpecies,
    defenderAbility,
    defenderItem,
    defenderNature,
    defenderTera,
    defenderEvs,
    defenderIvs,
    defenderBoosts,
    defenderStatus,
    100,
    defenderMegaActive
  );

  // Our pokemon as defender (no boosts — they don't apply when receiving)
  const sharedOurPokemonAsDefender = selectedPokemon
    ? buildAttackerFromDb(
        gen,
        selectedPokemon,
        EMPTY_BOOSTS,
        "Healthy",
        attackerMegaActive
      )
    : null;

  // Defense field: defender fires at our pokemon
  const sharedDefenseField = buildField(
    gameType,
    effectiveWeather,
    effectiveTerrain,
    gravity,
    fairyAura,
    attackerSide,
    defenderSide,
    "defense"
  );

  function getCalcOutputForMove(moveIdx: number): CalcOutput | null {
    if (!selectedPokemon) return null;
    const moveName = moves[moveIdx];
    if (!moveName) return null;

    const isCrit = critMoves[moveIdx] ?? false;

    if (direction === "offense") {
      if (!sharedAttacker || !sharedDefender) return null;
      // Forward direction: attacker is on YOUR team — use faintedYours for Last Respects BP.
      return runCalc(
        gen,
        sharedAttacker,
        sharedDefender,
        moveName,
        isCrit,
        sharedOffenseField,
        faintedYours,
        effectiveWeather
      );
    }

    // Defense direction: defender fires at us — reuse the shared swap-side builders
    // and the defense-side field. faintedTheirs applies to the defender's Last Respects BP.
    if (!sharedDefenderAsAttacker || !sharedOurPokemonAsDefender) return null;
    return runCalc(
      gen,
      sharedDefenderAsAttacker,
      sharedOurPokemonAsDefender,
      moveName,
      isCrit,
      sharedDefenseField,
      faintedTheirs,
      effectiveWeather
    );
  }

  const moveCalcOutputs: readonly (CalcOutput | null)[] = moves.map((_, idx) =>
    getCalcOutputForMove(idx)
  );

  // Per-row forward calc — every Pokemon row in the team builder calls this
  // with its own pokemon to populate its CALC column. The chip-pick "focused"
  // attacker (rowPokemon.id === selectedPokemon?.id) inherits the panel's
  // boosts/status/mega/crit tweaks; non-focused rows compute against neutral
  // baseline so each row reflects the species' raw matchup vs the defender.
  const NULL_OUTPUTS: readonly (CalcOutput | null)[] = [null, null, null, null];
  function computeForwardOutputsForRow(
    rowPokemon: Tables<"pokemon"> | null
  ): readonly (CalcOutput | null)[] {
    if (!rowPokemon) return NULL_OUTPUTS;
    if (!sharedDefender) return NULL_OUTPUTS;

    const isFocused = selectedPokemon?.id === rowPokemon.id;
    // Focused row reuses the already-built sharedAttacker (saves a Pokemon
    // construction). Non-focused rows build a fresh attacker with neutral
    // settings — boosts only apply to the chip-picked row.
    const attacker = isFocused
      ? sharedAttacker
      : buildAttackerFromDb(gen, rowPokemon, EMPTY_BOOSTS, "Healthy", true);
    if (!attacker) return NULL_OUTPUTS;

    const rowMoves = [
      rowPokemon.move1,
      rowPokemon.move2,
      rowPokemon.move3,
      rowPokemon.move4,
    ] as const;
    return rowMoves.map((moveName, idx) => {
      if (!moveName) return null;
      const isCrit = isFocused ? (critMoves[idx] ?? false) : false;
      return runCalc(
        gen,
        attacker,
        sharedDefender,
        moveName,
        isCrit,
        sharedOffenseField,
        faintedYours,
        effectiveWeather
      );
    });
  }

  const selectedMoveName = moves[selectedMoveIdx] ?? null;
  const selectedMoveOutput = moveCalcOutputs[selectedMoveIdx] ?? null;

  // --- Reverse-direction: defender's moves aimed at the active attacker ---
  // Accepts a concrete move name so callers can pass either a user-set override
  // or a default from useDefenderMoves without needing an extra round-trip.
  function computeReverseOutput(moveName: string): CalcOutput | null {
    if (!selectedPokemon) return null;
    if (!moveName) return null;
    if (!sharedDefenderAsAttacker || !sharedOurPokemonAsDefender) return null;
    // Reverse direction: the defender is attacking — their fainted count applies for Last Respects.
    return runCalc(
      gen,
      sharedDefenderAsAttacker,
      sharedOurPokemonAsDefender,
      moveName,
      false,
      sharedDefenseField,
      faintedTheirs,
      effectiveWeather
    );
  }

  // Pre-compute outputs for the raw user-set defenderMoves slots (for context
  // consumers that don't have effective move defaults resolved yet).
  // Short-circuit when no defender moves are populated to avoid building objects for nothing.
  const hasAnyDefenderMove = defenderMoves.some(Boolean);
  const moveCalcOutputsReverse: readonly (CalcOutput | null)[] =
    hasAnyDefenderMove
      ? [0, 1, 2, 3].map((idx) =>
          computeReverseOutput(defenderMoves[idx] ?? "")
        )
      : [null, null, null, null];

  return {
    direction,
    setDirection,
    selectedMoveIdx,
    setSelectedMoveIdx,
    critMoves,
    toggleCrit,
    attackerStatus,
    setAttackerStatus,
    attackerBoosts,
    setAttackerBoost,
    defenderSpecies,
    defenderAbility,
    defenderItem,
    defenderNature,
    defenderTera,
    defenderEvs,
    defenderIvs,
    defenderBoosts,
    defenderStatus,
    defenderHpPercent,
    defenderMoves,
    setDefenderSpecies,
    setDefenderAbility,
    setDefenderItem,
    setDefenderNature,
    setDefenderTera,
    setDefenderEv,
    setDefenderIv,
    setDefenderBoost,
    setDefenderStatus,
    setDefenderHpPercent,
    attackerMegaActive,
    setAttackerMegaActive,
    defenderMegaActive,
    setDefenderMegaActive,
    setDefenderMove,
    resetDefenderForSpecies,
    gameType,
    weather,
    terrain,
    gravity,
    setGameType,
    setWeather,
    setTerrain,
    setGravity,
    fairyAura,
    setFairyAura,
    attackerSide,
    defenderSide,
    setAttackerSide,
    setDefenderSide,
    moves,
    moveCalcOutputs,
    computeForwardOutputsForRow,
    moveCalcOutputsReverse,
    computeReverseOutput,
    selectedMoveName,
    selectedMoveOutput,
    inferredWeather,
    inferredTerrain,
  };
}
