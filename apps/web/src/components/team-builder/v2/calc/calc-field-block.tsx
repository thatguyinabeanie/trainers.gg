"use client";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

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
// SideColumn — one column within the combined Sides card
// =============================================================================

interface SideColumnProps {
  title: "Yours" | "Theirs";
  color: "primary" | "destructive";
  side: BaseSideState;
  onUpdate: (patch: Partial<BaseSideState>) => void;
  fainted: number;
  setFainted: (n: number) => void;
}

function SideRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-foreground">{label}</span>
      <Switch checked={active} onCheckedChange={onToggle} />
    </div>
  );
}

function SideColumn({ title, color, side, onUpdate, fainted, setFainted }: SideColumnProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "font-mono text-[9px] font-bold uppercase tracking-[0.12em]",
          color === "primary" ? "text-primary" : "text-destructive"
        )}
      >
        {title}
      </div>

      {/* Boosts */}
      <SideRow label="Helping Hand" active={side.helpingHand} onToggle={() => onUpdate({ helpingHand: !side.helpingHand })} />
      <SideRow label="Friend Guard" active={side.friendGuard} onToggle={() => onUpdate({ friendGuard: !side.friendGuard })} />
      <SideRow label="Salt Cure" active={side.saltCure} onToggle={() => onUpdate({ saltCure: !side.saltCure })} />
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground">Knocked Out</span>
        <Stepper<(typeof FAINTED_OPTIONS)[number]>
          options={FAINTED_OPTIONS}
          value={fainted as (typeof FAINTED_OPTIONS)[number]}
          onChange={setFainted}
        />
      </div>

      {/* Screens */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[8.5px] uppercase tracking-wide text-muted-foreground/70">Screens</span>
        <SideRow label="Reflect" active={side.reflect} onToggle={() => onUpdate({ reflect: !side.reflect })} />
        <SideRow label="Light Screen" active={side.lightScreen} onToggle={() => onUpdate({ lightScreen: !side.lightScreen })} />
        <SideRow label="Aurora Veil" active={side.auroraVeil} onToggle={() => onUpdate({ auroraVeil: !side.auroraVeil })} />
      </div>

      {/* Hazards */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[8.5px] uppercase tracking-wide text-muted-foreground/70">Hazards</span>
        <SideRow label="Stealth Rock" active={side.stealthRock} onToggle={() => onUpdate({ stealthRock: !side.stealthRock })} />
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground">Spikes</span>
          <Stepper<0 | 1 | 2 | 3>
            options={[0, 1, 2, 3] as const}
            value={side.spikes}
            onChange={(v) => onUpdate({ spikes: v })}
          />
        </div>
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
      <fieldset className="rounded-lg border border-border/60 px-2.5 py-2">
        <legend className="px-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
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

      {/* Sides — stacked vertically */}
      <fieldset className="rounded-lg border border-border/60 px-2.5 py-2">
        <legend className="px-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Sides
        </legend>
        <div className="flex flex-col gap-4">
          <SideColumn
            title="Yours"
            color="primary"
            side={attackerSide}
            onUpdate={setAttackerSide}
            fainted={faintedYours}
            setFainted={setFaintedYours}
          />
          <div className="border-t border-border/40" />
          <SideColumn
            title="Theirs"
            color="destructive"
            side={defenderSide}
            onUpdate={setDefenderSide}
            fainted={faintedTheirs}
            setFainted={setFaintedTheirs}
          />
        </div>
      </fieldset>
    </div>
  );
}
