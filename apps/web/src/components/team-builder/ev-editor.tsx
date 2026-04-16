"use client";

import { useRef, useEffect, useState } from "react";

import {
  calculateStat,
  calculateHP,
  calculateChampionsHP,
  calculateChampionsStat,
  getNatureMultiplier,
  calculateNatureBumps,
  NATURE_EFFECTS,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
  type StatKey,
  type StatValues,
  STAT_KEYS,
  STAT_LABELS,
} from "./stat-types";

// =============================================================================
// Constants
// =============================================================================

const MAX_EV = 252;
const TOTAL_EV_LIMIT = 510;
const MAX_SP = 32;

/** Tailwind color tokens for each stat's filled bar. */
const STAT_BAR_COLORS: Record<StatKey, string> = {
  hp: "bg-red-500",
  attack: "bg-orange-500",
  defense: "bg-yellow-500",
  specialAttack: "bg-blue-500",
  specialDefense: "bg-green-500",
  speed: "bg-pink-500",
};

// =============================================================================
// Types
// =============================================================================

interface EvEditorProps {
  evs: StatValues;
  ivs: StatValues;
  baseStats: StatValues;
  nature: string;
  level: number;
  /**
   * When true, renders the Pokemon Champions Stat Points (SP) input mode
   * instead of the classic EV draggable bars. SP is 0-32 per stat with no
   * total budget cap. Champions always uses level 50 and no IVs in its formula.
   */
  isStatPoints?: boolean;
  onChange: (stat: StatKey, value: number) => void;
  onPreset: (preset: "reset" | "maxAtk" | "maxBulk") => void;
  /**
   * When true, all drag, keyboard, and input interactions are no-ops and
   * the bars/inputs appear dimmed. Preset buttons are also disabled.
   */
  disabled?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/** Sum all EV values. */
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

/**
 * Calculate the final stat value for a given stat key, taking nature into
 * account. HP uses a different formula.
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
 * Level is always 50 in Champions. IVs are not used — baked into the formula.
 * Nature applies to non-HP stats.
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

/**
 * Snap an EV value to the nearest nature-bump breakpoint if it is within
 * 2 EVs of one.
 */
function snapToBump(rawEv: number, bumps: number[]): number {
  const SNAP_THRESHOLD = 2;
  let snapped = rawEv;
  let closestDistance = SNAP_THRESHOLD + 1;

  for (const bump of bumps) {
    const distance = Math.abs(bump - rawEv);
    if (distance <= SNAP_THRESHOLD && distance < closestDistance) {
      snapped = bump;
      closestDistance = distance;
    }
  }

  return snapped;
}

// =============================================================================
// StatRow — a single row in the EV editor
// =============================================================================

interface StatRowProps {
  statKey: StatKey;
  ev: number;
  finalStat: number;
  natureBumps: number[];
  isNatureBoosted: boolean;
  isNatureReduced: boolean;
  remaining: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function StatRow({
  statKey,
  ev,
  finalStat,
  natureBumps,
  isNatureBoosted,
  isNatureReduced,
  remaining,
  onChange,
  disabled = false,
}: StatRowProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // -------------------------------------------------------------------------
  // Mouse drag on bar
  // -------------------------------------------------------------------------

  function calculateEvFromMouseX(clientX: number): number {
    const bar = barRef.current;
    if (!bar) return ev;

    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(
      0,
      Math.min(1, (clientX - rect.left) / rect.width)
    );
    // Round to nearest multiple of 4
    const rawEv = Math.round((fraction * MAX_EV) / 4) * 4;
    const capped = Math.min(rawEv, ev + remaining); // cannot exceed budget

    // Snap to nature bump if boosted stat and bump is nearby
    if (isNatureBoosted && natureBumps.length > 0) {
      return snapToBump(capped, natureBumps);
    }

    return capped;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Only primary button (left-click / touch)
    if (e.button !== 0) return;
    if (disabled) return;
    e.preventDefault();

    // Capture the pointer so moves are tracked even outside the element
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDragging.current = true;
    onChange(calculateEvFromMouseX(e.clientX));

    function onPointerMove(ev: PointerEvent) {
      if (!isDragging.current) return;
      onChange(calculateEvFromMouseX(ev.clientX));
    }

    function onPointerUp() {
      isDragging.current = false;
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    }

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      isDragging.current = false;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const fillPercent = (ev / MAX_EV) * 100;
  const label = STAT_LABELS[statKey];
  const barColor = STAT_BAR_COLORS[statKey];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={cn(
        "grid grid-cols-[44px_1fr_48px] items-center gap-2 md:grid-cols-[52px_1fr_56px_48px]",
        disabled && "opacity-50"
      )}
    >
      {/* Stat label with nature indicator */}
      <span
        className={cn(
          "text-right text-xs font-semibold tabular-nums",
          isNatureBoosted && "text-green-600 dark:text-green-400",
          isNatureReduced && "text-red-500 dark:text-red-400"
        )}
      >
        {label}
        {isNatureBoosted && "+"}
        {isNatureReduced && "-"}
      </span>

      {/* Draggable bar */}
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={MAX_EV}
        aria-valuenow={ev}
        aria-label={`${label} EVs`}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          const step = e.shiftKey ? 16 : 4;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(ev + step, ev + remaining, MAX_EV));
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(ev - step, 0));
          }
        }}
        className={cn(
          "relative h-[7px] touch-none rounded-full select-none",
          disabled ? "cursor-default" : "cursor-ew-resize",
          "bg-muted focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
        )}
      >
        {/* Filled region */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-none",
            barColor,
            isNatureReduced && "opacity-30"
          )}
          style={{ width: `${fillPercent}%` }}
        />

        {/* Nature-bump tick marks (only on boosted stat) */}
        {isNatureBoosted &&
          natureBumps.map((bumpEv) => {
            const bumpPercent = (bumpEv / MAX_EV) * 100;
            return (
              <div
                key={bumpEv}
                className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full bg-white/60"
                style={{ left: `${bumpPercent}%` }}
                aria-hidden="true"
              />
            );
          })}

        {/* Thumb handle */}
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-300 bg-white shadow-sm"
          style={{ left: `${fillPercent}%` }}
          aria-hidden="true"
        />
      </div>

      {/* EV numeric input — hidden on mobile, bar + value display is sufficient */}
      <input
        type="number"
        min={0}
        max={MAX_EV}
        value={ev}
        onChange={(e) => {
          if (disabled) return;
          const raw = parseInt(e.target.value, 10);
          if (isNaN(raw)) return;
          const clamped = Math.max(0, Math.min(raw, ev + remaining, MAX_EV));
          onChange(clamped);
        }}
        disabled={disabled}
        className={cn(
          "hidden h-6 w-full rounded border border-transparent bg-transparent px-1 text-right text-xs tabular-nums md:block",
          "hover:border-border focus:border-border focus:outline-none",
          "text-foreground"
        )}
        aria-label={`${label} EV value`}
      />

      {/* Final calculated stat */}
      <span className="text-muted-foreground text-right text-xs tabular-nums">
        {finalStat}
      </span>
    </div>
  );
}

