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
import s from "../builder.module.css";

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
        boostKey ? s.spreadRowWithStage : s.spreadRow,
        colorClass
      )}
    >
      {/* Col 1: Stat label */}
      <span className={s.spreadLabel}>
        {label}
        {isNatureBoosted && (
          <span className="text-[9px] font-black tracking-tighter text-red-600 dark:text-red-400">
            ▲
          </span>
        )}
        {isNatureReduced && (
          <span className="text-[9px] font-black tracking-tighter text-sky-600 dark:text-sky-400">
            ▽
          </span>
        )}
      </span>

      {/* Col 2: Base stat */}
      <span className={s.spreadBase}>{base}</span>

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
      <div className={s.spreadSliderWrap}>
        <div className={s.spreadSliderTrack} aria-hidden />
        <input
          type="range"
          min={0}
          max={budget.perStat}
          step={budget.step}
          value={ev}
          onChange={handleSliderChange}
          aria-label={`${label} ${isChampions ? "Stat Point slider" : "EV slider"}`}
          className={s.spreadSlider}
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
      <span className={s.spreadFinal}>{finalStat}</span>
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
            />
          );
        })}
      </div>

      {/* ── HP% slider ────────────────────────────────────────────── */}
      <div className="mt-1 flex items-center gap-2">
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
          {currentHP}/{maxHP} HP
        </span>
        <span className="w-8 text-right font-mono text-[10px] font-semibold text-muted-foreground">
          {defenderHpPercent}%
        </span>
      </div>

    </div>
  );
}
