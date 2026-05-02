# Calc Column Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move damage calc results out of the move button into a dedicated fixed-width `CalcColumn` component that sits beside the moves lane when the calc panel is open.

**Architecture:** `CalcColumn` is a new component rendered in `active-row.tsx` as a flex sibling to `MovesLane`. It reads `calc.moveCalcOutputs[]` from `useCalcStateContext()` directly — no prop drilling. `MoveTile` becomes pure move display (no calc logic). The moves lane is fixed at 280px when calc is open; otherwise `flex: 1`.

**Tech Stack:** React 19.2, Next.js 16 App Router, React Compiler (no useMemo/useCallback), Tailwind CSS 4, CSS Modules (`builder.module.css`), Base UI Popover/Tooltip, `@trainers/pokemon` for move data.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/src/components/team-builder/v2/lanes/calc-column.tsx` | **CREATE** | CalcColumn + CalcRow components |
| `apps/web/src/components/team-builder/v2/lanes/moves-lane.tsx` | **MODIFY** | Strip calc from MoveTile; fix lane width |
| `apps/web/src/components/team-builder/v2/lanes/active-row.tsx` | **MODIFY** | Add CalcColumn beside MovesLane |
| `apps/web/src/components/team-builder/v2/builder.module.css` | **MODIFY** | Update .mvline grid; add calc column CSS |

---

## Task 1: Update `.mvline` CSS grid for the 280px lane

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/builder.module.css`

The move button grid is currently `max-content | minmax(0,10rem) | 56px | 72px`. For a 280px lane the name column needs to be `minmax(0,1fr)` (fills remainder), BP 44px, ACC 60px. Also set `width: 100%` so the button fills its parent lane.

- [ ] **Find the `.mvline` grid-template-columns declaration** (search for `max-content` near line 940) and replace with:

```css
:global(.mvline) {
  display: grid;
  grid-template-columns:
    max-content       /* type + category grouped */
    minmax(0, 1fr)    /* name — fills remaining space */
    44px              /* BP */
    60px;             /* Acc */
  align-items: center;
  justify-content: start;
  gap: 6px;
  padding: 5px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  text-align: left;
  width: 100%;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
```

- [ ] **Update `.mvline-stat-value--bp` and `.mvline-stat-value--acc`** widths to match:

```css
:global(.mvline-stat-value--bp) {
  width: 1.5rem; /* fits "140" */
}

:global(.mvline-stat-value--acc) {
  width: 2.25rem; /* fits "100%" */
}
```

- [ ] **Add the calc column CSS** right after the existing `.mvline-calc-section` block:

```css
/* Calc column — fixed-width sibling to the moves lane */
:global(.calc-col) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex-shrink: 0;
  width: 160px;
  background: var(--muted/20, color-mix(in oklch, var(--muted) 40%, transparent));
  border-left: 1px solid var(--border);
  padding: 8px 0;
}

:global(.calc-col-header) {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  padding: 0 8px 5px;
  height: 21px; /* matches .moves-label spacer height */
  display: flex;
  align-items: flex-end;
}

:global(.calc-col-row) {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  font-family: var(--font-mono, monospace);
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  /* Height must match .mvline tile: 5px top + content + 5px bottom + 4px gap */
  min-height: 30px;
}

:global(.calc-col-row--ko1) { color: var(--ko-red); }
:global(.calc-col-row--ko2) { color: var(--ko-amber2-fg); }
:global(.calc-col-row--ko3) { color: var(--ko-yellow-fg); }
:global(.calc-col-row--ko4) { color: var(--muted-foreground); }
```

- [ ] **Typecheck:**
```bash
pnpm --filter @trainers/web typecheck 2>&1 | grep -E "error" | head -5
```
Expected: no errors (CSS-only change).

- [ ] **Commit:**
```bash
git add apps/web/src/components/team-builder/v2/builder.module.css
git commit -m "style(team-builder): update mvline grid for 280px lane + calc column CSS"
```

---

## Task 2: Create `CalcColumn` component

**Files:**
- Create: `apps/web/src/components/team-builder/v2/lanes/calc-column.tsx`

This component renders 4 rows of calc results (one per move slot), aligned with the 4 `MoveTile` rows. It reads all calc state from context and computes the same values `MoveTile` previously computed inline.

- [ ] **Create the file:**

