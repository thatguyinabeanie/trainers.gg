"use client";

import { useState } from "react";

import {
  type GameFormat,
  calculateStat,
  calculateHP,
  calculateChampionsHP,
  calculateChampionsStat,
  getBaseStats,
  getNatureMultiplier,
  getStatTier,
  NATURE_EFFECTS,
} from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

import {
  type StatKey,
  type StatValues,
  STAT_KEYS,
  STAT_LABELS,
} from "./stat-types";
import { type ValidationError } from "./validation-hooks";

// =============================================================================
// Constants
// =============================================================================

const MAX_EV = 252;
const TOTAL_EV_LIMIT = 510;
const MAX_SP = 32;

/** Map StatKey to the corresponding `pokemon` row column for EV updates. */
const EV_FIELD: Record<StatKey, keyof Tables<"pokemon">> = {
  hp: "ev_hp",
  attack: "ev_attack",
  defense: "ev_defense",
  specialAttack: "ev_special_attack",
  specialDefense: "ev_special_defense",
  speed: "ev_speed",
};

/** Tailwind class for each stat tier — uses theme tokens. */
const STAT_TIER_COLOR = {
  low: "text-stat-low",
  mid: "text-stat-mid",
  good: "text-stat-good",
  great: "text-stat-great",
} as const;

// =============================================================================
// Types
// =============================================================================

interface StatsTableProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  fieldErrors?: ValidationError[];
  onUpdate: (field: keyof Tables<"pokemon">, value: number) => void;
  disabled?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/** Sum all six points (EV or SP). */
function totalPoints(values: StatValues): number {
  return (
    values.hp +
    values.attack +
    values.defense +
    values.specialAttack +
    values.specialDefense +
    values.speed
  );
}

/**
 * Calculate the final stat value with classic EV/IV/level formula.
 * HP uses a separate formula; non-HP stats apply the nature multiplier.
 */
function getFinalStat(
  stat: StatKey,
  baseStats: StatValues,
  ivs: StatValues,
  evs: StatValues,
  nature: string,
  level: number
): number {
  const base = baseStats[stat];
  const iv = ivs[stat];
  const ev = evs[stat];

  if (stat === "hp") {
    return calculateHP(base, iv, ev, level);
  }
  const multiplier = getNatureMultiplier(
    nature,
    stat as keyof Omit<StatValues, "hp">
  );
  return calculateStat(base, iv, ev, level, multiplier);
}

/**
 * Calculate the final stat for Champions (SP system).
 * Level is always 50 in Champions; IVs are not used; nature applies to non-HP.
 */
function getChampionsFinalStat(
  stat: StatKey,
  baseStats: StatValues,
  sps: StatValues,
  nature: string
): number {
  const base = baseStats[stat];
  const sp = sps[stat];
  if (stat === "hp") {
    return calculateChampionsHP(base, sp);
  }
  const multiplier = getNatureMultiplier(
    nature,
    stat as keyof Omit<StatValues, "hp">
  );
  return calculateChampionsStat(base, sp, multiplier);
}

// =============================================================================
// StatRow — one row in the 3-column Showdown-style stat table
// =============================================================================

interface StatRowProps {
  statKey: StatKey;
  base: number;
  points: number;
  /** Maximum points allowed for this individual stat (252 EV / 32 SP). */
  pointsMax: number;
  /** Slider/input step (4 for EVs, 1 for SP). */
  step: number;
  /** Maximum points the user can spend on this stat right now (respects budget). */
  budget: number;
  finalStat: number;
  isNatureBoosted: boolean;
  isNatureReduced: boolean;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function StatRow({
  statKey,
  base,
  points,
  pointsMax,
  step,
  budget,
  finalStat,
  isNatureBoosted,
  isNatureReduced,
  onChange,
  disabled = false,
}: StatRowProps) {
  const label = STAT_LABELS[statKey];
  const tier = getStatTier(base);
  const baseColor = STAT_TIER_COLOR[tier];

  function clampAndEmit(raw: number) {
    if (disabled) return;
    if (Number.isNaN(raw)) return;
    const clamped = Math.max(0, Math.min(raw, pointsMax, budget));
    onChange(clamped);
  }

  return (
    <>
      {/* Stat label — nature +/− is a small suffix that supplements the Final
          column rather than replacing it. The suffix communicates which stat
          the nature boosts/drops without taking the place of the calculated
          final value rendered to the right. */}
      <span
        className={cn(
          "text-muted-foreground text-right text-[10px] font-semibold tracking-wide uppercase"
        )}
      >
        {label}
        {isNatureBoosted && (
          <span
            className="text-stat-good ml-0.5 text-[11px]"
            aria-label={`${label} is boosted by nature`}
          >
            +
          </span>
        )}
        {isNatureReduced && (
          <span
            className="text-destructive ml-0.5 text-[11px]"
            aria-label={`${label} is reduced by nature`}
          >
            −
          </span>
        )}
      </span>

      {/* Base */}
      <span
        className={cn(
          "text-center font-mono text-lg font-bold tabular-nums",
          baseColor
        )}
      >
        {base}
      </span>

      {/* Points: numeric input + slider, in a 2-col subgrid */}
      <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-2">
        <input
          type="number"
          min={0}
          max={pointsMax}
          step={step}
          value={points}
          disabled={disabled}
          aria-label={`${label} points`}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            clampAndEmit(parsed);
          }}
          className={cn(
            "h-7 w-12 rounded border border-transparent bg-transparent px-1 text-right font-mono text-xs tabular-nums",
            "hover:border-border focus:border-border focus:outline-none",
            disabled && "opacity-50"
          )}
        />
        <Slider
          min={0}
          max={pointsMax}
          step={step}
          value={points}
          onValueChange={(value) =>
            clampAndEmit(
              Array.isArray(value) ? (value[0] ?? 0) : (value as number)
            )
          }
          disabled={disabled}
          aria-label={`${label} points slider`}
          className="w-full"
        />
      </div>

