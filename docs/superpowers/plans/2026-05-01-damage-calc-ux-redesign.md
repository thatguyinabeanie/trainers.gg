# Damage Calc UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the damage calc bottom panel — stepper stat boosts, full field conditions on both sides, expanded labels, full-width defender header, equal-thirds column layout.

**Architecture:** All changes are in `apps/web/src/components/team-builder/v2/calc/` and `use-calc-state.ts`. State changes first (Task 1), then each UI block independently, then tests. A new `calc-defender-header.tsx` extracts the defender identity block so `CalcDefenderStats` becomes a pure spread component.

**Tech Stack:** React 19, Tailwind CSS 4, `@smogon/calc` (Side/Field constructors), `@testing-library/react`.

**Spec:** `docs/design/2026-05-01-damage-calc-ux-redesign.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `use-calc-state.ts` | Modify | Expand `BaseSideState`, remove `DefenderSideState`, add `fairyAura` |
| `calc-field-block.tsx` | Modify | Full conditions on both sides, expanded labels, Fairy Aura |
| `calc-attacker-block.tsx` | Modify | Stepper + quick-picks, reorder content |
| `calc-defender-header.tsx` | **Create** | Full-width defender identity (sprite, pickers, loadout chips) |
| `calc-defender-stats.tsx` | Modify | Remove header block; keep only spread rows + HP slider |
| `calc-bottom-panel.tsx` | Modify | 1fr/1fr/1fr outer grid, render `DefenderMonHeader` |
| `calc-drawer.tsx` | Modify | Thread `fairyAura`/`setFairyAura` to `CalcFieldBlock` |
| `__tests__/calc-field-block.test.tsx` | Modify | Cover new toggles, symmetric sides, Fairy Aura |
| `__tests__/calc-attacker-block.test.tsx` | Modify | Cover stepper interaction, new content order |
| `__tests__/calc-bottom-panel.test.tsx` | Modify | Cover new layout, `DefenderMonHeader` render |

---

## Task 1: Expand State Types + buildField

**Files:**
- Modify: `apps/web/src/components/team-builder/use-calc-state.ts`

### What changes

`BaseSideState` gains `protect`, `stealthRock`, `spikes`, `saltCure`. `DefenderSideState` is removed (it becomes empty). `fairyAura: boolean` is added to the top-level field state. `buildField` is simplified — no more `"stealthRock" in dSide` conditional casts.

- [ ] **Step 1: Replace `BaseSideState` and remove `DefenderSideState`**

In `use-calc-state.ts`, replace lines 48–61:

```ts
export interface BaseSideState {
  reflect: boolean;
  lightScreen: boolean;
  auroraVeil: boolean;
  tailwind: boolean;
  helpingHand: boolean;
  friendGuard: boolean;
  protect: boolean;
  stealthRock: boolean;
  spikes: number;
  saltCure: boolean;
}
export type AttackerSideState = BaseSideState;
// DefenderSideState removed — both sides now use BaseSideState directly.
```

- [ ] **Step 2: Add `fairyAura` to `UseCalcStateReturn`**

In the `// Field` block of `UseCalcStateReturn` (around line 431), add after `setGravity`:

```ts
fairyAura: boolean;
setFairyAura: (v: boolean) => void;
```

Also change:
```ts
// Before:
defenderSide: DefenderSideState;
setDefenderSide: (patch: Partial<DefenderSideState>) => void;
// After:
defenderSide: BaseSideState;
setDefenderSide: (patch: Partial<BaseSideState>) => void;
```

- [ ] **Step 3: Update `buildField` signature and body**

Replace the entire `buildField` function:

```ts
function buildField(
  gameType: "Doubles" | "Singles",
  weather: string,
  terrain: string,
  gravity: boolean,
  fairyAura: boolean,
  attackerSide: BaseSideState,
  defenderSide: BaseSideState,
  direction: CalcDirection
): Field {
  const aSide = direction === "offense" ? attackerSide : defenderSide;
  const dSide = direction === "offense" ? defenderSide : attackerSide;

  const aSmogon = new Side({
    isReflect: aSide.reflect,
    isLightScreen: aSide.lightScreen,
    isAuroraVeil: aSide.auroraVeil,
    isTailwind: aSide.tailwind,
    isHelpingHand: aSide.helpingHand,
    isFriendGuard: aSide.friendGuard,
    isProtected: aSide.protect,
    isSR: aSide.stealthRock,
    spikes: aSide.spikes,
    isSaltCured: aSide.saltCure,
  });

  const dSmogon = new Side({
    isReflect: dSide.reflect,
    isLightScreen: dSide.lightScreen,
    isAuroraVeil: dSide.auroraVeil,
    isTailwind: dSide.tailwind,
    isHelpingHand: dSide.helpingHand,
    isFriendGuard: dSide.friendGuard,
    isProtected: dSide.protect,
    isSR: dSide.stealthRock,
    spikes: dSide.spikes,
    isSaltCured: dSide.saltCure,
  });

  return new Field({
    gameType,
    weather: asSmogon(weather || null),
    terrain: asSmogon(terrain || null),
    isGravity: gravity,
    isFairyAura: fairyAura,
    attackerSide: aSmogon,
    defenderSide: dSmogon,
  });
}
```

