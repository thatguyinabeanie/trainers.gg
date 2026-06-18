"use client";

import { useState } from "react";

import { type GameFormat } from "@trainers/pokemon";
import { type Tables, type TablesUpdate } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import {
  STAT_KEYS,
  STAT_LABELS,
  type StatKey,
  type StatValues,
} from "../stat-types";
import { type StatBoosts } from "../use-calc-state";

// =============================================================================
// Types
// =============================================================================

interface RadialFineTuneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
  /** Whether IV inputs should be shown (false in Champions format). */
  showIvs: boolean;
  isChampions: boolean;
  /** Current resolved IVs for display. */
  ivs: StatValues;
  /** Stat boosts (only render when provided). */
  boosts?: StatBoosts;
  onBoostChange?: (stat: keyof StatBoosts, value: number) => void;
}

// =============================================================================
// IV field map
// =============================================================================

const IV_FIELD: Record<StatKey, keyof Tables<"pokemon">> = {
  hp: "iv_hp",
  attack: "iv_attack",
  defense: "iv_defense",
  specialAttack: "iv_special_attack",
  specialDefense: "iv_special_defense",
  speed: "iv_speed",
};

/** Maps StatKey → StatBoosts key (HP has no boost). */
const STAT_TO_BOOST_KEY: Partial<Record<StatKey, keyof StatBoosts>> = {
  attack: "atk",
  defense: "def",
  specialAttack: "spa",
  specialDefense: "spd",
  speed: "spe",
};

const UNINITIALIZED = Symbol();

// =============================================================================
// IvRow
// =============================================================================

interface IvRowProps {
  statKey: StatKey;
  iv: number;
  onUpdate: (fields: Partial<TablesUpdate<"pokemon">>) => void;
}

function IvRow({ statKey, iv, onUpdate }: IvRowProps) {
  const [draftIv, setDraftIv] = useState<number | null>(null);
  const [prevIv, setPrevIv] = useState<number | typeof UNINITIALIZED>(
    UNINITIALIZED
  );

  // Reset draft when committed prop changes (mirrors StatsLane pattern)
  if (iv !== prevIv) {
    setPrevIv(iv);
    setDraftIv(null);
  }

  const displayIv = draftIv ?? iv;

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground w-8 font-mono text-xs font-semibold uppercase">
        {STAT_LABELS[statKey]}
      </span>
      <input
        type="number"
        min={0}
        max={31}
        value={displayIv}
        aria-label={`${STAT_LABELS[statKey]} IV`}
        onChange={(e) => {
          const v = Math.max(0, Math.min(31, Number(e.target.value)));
          setDraftIv(v);
        }}
        onBlur={() => {
          if (draftIv === null) return;
          const next = draftIv;
          setDraftIv(null);
          onUpdate({ [IV_FIELD[statKey]]: next });
        }}
        className={cn(
          "focus:ring-primary h-5 w-10 rounded border bg-transparent text-center font-mono text-xs outline-none focus:ring-1",
          displayIv !== 31
            ? "border-amber-400/60 text-amber-600 dark:text-amber-400"
            : "border-border text-muted-foreground"
        )}
      />
    </div>
  );
}

// =============================================================================
// BoostRow
// =============================================================================

interface BoostRowProps {
  statKey: StatKey;
  boostKey: keyof StatBoosts;
  boost: number;
  onBoostChange: (stat: keyof StatBoosts, value: number) => void;
}

function BoostRow({ statKey, boostKey, boost, onBoostChange }: BoostRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground w-8 font-mono text-xs font-semibold uppercase">
        {STAT_LABELS[statKey]}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${STAT_LABELS[statKey]} boost`}
          onClick={() => onBoostChange(boostKey, Math.max(-6, boost - 1))}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-6 items-center justify-center rounded text-xs font-bold"
        >
          −
        </button>
        <span
          className={cn(
            "w-6 text-center font-mono text-xs font-semibold tabular-nums",
            boost > 0 && "text-teal-600 dark:text-teal-400",
            boost < 0 && "text-rose-600 dark:text-rose-400",
            boost === 0 && "text-muted-foreground"
          )}
        >
          {boost > 0 ? `+${boost}` : boost}
        </span>
        <button
          type="button"
          aria-label={`Increase ${STAT_LABELS[statKey]} boost`}
          onClick={() => onBoostChange(boostKey, Math.min(6, boost + 1))}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-6 items-center justify-center rounded text-xs font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// RadialFineTune
// =============================================================================

/**
 * Collapsible fine-tune section below the hexagon.
 *
 * Reveals:
 *  • IV inputs for each stat — ONLY when formatSupportsIvs (non-Champions).
 *  • Calc boost steppers for each non-HP stat — ONLY when boosts + onBoostChange
 *    are provided by the caller (calc panel is active).
 *
 * Kept out of the main SVG to avoid bloating the hexagon render tree.
 */
export function RadialFineTune({
  open,
  onOpenChange,
  pokemon: _pokemon,
  format: _format,
  onUpdate,
  showIvs,
  isChampions: _isChampions,
  ivs,
  boosts,
  onBoostChange,
}: RadialFineTuneProps) {
  const hasContent =
    showIvs || (boosts !== undefined && onBoostChange !== undefined);
  if (!hasContent) return null;

  return (
    <div className="mx-auto w-full max-w-xs">
      {/* Expander trigger */}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls="radial-fine-tune-panel"
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center justify-between rounded px-2 py-1 text-xs transition-colors"
      >
        <span className="font-medium">
          {showIvs ? "IVs" : ""}
          {showIvs && boosts !== undefined ? " & " : ""}
          {boosts !== undefined && onBoostChange !== undefined ? "Boosts" : ""}
        </span>
        <span
          className={cn(
            "text-sm leading-none transition-transform duration-150",
            open ? "rotate-180" : "rotate-0"
          )}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div
          id="radial-fine-tune-panel"
          className="border-border/60 bg-muted/30 mt-1 rounded-lg border px-3 py-2"
        >
          {/* Two-column layout: IVs on the left, Boosts on the right */}
          <div
            className={cn(
              "grid gap-x-4 gap-y-1",
              showIvs && boosts !== undefined && onBoostChange !== undefined
                ? "grid-cols-2"
                : "grid-cols-1"
            )}
          >
            {/* IV column */}
            {showIvs && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground/70 mb-0.5 text-center font-mono text-xs font-semibold tracking-wide uppercase">
                  IVs
                </span>
                {STAT_KEYS.map((statKey) => (
                  <IvRow
                    key={statKey}
                    statKey={statKey}
                    iv={ivs[statKey]}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            )}

            {/* Boost column */}
            {boosts !== undefined && onBoostChange !== undefined && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground/70 mb-0.5 text-center font-mono text-xs font-semibold tracking-wide uppercase">
                  ± Boosts
                </span>
                {STAT_KEYS.filter((k) => k !== "hp").map((statKey) => {
                  const boostKey = STAT_TO_BOOST_KEY[statKey];
                  if (!boostKey) return null;
                  return (
                    <BoostRow
                      key={statKey}
                      statKey={statKey}
                      boostKey={boostKey}
                      boost={boosts[boostKey]}
                      onBoostChange={onBoostChange}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
