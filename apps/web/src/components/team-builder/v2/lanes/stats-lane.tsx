"use client";

import { useEffect, useState } from "react";

import {
  findStatBreakpoints,
  getBaseStats,
  getNatureMultiplier,
  isChampionsFormat,
  NATURE_EFFECTS,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { type ValidationError } from "../../validation-hooks";
import {
  type StatKey,
  type StatValues,
  STAT_KEYS,
  STAT_LABELS,
  STAT_COLOR_CLASS,
} from "../../stat-types";
import {
  buildInputDisplay,
  computeInvestBudget,
  computeStat,
  computeVizBarWidths,
} from "../../calc-stat-helpers";
import { formatSupportsIvs } from "../format-gating";
import { FieldError } from "../validation/field-error";
import s from "../builder.module.css";

// =============================================================================
// Constants
// =============================================================================

const EV_FIELD: Record<StatKey, keyof Tables<"pokemon">> = {
  hp: "ev_hp",
  attack: "ev_attack",
  defense: "ev_defense",
  specialAttack: "ev_special_attack",
  specialDefense: "ev_special_defense",
  speed: "ev_speed",
};

const IV_FIELD: Record<StatKey, keyof Tables<"pokemon">> = {
  hp: "iv_hp",
  attack: "iv_attack",
  defense: "iv_defense",
  specialAttack: "iv_special_attack",
  specialDefense: "iv_special_defense",
  speed: "iv_speed",
};

/** Design-source total EV display cap — intentionally 508 to match the design bundle. */
const EV_DISPLAY_MAX = 508;
const EV_PER_STAT_MAX = 252;
const EV_STEP = 4;

/** Pokemon Champions Reg M-A: max 66 stat points across all stats, max 32 per stat, step of 1. */
const SP_TOTAL_MAX = 66;
const SP_PER_STAT_MAX = 32;
const SP_STEP = 1;

/** Per-format stat-investment caps. Champions uses SP, everything else uses EV. */
interface StatBudget {
  total: number;
  perStat: number;
  step: number;
  /** Short label used in pickers + total chip ("EV" or "SP"). */
  label: string;
}

function getStatBudget(isChampions: boolean): StatBudget {
  if (isChampions) {
    return {
      total: SP_TOTAL_MAX,
      perStat: SP_PER_STAT_MAX,
      step: SP_STEP,
      label: "SP",
    };
  }
  return {
    total: EV_DISPLAY_MAX,
    perStat: EV_PER_STAT_MAX,
    step: EV_STEP,
    label: "EV",
  };
}

const DRAFT_DEBOUNCE_MS = 400;
const UNINITIALIZED = Symbol();

// =============================================================================
// Types
// =============================================================================

interface StatsLaneProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Validation errors scoped to stat/EV fields. */
  fieldErrors?: ValidationError[];
}

// =============================================================================
// Helpers
// =============================================================================

function getEvs(pokemon: Tables<"pokemon">): StatValues {
  return {
    hp: pokemon.ev_hp ?? 0,
    attack: pokemon.ev_attack ?? 0,
    defense: pokemon.ev_defense ?? 0,
    specialAttack: pokemon.ev_special_attack ?? 0,
    specialDefense: pokemon.ev_special_defense ?? 0,
    speed: pokemon.ev_speed ?? 0,
  };
}

function getIvs(pokemon: Tables<"pokemon">): StatValues {
  return {
    hp: pokemon.iv_hp ?? 31,
    attack: pokemon.iv_attack ?? 31,
    defense: pokemon.iv_defense ?? 31,
    specialAttack: pokemon.iv_special_attack ?? 31,
    specialDefense: pokemon.iv_special_defense ?? 31,
    speed: pokemon.iv_speed ?? 31,
  };
}

function totalEvs(evs: StatValues): number {
  return (
    evs.hp +
    evs.attack +
    evs.defense +
    evs.specialAttack +
    evs.specialDefense +
    evs.speed
  );
}

/** Canonical neutral nature — the rest (Hardy/Docile/Bashful/Quirky) are duplicates. */
const NEUTRAL_NATURE = "Serious";

type NatureStat = "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";

/** When the user adds "+" to a stat with no current −nature, default to a sensible reduced stat. */
const DEFAULT_REDUCE_FOR_BOOST: Record<NatureStat, NatureStat> = {
  attack: "specialAttack", // → Adamant
  defense: "specialAttack", // → Impish
  specialAttack: "attack", // → Modest
  specialDefense: "attack", // → Calm
  speed: "specialAttack", // → Jolly
};

