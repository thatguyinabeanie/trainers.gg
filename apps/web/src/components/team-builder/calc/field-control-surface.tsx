"use client";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { type UseCalcStateReturn } from "../use-calc-state";

// =============================================================================
// Types
// =============================================================================

export interface FieldControlSurfaceProps {
  calc: UseCalcStateReturn;
  className?: string;
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

// =============================================================================
// Local primitives
// =============================================================================

/**
 * Pill toggle button — teal when active, muted when inactive.
 * ≥40px tap target via min-h-10 sm:min-h-auto.
 */
interface PillToggleProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function PillToggle({ active, onClick, children }: PillToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        // Minimum 40px tap target on all viewports
        "flex min-h-10 items-center rounded-full border px-3 py-1 font-mono text-xs leading-none transition-all sm:min-h-0 sm:px-2 sm:py-0.5",
        active
          ? "border-primary/50 bg-primary/10 text-primary font-semibold shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Numeric stepper — inline pill segment control for `0 | 1 | 2 | 3` values.
 * Each step is a ≥40px tap target on mobile.
 */
interface SpikesStepperProps {
  value: 0 | 1 | 2 | 3;
  onChange: (v: 0 | 1 | 2 | 3) => void;
}

const SPIKES_OPTIONS = [0, 1, 2, 3] as const;

function SpikesStepper({ value, onChange }: SpikesStepperProps) {
  return (
    <div className="border-border inline-flex overflow-hidden rounded-full border">
      {SPIKES_OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            // Minimum 40px tap target; narrower on sm+
            "border-border flex min-h-10 min-w-10 items-center justify-center border-r px-1.5 font-mono text-xs transition-colors last:border-r-0 sm:min-h-0 sm:min-w-0 sm:py-px",
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

/**
 * Mirrored row: a switch on each side with a centered label.
 * The three-cell grid is provided by the parent container.
 */
interface SideSwitchRowProps {
  label: string;
  yours: boolean;
  theirs: boolean;
  onToggleYours: () => void;
  onToggleTheirs: () => void;
}

function SideSwitchRow({
  label,
  yours,
  theirs,
  onToggleYours,
  onToggleTheirs,
}: SideSwitchRowProps) {
  return (
    <>
      <div className="flex justify-end">
        <Switch
          size="sm"
          checked={yours}
          onCheckedChange={onToggleYours}
          aria-label={`${label} (ours)`}
        />
      </div>
      <span className="text-muted-foreground text-center text-xs">{label}</span>
      <div className="flex justify-start">
        <Switch
          size="sm"
          checked={theirs}
          onCheckedChange={onToggleTheirs}
          aria-label={`${label} (theirs)`}
        />
      </div>
    </>
  );
}

/** Visual divider with a centered label — spans the full 3-column row. */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="col-span-3 flex items-center gap-2 pt-1">
      <div className="border-border/40 flex-1 border-t border-dashed" />
      <span className="text-muted-foreground/70 font-mono text-xs tracking-wide uppercase">
        {label}
      </span>
      <div className="border-border/40 flex-1 border-t border-dashed" />
    </div>
  );
}

// =============================================================================
// FieldControlSurface
// =============================================================================

/**
 * Versus-view field control surface — all conditions visible up front with no
 * nested menus.
 *
 * Sections:
 * 1. Game type toggle (Singles / Doubles) — shadcn ToggleGroup, single-select
 * 2. Weather pills — Sun / Rain / Sand / Snow; clicking active clears to "" (auto)
 * 3. Terrain pills — Grassy / Electric / Psychic / Misty; same clear behaviour
 * 4. Other — Gravity + Fairy Aura toggle pills
 *    // Trick Room intentionally omitted — no setter in use-calc-state and no damage impact
 * 5. Sides grid — Ours | label | Theirs mirrored layout:
 *    - Reflect, Light Screen, Aurora Veil (screen toggles via Switch)
 *    - Stealth Rock (hazard toggle via Switch)
 *    - Spikes (0–3 count stepper)
 *
 * Accepts `calc: UseCalcStateReturn` directly — mirrors the versus-view
 * pattern where the full hook return is passed as a single prop.
 */
export function FieldControlSurface({
  calc,
  className,
}: FieldControlSurfaceProps) {
  const {
    gameType,
    setGameType,
    weather,
    setWeather,
    terrain,
    setTerrain,
    gravity,
    setGravity,
    fairyAura,
    setFairyAura,
    magicRoom,
    setMagicRoom,
    wonderRoom,
    setWonderRoom,
    inferredWeather,
    inferredTerrain,
    attackerSide,
    setAttackerSide,
    defenderSide,
    setDefenderSide,
  } = calc;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* ── 1. Game type ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-primary font-mono text-xs font-bold tracking-[0.12em] uppercase">
          Field
        </span>
        <ToggleGroup
          aria-label="Game type"
          value={[gameType]}
          size="sm"
          onValueChange={(next) => {
            // Single-select: Base UI returns [] on deselect — disallow empty
            // state by keeping the current value when nothing is picked.
            const [picked] = next;
            if (!picked || picked === gameType) return;
            setGameType(picked as "Singles" | "Doubles");
          }}
        >
          <ToggleGroupItem value="Singles" aria-label="Singles">
            Singles
          </ToggleGroupItem>
          <ToggleGroupItem value="Doubles" aria-label="Doubles">
            Doubles
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* ── 2. Weather ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground/70 shrink-0 font-mono text-xs tracking-wide uppercase">
            Weather
          </span>
          <div className="flex flex-wrap justify-end gap-1">
            {WEATHER_OPTIONS.map(({ value, label }) => (
              <PillToggle
                key={value}
                active={weather === value}
                onClick={() => setWeather(weather === value ? "" : value)}
              >
                {label}
              </PillToggle>
            ))}
          </div>
        </div>
        {/* Auto-inferred hint — only when no explicit weather is set */}
        {weather === "" && inferredWeather && (
          <p className="text-muted-foreground text-right font-mono text-xs italic">
            auto: {inferredWeather}
          </p>
        )}
      </div>

      {/* ── 3. Terrain ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground/70 shrink-0 font-mono text-xs tracking-wide uppercase">
            Terrain
          </span>
          <div className="flex flex-wrap justify-end gap-1">
            {TERRAIN_OPTIONS.map(({ value, label }) => (
              <PillToggle
                key={value}
                active={terrain === value}
                onClick={() => setTerrain(terrain === value ? "" : value)}
              >
                {label}
              </PillToggle>
            ))}
          </div>
        </div>
        {/* Auto-inferred hint — only when no explicit terrain is set */}
        {terrain === "" && inferredTerrain && (
          <p className="text-muted-foreground text-right font-mono text-xs italic">
            auto: {inferredTerrain}
          </p>
        )}
      </div>

      {/* ── 4. Other ──────────────────────────────────────────────────── */}
      {/* Trick Room intentionally omitted — no setter in use-calc-state and no damage impact */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/70 shrink-0 font-mono text-xs tracking-wide uppercase">
          Other
        </span>
        <div className="flex flex-wrap gap-1">
          <PillToggle active={gravity} onClick={() => setGravity(!gravity)}>
            Gravity
          </PillToggle>
          <PillToggle
            active={fairyAura}
            onClick={() => setFairyAura(!fairyAura)}
          >
            Fairy Aura
          </PillToggle>
          <PillToggle
            active={magicRoom}
            onClick={() => setMagicRoom(!magicRoom)}
          >
            Magic Room
          </PillToggle>
          <PillToggle
            active={wonderRoom}
            onClick={() => setWonderRoom(!wonderRoom)}
          >
            Wonder Room
          </PillToggle>
        </div>
      </div>

      {/* ── 5. Sides grid ─────────────────────────────────────────────── */}
      <fieldset className="border-border/60 rounded-lg border px-3 py-2">
        <legend className="text-primary px-1 font-mono text-xs font-bold tracking-[0.12em] uppercase">
          Sides
        </legend>

        {/*
          Three-column grid: [1fr auto 1fr]
          Left column = Ours (attacker side), centre = label, right = Theirs (defender side).
          On narrow viewports (<360px) flex-wrap triggers so the columns don't overflow.
        */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-1 gap-y-1">
          {/* Column headers */}
          <span className="text-muted-foreground text-right font-mono text-xs font-semibold tracking-wider uppercase">
            Ours
          </span>
          <span />
          <span className="text-muted-foreground font-mono text-xs font-semibold tracking-wider uppercase">
            Theirs
          </span>

          {/* ── Screens section ─────────────────────────────────────── */}
          <SectionDivider label="Screens" />

          <SideSwitchRow
            label="Reflect"
            yours={attackerSide.reflect}
            theirs={defenderSide.reflect}
            onToggleYours={() =>
              setAttackerSide({ reflect: !attackerSide.reflect })
            }
            onToggleTheirs={() =>
              setDefenderSide({ reflect: !defenderSide.reflect })
            }
          />

          <SideSwitchRow
            label="Light Screen"
            yours={attackerSide.lightScreen}
            theirs={defenderSide.lightScreen}
            onToggleYours={() =>
              setAttackerSide({ lightScreen: !attackerSide.lightScreen })
            }
            onToggleTheirs={() =>
              setDefenderSide({ lightScreen: !defenderSide.lightScreen })
            }
          />

          <SideSwitchRow
            label="Aurora Veil"
            yours={attackerSide.auroraVeil}
            theirs={defenderSide.auroraVeil}
            onToggleYours={() =>
              setAttackerSide({ auroraVeil: !attackerSide.auroraVeil })
            }
            onToggleTheirs={() =>
              setDefenderSide({ auroraVeil: !defenderSide.auroraVeil })
            }
          />

          {/* ── Hazards section ─────────────────────────────────────── */}
          <SectionDivider label="Hazards" />

          <SideSwitchRow
            label="Stealth Rock"
            yours={attackerSide.stealthRock}
            theirs={defenderSide.stealthRock}
            onToggleYours={() =>
              setAttackerSide({ stealthRock: !attackerSide.stealthRock })
            }
            onToggleTheirs={() =>
              setDefenderSide({ stealthRock: !defenderSide.stealthRock })
            }
          />

          {/* Spikes — 0–3 count stepper on each side */}
          <div className="flex justify-end">
            <SpikesStepper
              value={attackerSide.spikes}
              onChange={(v) => setAttackerSide({ spikes: v })}
            />
          </div>
          <span className="text-muted-foreground text-center text-xs">
            Spikes
          </span>
          <div className="flex justify-start">
            <SpikesStepper
              value={defenderSide.spikes}
              onChange={(v) => setDefenderSide({ spikes: v })}
            />
          </div>

          <SideSwitchRow
            label="Leech Seed"
            yours={attackerSide.leechSeed}
            theirs={defenderSide.leechSeed}
            onToggleYours={() =>
              setAttackerSide({ leechSeed: !attackerSide.leechSeed })
            }
            onToggleTheirs={() =>
              setDefenderSide({ leechSeed: !defenderSide.leechSeed })
            }
          />

          {/* ── Boosts section ──────────────────────────────────────── */}
          <SectionDivider label="Boosts" />

          <SideSwitchRow
            label="Helping Hand"
            yours={attackerSide.helpingHand}
            theirs={defenderSide.helpingHand}
            onToggleYours={() =>
              setAttackerSide({ helpingHand: !attackerSide.helpingHand })
            }
            onToggleTheirs={() =>
              setDefenderSide({ helpingHand: !defenderSide.helpingHand })
            }
          />

          <SideSwitchRow
            label="Friend Guard"
            yours={attackerSide.friendGuard}
            theirs={defenderSide.friendGuard}
            onToggleYours={() =>
              setAttackerSide({ friendGuard: !attackerSide.friendGuard })
            }
            onToggleTheirs={() =>
              setDefenderSide({ friendGuard: !defenderSide.friendGuard })
            }
          />

          <SideSwitchRow
            label="Protect"
            yours={attackerSide.protect}
            theirs={defenderSide.protect}
            onToggleYours={() =>
              setAttackerSide({ protect: !attackerSide.protect })
            }
            onToggleTheirs={() =>
              setDefenderSide({ protect: !defenderSide.protect })
            }
          />

          <SideSwitchRow
            label="Single Target"
            yours={attackerSide.singleTarget}
            theirs={defenderSide.singleTarget}
            onToggleYours={() =>
              setAttackerSide({ singleTarget: !attackerSide.singleTarget })
            }
            onToggleTheirs={() =>
              setDefenderSide({ singleTarget: !defenderSide.singleTarget })
            }
          />

          <SideSwitchRow
            label="Critical Hit"
            yours={attackerSide.crit}
            theirs={defenderSide.crit}
            onToggleYours={() => setAttackerSide({ crit: !attackerSide.crit })}
            onToggleTheirs={() => setDefenderSide({ crit: !defenderSide.crit })}
          />
        </div>
      </fieldset>
    </div>
  );
}
