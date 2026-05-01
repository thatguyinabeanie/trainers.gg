"use client";

import { useState } from "react";

import {
  calculateHP,
  calculateStat,
  calculateChampionsHP,
  calculateChampionsStat,
  findStatBreakpoints,
  getBaseStats,
  getLegalAbilities,
  getNatureMultiplier,
  getSpeciesTypes,
  getValidAbilities,
  getValidNatures,
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
import { type StatValues } from "../../stat-types";
import { formatSupportsTera } from "../format-gating";
import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AbilityPicker } from "../pickers/ability-picker";
import { ItemPicker } from "../pickers/item-picker";
import { NaturePicker } from "../pickers/nature-picker";
import { SpeciesPicker } from "../pickers/species-picker";
import { TypePicker } from "../pickers/type-picker";
import { StageDropdown } from "./stage-dropdown";
import s from "../builder.module.css";

// =============================================================================
// Types
// =============================================================================

export interface CalcDefenderStatsProps {
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  defenderTera: string;
  defenderEvs: DefenderEvs;
  defenderIvs: DefenderIvs;
  defenderBoosts: DefenderBoosts;
  defenderHpPercent: number;
  format: GameFormat | undefined;
  setDefenderSpecies: (v: string) => void;
  setDefenderAbility: (v: string) => void;
  setDefenderItem: (v: string) => void;
  setDefenderNature: (v: string) => void;
  setDefenderTera: (v: string) => void;
  setDefenderEv: (stat: keyof DefenderEvs, v: number) => void;
  setDefenderIv: (stat: keyof DefenderIvs, v: number) => void;
  setDefenderBoost: (stat: keyof DefenderBoosts, v: number) => void;
  setDefenderHpPercent: (v: number) => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Defender stat rows — all 6 in Showdown order. */
const DEFENDER_STAT_ROWS: {
  evKey: keyof DefenderEvs;
  ivKey: keyof DefenderIvs;
  boostKey: keyof DefenderBoosts | null;
  /** Full long key used in nature calculations. */
  statKey: string;
  label: string;
  colorClass: string;
}[] = [
  {
    evKey: "hp",
    ivKey: "hp",
    boostKey: null,
    statKey: "hp",
    label: "HP",
    colorClass: "text-rose-500 dark:text-rose-400",
  },
  {
    evKey: "atk",
    ivKey: "atk",
    boostKey: "atk",
    statKey: "attack",
    label: "Atk",
    colorClass: "text-orange-500 dark:text-orange-400",
  },
  {
    evKey: "def",
    ivKey: "def",
    boostKey: "def",
    statKey: "defense",
    label: "Def",
    colorClass: "text-amber-500 dark:text-amber-400",
  },
  {
    evKey: "spa",
    ivKey: "spa",
    boostKey: "spa",
    statKey: "specialAttack",
    label: "SpA",
    colorClass: "text-sky-500 dark:text-sky-400",
  },
  {
    evKey: "spd",
    ivKey: "spd",
    boostKey: "spd",
    statKey: "specialDefense",
    label: "SpD",
    colorClass: "text-emerald-500 dark:text-emerald-400",
  },
  {
    evKey: "spe",
    ivKey: "spe",
    boostKey: "spe",
    statKey: "speed",
    label: "Spe",
    colorClass: "text-fuchsia-500 dark:text-fuchsia-400",
  },
];

/** EV caps. */
const EV_PER_STAT_MAX = 252;
const EV_TOTAL_MAX = 510;
const EV_STEP = 4;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Apply stat stage multiplier to a final base stat value.
 * Positive stages: ×(2+n)/2   |   Negative stages: ×2/(2+|n|)
 */
function applyStage(base: number, stage: number): number {
  if (stage === 0) return base;
  if (stage > 0) return Math.floor((base * (2 + stage)) / 2);
  return Math.floor((base * 2) / (2 + Math.abs(stage)));
}

function computeDefenderStat(opts: {
  statKey: string;
  base: number;
  iv: number;
  ev: number;
  nature: string;
  level: number;
  isChampions: boolean;
}): number {
  const { statKey, base, iv, ev, nature, level, isChampions } = opts;

  if (isChampions) {
    if (statKey === "hp") return calculateChampionsHP(base, ev);
    const mult = getNatureMultiplier(
      nature,
      statKey as keyof Omit<StatValues, "hp">
    );
    return calculateChampionsStat(base, ev, mult);
  }

  if (statKey === "hp") return calculateHP(base, iv, ev, level);
  const mult = getNatureMultiplier(
    nature,
    statKey as keyof Omit<StatValues, "hp">
  );
  return calculateStat(base, iv, ev, level, mult);
}

/** Total EVs across all 6 stats. */
function totalDefenderEvs(evs: DefenderEvs): number {
  return evs.hp + evs.atk + evs.def + evs.spa + evs.spd + evs.spe;
}

// =============================================================================
// DefenderStatRow — one horizontal stat row
// =============================================================================

interface DefenderStatRowProps {
  evKey: keyof DefenderEvs;
  ivKey: keyof DefenderIvs;
  boostKey: keyof DefenderBoosts | null;
  statKey: string;
  label: string;
  colorClass: string;
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
  ivKey: _ivKey,
  boostKey,
  statKey,
  label,
  colorClass,
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
  // --- Final stat without boosts (base + EV + IV + nature) ---
  const rawFinal = computeDefenderStat({
    statKey,
    base,
    iv,
    ev,
    nature,
    level,
    isChampions,
  });