      {/* Final */}
      <span
        className={cn(
          "text-right font-mono text-sm font-bold tabular-nums",
          points === 0 ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {finalStat}
      </span>
    </>
  );
}

// =============================================================================
// StatsTable
// =============================================================================

/**
 * Showdown-style 3-column stat editor: Base · Points · Final.
 *
 * Replaces the legacy `EvEditor` with a denser layout that surfaces the
 * Pokemon's base stats (color-tiered via {@link getStatTier}) alongside the
 * editable points and the resulting final stat at the configured level.
 *
 * Format-aware:
 *   - **Champions** (gen 10): Stat Points 0–32 per stat, no IVs, no total cap.
 *   - **Classic**: EVs 0–252 per stat, total budget 510, nature multipliers.
 */
export function StatsTable({
  pokemon,
  format,
  fieldErrors,
  onUpdate,
  disabled = false,
}: StatsTableProps) {
  // Base stats derived from species — fall back to zeros so the table still
  // renders a placeholder shell if the species lookup fails.
  const baseStats: StatValues = getBaseStats(pokemon.species) ?? {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  };

  // Champions detection — Gen 10
  const isChampions = format?.generation === 10;

  // Read EVs/SPs and IVs from the pokemon row.
  const propEvs: StatValues = {
    hp: pokemon.ev_hp ?? 0,
    attack: pokemon.ev_attack ?? 0,
    defense: pokemon.ev_defense ?? 0,
    specialAttack: pokemon.ev_special_attack ?? 0,
    specialDefense: pokemon.ev_special_defense ?? 0,
    speed: pokemon.ev_speed ?? 0,
  };
  const ivs: StatValues = {
    hp: pokemon.iv_hp ?? 31,
    attack: pokemon.iv_attack ?? 31,
    defense: pokemon.iv_defense ?? 31,
    specialAttack: pokemon.iv_special_attack ?? 31,
    specialDefense: pokemon.iv_special_defense ?? 31,
    speed: pokemon.iv_speed ?? 31,
  };

  // Local state mirrors props so the slider/input feels instant; we sync from
  // props using the render-time reset pattern (no setState-in-effect).
  const [localEvs, setLocalEvs] = useState<StatValues>(propEvs);
  const [prevPropEvs, setPrevPropEvs] = useState<StatValues>(propEvs);
  const propsChanged =
    prevPropEvs.hp !== propEvs.hp ||
    prevPropEvs.attack !== propEvs.attack ||
    prevPropEvs.defense !== propEvs.defense ||
    prevPropEvs.specialAttack !== propEvs.specialAttack ||
    prevPropEvs.specialDefense !== propEvs.specialDefense ||
    prevPropEvs.speed !== propEvs.speed;
  if (propsChanged) {
    setPrevPropEvs(propEvs);
    setLocalEvs(propEvs);
  }
  const evs = localEvs;
  const used = totalPoints(evs);

  // Per-format limits.
  const pointsMax = isChampions ? MAX_SP : MAX_EV;
  const totalLimit = isChampions ? Infinity : TOTAL_EV_LIMIT;
  const remaining = totalLimit - used;
  const step = isChampions ? 1 : 4;

  // Nature effect indicators — hidden for Champions (natures don't affect stats in Gen 10).
  const natureEffect = isChampions ? null : NATURE_EFFECTS[pokemon.nature];
  const boostedStat = natureEffect?.boost ?? null;
  const reducedStat = natureEffect?.reduce ?? null;

  // BST is the sum of base stats — kept in the footer for reference.
  const bst =
    baseStats.hp +
    baseStats.attack +
    baseStats.defense +
    baseStats.specialAttack +
    baseStats.specialDefense +
    baseStats.speed;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleChange(stat: StatKey, value: number) {
    setLocalEvs((prev) => ({ ...prev, [stat]: value }));
    onUpdate(EV_FIELD[stat], value);
  }

  function applyPreset(preset: "reset" | "maxBulk" | "maxAtk" | "maxSpe") {
    const presets: Record<typeof preset, StatValues> = {
      reset: {
        hp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
      maxBulk: {
        hp: 252,
        attack: 0,
        defense: 128,
        specialAttack: 0,
        specialDefense: 128,
        speed: 0,
      },
      maxAtk: {
        hp: 4,
        attack: 252,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 252,
      },
      maxSpe: {
        hp: 4,
        attack: 0,
        defense: 0,
        specialAttack: 252,
        specialDefense: 0,
        speed: 252,
      },
    };
    const spread = presets[preset];
    // Update local state immediately so the slider/input reflects the change,
    // then push each field to the parent for persistence.
    setLocalEvs(spread);
    for (const stat of STAT_KEYS) {
      onUpdate(EV_FIELD[stat], spread[stat]);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const fieldError = fieldErrors?.find(
    (e) => e.field === "evs" || e.field === "evTotal"
  );

  return (
    <div className="flex flex-col gap-3">
      {/* 4-col grid: stat label · base · points · final.
          Sized in rem for clarity:
            - 2.75rem (44px) — stat label, fits "SpA+" / "SpD−"
            - 3rem  (48px) — base value (3-digit max)
            - minmax(0,1fr) — points block (numeric input + slider)
            - 3.25rem (52px) — final value (3-digit max in Geist Mono) */}
      <div className="grid grid-cols-[2.75rem_3rem_minmax(0,1fr)_3.25rem] items-center gap-x-2.5 gap-y-2.5">
        {/* Header row — left column blank */}
        <span aria-hidden="true" />
        <span className="text-muted-foreground text-center text-[10px] font-semibold tracking-wide uppercase">
          Base
        </span>
        <span className="text-muted-foreground text-left text-[10px] font-semibold tracking-wide uppercase">
          {isChampions ? "Stat Points" : "Points"}
        </span>
        <span className="text-muted-foreground text-right text-[10px] font-semibold tracking-wide uppercase">
          Final
        </span>

        {/* Per-stat rows */}
        {STAT_KEYS.map((statKey) => {
          const finalStat = isChampions
            ? getChampionsFinalStat(statKey, baseStats, evs, pokemon.nature)
            : getFinalStat(
                statKey,
                baseStats,
                ivs,
                evs,
                pokemon.nature,
                pokemon.level ?? 50
              );

          // Budget for this individual stat: remaining + this stat's current points.
          const budget = isChampions
            ? MAX_SP
            : Math.min(MAX_EV, evs[statKey] + remaining);

          return (
            <StatRow
              key={statKey}
              statKey={statKey}
              base={baseStats[statKey]}
              points={evs[statKey]}
              pointsMax={pointsMax}
              step={step}
              budget={budget}
              finalStat={finalStat}
              isNatureBoosted={boostedStat === statKey}
              isNatureReduced={reducedStat === statKey}
              onChange={(value) => handleChange(statKey, value)}
              disabled={disabled}
            />
          );
        })}
      </div>

      {/* BST + preset buttons */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          BST{" "}
          <span className="text-foreground font-mono font-semibold tabular-nums">
            {bst}
          </span>
        </span>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => applyPreset("reset")}
            disabled={disabled}
          >
            Reset
          </Button>
          {!isChampions && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => applyPreset("maxBulk")}
                disabled={disabled}
              >
                Max bulk
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => applyPreset("maxAtk")}
                disabled={disabled}
              >
                Max Atk
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => applyPreset("maxSpe")}
                disabled={disabled}
              >
                Max Spe
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Display stats footer — points spent */}
      {!isChampions && (
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          <span
            className={cn(
              "text-foreground font-mono tabular-nums",
              used > TOTAL_EV_LIMIT && "text-destructive",
              used === TOTAL_EV_LIMIT && "text-stat-good"
            )}
          >
            {used}
          </span>
          <span> / {TOTAL_EV_LIMIT} points spent</span>
        </p>
      )}

      {fieldError && (
        <p
          className={cn(
            "text-xs",
            fieldError.severity === "warning"
              ? "text-amber-600 dark:text-amber-500"
              : "text-destructive"
          )}
        >
          {fieldError.message}
        </p>
      )}
    </div>
  );
}