/** When the user adds "−" to a stat with no current +nature, default to a sensible boosted stat. */
const DEFAULT_BOOST_FOR_REDUCE: Record<NatureStat, NatureStat> = {
  attack: "specialAttack", // → Modest (−Atk)
  defense: "specialAttack", // → Mild (−Def)
  specialAttack: "attack", // → Adamant (−SpA)
  specialDefense: "attack", // → Naughty (−SpD)
  speed: "attack", // → Brave (−Spe)
};

/** Search NATURE_EFFECTS for a nature with the given (boost, reduce) pair. */
function findNatureFor(boost: NatureStat, reduce: NatureStat): string | null {
  for (const [name, eff] of Object.entries(NATURE_EFFECTS)) {
    if (eff.boost === boost && eff.reduce === reduce) return name;
  }
  return null;
}

/**
 * Parse the EV/SP input as `"12+"`, `"12−"`, `"12-"`, `"12"`, `"+"`, `"−"`, `""`.
 * Tolerates unicode minus and ASCII hyphen for negative-nature suffix.
 */
function parseEvInput(raw: string): {
  value: number;
  suffix: "+" | "-" | null;
} {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d*)\s*([+\-−])?$/);
  if (!match) return { value: 0, suffix: null };
  const numStr = match[1] ?? "";
  const value = numStr === "" ? 0 : parseInt(numStr, 10);
  const sym = match[2];
  const suffix = sym === "+" ? "+" : sym === "-" || sym === "−" ? "-" : null;
  return { value, suffix };
}

const ALL_NATURE_STATS: NatureStat[] = [
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];

/**
 * Pick a fresh nature partner stat (the −stat for a +boost, or the +stat for
 * a −reduce). Tries the default first; if the default conflicts with `avoid`
 * (the partner stat we explicitly want to leave alone — typically the
 * previous boost when we're moving the + somewhere new), falls back to the
 * first stat that isn't the new mover or `avoid`.
 */
function pickFreshPartner(
  mover: NatureStat,
  avoid: NatureStat | null,
  defaults: Record<NatureStat, NatureStat>
): NatureStat {
  const def = defaults[mover];
  if (def !== avoid) return def;
  return (
    ALL_NATURE_STATS.find((s) => s !== mover && s !== avoid) ?? def
  );
}

/**
 * Given the current nature, the row's stat, and the suffix the user typed,
 * compute what the new nature should be (or null if no change needed).
 *
 * Rules (matching user expectation):
 * • suffix === "+": this stat becomes +nature.
 *   - If already +stat: no change.
 *   - If the row's stat is the current −stat (so we'd be moving the + onto a
 *     stat that was the −): the previous boost stat keeps its neutral status
 *     (we DO NOT flip it to −); pick a fresh − partner that isn't the
 *     previous boost or the new boost.
 *   - Otherwise: keep the existing − partner if any, else pick a default.
 * • suffix === "-": symmetric.
 * • suffix === null: if the row's stat WAS +/−, switch to neutral (Serious).
 *
 * HP returns null — HP can't be a nature stat.
 */
function computeNatureForSuffix(opts: {
  currentNature: string;
  statKey: StatKey;
  suffix: "+" | "-" | null;
}): string | null {
  const { currentNature, statKey, suffix } = opts;
  if (statKey === "hp") return null;
  const stat = statKey;

  const current = NATURE_EFFECTS[currentNature] ?? {};
  const currentBoost = current.boost ?? null;
  const currentReduce = current.reduce ?? null;

  if (suffix === "+") {
    if (currentBoost === stat) return null;

    let reduce: NatureStat;
    if (currentReduce && currentReduce !== stat) {
      // Keep the existing − partner (no conflict).
      reduce = currentReduce;
    } else {
      // Need fresh − partner. Avoid the previous boost so it isn't flipped.
      reduce = pickFreshPartner(stat, currentBoost, DEFAULT_REDUCE_FOR_BOOST);
    }
    return findNatureFor(stat, reduce);
  }

  if (suffix === "-") {
    if (currentReduce === stat) return null;

    let boost: NatureStat;
    if (currentBoost && currentBoost !== stat) {
      boost = currentBoost;
    } else {
      boost = pickFreshPartner(stat, currentReduce, DEFAULT_BOOST_FOR_REDUCE);
    }
    return findNatureFor(boost, stat);
  }

  // suffix === null — user removed the modifier on this stat
  if (currentBoost === stat || currentReduce === stat) {
    return NEUTRAL_NATURE;
  }
  return null;
}