```tsx
"use client";

import { getMoveData, type GameFormat } from "@trainers/pokemon";
import { type Tables } from "@trainers/supabase";

import { cn } from "@/lib/utils";

import { useCalcStateContext } from "../calc/calc-state-context";
import { getMoveEffectiveness } from "../calc/move-effectiveness";
import { getMoveTargetInfo } from "../calc/move-target-info";
import { getVerdict } from "../../use-calc-state";

// =============================================================================
// Types
// =============================================================================

interface CalcColumnProps {
  pokemon: Tables<"pokemon">;
  format: GameFormat | undefined;
}

type KoTier = "1" | "2" | "3" | "4" | null;

// =============================================================================
// Helpers
// =============================================================================

const MOVE_SLOTS = ["move1", "move2", "move3", "move4"] as const;
type MoveSlot = (typeof MOVE_SLOTS)[number];

function getKoTier(minPct: number, maxPct: number): KoTier {
  const verdict = getVerdict(minPct, maxPct);
  if (verdict === "OHKO") return "1";
  if (verdict === "2HKO") return "2";
  if (verdict === "3HKO") return "3";
  if (maxPct > 0) return "4";
  return null;
}

// =============================================================================
// CalcRow — one result row aligned to a MoveTile
// =============================================================================

interface CalcRowProps {
  slotIndex: number;
  moveName: string | null;
}

function CalcRow({ slotIndex, moveName }: CalcRowProps) {
  const calc = useCalcStateContext();
  const output = calc.moveCalcOutputs[slotIndex] ?? null;

  const moveData = moveName ? getMoveData(moveName) : null;
  const isStatus = moveData?.category === "Status";
  const hasCalc = calc.calcEnabled && output !== null && !isStatus;
  const hasDefender = calc.calcEnabled && Boolean(calc.defenderSpecies);

  const targetInfo = moveName ? getMoveTargetInfo(moveName) : null;
  const isSpread = targetInfo?.isSpread ?? false;
  const foesAlive = calc.field.foesAlive;
  const allyAlive = calc.field.allyAlive;
  const spreadApplied =
    isSpread &&
    (targetInfo?.kind === "all-foes"
      ? foesAlive >= 2
      : foesAlive >= 2 || allyAlive);

  const rawMin = output?.minPercent ?? 0;
  const rawMax = output?.maxPercent ?? 0;
  const displayMin = spreadApplied ? rawMin * 0.75 : rawMin;
  const displayMax = spreadApplied ? rawMax * 0.75 : rawMax;

  const koTier = hasCalc ? getKoTier(displayMin, displayMax) : null;
  const effectiveWeather = calc.weather || calc.inferredWeather;
  const eff =
    moveName && hasDefender && !isStatus
      ? getMoveEffectiveness(moveName, calc.defenderSpecies, effectiveWeather)
      : null;

  return (
    <div className={cn("calc-col-row", koTier && `calc-col-row--ko${koTier}`)}>
      {hasCalc && koTier ? (
        <>
          <span
            className="font-mono text-[8.5px] font-black tracking-[0.07em] uppercase flex-shrink-0"
          >
            {koTier === "1" ? "OHKO" : koTier === "2" ? "2HKO" : koTier === "3" ? "3HKO" : "4HKO+"}
          </span>
          <span className="tabular-nums flex-shrink-0">
            {displayMin.toFixed(1)}–{displayMax.toFixed(1)}%
          </span>
          {((eff !== null && eff !== 1) || spreadApplied) && (
            <span className="flex items-center gap-1">
              {eff !== null && eff !== 1 && (
                <span
                  className={cn(
                    "text-[8.5px] font-bold px-1 py-px rounded",
                    eff > 1
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : eff === 0
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/60 text-muted-foreground"
                  )}
                  title={eff === 0 ? "Immune" : `${eff}× effectiveness`}
                >
                  {eff}×
                </span>
              )}
              {spreadApplied && (
                <span
                  className="text-[8.5px] font-bold text-muted-foreground"
                  title="Spread −25%"
                >
                  spread
                </span>
              )}
            </span>
          )}
        </>
      ) : moveName && !isStatus && hasDefender && output === null ? (
        <span className="text-[9.5px] italic text-muted-foreground/70 font-normal">
          — unavailable —
        </span>
      ) : moveName && !isStatus && !hasDefender ? (
        <span className="text-[9.5px] italic text-muted-foreground/50 font-normal">
          — pick target —
        </span>
      ) : (
        <span className="text-muted-foreground/30 font-normal">—</span>
      )}
    </div>
  );
}

// =============================================================================
// CalcColumn
// =============================================================================

/**
 * Fixed 160px column showing damage calc results for all 4 move slots.
 * Rendered beside MovesLane when calc.calcEnabled is true.
 * Each row aligns with the corresponding MoveTile row.
 */
export function CalcColumn({ pokemon, format: _format }: CalcColumnProps) {
  return (
    <div className="calc-col">
      <div className="calc-col-header">CALC</div>
      {MOVE_SLOTS.map((slot, i) => (
        <CalcRow
          key={slot}
          slotIndex={i}
          moveName={pokemon[slot] ?? null}
        />
      ))}
    </div>
  );
}
```

