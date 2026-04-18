"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  type AttackerSideState,
  type BaseSideState,
  type DefenderSideState,
} from "./use-calc-state";

// =============================================================================
// Types
// =============================================================================

export type GameType = "Doubles" | "Singles";

interface CalcFieldFormProps {
  gameType: GameType;
  weather: string;
  terrain: string;
  gravity: boolean;
  onGameTypeChange: (v: GameType) => void;
  onWeatherChange: (v: string) => void;
  onTerrainChange: (v: string) => void;
  onGravityChange: (v: boolean) => void;
}

// =============================================================================
// Constants
// =============================================================================

const WEATHER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "None" },
  { value: "Sun", label: "Sun" },
  { value: "Rain", label: "Rain" },
  { value: "Sand", label: "Sand" },
  { value: "Snow", label: "Snow" },
];

const TERRAIN_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "None" },
  { value: "Electric", label: "Electric" },
  { value: "Grassy", label: "Grassy" },
  { value: "Misty", label: "Misty" },
  { value: "Psychic", label: "Psychic" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Field accordion content — game mode, weather, terrain, and global toggles.
 * Designed for the narrow 460px right rail.
 *
 * Note: This panel currently surfaces the calc-engine-supported global state
 * (Gravity). Trick Room / Magic Room / Wonder Room are not yet wired into
 * the underlying calc state — they would be no-ops until the engine layer
 * exposes them.
 */
export function CalcFieldForm({
  gameType,
  weather,
  terrain,
  gravity,
  onGameTypeChange,
  onWeatherChange,
  onTerrainChange,
  onGravityChange,
}: CalcFieldFormProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Mode pills — mutually exclusive */}
      <PillRow label="Mode" radioGroup>
        {(["Doubles", "Singles"] as const).map((g) => (
          <Pill
            key={g}
            active={gameType === g}
            onClick={() => onGameTypeChange(g)}
            testId={`calc-field-mode-${g.toLowerCase()}`}
            radio
          >
            {g}
          </Pill>
        ))}
      </PillRow>

      {/* Weather — mutually exclusive */}
      <PillRow label="Weather" radioGroup>
        {WEATHER_OPTIONS.map((opt) => (
          <Pill
            key={opt.value || "none"}
            active={weather === opt.value}
            onClick={() => onWeatherChange(opt.value)}
            testId={`calc-field-weather-${opt.label.toLowerCase()}`}
            radio
          >
            {opt.label}
          </Pill>
        ))}
      </PillRow>

      {/* Terrain — mutually exclusive */}
      <PillRow label="Terrain" radioGroup>
        {TERRAIN_OPTIONS.map((opt) => (
          <Pill
            key={opt.value || "none"}
            active={terrain === opt.value}
            onClick={() => onTerrainChange(opt.value)}
            testId={`calc-field-terrain-${opt.label.toLowerCase()}`}
            radio
          >
            {opt.label}
          </Pill>
        ))}
      </PillRow>

      {/* Other */}
      <PillRow label="Other">
        <Pill
          active={gravity}
          onClick={() => onGravityChange(!gravity)}
          testId="calc-field-gravity"
        >
          Gravity
        </Pill>
      </PillRow>
    </div>
  );
}

// =============================================================================
// Sides form (separate accordion content)
// =============================================================================

interface CalcSidesFormProps {
  attackerSide: AttackerSideState;
  defenderSide: DefenderSideState;
  onAttackerSideChange: (patch: Partial<AttackerSideState>) => void;
  onDefenderSideChange: (patch: Partial<DefenderSideState>) => void;
}

/**
 * Sides accordion content — per-side screens, support moves, and hazards.
 */
export function CalcSidesForm({
  attackerSide,
  defenderSide,
  onAttackerSideChange,
  onDefenderSideChange,
}: CalcSidesFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <SideBlock
        label="Your side"
        side={attackerSide}
        onChange={onAttackerSideChange}
      />
      <SideBlock
        label="Their side"
        side={defenderSide}
        onChange={onDefenderSideChange}
      />
      {/* Hazards — only meaningful on their side */}
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
          Hazards (their side)
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Pill
            active={defenderSide.stealthRock}
            onClick={() =>
              onDefenderSideChange({ stealthRock: !defenderSide.stealthRock })
            }
            testId="calc-hazards-sr"
          >
            Stealth Rock
          </Pill>
          <Pill
            active={defenderSide.saltCure}
            onClick={() =>
              onDefenderSideChange({ saltCure: !defenderSide.saltCure })
            }
            testId="calc-hazards-saltcure"
          >
            Salt Cure
          </Pill>
          {/* Spikes — single-select within itself */}
          <SpikesPicker
            value={defenderSide.spikes}
            onChange={(v) => onDefenderSideChange({ spikes: v })}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SideBlock — toggles for one side
// =============================================================================

interface SideBlockProps {
  label: string;
  side: AttackerSideState | DefenderSideState;
  onChange: (patch: Partial<BaseSideState>) => void;
}

function SideBlock({ label, side, onChange }: SideBlockProps) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        <Pill
          active={side.reflect}
          onClick={() => onChange({ reflect: !side.reflect })}
        >
          Reflect
        </Pill>
        <Pill
          active={side.lightScreen}
          onClick={() => onChange({ lightScreen: !side.lightScreen })}
        >
          Light Screen
        </Pill>
        <Pill
          active={side.auroraVeil}
          onClick={() => onChange({ auroraVeil: !side.auroraVeil })}
        >
          Aurora Veil
        </Pill>
        <Pill
          active={side.tailwind}
          onClick={() => onChange({ tailwind: !side.tailwind })}
        >
          Tailwind
        </Pill>
        <Pill
          active={side.helpingHand}
          onClick={() => onChange({ helpingHand: !side.helpingHand })}
        >
          Helping Hand
        </Pill>
        <Pill
          active={side.friendGuard}
          onClick={() => onChange({ friendGuard: !side.friendGuard })}
        >
          Friend Guard
        </Pill>
      </div>
    </div>
  );
}

// =============================================================================
// SpikesPicker
// =============================================================================

interface SpikesPickerProps {
  value: number;
  onChange: (v: number) => void;
}

function SpikesPicker({ value, onChange }: SpikesPickerProps) {
  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          "rounded border px-2 py-1 text-[11px]",
          value > 0
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-background text-muted-foreground"
        )}
      >
        Spikes
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Spikes layers"
        className="border-border bg-background h-7 rounded border px-1 text-xs"
      >
        {[0, 1, 2, 3].map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

// =============================================================================
// Pill primitives
// =============================================================================

interface PillRowProps {
  label: string;
  children: ReactNode;
  /** When true, wraps children in role="radiogroup" for mutually-exclusive pill groups. */
  radioGroup?: boolean;
}

function PillRow({ label, children, radioGroup }: PillRowProps) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <div
        className="flex flex-wrap gap-1"
        {...(radioGroup ? { role: "radiogroup", "aria-label": label } : {})}
      >
        {children}
      </div>
    </div>
  );
}

interface PillProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
  /** When true, renders with role="radio" + aria-checked for mutually-exclusive groups. */
  radio?: boolean;
}

function Pill({ active, onClick, children, testId, radio }: PillProps) {
  // Roving tabindex for the radio variant — only the active option is in the
  // tab order; arrow-key handling is delegated to the parent radiogroup since
  // PillRow already wraps the children with role="radiogroup".
  const radioProps = radio
    ? {
        role: "radio" as const,
        "aria-checked": active,
        tabIndex: active ? 0 : -1,
      }
    : { "aria-pressed": active };

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      {...radioProps}
      className={cn(
        "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors duration-150",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