  // --- Final stat without EVs (for the solid base layer of viz bar) ---
  const rawFinalNoEv = computeDefenderStat({
    statKey,
    base,
    iv,
    ev: 0,
    nature,
    level,
    isChampions,
  });

  // --- Stage-adjusted final stat ---
  const finalStat = boostKey ? applyStage(rawFinal, boost) : rawFinal;

  // --- Viz bar ---
  const baseLayerWidth = Math.min(100, (rawFinalNoEv / 250) * 100);
  const investLayerLeft = baseLayerWidth;
  const investLayerWidth = Math.max(
    0,
    Math.min(100, (rawFinal / 250) * 100) - baseLayerWidth
  );

  // --- EV slider budget ---
  const otherEvs = totalEv - ev;
  const remainingForThis = Math.max(0, EV_TOTAL_MAX - otherEvs);
  const investBudget = Math.min(EV_PER_STAT_MAX, remainingForThis);

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
        perStatMax: EV_PER_STAT_MAX,
        step: EV_STEP,
        isChampions,
      })
    : [];

  const nextBpEv = breakpoints.find((bp) => bp > ev);

  // --- Input buffer for text EV entry ---
  const [inputBuffer, setInputBuffer] = useState<string | null>(null);

  const inputDisplay =
    ev === 0 && !isNatureBoosted && !isNatureReduced
      ? ""
      : `${ev}${isNatureBoosted ? "+" : isNatureReduced ? "−" : ""}`;
  const displayValue = inputBuffer ?? inputDisplay;

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Number(e.target.value);
    const clamped = Math.min(raw, investBudget);
    const snapped = Math.round(clamped / EV_STEP) * EV_STEP;
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
    const clamped = Math.min(val, investBudget, EV_PER_STAT_MAX);
    const snapped = Math.round(Math.max(0, clamped) / EV_STEP) * EV_STEP;
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
        // Defender stat row grid: label | base | viz bar | input | slider | [stage] | final
        // For HP: no stage dropdown — 6 cols; for others: 7 cols
        "grid items-center gap-[6px] rounded px-1 py-[2px] hover:bg-muted/50",
        boostKey
          ? "grid-cols-[28px_22px_minmax(36px,1fr)_34px_minmax(70px,2fr)_32px_26px]"
          : "grid-cols-[28px_22px_minmax(36px,1fr)_34px_minmax(70px,2fr)_26px]",
        colorClass
      )}
    >
      {/* Col 1: Stat label */}
      <span className="flex items-center gap-[1px] font-mono text-[9.5px] font-semibold uppercase tracking-[0.06em]">
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
      <span className="text-right font-mono text-[9.5px] text-muted-foreground">
        {base}
      </span>

      {/* Col 3: Viz bar */}
      <div className={s.spreadVbar}>
        <span
          className={cn(s.spreadVbarBase, "bg-current")}
          style={{ width: `${baseLayerWidth}%` }}
        />
        {investLayerWidth > 0 && (
          <span
            className={cn(s.spreadVbarInvest, "bg-current")}
            style={{
              left: `${investLayerLeft}%`,
              width: `${investLayerWidth}%`,
            }}
          />
        )}
      </div>

      {/* Col 4: EV text input */}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        aria-label={`${label} EVs`}
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
          max={EV_PER_STAT_MAX}
          step={EV_STEP}
          value={ev}
          onChange={handleSliderChange}
          aria-label={`${label} EV slider`}
          className={s.spreadSlider}
        />
        {isNatureBoosted && breakpoints.length > 0 && (
          <div className={s.spreadBumps}>
            {breakpoints.map((bpEv) => (
              <span
                key={bpEv}
                className={cn(
                  s.spreadBumpTick,
                  bpEv === nextBpEv && s.spreadBumpTickNext
                )}
                style={{ left: `${(bpEv / EV_PER_STAT_MAX) * 100}%` }}
              />
            ))}
          </div>
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
      <span className="text-right font-mono text-[11.5px] font-bold">
        {finalStat}
      </span>
    </div>
  );
}