- [ ] **Step 4: Add `fairyAura` useState and update `defenderSide` initial state**

After the `gravity` useState (around line 559), add:
```ts
const [fairyAura, setFairyAura] = useState(false);
```

Replace the `defenderSide` initial state (currently lines 568–578) with:
```ts
const [defenderSide, setDefenderSideState] = useState<BaseSideState>({
  reflect: false,
  lightScreen: false,
  auroraVeil: false,
  tailwind: false,
  helpingHand: false,
  friendGuard: false,
  protect: false,
  stealthRock: false,
  spikes: 0,
  saltCure: false,
});
```

Update `setDefenderSide` type (around line 629):
```ts
function setDefenderSide(patch: Partial<BaseSideState>) {
  setDefenderSideState((prev) => ({ ...prev, ...patch }));
}
```

- [ ] **Step 5: Thread `fairyAura` through all three `buildField` call-sites**

Each call site (offense calc, defense calc, field exposure) passes `gravity` as the 4th arg. Add `fairyAura` as the 5th arg in each:

```ts
// All three calls: change from
buildField(gameType, weather, terrain, gravity, attackerSide, defenderSide, direction)
// to
buildField(gameType, weather, terrain, gravity, fairyAura, attackerSide, defenderSide, direction)
```

- [ ] **Step 6: Expose `fairyAura` and `setFairyAura` in the returned object**

In the `return` object of `useCalcState` (where `gravity` and `setGravity` are exported), add:
```ts
fairyAura,
setFairyAura,
```

- [ ] **Step 7: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -iE "error|warning" | grep "use-calc-state\|calc-field-block\|calc-drawer\|calc-bottom" | head -20
```

Expected: errors only in files that import `DefenderSideState` — those are fixed in later tasks.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/team-builder/use-calc-state.ts
git commit -m "refactor(calc): merge DefenderSideState into BaseSideState, add fairyAura"
```

---

