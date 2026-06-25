"use client";

import { useEffect, useState } from "react";

import {
  type GameFormat,
  isChampionsFormat,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import type * as CalcEngineModule from "./calc/calc-engine";
import { type KoTierLabel } from "./calc/recovery";

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
  leechSeed: boolean;
  crit: boolean;
  singleTarget: boolean;
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
  /**
   * Percentage chance (0–100) that the move OHKOs, computed from the
   * distribution of damage rolls vs the defender's current HP. null when
   * the move is immune or no rolls are available.
   *
   * Examples: 100 = guaranteed OHKO, 93.75 = 15/16 rolls KO, 0 = no roll KOs.
   */
  koChance: number | null;
}

// Attacker's max HP — used in the "X–Y / HP" detail line for reverse calcs.
export type AttackerMaxHP = number;

export type CalcDirection = "offense" | "defense";

// =============================================================================
// Constants
// =============================================================================

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
  if (ENGINE_WEATHER_SET.has(s))
    return { kind: "set", value: s as EngineWeather };
  return { kind: "auto" };
}

function parseTerrainString(s: string): TerrainInput {
  if (s === "" || s === "auto") return { kind: "auto" };
  if (s === "None") return { kind: "none" };
  if (ENGINE_TERRAIN_SET.has(s))
    return { kind: "set", value: s as EngineTerrain };
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
// Lazy engine type alias
// =============================================================================

/** The resolved module shape of calc-engine.ts — loaded on demand. The import
 * is type-only (erased at build) so it never pulls @smogon/calc into the bundle;
 * the runtime load is the dynamic import() in the effect below. */
type CalcEngine = typeof CalcEngineModule;

/** Module-level cache of the loaded engine. The first hook instance's dynamic
 * import populates it, so every later useCalcState mount resolves the engine
 * synchronously (the chunk loads once, not per instance). */
let cachedCalcEngine: CalcEngine | null = null;

/**
 * Test-only: synchronously prime the engine cache so unit/integration tests can
 * render the hook and assert calc output without awaiting the in-hook dynamic
 * import. Call once in a `beforeAll`. In production the engine loads via the
 * effect in `useCalcState`; this is never imported by app code.
 */
export async function __loadCalcEngineForTests(): Promise<void> {
  cachedCalcEngine = await import("./calc/calc-engine");
}

// `Verdict` + `getVerdict` live in ./calc/calc-verdict (engine-free) so always-on
// consumers (dockbar, calc-display-helpers) can use them without pulling
// @smogon/calc into the initial bundle. Re-exported here for back-compat.
export { type Verdict, getVerdict } from "./calc/calc-verdict";

// =============================================================================
// Hook interfaces
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
  magicRoom: boolean;
  setMagicRoom: (v: boolean) => void;
  wonderRoom: boolean;
  setWonderRoom: (v: boolean) => void;
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
  /**
   * Compute reverse outputs for any team row — the defender's effective moves
   * aimed at the given team member. Returns 4 outputs parallel to effectiveMoves.
   */
  computeReverseOutputsForRow: (
    rowPokemon: Tables<"pokemon"> | null,
    effectiveMoves: readonly [string, string, string, string]
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

const NULL_OUTPUTS: readonly (CalcOutput | null)[] = [null, null, null, null];

/**
 * Owns the entire damage-calc state machine for the team builder.
 *
 * Consumed by {@link CalcPanel} so calc math stays in one place. State **does
 * not** reset on `selectedPokemon` change — callers should drive that with a
 * `key` on the consuming component (per `react-patterns.md`).
 *
 * The `@smogon/calc` engine is loaded lazily via dynamic `import()` when
 * `calcEnabled` transitions to true. Until the engine chunk resolves all
 * compute functions return empty/null outputs so the provider is safe to
 * mount immediately (always-on, no dynamic provider wrapping needed).
 */
export function useCalcState({
  selectedPokemon,
  format,
  faintedYours = 0,
  faintedTheirs = 0,
}: UseCalcStateOptions): UseCalcStateReturn {
  // --- Lazy engine — the ONLY entry point to @smogon/calc ----------------
  // Nothing in the always-mounted path statically imports @smogon/calc; it is
  // pulled in here via a dynamic import() so it stays out of the editor's
  // initial bundle. Init from the module cache so a second-or-later mount has
  // the engine synchronously; the load fires on mount so the chunk is
  // pre-fetched before the user opens the calc panel.
  const [engine, setEngine] = useState<CalcEngine | null>(cachedCalcEngine);

  useEffect(() => {
    if (engine) return;
    let cancelled = false;
    import("./calc/calc-engine").then((m) => {
      cachedCalcEngine = m;
      if (!cancelled) setEngine(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
  const [attackerStatus, setAttackerStatus] = useState<StatusLabel>("Healthy");
  const [attackerBoosts, setAttackerBoosts] =
    useState<AttackerBoosts>(EMPTY_BOOSTS);

  // --- Defender ---
  const [defenderSpecies, setDefenderSpecies] = useState("Floette-Eternal");
  const [defenderAbility, setDefenderAbility] = useState("Flower Veil");
  const [defenderItem, setDefenderItem] = useState("Floettite");
  const [defenderNature, setDefenderNature] = useState("Modest");
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
  const [defenderStatus, setDefenderStatus] = useState<StatusLabel>("Healthy");
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
  const [magicRoom, setMagicRoom] = useState(false);
  const [wonderRoom, setWonderRoom] = useState(false);
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
    leechSeed: false,
    crit: false,
    singleTarget: false,
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
    leechSeed: false,
    crit: false,
    singleTarget: false,
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

  // --- Shared calc objects — built once per render when engine is loaded ---
  // `effective*` are the engine-ready values (typed `EngineWeather|null` etc).
  // We pass the empty string when the field is absent so the engine treats
  // it as "no weather/terrain active".
  const effectiveWeather = resolvedWeather.effective ?? "";
  const effectiveTerrain = resolvedTerrain.effective ?? "";

  // When the engine chunk has not yet arrived, all calc objects are null and
  // all compute functions return NULL_OUTPUTS. The provider is always mounted
  // so children render immediately; they just show no calc results until the
  // chunk resolves.
  const gen = engine ? engine.getGen(format) : null;

  const sharedOffenseField =
    engine && gen
      ? engine.buildField(
          gameType,
          effectiveWeather,
          effectiveTerrain,
          gravity,
          fairyAura,
          magicRoom,
          wonderRoom,
          attackerSide,
          defenderSide,
          direction
        )
      : null;

  const sharedAttacker =
    engine && gen && selectedPokemon
      ? engine.buildAttackerFromDb(
          gen,
          selectedPokemon,
          attackerBoosts,
          attackerStatus,
          attackerMegaActive
        )
      : null;

  const sharedDefender =
    engine && gen
      ? engine.buildDefenderPokemon(
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
        )
      : null;

  const sharedDefenderAsAttacker =
    engine && gen
      ? engine.buildDefenderPokemon(
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
        )
      : null;

  const sharedOurPokemonAsDefender =
    engine && gen && selectedPokemon
      ? engine.buildAttackerFromDb(
          gen,
          selectedPokemon,
          EMPTY_BOOSTS,
          "Healthy",
          attackerMegaActive
        )
      : null;

  const sharedDefenseField =
    engine && gen
      ? engine.buildField(
          gameType,
          effectiveWeather,
          effectiveTerrain,
          gravity,
          fairyAura,
          magicRoom,
          wonderRoom,
          attackerSide,
          defenderSide,
          "defense"
        )
      : null;

  function getCalcOutputForMove(moveIdx: number): CalcOutput | null {
    if (!engine || !gen) return null;
    if (!selectedPokemon) return null;
    const moveName = moves[moveIdx];
    if (!moveName) return null;

    const isCrit = critMoves[moveIdx] ?? false;

    if (direction === "offense") {
      if (!sharedAttacker || !sharedDefender || !sharedOffenseField) return null;
      // Forward direction: attacker is on YOUR team — use faintedYours for Last Respects BP.
      return engine.runCalc(
        gen,
        sharedAttacker,
        sharedDefender,
        moveName,
        isCrit || attackerSide.crit,
        sharedOffenseField,
        faintedYours,
        effectiveWeather,
        attackerSide.singleTarget,
        format?.id
      );
    }

    // Defense direction: defender fires at us — reuse the shared swap-side builders
    // and the defense-side field. faintedTheirs applies to the defender's Last Respects BP.
    if (!sharedDefenderAsAttacker || !sharedOurPokemonAsDefender || !sharedDefenseField) return null;
    return engine.runCalc(
      gen,
      sharedDefenderAsAttacker,
      sharedOurPokemonAsDefender,
      moveName,
      isCrit || defenderSide.crit,
      sharedDefenseField,
      faintedTheirs,
      effectiveWeather,
      defenderSide.singleTarget,
      format?.id
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
  function computeForwardOutputsForRow(
    rowPokemon: Tables<"pokemon"> | null
  ): readonly (CalcOutput | null)[] {
    if (!engine || !gen) return NULL_OUTPUTS;
    if (!rowPokemon) return NULL_OUTPUTS;
    if (!sharedDefender) return NULL_OUTPUTS;

    const isFocused = selectedPokemon?.id === rowPokemon.id;
    // Focused row reuses the already-built sharedAttacker (saves a Pokemon
    // construction). Non-focused rows build a fresh attacker with neutral
    // settings — boosts only apply to the chip-picked row.
    const attacker = isFocused
      ? sharedAttacker
      : engine.buildAttackerFromDb(gen, rowPokemon, EMPTY_BOOSTS, "Healthy", true);
    if (!attacker || !sharedOffenseField) return NULL_OUTPUTS;

    const rowMoves = [
      rowPokemon.move1,
      rowPokemon.move2,
      rowPokemon.move3,
      rowPokemon.move4,
    ] as const;
    return rowMoves.map((moveName, idx) => {
      if (!moveName) return null;
      const isCrit =
        (isFocused ? (critMoves[idx] ?? false) : false) || attackerSide.crit;
      return engine.runCalc(
        gen,
        attacker,
        sharedDefender,
        moveName,
        isCrit,
        sharedOffenseField,
        faintedYours,
        effectiveWeather,
        attackerSide.singleTarget,
        format?.id
      );
    });
  }

  const selectedMoveName = moves[selectedMoveIdx] ?? null;
  const selectedMoveOutput = moveCalcOutputs[selectedMoveIdx] ?? null;

  // --- Reverse-direction: defender's moves aimed at the active attacker ---
  // Accepts a concrete move name so callers can pass either a user-set override
  // or a default from useDefenderMoves without needing an extra round-trip.
  function computeReverseOutput(moveName: string): CalcOutput | null {
    if (!engine || !gen) return null;
    if (!selectedPokemon) return null;
    if (!moveName) return null;
    if (!sharedDefenderAsAttacker || !sharedOurPokemonAsDefender || !sharedDefenseField) return null;
    // Reverse direction: the defender is attacking — their fainted count applies for Last Respects.
    return engine.runCalc(
      gen,
      sharedDefenderAsAttacker,
      sharedOurPokemonAsDefender,
      moveName,
      defenderSide.crit,
      sharedDefenseField,
      faintedTheirs,
      effectiveWeather,
      defenderSide.singleTarget,
      format?.id
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

  /**
   * Compute reverse outputs for any team row — the defender's 4 moves aimed
   * at the given pokemon. Similar to computeForwardOutputsForRow but in the
   * reverse direction. Used by per-row damage cards.
   */
  function computeReverseOutputsForRow(
    rowPokemon: Tables<"pokemon"> | null,
    effectiveMoves: readonly [string, string, string, string]
  ): readonly (CalcOutput | null)[] {
    if (!engine || !gen) return NULL_OUTPUTS;
    if (!rowPokemon) return NULL_OUTPUTS;
    if (!sharedDefenderAsAttacker) return NULL_OUTPUTS;
    if (!effectiveMoves.some(Boolean)) return NULL_OUTPUTS;

    const isFocused = selectedPokemon?.id === rowPokemon.id;
    // Build this team member as a defender (neutral boosts, healthy)
    const ourDefender = engine.buildAttackerFromDb(
      gen,
      rowPokemon,
      EMPTY_BOOSTS,
      "Healthy",
      isFocused ? attackerMegaActive : true
    );
    if (!ourDefender || !sharedDefenseField) return NULL_OUTPUTS;

    return effectiveMoves.map((moveName) => {
      if (!moveName) return null;
      return engine.runCalc(
        gen,
        sharedDefenderAsAttacker,
        ourDefender,
        moveName,
        defenderSide.crit,
        sharedDefenseField,
        faintedTheirs,
        effectiveWeather,
        defenderSide.singleTarget,
        format?.id
      );
    });
  }

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
    magicRoom,
    setMagicRoom,
    wonderRoom,
    setWonderRoom,
    attackerSide,
    defenderSide,
    setAttackerSide,
    setDefenderSide,
    moves,
    moveCalcOutputs,
    computeForwardOutputsForRow,
    computeReverseOutputsForRow,
    moveCalcOutputsReverse,
    computeReverseOutput,
    selectedMoveName,
    selectedMoveOutput,
    inferredWeather,
    inferredTerrain,
  };
}
