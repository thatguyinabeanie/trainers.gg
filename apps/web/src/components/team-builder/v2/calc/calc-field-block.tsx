"use client";

import { cn } from "@/lib/utils";

import { type BaseSideState } from "../../use-calc-state";

// =============================================================================
// Types
// =============================================================================

/** Flat field-condition values (weather, terrain, and global toggles). */
export interface FieldConditions {
  weather: string;
  terrain: string;
  gravity: boolean;
  fairyAura: boolean;
}

/** Setters for each individual field condition. */
export interface FieldConditionSetters {
  setWeather: (v: string) => void;
  setTerrain: (v: string) => void;
  setGravity: (v: boolean) => void;
  setFairyAura: (v: boolean) => void;
}

/** Doubles-specific state (hidden in Singles mode). */
export interface DoublesState {
  foesAlive: 1 | 2;
  allyAlive: boolean;
}

/** Setters for doubles-specific state. */
export interface DoublesStateSetters {
  setFoesAlive: (v: 1 | 2) => void;
  setAllyAlive: (v: boolean) => void;
}

/** Fainted counters for both sides. */
export interface FaintedCounts {
  yours: number;
  theirs: number;
}

/** Setters for fainted counters. */
export interface FaintedCountSetters {
  setYours: (n: number) => void;
  setTheirs: (n: number) => void;
}

/** Optional values inferred from the attacker's ability. */
export interface InferredConditions {
  weather: string | null;
  terrain: string | null;
  attackerAbility: string | null;
}

interface CalcFieldBlockProps {
  gameType: "Doubles" | "Singles";
  setGameType: (v: "Doubles" | "Singles") => void;

  attackerSide: BaseSideState;
  setAttackerSide: (patch: Partial<BaseSideState>) => void;
  defenderSide: BaseSideState;
  setDefenderSide: (patch: Partial<BaseSideState>) => void;

  /** Weather, terrain, gravity, and fairy aura values. */
  field: FieldConditions;
  /** Setters for each field condition. */
  setField: FieldConditionSetters;

  /** Doubles-specific state (foesAlive, allyAlive). Hidden in Singles mode. */
  doubles: DoublesState;
  /** Setters for doubles-specific state. */
  setDoubles: DoublesStateSetters;

  /** Fainted counters for each side. */
  fainted: FaintedCounts;
  /** Setters for each fainted counter. */
  setFainted: FaintedCountSetters;

  /** Values inferred from the attacker's ability (all optional). */
  inferred?: InferredConditions;
}

// =============================================================================
// Constants
// =============================================================================

/** @smogon/calc weather values — capitalized. */
const WEATHER_OPTIONS: { value: string; label: string }[] = [
  { value: "Sun", label: "Sun" },
  { value: "Rain", label: "Rain" },
  { value: "Sand", label: "Sand" },
  { value: "Snow", label: "Snow" },
];

/** @smogon/calc terrain values — capitalized. */
const TERRAIN_OPTIONS: { value: string; label: string }[] = [
  { value: "Grassy", label: "Grassy" },
  { value: "Electric", label: "Electric" },
  { value: "Psychic", label: "Psychic" },
  { value: "Misty", label: "Misty" },
];

const FAINTED_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
const FOES_ALIVE_OPTIONS = [1, 2] as const;

// =============================================================================
// Stepper — inline segment control for small numeric values
// =============================================================================

interface StepperProps<T extends number> {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}

function Stepper<T extends number>({ options, value, onChange }: StepperProps<T>) {
  return (
    <div className="inline-flex overflow-hidden rounded border bg-card">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "cursor-default border-r px-1.5 py-px font-mono text-[10px] last:border-r-0",
            value === o
              ? "bg-primary text-primary-foreground"
              : "bg-card text-foreground hover:bg-muted"
          )}
        >
          {String(o)}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// ToggleBtn — local primitive
// =============================================================================

