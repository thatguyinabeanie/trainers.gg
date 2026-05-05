"use client";

import { useState } from "react";

import {
  applyStage,
  findStatBreakpoints,
  getBaseStats,
  getNatureMultiplier,
  isChampionsFormat,
  NATURE_EFFECTS,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import {
  type DefenderBoosts,
  type DefenderEvs,
  type DefenderIvs,
} from "../../use-calc-state";
import { type StatValues, STAT_COLOR_CLASS } from "../../stat-types";
import {
  buildInputDisplay,
  computeInvestBudget,
  computeStat,
  computeVizBarWidths,
  getStatBudget,
} from "../../calc-stat-helpers";
import { StatBumpsOverlay, StatVizBar } from "../stat-viz-bar";
import { StageDropdown } from "./stage-dropdown";
const spreadRowClass = "grid grid-cols-[40px_30px_minmax(30px,0.8fr)_40px_minmax(60px,1.6fr)_36px] gap-1.5 items-center px-1 py-0.5 rounded hover:bg-muted";
const spreadRowWithStageClass = "grid grid-cols-[40px_30px_minmax(30px,0.8fr)_40px_minmax(60px,1.6fr)_32px_36px] gap-1.5 items-center px-1 py-0.5 rounded hover:bg-muted";
const spreadLabelClass = "text-[9.5px] font-semibold uppercase tracking-[0.06em] font-mono text-left whitespace-nowrap flex items-center gap-px";
const spreadBaseClass = "font-mono text-[9.5px] text-muted-foreground text-right tabular-nums";
const spreadSliderWrapClass = "relative h-3.5";
const spreadSliderTrackClass = "absolute top-1/2 left-0 right-0 h-[3px] bg-muted-foreground/40 rounded-full -translate-y-1/2 pointer-events-none";
const spreadSliderClass = "spread-slider";
const spreadFinalClass = "font-mono text-[11.5px] font-bold text-right tabular-nums";

// =============================================================================
// Types
// =============================================================================

export interface CalcDefenderStatsProps {
  defenderSpecies: string;
  defenderNature: string;
  defenderEvs: DefenderEvs;
  defenderIvs: DefenderIvs;
  defenderBoosts: DefenderBoosts;
  defenderHpPercent: number;
  format: GameFormat | undefined;
  setDefenderEv: (stat: keyof DefenderEvs, v: number) => void;
  setDefenderBoost: (stat: keyof DefenderBoosts, v: number) => void;
  setDefenderHpPercent: (v: number) => void;
  setDefenderNature: (v: string) => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Maps smogon long stat key → DefenderEvs short key (for nature comparison). */
const LONG_TO_SHORT: Partial<Record<string, keyof DefenderEvs>> = {
  attack: "atk",
  defense: "def",
  specialAttack: "spa",
  specialDefense: "spd",
  speed: "spe",
};

/** Defender stat rows — all 6 in Showdown order. */
const DEFENDER_STAT_ROWS: {
  evKey: keyof DefenderEvs;
  ivKey: keyof DefenderIvs;
  boostKey: keyof DefenderBoosts | null;
  /** Full long key used in nature calculations. */
  statKey: string;
  label: string;
}[] = [
  { evKey: "hp", ivKey: "hp", boostKey: null, statKey: "hp", label: "HP" },
  { evKey: "atk", ivKey: "atk", boostKey: "atk", statKey: "attack", label: "Atk" },
  { evKey: "def", ivKey: "def", boostKey: "def", statKey: "defense", label: "Def" },
  { evKey: "spa", ivKey: "spa", boostKey: "spa", statKey: "specialAttack", label: "SpA" },
  { evKey: "spd", ivKey: "spd", boostKey: "spd", statKey: "specialDefense", label: "SpD" },
  { evKey: "spe", ivKey: "spe", boostKey: "spe", statKey: "speed", label: "Spe" },
];

// =============================================================================
// Helpers
// =============================================================================

/** Total EVs across all 6 stats. */
function totalDefenderEvs(evs: DefenderEvs): number {
  return evs.hp + evs.atk + evs.def + evs.spa + evs.spd + evs.spe;
}

// =============================================================================
// Nature cycling helpers
// =============================================================================

type NatureStat =
  | "attack"
  | "defense"
  | "specialAttack"
  | "specialDefense"
  | "speed";

const SHORT_TO_LONG: Record<string, NatureStat> = {
  atk: "attack",
  def: "defense",
  spa: "specialAttack",
  spd: "specialDefense",
  spe: "speed",
};

/** Default − stat when user clicks to boost. */
const DEFAULT_REDUCE_FOR_BOOST: Record<NatureStat, NatureStat> = {
  attack: "specialAttack",
  defense: "specialAttack",
  specialAttack: "attack",
  specialDefense: "attack",
  speed: "specialAttack",
};

/** Default + stat when user clicks to reduce. */
const DEFAULT_BOOST_FOR_REDUCE: Record<NatureStat, NatureStat> = {
  attack: "specialAttack",
  defense: "specialAttack",
  specialAttack: "attack",
  specialDefense: "attack",
  speed: "attack",
};

const ALL_NATURE_STATS: NatureStat[] = [
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];

const NEUTRAL_NATURE = "Serious";

function findNatureFor(boost: NatureStat, reduce: NatureStat): string | null {
  for (const [name, eff] of Object.entries(NATURE_EFFECTS)) {
    if (eff.boost === boost && eff.reduce === reduce) return name;
  }
  return null;
}

function pickFreshPartner(
  mover: NatureStat,
  avoid: NatureStat | null,
  defaults: Record<NatureStat, NatureStat>
): NatureStat {
  const def = defaults[mover];
  if (def !== avoid) return def;
  return ALL_NATURE_STATS.find((s) => s !== mover && s !== avoid) ?? def;
}

/**
 * Cycle a stat's nature influence on click:
 * neutral → boosted → reduced → neutral
 *
 * HP cannot have nature effects — returns null (no change).
 */
function cycleNature(
  currentNature: string,
  statKey: string
): string | null {
  if (statKey === "hp") return null;
  const longStat = SHORT_TO_LONG[statKey] ?? (statKey as NatureStat);
  if (!ALL_NATURE_STATS.includes(longStat)) return null;

  const current = NATURE_EFFECTS[currentNature] ?? {};
  const currentBoost = current.boost ?? null;
  const currentReduce = current.reduce ?? null;

  // Currently boosted → switch to reduced
  if (currentBoost === longStat) {
    const boost = pickFreshPartner(longStat, null, DEFAULT_BOOST_FOR_REDUCE);
    return findNatureFor(boost, longStat);
  }

  // Currently reduced → switch to neutral
  if (currentReduce === longStat) {
    return NEUTRAL_NATURE;
  }

  // Currently neutral → switch to boosted
  let reduce: NatureStat;
  if (currentReduce && currentReduce !== longStat) {
    reduce = currentReduce;
  } else {
    reduce = pickFreshPartner(longStat, currentBoost, DEFAULT_REDUCE_FOR_BOOST);
  }
  return findNatureFor(longStat, reduce);
}

// =============================================================================
// DefenderStatRow — one horizontal stat row
// =============================================================================

interface DefenderStatRowProps {
  evKey: keyof DefenderEvs;
  boostKey: keyof DefenderBoosts | null;
  statKey: string;
  label: string;
  /** Pre-computed final stat (base + EV + IV + nature, no boosts). */
  rawFinal: number;
  /** Pre-computed final stat with EV=0 (for the solid base layer of viz bar). */
  rawFinalNoEv: number;
  ev: number;
  iv: number;
  base: number;
  nature: string;
  level: number;
  isChampions: boolean;
  isNatureBoosted: boolean;
  isNatureReduced: boolean;
  totalEv: number;
  boost: number;
  setDefenderEv: (stat: keyof DefenderEvs, v: number) => void;
  setDefenderBoost: (stat: keyof DefenderBoosts, v: number) => void;
  onNatureClick: () => void;
}

function DefenderStatRow({
  evKey,
  boostKey,
  statKey,
  label,
  rawFinal,
  rawFinalNoEv,
  ev,
  iv,
  base,
  nature,
  level,
  isChampions,
  isNatureBoosted,
  isNatureReduced,
  totalEv,
  boost,
  setDefenderEv,
  setDefenderBoost,
  onNatureClick,
}: DefenderStatRowProps) {
  const colorClass = STAT_COLOR_CLASS[statKey as keyof typeof STAT_COLOR_CLASS] ?? "";

  // --- Stage-adjusted final stat ---
  const finalStat = boostKey ? applyStage(rawFinal, boost) : rawFinal;

  // --- Viz bar ---
  const { baseLayerWidth, investLayerLeft, investLayerWidth } =
    computeVizBarWidths(rawFinal, rawFinalNoEv);

  const budget = getStatBudget(isChampions);

  // --- EV slider budget ---
  const investBudget = computeInvestBudget(totalEv, ev, budget.total, budget.perStat);

  // --- Breakpoint ticks (only for +nature stat) ---
  const breakpoints = isNatureBoosted
    ? findStatBreakpoints({
        statKey: statKey as Parameters<typeof findStatBreakpoints>[0]["statKey"],
        base,
        iv,
        level,
        natureMultiplier: isChampions
          ? 1.1
          : getNatureMultiplier(
              nature,
              statKey as keyof Omit<StatValues, "hp">
            ),
        perStatMax: budget.perStat,
        step: budget.step,
        isChampions,
      })
    : [];

  const nextBpEv = breakpoints.find((bp) => bp > ev);

  // --- Input buffer for text EV entry ---
  const [inputBuffer, setInputBuffer] = useState<string | null>(null);

  const inputDisplay = buildInputDisplay(ev, isNatureBoosted, isNatureReduced);
  const displayValue = inputBuffer ?? inputDisplay;

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Number(e.target.value);
    const clamped = Math.min(raw, investBudget);
    const snapped = Math.round(clamped / budget.step) * budget.step;
    setDefenderEv(evKey, snapped);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputBuffer(e.target.value);
  }

  function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
    setInputBuffer(e.target.value);
  }

  function commitInput(raw: string) {
    const trimmed = raw.trim();
    const numStr = trimmed.replace(/[+\-−]$/, "");
    const parsed = numStr === "" ? 0 : parseInt(numStr, 10);
    const val = Number.isNaN(parsed) ? 0 : parsed;
    const clamped = Math.min(val, investBudget, budget.perStat);
    const snapped = Math.round(Math.max(0, clamped) / budget.step) * budget.step;
    setDefenderEv(evKey, snapped);
    setInputBuffer(null);
  }

  function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
    commitInput(e.target.value);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setInputBuffer(null);
      e.currentTarget.blur();
    }
  }

  return (
    <div
      className={cn(
        // Match poke-row's .spreadRow / .spreadRowWithStage for visual parity
        boostKey ? spreadRowWithStageClass : spreadRowClass,
        colorClass
      )}
    >
      {/* Col 1: Stat label — clickable to cycle nature */}
      <button
        type="button"
        onClick={onNatureClick}
        disabled={statKey === "hp"}
        className={cn(spreadLabelClass, statKey !== "hp" && "cursor-pointer hover:opacity-70")}
      >
        {label}
        <span className="inline-block w-[9px] text-[7px] leading-none">
          {isNatureBoosted && "▲"}
          {isNatureReduced && "▼"}
        </span>
      </button>

      {/* Col 2: Base stat */}
      <span className={spreadBaseClass}>{base}</span>

      {/* Col 3: Viz bar */}
      <StatVizBar
        baseLayerWidth={baseLayerWidth}
        investLayerLeft={investLayerLeft}
        investLayerWidth={investLayerWidth}
      />

      {/* Col 4: EV text input */}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        aria-label={`${label} ${isChampions ? "Stat Points" : "EVs"}`}
        className={cn(
          "focus:ring-primary h-[18px] w-full rounded border bg-transparent text-center font-mono text-[10.5px] outline-none focus:ring-1",
          isNatureBoosted && "border-red-400/70 text-red-600 dark:text-red-400",
          isNatureReduced &&
            "border-sky-400/70 text-sky-600 dark:text-sky-400",
          !isNatureBoosted &&
            !isNatureReduced &&
            "border-border text-foreground"
        )}
      />

      {/* Col 5: EV slider with breakpoint ticks */}
      <div className={spreadSliderWrapClass}>
        <div className={spreadSliderTrackClass} aria-hidden />
        <input
          type="range"
          min={0}
          max={budget.perStat}
          step={budget.step}
          value={ev}
          onChange={handleSliderChange}
          aria-label={`${label} ${isChampions ? "Stat Point slider" : "EV slider"}`}
          className={spreadSliderClass}
        />
        {isNatureBoosted && breakpoints.length > 0 && (
          <StatBumpsOverlay
            breakpoints={breakpoints}
            nextBpEv={nextBpEv}
            perStatMax={budget.perStat}
            label={label}
          />
        )}
      </div>

      {/* Col 6 (non-HP only): Stage dropdown */}
      {boostKey && (
        <StageDropdown
          value={boost}
          onChange={(v) => setDefenderBoost(boostKey, v)}
          statKey={label.toLowerCase()}
        />
      )}

      {/* Col 6 (HP) / Col 7 (non-HP): Final stat with stage applied */}
      <span className={spreadFinalClass}>{finalStat}</span>
    </div>
  );
}

