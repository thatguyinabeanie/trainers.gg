"use client";

import { useState } from "react";

import {
  calculateHP,
  calculateChampionsHP,
  calculateStat,
  calculateChampionsStat,
  getBaseStats,
  getNatureMultiplier,
  getStatTier,
  NATURE_EFFECTS,
  type GameFormat,
} from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { type ValidationError } from "../../validation-hooks";
import {
  type StatKey,
  type StatValues,
  STAT_KEYS,
  STAT_LABELS,
} from "../../stat-types";
import { NumberPicker } from "../pickers/number-picker";
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

function isChampionsFormat(format: GameFormat | undefined): boolean {
  return !!format && format.generation === 10;
}

function computeFinalStat(
  stat: StatKey,
  base: StatValues,
  ivs: StatValues,
  evs: StatValues,
  nature: string,
  level: number,
  isChampions: boolean
): number {
  const b = base[stat];
  const iv = ivs[stat];
  const ev = evs[stat];

  if (isChampions) {
    if (stat === "hp") return calculateChampionsHP(b, ev);
    const mult = getNatureMultiplier(nature, stat as keyof Omit<StatValues, "hp">);
    return calculateChampionsStat(b, ev, mult);
  }

  if (stat === "hp") return calculateHP(b, iv, ev, level);
  const mult = getNatureMultiplier(nature, stat as keyof Omit<StatValues, "hp">);
  return calculateStat(b, iv, ev, level, mult);
}

/** CSS custom property string for the stat-tier bar fill color. */
function tierBarColor(tier: string): string {
  switch (tier) {
    case "low": return "var(--color-stat-low, var(--stat-low, oklch(0.7 0.15 30)))";
    case "mid": return "var(--color-stat-mid, var(--stat-mid, oklch(0.75 0.15 80)))";
    case "good": return "var(--color-stat-good, var(--stat-good, oklch(0.7 0.2 140)))";
    case "great": return "var(--color-stat-great, var(--stat-great, oklch(0.6 0.22 145)))";
    default: return "var(--muted-foreground)";
  }
}

/** Tailwind text color class from stat tier (for label). */
function tierTextClass(tier: string): string {
  switch (tier) {
    case "low": return "text-stat-low";
    case "mid": return "text-stat-mid";
    case "good": return "text-stat-good";
    case "great": return "text-stat-great";
    default: return "text-muted-foreground";
  }
}

// =============================================================================
// StatRow — one horizontal stat row
// =============================================================================

interface StatRowProps {
  statKey: StatKey;
  finalStat: number;
  ev: number;
  base: number;
  isNatureBoosted: boolean;
  isNatureReduced: boolean;
  evFieldKey: keyof Tables<"pokemon">;
  totalEv: number;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
}

function StatRow({
  statKey,
  finalStat,
  ev,
  base,
  isNatureBoosted,
  isNatureReduced,
  evFieldKey,
  totalEv,
  onUpdate,
}: StatRowProps) {
  const [open, setOpen] = useState(false);
  const label = STAT_LABELS[statKey];
  const tier = getStatTier(base);

  // Bar fill = finalStat / 250, clamped to 100%
  const barPct = Math.min(100, (finalStat / 250) * 100);
  const barColor = tierBarColor(tier);
  const labelTextClass = isNatureBoosted
    ? "text-green-600 dark:text-green-400"
    : isNatureReduced
      ? "text-destructive"
      : tierTextClass(tier);

  const remainingEv = Math.max(0, 508 - totalEv + ev);
  const evBudget = Math.min(252, remainingEv);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={s.statRow}
          />
        }
      >
        {/* Col 1: Stat label, color-coded */}
        <span
          className={cn(s.statLabel, labelTextClass)}
        >
          {label}
          {isNatureBoosted && <span className="ml-0.5">+</span>}
          {isNatureReduced && <span className="ml-0.5">−</span>}
        </span>

        {/* Col 2: Horizontal bar */}
        <div className={s.statBar}>
          <span
            className={s.statBarFill}
            style={{
              width: `${barPct}%`,
              background: barColor,
            }}
          />
        </div>

        {/* Col 3: Final stat value (mono) */}
        <span className={s.statValue}>{finalStat}</span>

        {/* Col 4: EV count (muted) */}
        <span className={s.statEv}>{ev}</span>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="center" className="w-auto p-0">
        <NumberPicker
          title={`EV · ${label}`}
          value={ev}
          min={0}
          max={252}
          step={4}
          suffix="/ 252"
          hint={`Total used: ${totalEv} / ${EV_DISPLAY_MAX}`}
          onChange={(v) => {
            const clamped = Math.min(v, evBudget);
            onUpdate({ [evFieldKey]: clamped });
          }}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// StatsLane
