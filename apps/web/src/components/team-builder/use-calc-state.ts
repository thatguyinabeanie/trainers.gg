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

import { type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

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

export interface BaseSideState {
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  tailwind: boolean;
  helpingHand: boolean;
  friendGuard: boolean;
  protect: boolean;
  stealthRock: boolean;
  spikes: number;
  saltCure: boolean;
}
export type AttackerSideState = BaseSideState;
// DefenderSideState removed — both sides now use BaseSideState directly.

export interface CalcOutput {
  minPercent: number;
  maxPercent: number;
  desc: string;
  rolls: readonly number[];
  defenderMaxHP: number;
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

function getGen(generationNumber: number) {
  // @smogon/calc + @pkmn/data only ship damage mechanics for gens 1–9.
  // Newer formats (e.g. Champions = gen 10) fall back to gen 9 mechanics
  // so the calc engine doesn't crash trying to look up an undefined gen.
  const safeGen = Math.min(Math.max(generationNumber, 1), 9);
  let gen = generationsCache.get(safeGen);
  if (!gen) {
    gen = Generations.get(
      safeGen as Parameters<typeof Generations.get>[0]
    );
    generationsCache.set(safeGen, gen);
  }
  return gen;
}

/** Status display label → Smogon status code mapping. */
export const STATUS_MAP: Record<string, string> = {
  Healthy: "",
  Burned: "brn",
  Poisoned: "psn",
  "Badly Poisoned": "tox",
  Paralyzed: "par",
  Asleep: "slp",
  Frozen: "frz",
};

/** Ability → inferred weather when no explicit weather is set. */
const ABILITY_WEATHER_MAP: Record<string, string> = {
  Drought: "Sun",
  Drizzle: "Rain",
  "Sand Stream": "Sand",
  "Snow Warning": "Snow",
  "Orichalcum Pulse": "Sun",
};

/** Ability → inferred terrain when no explicit terrain is set. */
const ABILITY_TERRAIN_MAP: Record<string, string> = {
  "Hadron Engine": "Electric",
};

const EMPTY_BOOSTS: StatBoosts = {
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
};

// =============================================================================
// Helpers
// =============================================================================

/** Cast a string to the branded smogon type for Pokemon constructor options. */
function asSmogon<T>(v: string | null | undefined): T {
  return (v ?? undefined) as unknown as T;
}

function buildAttackerFromDb(
  gen: ReturnType<typeof Generations.get>,
  db: Tables<"pokemon">,
  boosts: AttackerBoosts,
  status: string
): Pokemon | null {
  if (!db.species) return null;
  try {
    return new Pokemon(gen, db.species, {
      level: db.level ?? 50,
      nature: asSmogon(db.nature ?? "Hardy"),
      ability: asSmogon(db.ability),
      item: asSmogon(db.held_item),
      teraType: asSmogon(db.tera_type),
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
      boosts,
      status: asSmogon(STATUS_MAP[status] ?? ""),
      moves: [db.move1, db.move2, db.move3, db.move4].filter((m): m is string =>
        Boolean(m)
      ) as unknown as string[],
    });
  } catch (error) {
    console.warn("[useCalcState] Failed to build attacker:", error);
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
  status: string,
  hpPercent: number
): Pokemon | null {
  if (!species) return null;
  try {
    // Build without curHP first so we can call maxHP() to compute the real value.
    const mon = new Pokemon(gen, species, {
      level: 50,
      nature: asSmogon(nature),
      ability: asSmogon(ability || null),
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
    return new Pokemon(gen, species, {
      level: 50,
      nature: asSmogon(nature),
      ability: asSmogon(ability || null),
      item: asSmogon(item || null),
      teraType: asSmogon(teraType || null),
      ivs,
      evs,
      boosts,
      status: asSmogon(STATUS_MAP[status] ?? ""),
      curHP: hpValue,
    });
  } catch (error) {
    console.warn("[useCalcState] Failed to build defender:", error);
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
  faintedForMove?: number
): CalcOutput | null {
  try {
    const basePowerOverride =
      LAST_RESPECTS_MOVES.has(moveName) && faintedForMove !== undefined
        ? lastRespectsBP(faintedForMove)
        : undefined;
    const moveOpts = basePowerOverride !== undefined
      ? { isCrit, basePower: basePowerOverride }
      : { isCrit };
    const move = new Move(gen, moveName, moveOpts);
    const result = calculate(gen, attacker, defender, move, field);
    const damage = result.damage;
    if (!damage || (Array.isArray(damage) && damage.length === 0)) return null;

    const defHP = defender.maxHP();
    if (defHP === 0) return null;

    const [minDmg, maxDmg] = result.range();
    const minPercent = Math.floor((minDmg / defHP) * 1000) / 10;
    const maxPercent = Math.floor((maxDmg / defHP) * 1000) / 10;

    const rolls: readonly number[] = Array.isArray(damage)
      ? Array.isArray(damage[0])
        ? ((damage as number[][])[0] ?? [])
        : (damage as number[])
      : [];

    return {
      minPercent,
      maxPercent,
      desc: result.desc(),
      rolls,
      defenderMaxHP: defHP,
    };
  } catch (error) {
    console.warn("[useCalcState] Failed to run damage calc:", error);
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
  attackerStatus: string;
  setAttackerStatus: (v: string) => void;
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
  defenderStatus: string;
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
  setDefenderStatus: (v: string) => void;
  setDefenderHpPercent: (v: number) => void;
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
  const gen = getGen(format?.generation ?? 9);

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
  const [attackerStatus, setAttackerStatus] = useState("Healthy");
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
  const [defenderBoosts, setDefenderBoosts] =
    useState<DefenderBoosts>(EMPTY_BOOSTS);
  const [defenderStatus, setDefenderStatus] = useState("Healthy");
  const [defenderHpPercent, setDefenderHpPercent] = useState(100);
  const [defenderMoves, setDefenderMovesState] = useState<
    [string, string, string, string]
  >(DEFAULT_DEFENDER_MOVES);

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
    setDefenderIvs((prev) => ({ ...prev, [stat]: Math.min(31, Math.max(0, Math.round(v))) }));
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
      // Classic EV mode: total capped at 510, each stat at 252.
      // SP mode (Champions) is enforced by the caller — they should pass a
      // value already clamped to 0-32, since this hook does not know about
      // the format.
      const MAX_TOTAL = 510;
      const otherTotal = Object.entries(prev)
        .filter(([k]) => k !== stat)
        .reduce((sum, [, val]) => sum + val, 0);
      const capped = Math.min(v, MAX_TOTAL - otherTotal, 252);
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
  // Only applies when the user has NOT explicitly set weather/terrain.
  const attackerAbility = selectedPokemon?.ability ?? null;
  const inferredWeather: string | null =
    !weather && attackerAbility
      ? (ABILITY_WEATHER_MAP[attackerAbility] ?? null)
      : null;
  const inferredTerrain: string | null =
    !terrain && attackerAbility
      ? (ABILITY_TERRAIN_MAP[attackerAbility] ?? null)
      : null;

  // --- Derived values — computed during render so result stays in sync ---
  const moves: readonly (string | null)[] = [
    selectedPokemon?.move1 ?? null,
    selectedPokemon?.move2 ?? null,
    selectedPokemon?.move3 ?? null,
    selectedPokemon?.move4 ?? null,
  ];

  // --- Shared calc objects — built once per render, reused across all move outputs ---
  const effectiveWeather = weather || (inferredWeather ?? "");
  const effectiveTerrain = terrain || (inferredTerrain ?? "");

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
    ? buildAttackerFromDb(gen, selectedPokemon, attackerBoosts, attackerStatus)
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
    defenderHpPercent
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
    100
  );

  // Our pokemon as defender (no boosts — they don't apply when receiving)
  const sharedOurPokemonAsDefender = selectedPokemon
    ? buildAttackerFromDb(gen, selectedPokemon, EMPTY_BOOSTS, "Healthy")
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
      return runCalc(gen, sharedAttacker, sharedDefender, moveName, isCrit, sharedOffenseField, faintedYours);
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
      faintedTheirs
    );
  }

  const moveCalcOutputs: readonly (CalcOutput | null)[] = moves.map((_, idx) =>
    getCalcOutputForMove(idx)
  );

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
    return runCalc(gen, sharedDefenderAsAttacker, sharedOurPokemonAsDefender, moveName, false, sharedDefenseField, faintedTheirs);
  }

  // Pre-compute outputs for the raw user-set defenderMoves slots (for context
  // consumers that don't have effective move defaults resolved yet).
  // Short-circuit when no defender moves are populated to avoid building objects for nothing.
  const hasAnyDefenderMove = defenderMoves.some(Boolean);
  const moveCalcOutputsReverse: readonly (CalcOutput | null)[] = hasAnyDefenderMove
    ? [0, 1, 2, 3].map((idx) => computeReverseOutput(defenderMoves[idx] ?? ""))
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
    moveCalcOutputsReverse,
    computeReverseOutput,
    selectedMoveName,
    selectedMoveOutput,
    inferredWeather,
    inferredTerrain,
  };
}
