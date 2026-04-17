"use client";

import {
  type GameFormat,
  type SpeedAffectingItem,
  getSpeedAffectingItems,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export type Weather = "none" | "sun" | "rain" | "sand" | "snow";

export interface SpeedToggleState {
  field: {
    tailwind: boolean;
    weather: Weather;
    trickRoom: boolean;
  };
  /** Speed stat stage, clamped to [-6, +6] */
  stage: number;
  /** Empty string = none; otherwise an item id from getSpeedAffectingItems */
  item: string;
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
// Pill — small toggle button used for binary / enum selections
// =============================================================================

interface PillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  ariaLabel?: string;
}

function Pill({ label, active, onClick, ariaLabel }: PillProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1 text-xs",
        "transition-colors duration-150",
        active
          ? "bg-primary/10 border-primary text-primary font-semibold"
          : "bg-card hover:bg-muted text-foreground"
      )}
    >
      {label}
    </button>
  );
}

// =============================================================================
// GroupHeader — small section caption above each toggle group
// =============================================================================

interface GroupHeaderProps {
  children: React.ReactNode;
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
  const weatherOptions: Weather[] = ["sun", "rain", "sand", "snow"];

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

  function setTrickRoom(next: boolean) {
    onChange({ ...state, field: { ...state.field, trickRoom: next } });
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
          <Pill
            label="Tailwind"
            active={state.field.tailwind}
            onClick={() => setTailwind(!state.field.tailwind)}
          />
          <Pill
            label="Trick Room"
            active={state.field.trickRoom}
            onClick={() => setTrickRoom(!state.field.trickRoom)}
          />
          {weatherOptions.map((w) => (
            <Pill
              key={w}
              label={WEATHER_LABELS[w]}
              ariaLabel={`Weather ${WEATHER_LABELS[w]}`}
              active={state.field.weather === w}
              onClick={() => setWeather(w)}
            />
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
        <select
          aria-label="Held item"
          value={state.item}
          onChange={(e) => setItem(e.target.value)}
          className="bg-card text-foreground rounded-md border px-1.5 py-1 text-xs"
        >
          <option value="">None</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Status ------------------------------------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <GroupHeader>Status</GroupHeader>
        <select
          aria-label="Status condition"
          value={state.status}
          onChange={(e) => setStatus(e.target.value as "healthy" | "paralyzed")}
          className="bg-card text-foreground rounded-md border px-1.5 py-1 text-xs"
        >
          <option value="healthy">Healthy</option>
          <option value="paralyzed">Paralyzed</option>
        </select>
      </div>
    </div>
  );
}