// =============================================================================
// SpStatRow — a single stat row for the Champions SP editor
// =============================================================================

interface SpStatRowProps {
  statKey: StatKey;
  sp: number;
  finalStat: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function SpStatRow({
  statKey,
  sp,
  finalStat,
  onChange,
  disabled = false,
}: SpStatRowProps) {
  const label = STAT_LABELS[statKey];

  return (
    <div
      className={cn(
        "grid grid-cols-[44px_1fr_48px] items-center gap-2",
        disabled && "opacity-50"
      )}
    >
      {/* Stat label */}
      <span className="text-muted-foreground text-right text-xs font-semibold tabular-nums">
        {label}
      </span>

      {/* SP number input — 0 to 32 */}
      <input
        type="number"
        min={0}
        max={MAX_SP}
        value={sp}
        onChange={(e) => {
          if (disabled) return;
          const raw = parseInt(e.target.value, 10);
          if (isNaN(raw)) return;
          onChange(Math.max(0, Math.min(raw, MAX_SP)));
        }}
        disabled={disabled}
        aria-label={`${label} Stat Points`}
        className={cn(
          "h-6 w-full rounded border border-transparent bg-transparent px-1 text-right text-xs tabular-nums",
          "hover:border-border focus:border-border focus:outline-none"
        )}
      />

      {/* Final calculated stat */}
      <span className="text-muted-foreground text-right text-xs tabular-nums">
        {finalStat}
      </span>
    </div>
  );
}

// =============================================================================
// EvEditor
// =============================================================================

/**
 * EV editor for the team builder Pokemon editor.
 *
 * Displays 6 draggable EV bars with nature indicators, calculated stat values,
 * nature-bump tick marks, and total EV counter. Supports preset buttons for
 * common EV spreads.
 */
export function EvEditor({
  evs: propEvs,
  ivs,
  baseStats,
  nature,
  level,
  isStatPoints = false,
  onChange,
  onPreset,
  disabled = false,
}: EvEditorProps) {
  // Local EV state for optimistic/instant updates while dragging.
  // Syncs from props when props change (e.g., after server save or preset).
  const [localEvs, setLocalEvs] = useState<StatValues>(propEvs);
  const [prevPropEvs, setPrevPropEvs] = useState<StatValues>(propEvs);

  // Sync local state when props change (render-time state reset pattern)
  if (prevPropEvs !== propEvs) {
    setPrevPropEvs(propEvs);
    setLocalEvs(propEvs);
  }

  // Use local EVs for display — updates are instant
  const evs = localEvs;
  const used = totalEvs(evs);
  const remaining = TOTAL_EV_LIMIT - used;

  // Wrapper that updates local state immediately AND calls parent onChange for debounced save
  function handleEvChange(stat: StatKey, value: number) {
    setLocalEvs((prev) => ({ ...prev, [stat]: value }));
    onChange(stat, value);
  }

  // Look up nature boost/reduce from NATURE_EFFECTS
  const natureEffect = NATURE_EFFECTS[nature];
  const boostedStat = natureEffect?.boost ?? null;
  const reducedStat = natureEffect?.reduce ?? null;

  // -------------------------------------------------------------------------
  // Render — SP mode (Champions)
  // -------------------------------------------------------------------------

  if (isStatPoints) {
    return (
      <div className="flex flex-col gap-3">
        {/* SP stat rows — one number input (0-32) per stat */}
        <div className="flex flex-col gap-1.5">
          {STAT_KEYS.map((statKey) => {
            const finalStat = getChampionsFinalStat(
              statKey,
              baseStats,
              evs,
              nature
            );
            return (
              <SpStatRow
                key={statKey}
                statKey={statKey}
                sp={evs[statKey]}
                finalStat={finalStat}
                onChange={(value) => handleEvChange(statKey, value)}
                disabled={disabled}
              />
            );
          })}
        </div>

        {/* Reset button — Max Atk / Max Bulk presets don't apply to SP */}
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onPreset("reset")}
            disabled={disabled}
          >
            Reset
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render — classic EV mode
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-3">
      {/* Stat rows */}
      <div className="flex flex-col gap-1.5">
        {STAT_KEYS.map((statKey) => {
          const isNatureBoosted = boostedStat === statKey;
          const isNatureReduced = reducedStat === statKey;

          // Calculate nature bumps only for the boosted stat
          const natureBumps = isNatureBoosted
            ? calculateNatureBumps(baseStats[statKey], ivs[statKey], level, 1.1)
            : [];

          const finalStat = getFinalStat(
            statKey,
            baseStats,
            ivs,
            evs,
            nature,
            level
          );

          // Budget available when changing this stat specifically
          const budgetForStat = remaining + evs[statKey];

          return (
            <StatRow
              key={statKey}
              statKey={statKey}
              ev={evs[statKey]}
              finalStat={finalStat}
              natureBumps={natureBumps}
              isNatureBoosted={isNatureBoosted}
              isNatureReduced={isNatureReduced}
              remaining={budgetForStat - evs[statKey]}
              onChange={(value) => {
                // Cap by total budget: other stats' EVs + this new value <= 510
                const otherTotal = used - evs[statKey];
                const capped = Math.min(value, TOTAL_EV_LIMIT - otherTotal);
                handleEvChange(statKey, capped);
              }}
              disabled={disabled}
            />
          );
        })}
      </div>

      {/* Total EV counter */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          <span
            className={cn(
              "font-semibold tabular-nums",
              used > TOTAL_EV_LIMIT
                ? "text-destructive"
                : used === TOTAL_EV_LIMIT
                  ? "text-green-600 dark:text-green-400"
                  : "text-foreground"
            )}
          >
            {used}
          </span>
          <span className="text-muted-foreground"> / {TOTAL_EV_LIMIT}</span>
          {remaining > 0 && (
            <span className="text-muted-foreground">
              {" "}
              • {remaining} remaining
            </span>
          )}
          {remaining === 0 && (
            <span className="text-green-600 dark:text-green-400"> • Full</span>
          )}
        </span>

        {/* EV spread visual (mini bar) */}
        <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, (used / TOTAL_EV_LIMIT) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs"
          onClick={() => onPreset("reset")}
          disabled={disabled}
        >
          Reset
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs"
          onClick={() => onPreset("maxAtk")}
          disabled={disabled}
        >
          Max Atk
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 flex-1 text-xs"
          onClick={() => onPreset("maxBulk")}
          disabled={disabled}
        >
          Max Bulk
        </Button>
      </div>
    </div>
  );
}
