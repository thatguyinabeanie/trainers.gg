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
}
export type AttackerSideState = BaseSideState;
export interface DefenderSideState extends BaseSideState {
  stealthRock: boolean;
  spikes: number;
  saltCure: boolean;
}

export interface CalcOutput {
  minPercent: number;
  maxPercent: number;
  desc: string;
  rolls: readonly number[];
  defenderMaxHP: number;
}

export type CalcDirection = "offense" | "defense";

// =============================================================================
// Constants
// =============================================================================

const gen9 = Generations.get(9);

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
  db: Tables<"pokemon">,
  boosts: AttackerBoosts,
  status: string
): Pokemon | null {
  if (!db.species) return null;
  try {
    return new Pokemon(gen9, db.species, {
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
  species: string,
  ability: string,
  item: string,
  nature: string,
  teraType: string,
  evs: DefenderEvs,
  boosts: DefenderBoosts,
  status: string,
  hpPercent: number
): Pokemon | null {
  if (!species) return null;
  try {
    return new Pokemon(gen9, species, {
      level: 50,
      nature: asSmogon(nature),
      ability: asSmogon(ability || null),
      item: asSmogon(item || null),
      teraType: asSmogon(teraType || null),
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs,
      boosts,
      status: asSmogon(STATUS_MAP[status] ?? ""),
      curHP: Math.max(1, Math.round((hpPercent / 100) * 1)),
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
  attackerSide: AttackerSideState,
  defenderSide: DefenderSideState,
  direction: CalcDirection
): Field {
  const aSide: BaseSideState =
    direction === "offense" ? attackerSide : defenderSide;
  const dSide: AttackerSideState | DefenderSideState =
    direction === "offense" ? defenderSide : attackerSide;

  const aSmogon = new Side({
    isReflect: aSide.reflect,
    isLightScreen: aSide.lightScreen,
    isAuroraVeil: aSide.auroraVeil,
    isTailwind: aSide.tailwind,
    isHelpingHand: aSide.helpingHand,
    isFriendGuard: aSide.friendGuard,
  });

  const dSmogon = new Side({
    isReflect: dSide.reflect,
    isLightScreen: dSide.lightScreen,
    isAuroraVeil: dSide.auroraVeil,
    isTailwind: dSide.tailwind,
    isHelpingHand: dSide.helpingHand,
    isFriendGuard: dSide.friendGuard,
    isSR:
      "stealthRock" in dSide ? (dSide as DefenderSideState).stealthRock : false,
    spikes: "spikes" in dSide ? (dSide as DefenderSideState).spikes : 0,
    isSaltCured:
      "saltCure" in dSide ? (dSide as DefenderSideState).saltCure : false,
  });

  return new Field({
    gameType,
    weather: asSmogon(weather || null),
    terrain: asSmogon(terrain || null),
    isGravity: gravity,
    attackerSide: aSmogon,
    defenderSide: dSmogon,
  });
}

function runCalc(
  attacker: Pokemon,
  defender: Pokemon,
  moveName: string,
  isCrit: boolean,
  field: Field
): CalcOutput | null {
  try {
    const move = new Move(gen9, moveName, { isCrit });
    const result = calculate(gen9, attacker, defender, move, field);
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
  defenderBoosts: DefenderBoosts;
  defenderStatus: string;
  defenderHpPercent: number;
  setDefenderSpecies: (v: string) => void;
  setDefenderAbility: (v: string) => void;
  setDefenderItem: (v: string) => void;
  setDefenderNature: (v: string) => void;
  setDefenderTera: (v: string) => void;
  setDefenderEv: (stat: keyof DefenderEvs, v: number) => void;
  setDefenderBoost: (stat: keyof DefenderBoosts, v: number) => void;
  setDefenderStatus: (v: string) => void;
  setDefenderHpPercent: (v: number) => void;
  /**
   * Resets defender stats (EVs, boosts, status, HP) and reasonable defaults
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
  // Sides
  attackerSide: AttackerSideState;
  defenderSide: DefenderSideState;
  setAttackerSide: (patch: Partial<AttackerSideState>) => void;
  setDefenderSide: (patch: Partial<DefenderSideState>) => void;
  // Derived results — computed during render
  moves: readonly (string | null)[];
  moveCalcOutputs: readonly (CalcOutput | null)[];
  selectedMoveName: string | null;
  selectedMoveOutput: CalcOutput | null;
}

const DEFAULT_DEFENDER_EVS: DefenderEvs = {
  hp: 252,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 4,
  spe: 0,
};

/**
 * Owns the entire damage-calc state machine for the team builder.
 *
 * Both the legacy {@link DamageCalcTab} and the new {@link CalcPanel} can
 * consume this hook so calc math stays in one place. State **does not** reset
 * on `selectedPokemon` change — callers should drive that with a `key` on the
 * consuming component (per `react-patterns.md`).
 */
export function useCalcState({
  selectedPokemon,
}: UseCalcStateOptions): UseCalcStateReturn {
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
  const [defenderBoosts, setDefenderBoosts] =
    useState<DefenderBoosts>(EMPTY_BOOSTS);
  const [defenderStatus, setDefenderStatus] = useState("Healthy");
  const [defenderHpPercent, setDefenderHpPercent] = useState(100);

  // --- Field ---
  const [gameType, setGameType] = useState<"Doubles" | "Singles">("Doubles");
  const [weather, setWeather] = useState("");
  const [terrain, setTerrain] = useState("");
  const [gravity, setGravity] = useState(false);
  const [attackerSide, setAttackerSideState] = useState<AttackerSideState>({
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
  });
  const [defenderSide, setDefenderSideState] = useState<DefenderSideState>({
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
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

  function setDefenderSide(patch: Partial<DefenderSideState>) {
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
    setDefenderBoosts(EMPTY_BOOSTS);
    setDefenderStatus("Healthy");
    setDefenderHpPercent(100);
  }

  // --- Derived values — computed during render so result stays in sync ---
  const moves: readonly (string | null)[] = [
    selectedPokemon?.move1 ?? null,
    selectedPokemon?.move2 ?? null,
    selectedPokemon?.move3 ?? null,
    selectedPokemon?.move4 ?? null,
  ];

  function getCalcOutputForMove(moveIdx: number): CalcOutput | null {
    if (!selectedPokemon) return null;
    const moveName = moves[moveIdx];
    if (!moveName) return null;

    const isCrit = critMoves[moveIdx] ?? false;
    const field = buildField(
      gameType,
      weather,
      terrain,
      gravity,
      attackerSide,
      defenderSide,
      direction
    );

    if (direction === "offense") {
      const attacker = buildAttackerFromDb(
        selectedPokemon,
        attackerBoosts,
        attackerStatus
      );
      const defender = buildDefenderPokemon(
        defenderSpecies,
        defenderAbility,
        defenderItem,
        defenderNature,
        defenderTera,
        defenderEvs,
        defenderBoosts,
        defenderStatus,
        defenderHpPercent
      );
      if (!attacker || !defender) return null;
      return runCalc(attacker, defender, moveName, isCrit, field);
    }

    // "defense": defender attacks us with the move
    const defenderAsAttacker = buildDefenderPokemon(
      defenderSpecies,
      defenderAbility,
      defenderItem,
      defenderNature,
      defenderTera,
      defenderEvs,
      defenderBoosts,
      defenderStatus,
      100
    );
    const ourPokemon = buildAttackerFromDb(
      selectedPokemon,
      EMPTY_BOOSTS,
      "Healthy"
    );
    if (!defenderAsAttacker || !ourPokemon) return null;
    return runCalc(defenderAsAttacker, ourPokemon, moveName, isCrit, field);
  }

  const moveCalcOutputs: readonly (CalcOutput | null)[] = moves.map((_, idx) =>
    getCalcOutputForMove(idx)
  );

  const selectedMoveName = moves[selectedMoveIdx] ?? null;
  const selectedMoveOutput = moveCalcOutputs[selectedMoveIdx] ?? null;

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
    defenderBoosts,
    defenderStatus,
    defenderHpPercent,
    setDefenderSpecies,
    setDefenderAbility,
    setDefenderItem,
    setDefenderNature,
    setDefenderTera,
    setDefenderEv,
    setDefenderBoost,
    setDefenderStatus,
    setDefenderHpPercent,
    resetDefenderForSpecies,
    gameType,
    weather,
    terrain,
    gravity,
    setGameType,
    setWeather,
    setTerrain,
    setGravity,
    attackerSide,
    defenderSide,
    setAttackerSide,
    setDefenderSide,
    moves,
    moveCalcOutputs,
    selectedMoveName,
    selectedMoveOutput,
  };
}
