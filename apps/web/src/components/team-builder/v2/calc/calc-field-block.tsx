"use client";

import { cn } from "@/lib/utils";

import {
  type AttackerSideState,
  type DefenderSideState,
} from "../../use-calc-state";

// =============================================================================
// Types
// =============================================================================

interface CalcFieldBlockProps {
  gameType: "Doubles" | "Singles";
  setGameType: (v: "Doubles" | "Singles") => void;
  attackerSide: AttackerSideState;
  setAttackerSide: (patch: Partial<AttackerSideState>) => void;
  defenderSide: DefenderSideState;
  setDefenderSide: (patch: Partial<DefenderSideState>) => void;
  weather: string;
  setWeather: (v: string) => void;
  terrain: string;
  setTerrain: (v: string) => void;
  gravity: boolean;
  setGravity: (v: boolean) => void;
  foesAlive: 1 | 2;
  allyAlive: boolean;
  setFoesAlive: (v: 1 | 2) => void;
  setAllyAlive: (v: boolean) => void;
  /** Inferred weather from attacker ability (null when user has explicit weather or ability doesn't set it). */
  inferredWeather?: string | null;
  /** Inferred terrain from attacker ability (null when user has explicit terrain or ability doesn't set it). */
  inferredTerrain?: string | null;
  /** Attacker's ability name — shown in the "inferred from X" badge. */
  attackerAbility?: string | null;
  /** Fainted count for YOUR team (0..5), used for Last Respects BP scaling. */
  faintedYours: number;
  setFaintedYours: (n: number) => void;
  /** Fainted count for THEIR team (0..5), used for Last Respects BP scaling. */
  faintedTheirs: number;
  setFaintedTheirs: (n: number) => void;
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
  tailwind: boolean;
  onTailwind: () => void;
  reflect: boolean;
  onReflect: () => void;
  lightScreen: boolean;
  onLightScreen: () => void;
  helpingHand?: boolean;
  onHelpingHand?: () => void;
  stealthRock?: boolean;
  onStealthRock?: () => void;
  fainted: number;
  setFainted: (n: number) => void;
}

function SideCard({
  title,
  color,
  tailwind,
  onTailwind,
  reflect,
  onReflect,
  lightScreen,
  onLightScreen,
  helpingHand,
  onHelpingHand,
  stealthRock,
  onStealthRock,
  fainted,
  setFainted,
}: SideCardProps) {
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
        <ToggleBtn active={tailwind} onClick={onTailwind}>
          TW
        </ToggleBtn>
        <ToggleBtn active={reflect} onClick={onReflect}>
          Refl
        </ToggleBtn>
        <ToggleBtn active={lightScreen} onClick={onLightScreen}>
          L.Scr
        </ToggleBtn>
        {title === "Yours" && onHelpingHand !== undefined && (
          <ToggleBtn active={helpingHand ?? false} onClick={onHelpingHand}>
            H.Hand
          </ToggleBtn>
        )}
        {title === "Theirs" && onStealthRock !== undefined && (
          <ToggleBtn active={stealthRock ?? false} onClick={onStealthRock}>
            ⛰ Rocks
          </ToggleBtn>
        )}
      </div>

      {/* Fainted stepper */}
      <div className="flex items-center gap-1 border-t border-dashed pt-1.5 font-mono text-[9.5px] text-muted-foreground">
        <span>FAINTED</span>
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
 * Field condition block — sectioned layout for the Phase 5 bottom-panel Field column.
 * Also used in CalcDrawer for the right-rail (mobile + desktop).
 */
export function CalcFieldBlock({
  gameType,
  setGameType,
  attackerSide,
  setAttackerSide,
  defenderSide,
  setDefenderSide,
  weather,
  setWeather,
  terrain,
  setTerrain,
  gravity,
  setGravity,
  foesAlive,
  allyAlive,
  setFoesAlive,
  setAllyAlive,
  inferredWeather = null,
  inferredTerrain = null,
  attackerAbility = null,
  faintedYours,
  setFaintedYours,
  faintedTheirs,
  setFaintedTheirs,
}: CalcFieldBlockProps) {
  return (
    <div className="flex h-full flex-col gap-2.5 overflow-y-auto">
      {/* ── Col head: eyebrow + Singles/Doubles toggle ─────────────────────── */}
      <div className="flex items-center justify-between border-b pb-2">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400">
          Field
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setGameType("Singles")}
            className={cn(
              "rounded px-2 py-0.5 font-mono text-[10px] transition-colors",
              gameType === "Singles"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            Singles
          </button>
          <button
            type="button"
            onClick={() => setGameType("Doubles")}
            className={cn(
              "rounded px-2 py-0.5 font-mono text-[10px] transition-colors",
              gameType === "Doubles"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            Doubles
          </button>
        </div>
      </div>

      {/* ── Doubles meta row ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1.5 font-mono text-[10.5px]">
        {gameType === "Doubles" && (
          <>
            <span className="text-muted-foreground">FOES</span>
            <Stepper<1 | 2>
              options={FOES_ALIVE_OPTIONS}
              value={foesAlive}
              onChange={setFoesAlive}
            />
            <span className="text-muted-foreground">ALLY</span>
            <ToggleBtn
              active={allyAlive}
              onClick={() => setAllyAlive(!allyAlive)}
            >
              {allyAlive ? "alive" : "fainted"}
            </ToggleBtn>
          </>
        )}
        <ToggleBtn
          active={gravity}
          onClick={() => setGravity(!gravity)}
        >
          🌀 Grav
        </ToggleBtn>
      </div>

      {/* ── Weather ────────────────────────────────────────────────────────── */}
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

      {/* ── Terrain ────────────────────────────────────────────────────────── */}
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

      {/* ── Sides ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
          Sides
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <SideCard
            title="Yours"
            color="primary"
            tailwind={attackerSide.tailwind}
            onTailwind={() =>
              setAttackerSide({ tailwind: !attackerSide.tailwind })
            }
            reflect={attackerSide.reflect}
            onReflect={() =>
              setAttackerSide({ reflect: !attackerSide.reflect })
            }
            lightScreen={attackerSide.lightScreen}
            onLightScreen={() =>
              setAttackerSide({ lightScreen: !attackerSide.lightScreen })
            }
            helpingHand={attackerSide.helpingHand}
            onHelpingHand={() =>
              setAttackerSide({ helpingHand: !attackerSide.helpingHand })
            }
            fainted={faintedYours}
            setFainted={setFaintedYours}
          />
          <SideCard
            title="Theirs"
            color="destructive"
            tailwind={defenderSide.tailwind}
            onTailwind={() =>
              setDefenderSide({ tailwind: !defenderSide.tailwind })
            }
            reflect={defenderSide.reflect}
            onReflect={() =>
              setDefenderSide({ reflect: !defenderSide.reflect })
            }
            lightScreen={defenderSide.lightScreen}
            onLightScreen={() =>
              setDefenderSide({ lightScreen: !defenderSide.lightScreen })
            }
            stealthRock={defenderSide.stealthRock}
            onStealthRock={() =>
              setDefenderSide({ stealthRock: !defenderSide.stealthRock })
            }
            fainted={faintedTheirs}
            setFainted={setFaintedTheirs}
          />
        </div>
      </div>
    </div>
  );
}
