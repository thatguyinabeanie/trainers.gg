"use client";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

import { type BaseSideState } from "../use-calc-state";

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
    <div className="inline-flex overflow-hidden rounded-full border border-border">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "border-r border-border px-1.5 py-px font-mono text-[10px] last:border-r-0 transition-colors",
            value === o
              ? "bg-primary text-primary-foreground font-semibold"
              : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
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
      className={cn(
        "rounded-full border px-2 py-0.5 font-mono text-[10px] leading-tight transition-all",
        active
          ? "border-primary/50 bg-primary/10 text-primary font-semibold shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// =============================================================================
// SideMirrorRow — a single row in the mirrored Ours | Label | Theirs grid
// =============================================================================

function SideSwitchRow({
  label,
  yours,
  theirs,
  onToggleYours,
  onToggleTheirs,
}: {
  label: string;
  yours: boolean;
  theirs: boolean;
  onToggleYours: () => void;
  onToggleTheirs: () => void;
}) {
  return (
    <>
      <div className="flex justify-end">
        <Switch size="sm" checked={yours} onCheckedChange={onToggleYours} aria-label={`${label} (ours)`} />
      </div>
      <span className="text-center text-[11px]">{label}</span>
      <div className="flex justify-start">
        <Switch size="sm" checked={theirs} onCheckedChange={onToggleTheirs} aria-label={`${label} (theirs)`} />
      </div>
    </>
  );
}

function SideSectionLabel({ label }: { label: string }) {
  return (
    <div className="col-span-3 flex items-center gap-2 pt-1">
      <div className="flex-1 border-t border-dashed border-border/40" />
      <span className="font-mono text-[8.5px] uppercase tracking-wide text-muted-foreground/70">
        {label}
      </span>
      <div className="flex-1 border-t border-dashed border-border/40" />
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
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      {/* Header: eyebrow + Singles/Doubles toggle */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
          Field
        </span>
        <div className="inline-flex overflow-hidden rounded-full border border-border">
          <button
            type="button"
            onClick={() => setGameType("Singles")}
            className={cn(
              "px-2.5 py-0.5 font-mono text-[10px] transition-colors",
              gameType === "Singles"
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            Singles
          </button>
          <button
            type="button"
            onClick={() => setGameType("Doubles")}
            className={cn(
              "px-2.5 py-0.5 font-mono text-[10px] border-l border-border transition-colors",
              gameType === "Doubles"
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            Doubles
          </button>
        </div>
      </div>

      {/* Conditions: weather, terrain, gravity, fairy aura */}
      <fieldset className="rounded-lg border border-border/60 px-3 py-2">
        <legend className="px-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
          Conditions
        </legend>
        <div className="flex flex-col gap-2">
          {/* Weather */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8.5px] uppercase tracking-wide text-muted-foreground/70 shrink-0">
              Weather
            </span>
            <div className="flex flex-1 flex-wrap justify-end gap-1">
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
              <span className="font-mono text-[8.5px] italic text-muted-foreground">
                ↳ {attackerAbility ?? inferredWeather}
              </span>
            )}
          </div>
          {/* Terrain */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8.5px] uppercase tracking-wide text-muted-foreground/70 shrink-0">
              Terrain
            </span>
            <div className="flex flex-1 flex-wrap justify-end gap-1">
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
              <span className="font-mono text-[8.5px] italic text-muted-foreground">
                ↳ {attackerAbility ?? inferredTerrain}
              </span>
            )}
          </div>
          {/* Other */}
          <div className="flex items-center gap-2 border-t border-dashed border-border/40 pt-1.5">
            <span className="font-mono text-[8.5px] uppercase tracking-wide text-muted-foreground/70 shrink-0">
              Other
            </span>
            <div className="flex flex-1 flex-wrap justify-end gap-1">
              <ToggleBtn active={gravity} onClick={() => setGravity(!gravity)}>
                Gravity
              </ToggleBtn>
              <ToggleBtn active={fairyAura} onClick={() => setFairyAura(!fairyAura)}>
                Fairy Aura
              </ToggleBtn>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Doubles-specific row — only visible in Doubles mode */}
      {gameType === "Doubles" && (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Doubles
          </span>
          <span className="font-mono text-[9px] text-muted-foreground">Foes</span>
          <Stepper<1 | 2>
            options={FOES_ALIVE_OPTIONS}
            value={foesAlive}
            onChange={setFoesAlive}
          />
          <span className="font-mono text-[9px] text-muted-foreground">Ally</span>
          <ToggleBtn active={allyAlive} onClick={() => setAllyAlive(!allyAlive)}>
            {allyAlive ? "Alive" : "Fainted"}
          </ToggleBtn>
        </div>
      )}

      {/* Sides — mirrored Ours | Label | Theirs grid */}
      <fieldset className="rounded-lg border border-border/60 px-3 py-2">
        <legend className="px-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-primary">
          Sides
        </legend>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-1 gap-y-0.5">
          {/* Header */}
          <span className="text-muted-foreground text-right text-[10px] font-semibold uppercase tracking-wider">
            Ours
          </span>
          <span />
          <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            Theirs
          </span>

          {/* Boosts */}
          <SideSwitchRow
            label="Helping Hand"
            yours={attackerSide.helpingHand}
            theirs={defenderSide.helpingHand}
            onToggleYours={() => setAttackerSide({ helpingHand: !attackerSide.helpingHand })}
            onToggleTheirs={() => setDefenderSide({ helpingHand: !defenderSide.helpingHand })}
          />
          <SideSwitchRow
            label="Friend Guard"
            yours={attackerSide.friendGuard}
            theirs={defenderSide.friendGuard}
            onToggleYours={() => setAttackerSide({ friendGuard: !attackerSide.friendGuard })}
            onToggleTheirs={() => setDefenderSide({ friendGuard: !defenderSide.friendGuard })}
          />
          <SideSwitchRow
            label="Salt Cure"
            yours={attackerSide.saltCure}
            theirs={defenderSide.saltCure}
            onToggleYours={() => setAttackerSide({ saltCure: !attackerSide.saltCure })}
            onToggleTheirs={() => setDefenderSide({ saltCure: !defenderSide.saltCure })}
          />

          {/* Knocked Out */}
          <div className="flex justify-end">
            <Stepper<(typeof FAINTED_OPTIONS)[number]>
              options={FAINTED_OPTIONS}
              value={faintedYours as (typeof FAINTED_OPTIONS)[number]}
              onChange={setFaintedYours}
            />
          </div>
          <span className="text-center text-[11px]">Knocked Out</span>
          <div className="flex justify-start">
            <Stepper<(typeof FAINTED_OPTIONS)[number]>
              options={FAINTED_OPTIONS}
              value={faintedTheirs as (typeof FAINTED_OPTIONS)[number]}
              onChange={setFaintedTheirs}
            />
          </div>

          {/* Screens */}
          <SideSectionLabel label="Screens" />
          <SideSwitchRow
            label="Reflect"
            yours={attackerSide.reflect}
            theirs={defenderSide.reflect}
            onToggleYours={() => setAttackerSide({ reflect: !attackerSide.reflect })}
            onToggleTheirs={() => setDefenderSide({ reflect: !defenderSide.reflect })}
          />
          <SideSwitchRow
            label="Light Screen"
            yours={attackerSide.lightScreen}
            theirs={defenderSide.lightScreen}
            onToggleYours={() => setAttackerSide({ lightScreen: !attackerSide.lightScreen })}
            onToggleTheirs={() => setDefenderSide({ lightScreen: !defenderSide.lightScreen })}
          />
          <SideSwitchRow
            label="Aurora Veil"
            yours={attackerSide.auroraVeil}
            theirs={defenderSide.auroraVeil}
            onToggleYours={() => setAttackerSide({ auroraVeil: !attackerSide.auroraVeil })}
            onToggleTheirs={() => setDefenderSide({ auroraVeil: !defenderSide.auroraVeil })}
          />

          {/* Hazards */}
          <SideSectionLabel label="Hazards" />
          <SideSwitchRow
            label="Stealth Rock"
            yours={attackerSide.stealthRock}
            theirs={defenderSide.stealthRock}
            onToggleYours={() => setAttackerSide({ stealthRock: !attackerSide.stealthRock })}
            onToggleTheirs={() => setDefenderSide({ stealthRock: !defenderSide.stealthRock })}
          />

          {/* Spikes */}
          <div className="flex justify-end">
            <Stepper<0 | 1 | 2 | 3>
              options={[0, 1, 2, 3] as const}
              value={attackerSide.spikes}
              onChange={(v) => setAttackerSide({ spikes: v })}
            />
          </div>
          <span className="text-center text-[11px]">Spikes</span>
          <div className="flex justify-start">
            <Stepper<0 | 1 | 2 | 3>
              options={[0, 1, 2, 3] as const}
              value={defenderSide.spikes}
              onChange={(v) => setDefenderSide({ spikes: v })}
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