## Task 2: CalcFieldBlock — Complete Conditions + Expanded Labels

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/calc/calc-field-block.tsx`

### What changes

`SideCard` becomes fully symmetric — both sides get identical controls. `DefenderSideState` import replaced with `BaseSideState`. `fairyAura`/`setFairyAura` added. All abbreviations expanded. "Conditions" section shows weather and terrain side-by-side.

- [ ] **Step 1: Update imports and props**

Replace the import line:
```ts
// Before:
import { type AttackerSideState, type DefenderSideState } from "../../use-calc-state";
// After:
import { type BaseSideState } from "../../use-calc-state";
```

Add `fairyAura` / `setFairyAura` to `CalcFieldBlockProps`:
```ts
interface CalcFieldBlockProps {
  // ... existing props ...
  fairyAura: boolean;
  setFairyAura: (v: boolean) => void;
  // Change:
  // attackerSide: AttackerSideState  →  attackerSide: BaseSideState
  // defenderSide: DefenderSideState  →  defenderSide: BaseSideState
  // setAttackerSide: (patch: Partial<AttackerSideState>)  →  setAttackerSide: (patch: Partial<BaseSideState>)
  // setDefenderSide: (patch: Partial<DefenderSideState>)  →  setDefenderSide: (patch: Partial<BaseSideState>)
}
```

- [ ] **Step 2: Rewrite `SideCard` to be symmetric**

Replace the entire `SideCard` component (lines ~127–204) with:

```tsx
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
            value={side.spikes as 0 | 1 | 2 | 3}
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
```

- [ ] **Step 3: Update `CalcFieldBlock` function signature destructuring**

In the `CalcFieldBlock` function signature, add `fairyAura` and `setFairyAura` to the destructured params, and change the side types:

```ts
export function CalcFieldBlock({
  // ... existing params ...
  gravity,
  setGravity,
  fairyAura,        // new
  setFairyAura,     // new
  attackerSide,     // now BaseSideState
  setAttackerSide,  // now (patch: Partial<BaseSideState>) => void
  defenderSide,     // now BaseSideState
  setDefenderSide,  // now (patch: Partial<BaseSideState>) => void
  // ... rest ...
}: CalcFieldBlockProps) {
```

- [ ] **Step 4: Rewrite `CalcFieldBlock` render — global effects + conditions + sides**

Replace the `return` inside `CalcFieldBlock` with:

```tsx
return (
  <div className="flex h-full flex-col gap-2.5 overflow-y-auto">
    {/* Header: eyebrow + Singles/Doubles toggle */}
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
```

- [ ] **Step 5: Typecheck the field block**

```bash
pnpm typecheck 2>&1 | grep "calc-field-block" | head -10
```

Expected: no errors in `calc-field-block.tsx`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/team-builder/v2/calc/calc-field-block.tsx
git commit -m "feat(calc): expand field block — full symmetric sides, Fairy Aura, expanded labels"
```

---

## Task 3: CalcAttackerBlock — Stepper + Content Reorder

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/calc/calc-attacker-block.tsx`

### What changes

Replace 13-button stage rows with a stepper (+/− buttons) and quick-pick chips. Move stat boosts above the inherits note.

- [ ] **Step 1: Add `QUICK_PICKS` constant, remove `STAGE_VALUES`**

Remove:
```ts
const STAGE_VALUES = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;
```

Add:
```ts
const QUICK_PICKS = [0, 1, 2, 3, 6] as const;
```

- [ ] **Step 2: Replace the stat boost grid in the render**

Replace the entire `{/* stat boosts grid */}` block (from `<div className="mt-3">` to its closing `</div>`) with:

```tsx
{/* Stat boosts — stepper + quick-pick chips */}
<div className="mt-3">
  <div className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
    Stat boosts
  </div>
  <div className="grid grid-cols-[28px_1fr] items-center gap-x-2 gap-y-1.5">
    {STAT_KEYS.map(({ key, label, colorClass }) => {
      const current = attackerBoosts[key];
      return (
        <div key={key} className="contents">
          <span className={cn("font-mono text-[9.5px] font-semibold tracking-[0.05em]", colorClass)}>
            {label}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAttackerBoost(key, Math.max(-6, current - 1))}
              aria-label={`Decrease ${label} boost`}
              className="flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded border border-border bg-muted/40 font-mono text-[13px] leading-none hover:bg-muted"
            >
              −
            </button>
            <span
              className={cn(
                "flex h-[20px] min-w-[32px] items-center justify-center rounded border font-mono text-[10px] font-bold",
                current > 0 && "border-primary/40 bg-primary/10 text-primary",
                current < 0 && "border-destructive/40 bg-destructive/10 text-destructive",
                current === 0 && "border-border bg-muted/30 text-muted-foreground"
              )}
            >
              {current > 0 ? `+${current}` : current}
            </span>
            <button
              type="button"
              onClick={() => setAttackerBoost(key, Math.min(6, current + 1))}
              aria-label={`Increase ${label} boost`}
              className="flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded border border-border bg-muted/40 font-mono text-[13px] leading-none hover:bg-muted"
            >
              +
            </button>
            <div className="flex gap-[3px]">
              {QUICK_PICKS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAttackerBoost(key, v)}
                  aria-pressed={current === v}
                  className={cn(
                    "rounded border px-[5px] py-[2px] font-mono text-[8.5px]",
                    current === v
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {v > 0 ? `+${v}` : v}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>
```

- [ ] **Step 3: Move stat boosts above inherits note**

The render currently has: mon head → inherits note → stat boosts.  
Swap so it reads: mon head → stat boosts → inherits note.

Move the `{/* stat boosts grid */}` block to appear **before** the `{/* inherits-from note */}` block.

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck 2>&1 | grep "calc-attacker-block" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/team-builder/v2/calc/calc-attacker-block.tsx
git commit -m "feat(calc): replace stat boost row with stepper + quick-pick chips, reorder content"
```

---

## Task 4: New `DefenderMonHeader` + Simplify `CalcDefenderStats`

**Files:**
- Create: `apps/web/src/components/team-builder/v2/calc/calc-defender-header.tsx`
- Modify: `apps/web/src/components/team-builder/v2/calc/calc-defender-stats.tsx`

### What changes

Extract sprite + species picker + type pills + loadout chips from `CalcDefenderStats` into a new `DefenderMonHeader` component. `CalcDefenderStats` becomes a pure spread editor (stat rows + HP slider only).

- [ ] **Step 1: Create `calc-defender-header.tsx`**

```tsx
"use client";

import {
  getSpeciesTypes,
  getLegalAbilities,
  getValidAbilities,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Sprite } from "../sprite";
import { TypePill } from "../type-pill";
import { AbilityPicker } from "../pickers/ability-picker";
import { ItemPicker } from "../pickers/item-picker";
import { NaturePicker } from "../pickers/nature-picker";
import { SpeciesPicker } from "../pickers/species-picker";
import { TypePicker } from "../pickers/type-picker";
import { formatSupportsTera } from "../format-gating";
import s from "../builder.module.css";

export interface DefenderMonHeaderProps {
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  defenderTera: string;
  format: GameFormat | undefined;
  attackerName: string;
  attackerHP: number | null;
  setDefenderSpecies: (v: string) => void;
  setDefenderAbility: (v: string) => void;
  setDefenderItem: (v: string) => void;
  setDefenderNature: (v: string) => void;
  setDefenderTera: (v: string) => void;
}

function LoadoutChip({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger className={cn(s.chipLabeled)}>
        <span className={s.chipPrefix}>{label}</span>
        <span className={cn(s.chipValue, "min-w-0 truncate")}>{value || "—"}</span>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" className="w-auto p-0" style={{ maxHeight: "60vh", overflow: "hidden" }}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function DefenderMonHeader({
  defenderSpecies,
  defenderAbility,
  defenderItem,
  defenderNature,
  defenderTera,
  format,
  attackerName,
  attackerHP,
  setDefenderSpecies,
  setDefenderAbility,
  setDefenderItem,
  setDefenderNature,
  setDefenderTera,
}: DefenderMonHeaderProps) {
  const showTera = formatSupportsTera(format);
  const types = defenderSpecies ? getSpeciesTypes(defenderSpecies) : [];

  const legalAbilities = format
    ? Array.from(getLegalAbilities(defenderSpecies, format.id) ?? getValidAbilities(defenderSpecies))
    : getValidAbilities(defenderSpecies);

  return (
    <div className="border-b p-3 pb-2">
      <div className="flex items-start gap-3">
        {/* Sprite */}
        <div className="size-[52px] flex-shrink-0 overflow-hidden rounded-md">
          <Sprite species={defenderSpecies || "Incineroar"} types={types} size={52} />
        </div>

        {/* Identity + loadout */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {/* Species picker */}
            <Popover>
              <PopoverTrigger className="block min-w-0 max-w-full cursor-pointer truncate rounded px-1 py-0.5 text-left text-[13px] font-bold hover:bg-muted">
                {defenderSpecies || "—"}
              </PopoverTrigger>
              <PopoverContent align="start" side="bottom" className="h-[480px] w-[640px] overflow-hidden p-0">
                <SpeciesPicker
                  value={defenderSpecies}
                  format={format}
                  onPick={(species) => setDefenderSpecies(species)}
                  onClose={() => undefined}
                />
              </PopoverContent>
            </Popover>
            {/* "vs X · HP" badge */}
            <span className="flex-shrink-0 font-mono text-[10px] text-muted-foreground">
              vs {attackerName} · {attackerHP !== null ? `${attackerHP} HP` : "—"}
            </span>
          </div>

          {/* Types */}
          <div className="mt-0.5 flex flex-wrap gap-1">
            {types.map((t) => (
              <TypePill key={t} t={t} />
            ))}
          </div>

          {/* Loadout chips */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {/* Item */}
            <Popover>
              <PopoverTrigger className={cn(s.chipLabeled)}>
                <span className={s.chipPrefix}>item</span>
                <span className={cn(s.chipValue, "min-w-0 truncate")}>{defenderItem || "—"}</span>
              </PopoverTrigger>
              <PopoverContent align="start" side="bottom" className="w-auto p-0">
                <ItemPicker value={defenderItem} format={format} teamItems={[]} onPick={(item) => setDefenderItem(item)} onClose={() => undefined} />
              </PopoverContent>
            </Popover>

            <LoadoutChip label="abil" value={defenderAbility}>
              <AbilityPicker
                value={defenderAbility}
                species={defenderSpecies}
                format={format}
                onPick={(ability) => setDefenderAbility(ability)}
                onClose={() => undefined}
              />
            </LoadoutChip>

            <LoadoutChip label="nat" value={defenderNature}>
              <NaturePicker value={defenderNature} onPick={(nat) => setDefenderNature(nat)} onClose={() => undefined} />
            </LoadoutChip>

            {showTera && (
              <LoadoutChip label="tera" value={defenderTera ? `${defenderTera} tera` : "—"}>
                <TypePicker value={defenderTera} onPick={(type) => setDefenderTera(type)} onClose={() => undefined} />
              </LoadoutChip>
            )}
          </div>

          {defenderSpecies && legalAbilities.length === 0 && (
            <p className="mt-1 font-mono text-[9px] text-muted-foreground/60">
              No abilities found for format
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Simplify `CalcDefenderStatsProps`**

In `calc-defender-stats.tsx`, replace the `CalcDefenderStatsProps` interface with:

```ts
export interface CalcDefenderStatsProps {
  defenderSpecies: string;
  defenderNature: string;
  defenderEvs: DefenderEvs;
  defenderIvs: DefenderIvs;
  defenderBoosts: DefenderBoosts;
  defenderHpPercent: number;
  format: GameFormat | undefined;
  setDefenderEv: (stat: keyof DefenderEvs, v: number) => void;
  setDefenderBoost: (stat: keyof DefenderBoosts, v: number) => void;
  setDefenderHpPercent: (v: number) => void;
}
```

- [ ] **Step 3: Remove unused imports from `calc-defender-stats.tsx`**

Remove these imports (they move to `calc-defender-header.tsx`):
- `getLegalAbilities`, `getValidAbilities`, `getSpeciesTypes` from `@trainers/pokemon`
- `Popover`, `PopoverContent`, `PopoverTrigger` from `@/components/ui/popover`
- `AbilityPicker`, `ItemPicker`, `NaturePicker`, `SpeciesPicker`, `TypePicker`
- `formatSupportsTera`
- `Sprite`, `TypePill`

Keep: `findStatBreakpoints`, `getBaseStats`, `getNatureMultiplier`, `isChampionsFormat`, `NATURE_EFFECTS`, `type GameFormat`, plus all the stat-computation helpers and `s` (CSS module).

- [ ] **Step 4: Remove the mon-head and loadout block from `CalcDefenderStats` render**

In the `CalcDefenderStats` component `return`, delete:
1. The "── Mon head ──" section (sprite + species popover + types)
2. The "── Loadout chips ──" section (item / ability / nature / tera chips)

Keep everything from `{/* ── Stats lane header ── */}` onward (the "Spread" / "Stat Points" eyebrow, stat rows, HP slider).

Also remove the `legalAbilities` calculation — it's no longer needed here.

The component destructuring in `CalcDefenderStats` should only include the new props:
```ts
export function CalcDefenderStats({
  defenderSpecies,
  defenderNature,
  defenderEvs,
  defenderIvs,
  defenderBoosts,
  defenderHpPercent,
  format,
  setDefenderEv,
  setDefenderBoost,
  setDefenderHpPercent,
}: CalcDefenderStatsProps) {
```

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "calc-defender-(stats|header)" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/team-builder/v2/calc/calc-defender-header.tsx \
        apps/web/src/components/team-builder/v2/calc/calc-defender-stats.tsx
git commit -m "refactor(calc): extract DefenderMonHeader, simplify CalcDefenderStats to pure spread"
```

---

## Task 5: CalcBottomPanel + CalcDrawer — Layout + Wiring

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/calc/calc-bottom-panel.tsx`
- Modify: `apps/web/src/components/team-builder/v2/calc/calc-drawer.tsx`

### What changes

Outer panel grid changes from `[1fr_1fr_2fr]` to `[1fr_1fr_1fr]`. The defender card now renders `DefenderMonHeader` as a full-width row above the stats/moves inner grid. `CalcDefenderStats` receives its reduced prop set. `fairyAura`/`setFairyAura` wired through both files.

- [ ] **Step 1: Update `calc-bottom-panel.tsx` — outer grid**

Change:
```tsx
// Before:
<div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr_2fr] gap-3 overflow-y-auto p-3">
// After:
<div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr_1fr] gap-3 overflow-y-auto p-3">
```

- [ ] **Step 2: Add `DefenderMonHeader` import**

```ts
import { DefenderMonHeader } from "./calc-defender-header";
```

- [ ] **Step 3: Rebuild the defender card in `calc-bottom-panel.tsx`**

The defender card currently wraps `CalcDefenderStats` and `CalcDefenderMoves` in an inner grid. Replace the entire `{/* Defender column */}` block:

```tsx
{/* Defender column */}
<div className="flex flex-col rounded-lg border bg-card shadow-sm">
  {/* Col head */}
  <div className="flex items-center justify-between border-b px-3 py-2">
    <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-destructive">
      Defender
    </span>
  </div>

  {/* Full-width mon identity header */}
  <DefenderMonHeader
    defenderSpecies={calc.defenderSpecies}
    defenderAbility={calc.defenderAbility}
    defenderItem={calc.defenderItem}
    defenderNature={calc.defenderNature}
    defenderTera={calc.defenderTera}
    format={format}
    attackerName={attackerName}
    attackerHP={attackerHP}
    setDefenderSpecies={calc.setDefenderSpecies}
    setDefenderAbility={calc.setDefenderAbility}
    setDefenderItem={calc.setDefenderItem}
    setDefenderNature={calc.setDefenderNature}
    setDefenderTera={calc.setDefenderTera}
  />

  {/* Stats | Moves split */}
  <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3.5 overflow-y-auto p-3">
    <CalcDefenderStats
      defenderSpecies={calc.defenderSpecies}
      defenderNature={calc.defenderNature}
      defenderEvs={calc.defenderEvs}
      defenderIvs={calc.defenderIvs}
      defenderBoosts={calc.defenderBoosts}
      defenderHpPercent={calc.defenderHpPercent}
      format={format}
      setDefenderEv={calc.setDefenderEv}
      setDefenderBoost={calc.setDefenderBoost}
      setDefenderHpPercent={calc.setDefenderHpPercent}
    />

    {/* Their moves → your atk reverse-calc column */}
    <div className="border-l border-dashed pl-3.5">
      <CalcDefenderMoves
        effectiveMoves={effectiveMoves}
        computeReverseOutput={calc.computeReverseOutput}
        attackerHP={attackerHP}
        defenderSpecies={calc.defenderSpecies}
        format={format}
        onPick={(slotIdx, moveName) => calc.setDefenderMove(slotIdx, moveName)}
      />
    </div>
  </div>
</div>
```

- [ ] **Step 4: Wire `fairyAura` in `CalcBottomPanel`**

In the `CalcFieldBlock` JSX inside the Field column, add:
```tsx
fairyAura={calc.fairyAura}
setFairyAura={calc.setFairyAura}
```

Also remove the `attackerName` and `attackerHP` from the old col-head (they moved to `DefenderMonHeader`):

The col-head for defender no longer shows `vs {attackerName} · {attackerHP} HP` — that's now inside `DefenderMonHeader`. Remove it from the col-head div.

- [ ] **Step 5: Wire `fairyAura` in `CalcDrawer`**

In `calc-drawer.tsx`, add to the `CalcFieldBlock` JSX:
```tsx
fairyAura={calc.fairyAura}
setFairyAura={calc.setFairyAura}
```

- [ ] **Step 6: Typecheck everything**

```bash
pnpm typecheck 2>&1 | grep -iE "error" | grep -v "node_modules" | head -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/team-builder/v2/calc/calc-bottom-panel.tsx \
        apps/web/src/components/team-builder/v2/calc/calc-drawer.tsx
git commit -m "feat(calc): 1fr/1fr/1fr grid, full-width defender header, wire fairyAura"
```

---

## Task 6: Update Tests

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/__tests__/calc-field-block.test.tsx`
- Modify: `apps/web/src/components/team-builder/v2/__tests__/calc-attacker-block.test.tsx`
- Modify: `apps/web/src/components/team-builder/v2/__tests__/calc-bottom-panel.test.tsx`

- [ ] **Step 1: Update `calc-field-block.test.tsx` — new state shape + new toggles**

Replace `makeAttackerSide` and `makeDefenderSide` factory functions (they now both produce `BaseSideState`):

```ts
import { type BaseSideState } from "../../use-calc-state";

function makeSideState(overrides: Partial<BaseSideState> = {}): BaseSideState {
  return {
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
    tailwind: false,
    helpingHand: false,
    friendGuard: false,
    protect: false,
    stealthRock: false,
    spikes: 0,
    saltCure: false,
    ...overrides,
  };
}
```

Update the `renderField` helper to include `fairyAura` / `setFairyAura`:
```ts
function renderField(props: Partial<RenderProps> = {}) {
  const defaults = {
    // ... keep existing defaults ...
    fairyAura: false,
    setFairyAura: jest.fn(),
    attackerSide: makeSideState(),
    defenderSide: makeSideState(),
    setAttackerSide: jest.fn(),
    setDefenderSide: jest.fn(),
    // Remove: helpingHand/stealthRock props (they're now inside attackerSide/defenderSide)
  };
  render(<CalcFieldBlock {...defaults} {...props} />);
}
```

Add tests for new toggles:

```ts
it("renders Fairy Aura toggle inactive by default", () => {
  renderField();
  expect(screen.getByRole("button", { name: /fairy aura/i })).toHaveAttribute("aria-pressed", "false");
});

it("calls setFairyAura when Fairy Aura clicked", () => {
  const setFairyAura = jest.fn();
  renderField({ fairyAura: false, setFairyAura });
  fireEvent.click(screen.getByRole("button", { name: /fairy aura/i }));
  expect(setFairyAura).toHaveBeenCalledWith(true);
});

it("renders Aurora Veil toggle on Yours side", () => {
  renderField({ attackerSide: makeSideState({ auroraVeil: true }) });
  // Both sides render Aurora Veil — find by label context
  const buttons = screen.getAllByRole("button", { name: /aurora veil/i });
  expect(buttons.length).toBe(2); // one for each side
  expect(buttons[0]).toHaveAttribute("aria-pressed", "true"); // Yours is active
  expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
});

it("renders Spikes stepper on both sides at 0 by default", () => {
  renderField();
  // Each side card has a "0" button for spikes
  const zeroButtons = screen.getAllByRole("button", { name: "0" });
  // (there will be multiple 0s; check at least one has aria-pressed="true" for the spikes stepper)
  const activeZeros = zeroButtons.filter(
    (b) => b.getAttribute("aria-pressed") === "true"
  );
  expect(activeZeros.length).toBeGreaterThanOrEqual(2);
});

it("renders Stealth Rock on Yours side (was previously Theirs only)", () => {
  renderField({ attackerSide: makeSideState({ stealthRock: true }) });
  const srButtons = screen.getAllByRole("button", { name: /stealth rock/i });
  expect(srButtons.length).toBe(2);
  expect(srButtons[0]).toHaveAttribute("aria-pressed", "true");
});

it("renders Helping Hand on Theirs side (was previously Yours only)", () => {
  renderField({ defenderSide: makeSideState({ helpingHand: true }) });
  const hhButtons = screen.getAllByRole("button", { name: /helping hand/i });
  expect(hhButtons.length).toBe(2);
  expect(hhButtons[1]).toHaveAttribute("aria-pressed", "true");
});

it("renders Gravity button with full label, not abbreviated", () => {
  renderField();
  expect(screen.getByRole("button", { name: /^gravity$/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /grav/i })).not.toBeInTheDocument();
});
```

Update existing toggle tests: the old design had per-toggle handler props (`onTailwind`, `onReflect`, etc.) — the new design uses a single `setAttackerSide`/`setDefenderSide` patch callback. Example migration:

```ts
// BEFORE (old test — button text was "TW", separate handler prop):
it("calls onTailwind when TW clicked", () => {
  const onTailwind = jest.fn();
  renderField({ onTailwind }); // old prop
  fireEvent.click(screen.getByText("TW"));
  expect(onTailwind).toHaveBeenCalled();
});

// AFTER (new test — full button label, patch callback):
it("calls setAttackerSide with tailwind patch when Tailwind clicked on Yours side", () => {
  const setAttackerSide = jest.fn();
  renderField({ attackerSide: makeSideState({ tailwind: false }), setAttackerSide });
  fireEvent.click(screen.getAllByRole("button", { name: /^tailwind$/i })[0]); // [0] = Yours side
  expect(setAttackerSide).toHaveBeenCalledWith({ tailwind: true });
});
```

Apply the same pattern for Reflect, Light Screen, Stealth Rock, Helping Hand — update button queries to use full words and check `setAttackerSide`/`setDefenderSide` called with the correct patch object.

- [ ] **Step 2: Update `calc-attacker-block.test.tsx` — stepper replaces 13-button row**

Remove tests that reference the old 13-button row:
- "Stat-boost grid: stage buttons -6..+6 render with correct aria-pressed"
- "Clicking a stage button calls setAttackerBoost with correct args"
- "Active stage button is aria-pressed=true; others are aria-pressed=false"

Add tests for the stepper:

```ts
it("renders stat boost stepper with decrease and increase buttons for each stat", () => {
  renderAttacker({ attackerBoosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });
  expect(screen.getByRole("button", { name: /decrease atk boost/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /increase atk boost/i })).toBeInTheDocument();
});

it("clicking + calls setAttackerBoost with incremented value", () => {
  const setAttackerBoost = jest.fn();
  renderAttacker({
    attackerBoosts: { atk: 1, def: 0, spa: 0, spd: 0, spe: 0 },
    setAttackerBoost,
  });
  fireEvent.click(screen.getByRole("button", { name: /increase atk boost/i }));
  expect(setAttackerBoost).toHaveBeenCalledWith("atk", 2);
});

it("clicking − calls setAttackerBoost with decremented value", () => {
  const setAttackerBoost = jest.fn();
  renderAttacker({
    attackerBoosts: { atk: 2, def: 0, spa: 0, spd: 0, spe: 0 },
    setAttackerBoost,
  });
  fireEvent.click(screen.getByRole("button", { name: /decrease atk boost/i }));
  expect(setAttackerBoost).toHaveBeenCalledWith("atk", 1);
});

it("+ clamps at +6", () => {
  const setAttackerBoost = jest.fn();
  renderAttacker({
    attackerBoosts: { atk: 6, def: 0, spa: 0, spd: 0, spe: 0 },
    setAttackerBoost,
  });
  fireEvent.click(screen.getByRole("button", { name: /increase atk boost/i }));
  expect(setAttackerBoost).toHaveBeenCalledWith("atk", 6);
});

it("renders quick-pick chips 0 +1 +2 +3 +6 for each stat", () => {
  renderAttacker({ attackerBoosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });
  // 5 stats × 5 chips = 25 total; spot-check +6 exists at least once
  const chips = screen.getAllByRole("button", { name: "+6" });
  expect(chips.length).toBe(5);
});

it("clicking a quick-pick chip calls setAttackerBoost with that value", () => {
  const setAttackerBoost = jest.fn();
  renderAttacker({
    attackerBoosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    setAttackerBoost,
  });
  // Click the first "+2" chip (ATK row)
  fireEvent.click(screen.getAllByRole("button", { name: "+2" })[0]);
  expect(setAttackerBoost).toHaveBeenCalledWith("atk", 2);
});

it("stat boosts section appears before inherits note", () => {
  renderAttacker();
  const boostsLabel = screen.getByText(/stat boosts/i);
  const inheritsNote = screen.getByText(/inherits spread/i);
  expect(
    boostsLabel.compareDocumentPosition(inheritsNote) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
});
```

- [ ] **Step 3: Update `calc-bottom-panel.test.tsx` — new defender header**

Add tests for `DefenderMonHeader` rendering. Mock `DefenderMonHeader` in the test:

```ts
jest.mock("../calc/calc-defender-header", () => ({
  DefenderMonHeader: ({ defenderSpecies, attackerName, attackerHP }: {
    defenderSpecies: string;
    attackerName: string;
    attackerHP: number | null;
  }) => (
    <div data-testid="defender-mon-header">
      <span data-testid="defender-species">{defenderSpecies}</span>
      <span data-testid="vs-info">{attackerName} {attackerHP}</span>
    </div>
  ),
}));
```

Add:
```ts
it("renders DefenderMonHeader with species and attacker info", () => {
  renderPanel();
  expect(screen.getByTestId("defender-mon-header")).toBeInTheDocument();
  expect(screen.getByTestId("defender-species")).toHaveTextContent("Incineroar");
});
```

- [ ] **Step 4: Run the full test suite**

```bash
pnpm test --filter @trainers/web 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/team-builder/v2/__tests__/calc-field-block.test.tsx \
        apps/web/src/components/team-builder/v2/__tests__/calc-attacker-block.test.tsx \
        apps/web/src/components/team-builder/v2/__tests__/calc-bottom-panel.test.tsx
git commit -m "test(calc): update tests for field conditions, stepper boosts, defender header"
```

---

## Final Check

- [ ] **Typecheck passes**

```bash
pnpm typecheck 2>&1 | grep -iE "^.*error" | grep -v "node_modules" | head -20
```

Expected: no errors.

- [ ] **Lint passes**

```bash
pnpm lint 2>&1 | grep -E "error|warning" | grep -v "node_modules" | head -20
```

Expected: no errors.

- [ ] **Full test suite passes**

```bash
pnpm test 2>&1 | tail -20
```

Expected: all pass.
