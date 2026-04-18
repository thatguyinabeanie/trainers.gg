"use client";

import { type ReactNode } from "react";

import {
  type GameFormat,
  type SpeedAffectingItem,
  getSpeedAffectingItems,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =============================================================================
// Types
// =============================================================================

export type Weather = "none" | "sun" | "rain" | "sand" | "snow";

export interface SpeedToggleState {
  field: {
    tailwind: boolean;
    weather: Weather;
  };
  /** Speed stat stage, clamped to [-6, +6] */
  stage: number;
  /** Empty string = none; otherwise an item id from getSpeedAffectingItems */
  item: string;
  /**
   * Current status condition. Only "paralyzed" directly reduces Speed; other
   * statuses can trigger Quick Feet (+1.5× when statused). Widen this union
   * when the UI exposes more than two options.
   *
   * TODO: expand to full status union ("burn" | "sleep" | "freeze" | "poison" |
   * "toxic") once the status picker supports them, so callers don't need casts.
   */
  status: "healthy" | "paralyzed";
}

interface SpeedToggleRailProps {
  state: SpeedToggleState;
  onChange: (next: SpeedToggleState) => void;
  format: GameFormat;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const STAGE_MIN = -6;
const STAGE_MAX = 6;

function clampStage(stage: number): number {
  return Math.max(STAGE_MIN, Math.min(STAGE_MAX, stage));
}

function formatStageLabel(stage: number): string {
  if (stage === 0) return "0";
  return stage > 0 ? `+${stage}` : String(stage);
}

const WEATHER_LABELS: Record<Weather, string> = {
  none: "None",
  sun: "Sun",
  rain: "Rain",
  sand: "Sand",
  snow: "Snow",
};

// =============================================================================
// GroupHeader — small section caption above each toggle group
// =============================================================================

interface GroupHeaderProps {
  children: ReactNode;
}

function GroupHeader({ children }: GroupHeaderProps) {
  return (
    <div className="text-muted-foreground text-[9px] font-semibold tracking-wider uppercase">
      {children}
    </div>
  );
}

// =============================================================================
// SpeedToggleRail
// =============================================================================

/**
 * Horizontal toggle bar rendered above the SpeedTierList. A pure-controlled
 * component that lets the user pose "what-if" questions about the selected
 * Pokémon's effective speed: field effects, stat stage, item, status.
 *
 * The four groups (Field / Stage / Item / Status) flow in a flex row and
 * wrap when the panel narrows.
 */
export function SpeedToggleRail({
  state,
  onChange,
  format,
  className,
}: SpeedToggleRailProps) {
  const items: SpeedAffectingItem[] = getSpeedAffectingItems(format);

  // Derived from WEATHER_LABELS so it stays in sync if new weathers are added.
  const weatherOptions = (Object.keys(WEATHER_LABELS) as Weather[]).filter(
    (w) => w !== "none"
  );

  // ---- helpers --------------------------------------------------------------

  function setTailwind(next: boolean) {
    onChange({ ...state, field: { ...state.field, tailwind: next } });
  }

  function setWeather(next: Weather) {
    // Real weather is mutually exclusive — clicking the active one clears it.
    const current = state.field.weather;
    const final = current === next ? "none" : next;
    onChange({ ...state, field: { ...state.field, weather: final } });
  }

  function setStage(next: number) {
    onChange({ ...state, stage: clampStage(next) });
  }

  function setItem(next: string) {
    onChange({ ...state, item: next });
  }

  function setStatus(next: "healthy" | "paralyzed") {
    onChange({ ...state, status: next });
  }

  // ---- render ---------------------------------------------------------------

  return (
    <div
      data-testid="speed-toggle-rail"
      className={cn(
        "bg-muted/30 flex flex-row flex-wrap gap-3 border-b px-3 py-2",
        className
      )}
    >
      {/* Field -------------------------------------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <GroupHeader>Field</GroupHeader>
        <div className="flex flex-row flex-wrap gap-1">
          <Toggle
            size="sm"
            variant="outline"
            pressed={state.field.tailwind}
            onPressedChange={(pressed) => setTailwind(pressed)}
            aria-label="Tailwind"
          >
            Tailwind
          </Toggle>
          {weatherOptions.map((w) => (
            <Toggle
              key={w}
              size="sm"
              variant="outline"
              pressed={state.field.weather === w}
              onPressedChange={() => setWeather(w)}
              aria-label={`Weather ${WEATHER_LABELS[w]}`}
            >
              {WEATHER_LABELS[w]}
            </Toggle>
          ))}
        </div>
      </div>

      {/* Stage stepper ------------------------------------------------------ */}
      <div className="flex flex-col gap-1.5">
        <GroupHeader>Stage</GroupHeader>
        <div className="bg-card grid grid-cols-[22px_32px_22px] overflow-hidden rounded-md border">
          <button
            type="button"
            aria-label="Decrement speed stage"
            disabled={state.stage <= STAGE_MIN}
            onClick={() => setStage(state.stage - 1)}
            className={cn(
              "hover:bg-muted text-foreground flex items-center justify-center text-sm transition-colors duration-150",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            −
          </button>
          <div
            data-testid="speed-stage-value"
            className="text-foreground flex items-center justify-center font-mono text-xs font-semibold"
          >
            {formatStageLabel(state.stage)}
          </div>
          <button
            type="button"
            aria-label="Increment speed stage"
            disabled={state.stage >= STAGE_MAX}
            onClick={() => setStage(state.stage + 1)}
            className={cn(
              "hover:bg-muted text-foreground flex items-center justify-center text-sm transition-colors duration-150",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            +
          </button>
        </div>
      </div>

      {/* Item --------------------------------------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <GroupHeader>Item</GroupHeader>
        <Select
          value={state.item || ""}
          onValueChange={(v) => setItem(v ?? "")}
        >
          <SelectTrigger size="sm" aria-label="Held item">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status ------------------------------------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <GroupHeader>Status</GroupHeader>
        <Select
          value={state.status}
          onValueChange={(v) => setStatus(v as "healthy" | "paralyzed")}
        >
          <SelectTrigger size="sm" aria-label="Status condition">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="paralyzed">Paralyzed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