// =============================================================================
// StatRow — one horizontal stat row (6-column grid)
// =============================================================================

interface StatRowProps {
  statKey: StatKey;
  /** Final stat with current investment (base + IV + EV + nature + level). */
  finalStat: number;
  /** Final stat with EV=0 (for the solid base layer of the viz bar). */
  noEvFinalStat: number;
  ev: number;
  base: number;
  ivs: StatValues;
  nature: string;
  level: number;
  isChampions: boolean;
  isNatureBoosted: boolean;
  isNatureReduced: boolean;
  evFieldKey: keyof Tables<"pokemon">;
  totalEv: number;
  budget: StatBudget;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
}

function StatRow({
  statKey,
  finalStat,
  noEvFinalStat,
  ev,
  base,
  ivs,
  nature,
  level,
  isChampions,
  isNatureBoosted,
  isNatureReduced,
  evFieldKey,
  totalEv,
  budget,
  onUpdate,
}: StatRowProps) {
  const label = STAT_LABELS[statKey];
  const statColorClass = STAT_COLOR_CLASS[statKey];

  // --- Viz bar layer widths (0→250 final stat space) ---
  const { baseLayerWidth, investLayerLeft, investLayerWidth } =
    computeVizBarWidths(finalStat, noEvFinalStat);

  // --- Slider budget ---
  const investBudget = computeInvestBudget(totalEv, ev, budget.total, budget.perStat);

  // --- EV draft + debounced commit ---
  // Slider/keyboard updates the local draft synchronously for snappy UI;
  // a 400ms debounced effect commits the latest value via onUpdate.
  // The Symbol-sentinel prevEv reset clears the draft when the prop catches
  // up (parent's optimistic patch landed), avoiding a flicker.
  const [draftEv, setDraftEv] = useState<number | null>(null);
  const [prevEv, setPrevEv] = useState<number | typeof UNINITIALIZED>(
    UNINITIALIZED
  );
  if (ev !== prevEv) {
    setPrevEv(ev);
    setDraftEv(null);
  }
  const displayEv = draftEv ?? ev;

  // --- Breakpoint ticks (only for +nature stat) ---
  const breakpoints = isNatureBoosted
    ? findStatBreakpoints({
        statKey,
        base,
        iv: ivs[statKey],
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

  // The first breakpoint strictly above the current EV is the "next" target
  const nextBpEv = breakpoints.find((bp) => bp > displayEv);

  // --- Label color: always the stat-key color; nature is shown only via the
  //                  ▲/▽ chevron next to the label, not by recoloring it. ---
  const labelTextClass = statColorClass;

  // --- Input display value ---
  const inputDisplay = buildInputDisplay(displayEv, isNatureBoosted, isNatureReduced);

  // --- Edit buffer: while focused, show what the user is typing instead of
  //                  the derived display, so the controlled value doesn't
  //                  fight typing (especially for the "+"/"−" suffix). ---
  const [inputBuffer, setInputBuffer] = useState<string | null>(null);
  const displayValue = inputBuffer ?? inputDisplay;

  useEffect(() => {
    if (draftEv === null) return;
    const timer = setTimeout(() => {
      onUpdate({ [evFieldKey]: draftEv });
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draftEv, evFieldKey, onUpdate]);

  function flushEvDraft() {
    if (draftEv === null) return;
    onUpdate({ [evFieldKey]: draftEv });
  }

  // --- Handle slider change ---
  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = Number(e.target.value);
    const clamped = Math.min(raw, investBudget);
    const snapped = Math.round(clamped / budget.step) * budget.step;
    setDraftEv(snapped);
  }

  // --- Handle text input change (just buffer the typed string) ---
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputBuffer(e.target.value);
  }

  // --- Handle text input focus (start editing) ---
  function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
    setInputBuffer(e.target.value);
  }

  // --- Commit the buffer: clamp/snap EV, optionally swap nature based on suffix ---
  function commitInput(raw: string) {
    const { value: parsedValue, suffix } = parseEvInput(raw);
    const val = Math.max(0, Math.min(budget.perStat, parsedValue));
    const clamped = Math.min(val, investBudget);
    const snapped = Math.round(clamped / budget.step) * budget.step;

    const newNature = computeNatureForSuffix({
      currentNature: nature,
      statKey,
      suffix,
    });

    const update: Partial<TablesUpdate<"pokemon">> = { [evFieldKey]: snapped };
    if (newNature !== null) update.nature = newNature;
    onUpdate(update);
    setInputBuffer(null);
  }

  // --- Handle text input blur ---
  function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
    commitInput(e.target.value);
  }

  // --- Enter commits early; Esc reverts ---
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setInputBuffer(null);
      e.currentTarget.blur();
    }
  }

  return (
    <div className={cn(s.spreadRow, statColorClass)}>
      {/* Col 1: Stat label, color-coded, with nature chevron */}
      <span className={cn(s.spreadLabel, labelTextClass)}>
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

      {/* Col 2: Base stat number, muted mono */}
      <span className={s.spreadBase}>{base}</span>

      {/* Col 3: Read-only viz bar (solid base + striped invest).
       * `bg-current` so both layers inherit the stat-key color from the row. */}
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

      {/* Col 4: Text input. Shows "{ev}{+/−}" reflecting the +/−nature on this
       * stat. Typing "12+" or "12−" sets EV and swaps the nature accordingly. */}
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        aria-label={`${label} investment`}
        className={cn(
          "focus:ring-primary h-[18px] w-9 rounded border bg-transparent text-center font-mono text-[10.5px] outline-none focus:ring-1",
          isNatureBoosted && "border-red-400/70 text-red-600 dark:text-red-400",
          isNatureReduced && "border-sky-400/70 text-sky-600 dark:text-sky-400",
          !isNatureBoosted &&
            !isNatureReduced &&
            "border-border text-foreground"
        )}
      />

      {/* Col 5: Slider with optional breakpoint ticks.
       * Stat-key color is on the row, so the thumb (background: currentColor)
       * and the bump rings (border: currentColor) inherit it from the row. */}
      <div className={s.spreadSliderWrap}>
        <div className={s.spreadSliderTrack} aria-hidden />
        <input
          type="range"
          min={0}
          max={budget.perStat}
          step={budget.step}
          value={displayEv}
          onChange={handleSliderChange}
          onPointerUp={flushEvDraft}
          onKeyUp={flushEvDraft}
          aria-label={`${label} slider`}
          aria-valuemin={0}
          aria-valuemax={budget.perStat}
          aria-valuenow={displayEv}
          className={s.spreadSlider}
        />

        {/* Breakpoint ticks overlay — only on +nature stat */}
        {isNatureBoosted && breakpoints.length > 0 && (
          <div className={s.spreadBumps} data-testid={`bumps-${statKey}`}>
            {breakpoints.map((bpEv) => (
              <span
                key={bpEv}
                className={cn(
                  s.spreadBumpTick,
                  bpEv === nextBpEv && s.spreadBumpTickNext
                )}
                style={{ left: `${(bpEv / budget.perStat) * 100}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Col 6: Final stat, mono bold */}
      <span className={s.spreadFinal}>{finalStat}</span>
    </div>
  );
}

// =============================================================================
// IV input
// =============================================================================

interface IvInputProps {
  statKey: StatKey;
  iv: number;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
}

function IvInput({ statKey, iv, onUpdate }: IvInputProps) {
  const [draftIv, setDraftIv] = useState<number | null>(null);
  const [prevIv, setPrevIv] = useState<number | typeof UNINITIALIZED>(
    UNINITIALIZED
  );
  if (iv !== prevIv) {
    setPrevIv(iv);
    setDraftIv(null);
  }
  const displayIv = draftIv ?? iv;

  useEffect(() => {
    if (draftIv === null) return;
    const timer = setTimeout(() => {
      onUpdate({ [IV_FIELD[statKey]]: draftIv });
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draftIv, statKey, onUpdate]);

  function flush() {
    if (draftIv === null) return;
    onUpdate({ [IV_FIELD[statKey]]: draftIv });
  }

  return (
    <input
      type="number"
      min={0}
      max={31}
      value={displayIv}
      onChange={(e) => {
        const v = Math.max(0, Math.min(31, Number(e.target.value)));
        setDraftIv(v);
      }}
      onBlur={flush}
      className={cn(
        "bg-background focus:ring-primary w-10 rounded border px-1 py-0.5 text-center font-mono text-xs outline-none focus:ring-1",
        displayIv !== 31 &&
          "border-amber-400/60 text-amber-600 dark:text-amber-400"
      )}
    />
  );
}

// =============================================================================
// StatsLane
// =============================================================================

/**
 * Spread lane — 6 horizontal stat rows in Pokemon Showdown style.
 *
 * Each row layout (CSS grid):
 *   [label 36px] [base# 26px] [viz bar 1fr] [input 38px] [slider 110px] [final# 32px]
 *
 * Viz bar: read-only, solid base layer + striped invest overlay. Maps 0→250 final stat.
 * Number input: shows EV with Showdown-style nature suffix (+/−).
 * Slider: the only EV/SP input. Red breakpoint ticks on +nature stat only.
 *
 * Supports Champions format (SP system, gen 10).
 * Below the rows: IV editor with a "Show IVs" toggle (collapses by default).
 */
export function StatsLane({
  pokemon,
  format,
  onUpdate,
  fieldErrors = [],
}: StatsLaneProps) {
  const [showIvs, setShowIvs] = useState(false);

  const evs = getEvs(pokemon);
  const ivs = getIvs(pokemon);
  const level = pokemon.level ?? 50;
  const nature = pokemon.nature ?? "Hardy";
  const isChampions = isChampionsFormat(format);
  const showIvSection = formatSupportsIvs(format);
  const totalEv = totalEvs(evs);
  const budget = getStatBudget(isChampions);

  const rawBase = getBaseStats(pokemon.species ?? "");
  const base: StatValues = rawBase ?? {
    hp: 50,
    attack: 50,
    defense: 50,
    specialAttack: 50,
    specialDefense: 50,
    speed: 50,
  };

  const natureEffect = NATURE_EFFECTS[nature];
  const natUp = natureEffect?.boost;
  const natDown = natureEffect?.reduce;

  // Detect any non-31 IVs for summary line
  const nonMaxIvs = STAT_KEYS.filter((k) => ivs[k] !== 31);

  // EV / total errors to show below the stat rows
  const evErrors = fieldErrors.filter(
    (e) => e.field === "evs" || e.field === "evTotal"
  );

  return (
    <div
      className="border-border/60 flex min-w-0 shrink-0 flex-col gap-0.5 border-r border-dashed px-3 py-2"
      style={{ width: 320, maxWidth: 360 }}
    >
      {/* Header with total investment chip */}
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
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

      {/* 6 horizontal stat rows */}
      <div className="flex flex-col">
        {STAT_KEYS.map((statKey) => {
          const isNatureBoosted = natUp === statKey;
          const isNatureReduced = natDown === statKey;

          // Current final stat (with current EVs)
          const finalStat = computeStat({
            statKey,
            base: base[statKey],
            iv: ivs[statKey],
            ev: evs[statKey],
            nature,
            level,
            isChampions,
          });

          // Final stat with EV=0 (for the solid base layer of the viz bar)
          const noEvFinalStat = computeStat({
            statKey,
            base: base[statKey],
            iv: ivs[statKey],
            ev: 0,
            nature,
            level,
            isChampions,
          });

          return (
            <StatRow
              key={statKey}
              statKey={statKey}
              finalStat={finalStat}
              noEvFinalStat={noEvFinalStat}
              ev={evs[statKey]}
              base={base[statKey]}
              ivs={ivs}
              nature={nature}
              level={level}
              isChampions={isChampions}
              isNatureBoosted={isNatureBoosted}
              isNatureReduced={isNatureReduced}
              evFieldKey={EV_FIELD[statKey]}
              totalEv={totalEv}
              budget={budget}
              onUpdate={onUpdate}
            />
          );
        })}
      </div>

      {/* EV total errors */}
      {evErrors.map((err, i) => (
        <FieldError key={i} message={err.message} severity={err.severity} />
      ))}

      {/* IV section — hidden in formats without IVs (e.g. Champions) */}
      {showIvSection && (
        <div className="mt-1">
          {/* IV toggle */}
          <button
            type="button"
            onClick={() => setShowIvs((v) => !v)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[10px] font-medium transition-colors"
          >
            <span className="font-mono text-[9px]">{showIvs ? "▾" : "▸"}</span>
            IVs
            {!showIvs && nonMaxIvs.length > 0 && (
              <span className="ml-1 font-mono text-[9.5px] text-amber-500">
                {nonMaxIvs.map((k) => `${STAT_LABELS[k]}:${ivs[k]}`).join(" ")}
              </span>
            )}
          </button>

          {/* IV grid */}
          {showIvs && (
            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
              {STAT_KEYS.map((statKey) => (
                <label key={statKey} className="flex items-center gap-1.5">
                  <span className="text-muted-foreground w-7 font-mono text-[9px] font-medium uppercase">
                    {STAT_LABELS[statKey]}
                  </span>
                  <IvInput
                    statKey={statKey}
                    iv={ivs[statKey]}
                    onUpdate={onUpdate}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