interface ToggleBtnProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToggleBtn({ active, onClick, children }: ToggleBtnProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("cd-toggle", active && "cd-toggle--on")}
    >
      {children}
    </button>
  );
}

// =============================================================================
// SideCard — yours / theirs side condition block
// =============================================================================

interface SideCardProps {
  title: "Yours" | "Theirs";
  color: "primary" | "destructive";
  side: BaseSideState;
  onUpdate: (patch: Partial<BaseSideState>) => void;
  fainted: number;
  setFainted: (n: number) => void;
}

function SideCard({ title, color, side, onUpdate, fainted, setFainted }: SideCardProps) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div
        className={cn(
          "mb-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.07em]",
          color === "primary" ? "text-primary" : "text-destructive"
        )}
      >
        ▸ {title}
      </div>

      <div className="mb-1.5 flex flex-wrap gap-1">
        <ToggleBtn active={side.tailwind} onClick={() => onUpdate({ tailwind: !side.tailwind })}>
          Tailwind
        </ToggleBtn>
        <ToggleBtn active={side.reflect} onClick={() => onUpdate({ reflect: !side.reflect })}>
          Reflect
        </ToggleBtn>
        <ToggleBtn active={side.lightScreen} onClick={() => onUpdate({ lightScreen: !side.lightScreen })}>
          Light Screen
        </ToggleBtn>
        <ToggleBtn active={side.auroraVeil} onClick={() => onUpdate({ auroraVeil: !side.auroraVeil })}>
          Aurora Veil
        </ToggleBtn>
        <ToggleBtn active={side.helpingHand} onClick={() => onUpdate({ helpingHand: !side.helpingHand })}>
          Helping Hand
        </ToggleBtn>
        <ToggleBtn active={side.friendGuard} onClick={() => onUpdate({ friendGuard: !side.friendGuard })}>
          Friend Guard
        </ToggleBtn>
        <ToggleBtn active={side.protect} onClick={() => onUpdate({ protect: !side.protect })}>
          Protect
        </ToggleBtn>
      </div>

      {/* Hazards */}
      <div className="mb-1.5 flex flex-wrap items-center gap-1 border-t border-dashed pt-1.5">
        <ToggleBtn active={side.stealthRock} onClick={() => onUpdate({ stealthRock: !side.stealthRock })}>
          Stealth Rock
        </ToggleBtn>
        <div className="flex items-center gap-1 font-mono text-[9.5px] text-muted-foreground">
          <span>Spikes</span>
          <Stepper<0 | 1 | 2 | 3>
            options={[0, 1, 2, 3] as const}
            value={side.spikes}
            onChange={(v) => onUpdate({ spikes: v })}
          />
        </div>
        <ToggleBtn active={side.saltCure} onClick={() => onUpdate({ saltCure: !side.saltCure })}>
          Salt Cure
        </ToggleBtn>
      </div>

      {/* Fainted */}
      <div className="flex items-center gap-1 border-t border-dashed pt-1.5 font-mono text-[9.5px] text-muted-foreground">
        <span>Fainted</span>
        <Stepper<(typeof FAINTED_OPTIONS)[number]>
          options={FAINTED_OPTIONS}
          value={fainted as (typeof FAINTED_OPTIONS)[number]}
          onChange={setFainted}
        />
      </div>
    </div>
  );
}

// =============================================================================
// CalcFieldBlock
// =============================================================================

/**
 * Field condition block — sectioned layout for the bottom-panel Field column.
 * Also used in CalcDrawer for the right-rail (mobile + desktop).
 */