- [ ] **Typecheck:**
```bash
pnpm --filter @trainers/web typecheck 2>&1 | grep -E "error|calc-column" | head -10
```
Expected: no errors.

- [ ] **Commit:**
```bash
git add apps/web/src/components/team-builder/v2/lanes/calc-column.tsx
git commit -m "feat(team-builder): add CalcColumn component with aligned calc result rows"
```

---

## Task 3: Strip calc content from `MoveTile` and fix `MovesLane` width

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/lanes/moves-lane.tsx`

`MoveTile` becomes pure move display — no calc imports, no sibling calc section div. `MovesLane` fixes its width at `280px` when `calcEnabled`, otherwise `flex: 1`.

- [ ] **Remove unused imports from `moves-lane.tsx`** — these are only needed by the calc section being removed:

Remove these lines from the import section:
```tsx
import { getMoveEffectiveness } from "../calc/move-effectiveness";
import { getMoveTargetInfo } from "../calc/move-target-info";
import { getVerdict } from "../../use-calc-state";
```

Keep: `useCalcStateContext` (still needed for `hasCalc` to set KO tier CSS classes on the button, and `CalcDetailCard` popup), `CalcDetailCard`.

- [ ] **Remove the calc computation variables from `MoveTile`** (lines ~101–136). Keep only what's needed for the button KO-tier CSS classes and the `CalcDetailCard` popup. The new `MoveTile` body after the `useState` and context reads should be:

```tsx
const calc = useCalcStateContext();
const moveIdx = SLOT_IDX[slotKey];
const output = calc.moveCalcOutputs[moveIdx] ?? null;

const moveData = moveName ? getMoveData(moveName) : null;
const isStatus = moveData?.category === "Status";
const hasCalc = calc.calcEnabled && output !== null && !isStatus;

const foesAlive = calc.field.foesAlive;
const allyAlive = calc.field.allyAlive;

// KO tier for button border coloring only
const targetInfo = moveName ? getMoveTargetInfo(moveName) : null;
const isSpread = targetInfo?.isSpread ?? false;
const spreadApplied =
  isSpread &&
  (targetInfo?.kind === "all-foes"
    ? foesAlive >= 2
    : foesAlive >= 2 || allyAlive);
const rawMin = output?.minPercent ?? 0;
const rawMax = output?.maxPercent ?? 0;
const displayMin = spreadApplied ? rawMin * 0.75 : rawMin;
const displayMax = spreadApplied ? rawMax * 0.75 : rawMax;
const koTier = hasCalc ? getKoTier(displayMin, displayMax) : null;