// =============================================================================
// LoadoutChip — popover trigger for item/abil/nat/tera
// =============================================================================

interface LoadoutChipProps {
  label: string;
  value: string;
  children: React.ReactNode;
}

function LoadoutChip({ label, value, children }: LoadoutChipProps) {
  return (
    <Popover>
      <PopoverTrigger className={cn(s.chipLabeled, "w-full")}>
        <span className={s.chipPrefix}>{label}</span>
        <span className={cn(s.chipValue, "min-w-0 flex-1 truncate")}>
          {value || "—"}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-auto p-0"
        style={{ maxHeight: "60vh", overflow: "hidden" }}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// CalcDefenderStats
// =============================================================================

/**
 * Defender stats sub-column for the calc bottom panel.
 *
 * Includes:
 * - Mon head (sprite + species name + types) — species is a popover picker
 * - Loadout chips (item / abil / nat / tera) — each opens the matching picker
 * - Full 6-stat lane (slider-primary, EV input, breakpoint pips, stage dropdown)
 * - HP% slider with absolute HP readout
 */
export function CalcDefenderStats({
  defenderSpecies,
  defenderAbility,
  defenderItem,
  defenderNature,
  defenderTera,
  defenderEvs,
  defenderIvs,
  defenderBoosts,
  defenderHpPercent,
  format,
  setDefenderSpecies,
  setDefenderAbility,
  setDefenderItem,
  setDefenderNature,
  setDefenderTera,
  setDefenderEv,
  setDefenderIv: _setDefenderIv,
  setDefenderBoost,
  setDefenderHpPercent,
}: CalcDefenderStatsProps) {
  const isChampions = isChampionsFormat(format);
  const showTera = formatSupportsTera(format);

  const types = defenderSpecies ? getSpeciesTypes(defenderSpecies) : [];

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

  // Map long stat keys to short (for nature comparison)
  const LONG_TO_SHORT: Partial<Record<string, keyof DefenderEvs>> = {
    attack: "atk",
    defense: "def",
    specialAttack: "spa",
    specialDefense: "spd",
    speed: "spe",
  };

  const natUpShort = natUpLong ? (LONG_TO_SHORT[natUpLong] ?? null) : null;
  const natDownShort = natDownLong ? (LONG_TO_SHORT[natDownLong] ?? null) : null;

  const totalEv = totalDefenderEvs(defenderEvs);

  // Compute max HP for current defender (for absolute HP readout)
  const maxHP = computeDefenderStat({
    statKey: "hp",
    base: base.hp,
    iv: defenderIvs.hp,
    ev: defenderEvs.hp,
    nature,
    level,
    isChampions,
  });
  const currentHP = Math.max(1, Math.round((defenderHpPercent / 100) * maxHP));

  // Ability list for picker
  const legalAbilities = format
    ? Array.from(
        getLegalAbilities(defenderSpecies, format.id) ??
          getValidAbilities(defenderSpecies)
      )
    : getValidAbilities(defenderSpecies);
  const _allNatures = getValidNatures();

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* ── Mon head ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* 60px sprite */}
        <div className="size-[60px] flex-shrink-0 overflow-hidden rounded-md">
          <Sprite
            species={defenderSpecies || "Incineroar"}
            types={types}
            size={60}
          />
        </div>

        {/* Species name (popover → picker) + types */}
        <div className="min-w-0 flex-1">
          <Popover>
            <PopoverTrigger className="block min-w-0 max-w-full cursor-pointer truncate rounded px-1 py-0.5 text-left text-[13px] font-bold hover:bg-muted">
              {defenderSpecies || "—"}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              className="w-[640px] p-0"
              style={{ height: "480px", overflow: "hidden" }}
            >
              <SpeciesPicker
                value={defenderSpecies}
                format={format}
                onPick={(species) => setDefenderSpecies(species)}
                onClose={() => undefined}
              />
            </PopoverContent>
          </Popover>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {types.map((t) => (
              <TypePill key={t} t={t} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Loadout chips ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-0.5">
        {/* Item */}
        <Popover>
          <PopoverTrigger className={cn(s.chipLabeled, "w-full")}>
            <span className={s.chipPrefix}>item</span>
            <span className={cn(s.chipValue, "min-w-0 flex-1 truncate")}>
              {defenderItem || "—"}
            </span>
          </PopoverTrigger>
          <PopoverContent align="start" side="bottom" className="w-auto p-0">
            <ItemPicker
              value={defenderItem}
              format={format}
              teamItems={[]}
              onPick={(item) => setDefenderItem(item)}
              onClose={() => undefined}
            />
          </PopoverContent>
        </Popover>

        {/* Ability */}
        <LoadoutChip label="abil" value={defenderAbility}>
          <AbilityPicker
            value={defenderAbility}
            species={defenderSpecies}
            format={format}
            onPick={(ability) => setDefenderAbility(ability)}
            onClose={() => undefined}
          />
        </LoadoutChip>

        {/* Nature */}
        <LoadoutChip label="nat" value={defenderNature}>
          <NaturePicker
            value={defenderNature}
            onPick={(nat) => setDefenderNature(nat)}
            onClose={() => undefined}
          />
        </LoadoutChip>

        {/* Tera — only shown for formats that support it */}
        {showTera && (
          <LoadoutChip
            label="tera"
            value={defenderTera ? `${defenderTera} tera` : "—"}
          >
            <TypePicker
              value={defenderTera}
              onPick={(type) => setDefenderTera(type)}
              onClose={() => undefined}
            />
          </LoadoutChip>
        )}
      </div>

      {/* ── Stats lane header ─────────────────────────────────────── */}
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
          Spread
        </span>
        <span
          className={cn(
            "font-mono text-[10px]",
            totalEv > EV_TOTAL_MAX
              ? "text-destructive font-semibold"
              : "text-muted-foreground"
          )}
        >
          {totalEv}
          <span className="text-muted-foreground/60">/{EV_TOTAL_MAX}</span>
        </span>
      </div>

      {/* ── Stat rows ─────────────────────────────────────────────── */}
      <div className="flex flex-col">
        {DEFENDER_STAT_ROWS.map((row) => {
          const isNatureBoosted = natUpShort === row.evKey;
          const isNatureReduced = natDownShort === row.evKey;
          const boost = row.boostKey ? (defenderBoosts[row.boostKey] ?? 0) : 0;

          return (
            <DefenderStatRow
              key={row.evKey}
              evKey={row.evKey}
              ivKey={row.ivKey}
              boostKey={row.boostKey}
              statKey={row.statKey}
              label={row.label}
              colorClass={row.colorClass}
              ev={defenderEvs[row.evKey]}
              iv={defenderIvs[row.ivKey]}
              base={baseByEvKey[row.evKey]}
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

      {/* Ability info line — shows legal abilities count as a hint */}
      {defenderSpecies && legalAbilities.length === 0 && (
        <p className="font-mono text-[9px] text-muted-foreground/60">
          No abilities found for format
        </p>
      )}
    </div>
  );
}