export function CalcFieldBlock({
  gameType,
  setGameType,
  attackerSide,
  setAttackerSide,
  defenderSide,
  setDefenderSide,
  field,
  setField,
  doubles,
  setDoubles,
  fainted,
  setFainted,
  inferred,
}: CalcFieldBlockProps) {
  const { weather, terrain, gravity, fairyAura } = field;
  const { setWeather, setTerrain, setGravity, setFairyAura } = setField;
  const { foesAlive, allyAlive } = doubles;
  const { setFoesAlive, setAllyAlive } = setDoubles;
  const { yours: faintedYours, theirs: faintedTheirs } = fainted;
  const { setYours: setFaintedYours, setTheirs: setFaintedTheirs } = setFainted;
  const inferredWeather = inferred?.weather ?? null;
  const inferredTerrain = inferred?.terrain ?? null;
  const attackerAbility = inferred?.attackerAbility ?? null;
  return (
    <div className="flex h-full flex-col gap-2.5 overflow-y-auto">
      {/* Header: eyebrow + Singles/Doubles toggle */}
      <div className="flex items-center justify-between border-b pb-2">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400">
          Field
        </span>
        <div className="flex gap-1">
          <ToggleBtn active={gameType === "Singles"} onClick={() => setGameType("Singles")}>
            Singles
          </ToggleBtn>
          <ToggleBtn active={gameType === "Doubles"} onClick={() => setGameType("Doubles")}>
            Doubles
          </ToggleBtn>
        </div>
      </div>

      {/* Global effects */}
      <div>
        <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
          Global
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted/40 px-2 py-1.5">
          {gameType === "Doubles" && (
            <>
              <span className="font-mono text-[10.5px] text-muted-foreground">Foes</span>
              <Stepper<1 | 2>
                options={FOES_ALIVE_OPTIONS}
                value={foesAlive}
                onChange={setFoesAlive}
              />
              <span className="font-mono text-[10.5px] text-muted-foreground">Ally</span>
              <ToggleBtn active={allyAlive} onClick={() => setAllyAlive(!allyAlive)}>
                {allyAlive ? "Alive" : "Fainted"}
              </ToggleBtn>
            </>
          )}
          <ToggleBtn active={gravity} onClick={() => setGravity(!gravity)}>
            Gravity
          </ToggleBtn>
          <ToggleBtn active={fairyAura} onClick={() => setFairyAura(!fairyAura)}>
            Fairy Aura
          </ToggleBtn>
        </div>
      </div>

      {/* Conditions: weather + terrain side-by-side */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
            Weather
          </div>
          <div className="flex flex-wrap gap-1">
            {WEATHER_OPTIONS.map(({ value, label }) => (
              <ToggleBtn
                key={value}
                active={weather === value || (weather === "" && inferredWeather === value)}
                onClick={() => setWeather(weather === value ? "" : value)}
              >
                {label}
              </ToggleBtn>
            ))}
          </div>
          {weather === "" && inferredWeather && (
            <div className="mt-1 font-mono text-[9.5px] italic text-muted-foreground">
              ↳ inferred from {attackerAbility ?? inferredWeather}
            </div>
          )}
        </div>
        <div>
          <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
            Terrain
          </div>
          <div className="flex flex-wrap gap-1">
            {TERRAIN_OPTIONS.map(({ value, label }) => (
              <ToggleBtn
                key={value}
                active={terrain === value || (terrain === "" && inferredTerrain === value)}
                onClick={() => setTerrain(terrain === value ? "" : value)}
              >
                {label}
              </ToggleBtn>
            ))}
          </div>
          {terrain === "" && inferredTerrain && (
            <div className="mt-1 font-mono text-[9.5px] italic text-muted-foreground">
              ↳ inferred from {attackerAbility ?? inferredTerrain}
            </div>
          )}
        </div>
      </div>

      {/* Sides */}
      <div>
        <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
          Sides
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <SideCard
            title="Yours"
            color="primary"
            side={attackerSide}
            onUpdate={setAttackerSide}
            fainted={faintedYours}
            setFainted={setFaintedYours}
          />
          <SideCard
            title="Theirs"
            color="destructive"
            side={defenderSide}
            onUpdate={setDefenderSide}
            fainted={faintedTheirs}
            setFainted={setFaintedTheirs}
          />
        </div>
      </div>
    </div>
  );
}