const hasError = slotErrors.some((e) => e.severity === "error");
```

Note: keep `getMoveTargetInfo` import and `getVerdict`/`getKoTier` — they're used for `koTier` which drives the button border color. Remove `getMoveEffectiveness` only.

- [ ] **Remove the sibling calc section div** from `MoveTile`'s return — the entire block:

```tsx
{/* Calc section — to the right of the move button */}
{calc.calcEnabled && (
  <div className={cn(
    "mvline-calc-section",
    ...
  )}>
    ...
  </div>
)}
```

And remove the outer `<div className="flex min-w-0 flex-row items-stretch">` wrapper, so the return is just:

```tsx
return (
  <div className="flex flex-col">
    <Popover ...>
      <PopoverTrigger ...>
        {/* grid content: type+cat, name, BP, Acc */}
      </PopoverTrigger>
      <PopoverContent ...>...</PopoverContent>
    </Popover>
    {slotErrors.map(...)}
  </div>
);
```

- [ ] **Update `MovesLane`** to read `calcEnabled` and fix its width:

```tsx
export function MovesLane({ pokemon, format, onUpdate, fieldErrors = [] }: MovesLaneProps) {
  const { calcEnabled } = useCalcStateContext();

  function handlePick(slotKey: MoveSlot, name: string) {
    onUpdate({ [slotKey]: name });
  }

  return (
    <div
      className={cn(
        "flex flex-col justify-center gap-1 border-r border-dashed border-border/60 p-3",
        calcEnabled
          ? "w-[440px] shrink-0"
          : "w-[440px] shrink-0"
      )}
    >
      {/* Header */}
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-muted-foreground font-mono text-[9.5px] font-medium tracking-widest uppercase">
          Moves
        </span>
      </div>

      {/* Move tiles */}
      <div className="flex flex-col gap-1">
        {MOVE_SLOTS.map((slotKey) => {
          const slotErrors = fieldErrors.filter((e) => e.field === slotKey);
          return (
            <MoveTile
              key={slotKey}
              slotKey={slotKey}
              moveName={pokemon[slotKey]}
              species={pokemon.species ?? ""}
              format={format}
              attacker={pokemon}
              onPick={handlePick}
              slotErrors={slotErrors}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Typecheck:**
```bash
pnpm --filter @trainers/web typecheck 2>&1 | grep -E "error|moves-lane" | head -10
```
Expected: no errors.

- [ ] **Commit:**
```bash
git add apps/web/src/components/team-builder/v2/lanes/moves-lane.tsx
git commit -m "refactor(team-builder): strip calc from MoveTile; fix MovesLane width to 440px always"
```

---

## Task 4: Wire `CalcColumn` into `active-row.tsx`

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/lanes/active-row.tsx`

Add `CalcColumn` as a flex sibling of `MovesLane`. It is only rendered when `calc.calcEnabled`. Import `useCalcStateContext` to read `calcEnabled`.

- [ ] **Add imports to `active-row.tsx`:**

```tsx
import { useCalcStateContext } from "../calc/calc-state-context";
import { CalcColumn } from "./calc-column";
```

- [ ] **Inside `ActiveRow`**, add the `calcEnabled` read and `CalcColumn` after `MovesLane`:

```tsx
export function ActiveRow({ ... }: ActiveRowProps) {
  const { calcEnabled } = useCalcStateContext();
  // ... existing error partitioning ...

  return (
    <div className={cn(s.rowActive, ...)}>
      {/* RIB */}
      ...

      <IdentityLane ... />

      <StatsLane ... />

      <MovesLane
        pokemon={pokemon}
        format={format}
        onUpdate={onUpdate}
        fieldErrors={movesErrors}
      />

      {/* Calc column — appears beside moves when calc panel is open */}
      {calcEnabled && (
        <CalcColumn pokemon={pokemon} format={format} />
      )}
    </div>
  );
}
```

- [ ] **Typecheck:**
```bash
pnpm --filter @trainers/web typecheck 2>&1 | grep -E "error|active-row" | head -10
```
Expected: no errors.

- [ ] **Run tests:**
```bash
pnpm --filter @trainers/web test 2>&1 | tail -20
```
Expected: all pass.

- [ ] **Commit:**
```bash
git add apps/web/src/components/team-builder/v2/lanes/active-row.tsx
git commit -m "feat(team-builder): wire CalcColumn beside MovesLane in active row"
```

---

## Task 5: Verify end-to-end

- [ ] **Start dev server:**
```bash
pnpm dev:web 2>&1 | tail -5
```

- [ ] **Open the team builder** at `http://localhost:3000/dashboard/alts/<username>/teams/<id>` with a team that has moves set.

- [ ] **Calc closed:** Moves lane should fill available space (`flex: 1`), all 4 move rows show type+name+BP+ACC cleanly. No calc column visible.

- [ ] **Calc opened** (click "Damage calc" in dock bar and select a defender): Moves lane narrows to 280px, CalcColumn (160px) appears to the right with 4 aligned rows showing KO tier + range + modifiers.

- [ ] **Adjust an EV slider** in the stats lane while calc is open: the calc column results should update live (React re-render driven by context).

- [ ] **Verify no clipping**: "4HKO+ 27.7–32.6% 0.5×" should render completely in the 160px column without overflow.

- [ ] **Status moves** (Protect, Follow Me, etc.) should show `—` in the calc column.

- [ ] **No defender selected** should show `— pick target —`.

- [ ] **Final typecheck + test:**
```bash
pnpm --filter @trainers/web typecheck 2>&1 | grep error | head -5
pnpm --filter @trainers/web test 2>&1 | tail -10
```
Expected: no errors, all tests pass.

- [ ] **Commit:**
```bash
git add -A
git commit -m "chore(team-builder): verified calc column layout end-to-end"
```