// =============================================================================
// CalcDefenderStats
// =============================================================================

/**
 * Defender stats sub-column for the calc bottom panel.
 *
 * Renders only the spread section:
 * - Full 6-stat lane (slider-primary, EV input, breakpoint pips, stage dropdown)
 * - HP% slider with absolute HP readout
 *
 * The mon head (sprite + species + types) and loadout chips (item / abil / nat / tera)
 * are rendered by DefenderMonHeader.
 */
export function CalcDefenderStats({
  defenderSpecies,
  defenderNature,
  defenderEvs,
  defenderIvs,
  defenderBoosts,
  defenderHpPercent,
  format,
  setDefenderEv,
  setDefenderBoost,
  setDefenderHpPercent,
  setDefenderNature,
}: CalcDefenderStatsProps) {
  const isChampions = isChampionsFormat(format);

  const rawBase = defenderSpecies ? getBaseStats(defenderSpecies) : null;
  const base = rawBase ?? {
    hp: 50,
    attack: 50,
    defense: 50,
    specialAttack: 50,
    specialDefense: 50,
    speed: 50,
  };

  // Base stats keyed by DefenderEvs keys (smogon abbrev)
  const baseByEvKey: Record<keyof DefenderEvs, number> = {
    hp: base.hp,
    atk: base.attack,
    def: base.defense,
    spa: base.specialAttack,
    spd: base.specialDefense,
    spe: base.speed,
  };

  const level = 50;
  const nature = defenderNature || "Hardy";
  const natureEffect = NATURE_EFFECTS[nature];
  const natUpLong = natureEffect?.boost ?? null;
  const natDownLong = natureEffect?.reduce ?? null;

  const natUpShort = natUpLong ? (LONG_TO_SHORT[natUpLong] ?? null) : null;
  const natDownShort = natDownLong ? (LONG_TO_SHORT[natDownLong] ?? null) : null;

  const totalEv = totalDefenderEvs(defenderEvs);

  // Compute max HP for current defender (for absolute HP readout)
  const maxHP = computeStat({
    statKey: "hp",
    base: base.hp,
    iv: defenderIvs.hp,
    ev: defenderEvs.hp,
    nature,
    level,
    isChampions,
  });
  const currentHP = Math.max(1, Math.round((defenderHpPercent / 100) * maxHP));

  const budget = getStatBudget(isChampions);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* ── Stats lane header ─────────────────────────────────────── */}
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          {isChampions ? "Stat points" : "Spread"}
        </span>
        <span
          className={cn(
            "font-mono text-[10px]",
            totalEv > budget.total
              ? "text-destructive font-semibold"
              : "text-muted-foreground"
          )}
        >
          {totalEv}
          <span className="text-muted-foreground/60">/{budget.total}</span>
        </span>
      </div>

      {/* ── Stat rows ─────────────────────────────────────────────── */}
      <div className="flex flex-col">
        {DEFENDER_STAT_ROWS.map((row) => {
          const isNatureBoosted = natUpShort === row.evKey;
          const isNatureReduced = natDownShort === row.evKey;
          const boost = row.boostKey ? (defenderBoosts[row.boostKey] ?? 0) : 0;
          const iv = defenderIvs[row.ivKey];
          const ev = defenderEvs[row.evKey];
          const base = baseByEvKey[row.evKey];

          const rawFinal = computeStat({ statKey: row.statKey, base, iv, ev, nature, level, isChampions });
          const rawFinalNoEv = computeStat({ statKey: row.statKey, base, iv, ev: 0, nature, level, isChampions });

          return (
            <DefenderStatRow
              key={row.evKey}
              evKey={row.evKey}
              boostKey={row.boostKey}
              statKey={row.statKey}
              label={row.label}
              rawFinal={rawFinal}
              rawFinalNoEv={rawFinalNoEv}
              ev={ev}
              iv={iv}
              base={base}
              nature={nature}
              level={level}
              isChampions={isChampions}
              isNatureBoosted={isNatureBoosted}
              isNatureReduced={isNatureReduced}
              totalEv={totalEv}
              boost={boost}
              setDefenderEv={setDefenderEv}
              setDefenderBoost={setDefenderBoost}
              onNatureClick={() => {
                const newNature = cycleNature(nature, row.evKey);
                if (newNature) setDefenderNature(newNature);
              }}
            />
          );
        })}
      </div>

      {/* ── HP% slider ────────────────────────────────────────────── */}
      <div className="mt-2 flex items-center gap-2 px-2 pb-1">
        <span className="w-5 font-mono text-[9.5px] font-semibold text-rose-500 dark:text-rose-400">
          HP
        </span>
        <input
          type="range"
          min={1}
          max={100}
          step={1}
          value={defenderHpPercent}
          onChange={(e) => setDefenderHpPercent(Number(e.target.value))}
          aria-label="Defender HP percent"
          className="flex-1 accent-rose-500"
          style={{ height: 6 }}
        />
        <span className="w-[72px] text-right font-mono text-[10px] text-muted-foreground">
          {currentHP}/{maxHP}
        </span>
        <span className="w-8 text-right font-mono text-[10px] font-semibold text-muted-foreground">
          {defenderHpPercent}%
        </span>
      </div>

    </div>
  );
}