// =============================================================================

/**
 * Spread lane — 6 horizontal stat rows with bars.
 *
 * Each row layout (CSS grid):
 *   [stat label, color-coded] [bar] [final stat value, mono] [EV count, muted]
 *
 * Bar fill width = finalStat / 250 * 100% (clamped), colored by stat tier.
 * Click on a row opens the EV NumberPicker for that stat.
 *
 * Supports Champions format (SP system, gen 10).
 * Below the rows: IV editor with a "Show IVs" toggle (collapses by default).
 * Phase 7: renders inline FieldError chips for EV/stat validation issues.
 */
export function StatsLane({ pokemon, format, onUpdate, fieldErrors = [] }: StatsLaneProps) {
  const [showIvs, setShowIvs] = useState(false);

  const evs = getEvs(pokemon);
  const ivs = getIvs(pokemon);
  const level = pokemon.level ?? 50;
  const nature = pokemon.nature ?? "Hardy";
  const isChampions = isChampionsFormat(format);
  const totalEv = totalEvs(evs);

  const rawBase = getBaseStats(pokemon.species ?? "");
  const base: StatValues = rawBase ?? {
    hp: 50, attack: 50, defense: 50,
    specialAttack: 50, specialDefense: 50, speed: 50,
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
      className="flex min-w-0 flex-1 flex-col gap-1 border-r border-dashed border-border/60 p-3"
      style={{ minWidth: 280 }}
    >
      {/* Header with total EV chip */}
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          Spread
        </span>
        <span
          className={cn(
            "font-mono text-[10px]",
            totalEv > EV_DISPLAY_MAX
              ? "text-destructive font-semibold"
              : "text-muted-foreground"
          )}
        >
          {totalEv}
          <span className="text-muted-foreground/60">/{EV_DISPLAY_MAX}</span>
        </span>
      </div>

      {/* 6 horizontal stat rows */}
      <div className="flex flex-col">
        {STAT_KEYS.map((statKey) => {
          const finalStat = computeFinalStat(
            statKey,
            base,
            ivs,
            evs,
            nature,
            level,
            isChampions
          );

          return (
            <StatRow
              key={statKey}
              statKey={statKey}
              finalStat={finalStat}
              ev={evs[statKey]}
              base={base[statKey]}
              isNatureBoosted={natUp === statKey}
              isNatureReduced={natDown === statKey}
              evFieldKey={EV_FIELD[statKey]}
              totalEv={totalEv}
              onUpdate={onUpdate}
            />
          );
        })}
      </div>

      {/* EV total errors */}
      {evErrors.map((err, i) => (
        <FieldError key={i} message={err.message} severity={err.severity} />
      ))}

      {/* IV section */}
      <div className="mt-1">
        {/* IV toggle */}
        <button
          type="button"
          onClick={() => setShowIvs((v) => !v)}
          className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium transition-colors hover:text-foreground"
        >
          <span className="font-mono text-[9px]">{showIvs ? "▾" : "▸"}</span>
          IVs
          {!showIvs && nonMaxIvs.length > 0 && (
            <span className="text-amber-500 ml-1 font-mono text-[9.5px]">
              {nonMaxIvs.map((k) => `${STAT_LABELS[k]}:${ivs[k]}`).join(" ")}
            </span>
          )}
        </button>

        {/* IV grid */}
        {showIvs && (
          <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
            {STAT_KEYS.map((statKey) => (
              <label
                key={statKey}
                className="flex items-center gap-1.5"
              >
                <span className="text-muted-foreground w-7 font-mono text-[9px] font-medium uppercase">
                  {STAT_LABELS[statKey]}
                </span>
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={ivs[statKey]}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(31, Number(e.target.value)));
                    onUpdate({ [IV_FIELD[statKey]]: v });
                  }}
                  className={cn(
                    "bg-background w-10 rounded border px-1 py-0.5 text-center font-mono text-xs outline-none focus:ring-1 focus:ring-primary",
                    ivs[statKey] !== 31 && "border-amber-400/60 text-amber-600 dark:text-amber-400"
                  )}
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
