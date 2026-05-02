# Calc Move Tile Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `DefenderMoveTile` in the damage calc panel from a 3-row stack to a 2-row layout where BP/accuracy live on the move name row and the damage % is the visual anchor of the calc output row.

**Architecture:** Single file change in `calc-defender-moves.tsx`. Row 1 gains BP and accuracy inline. Row 2 replaces the KO pill + detail line with a flat damage line: large % (colored by tier) · thin divider · tier label · thin divider · HP range · contextual notes. No new files, no prop changes.

**Tech Stack:** React 19, Tailwind CSS 4, `@testing-library/react`.

**Spec:** `docs/design/2026-05-01-calc-move-tile-redesign.md`

---

## File Map

| File | Action |
|---|---|
| `apps/web/src/components/team-builder/v2/calc/calc-defender-moves.tsx` | Modify — rewrite `DefenderMoveTile` render only |
| `apps/web/src/components/team-builder/v2/__tests__/calc-defender-moves.test.tsx` | Modify — update tests for new layout |

---

## Task 1: Rewrite `DefenderMoveTile` render

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/calc/calc-defender-moves.tsx`

### What changes

- `KO_TIER_CLASS` (used for the old pill CSS classes) → replaced by `KO_TIER_COLOR` (Tailwind text classes for the damage %)
- Add `basePower` derivation alongside the existing `accuracy` derivation
- Row 1: add BP + accuracy between move name and chevron
- Row 2: replace the pill + detail line with a flat damage line
- Remove row 3 entirely (its content is redistributed to rows 1 and 2)

- [ ] **Step 1: Replace `KO_TIER_CLASS` with `KO_TIER_COLOR`**

In `calc-defender-moves.tsx`, replace lines 42–47:

```ts
/** KO tier → Tailwind text-color class for the damage % display. */
const KO_TIER_COLOR: Record<string, string> = {
  OHKO: "text-destructive",
  "2HKO": "text-yellow-400 dark:text-yellow-300",
  "3HKO": "text-orange-400",
  "4HKO+": "text-muted-foreground",
};
```

- [ ] **Step 2: Add `basePower` derivation**

In `DefenderMoveTile`, after the existing `accuracy` derivation (around line 148), add:

```ts
// Base power — omit for status moves (basePower === 0)
const basePower = moveData?.basePower ?? 0;
```

- [ ] **Step 3: Rewrite the PopoverTrigger children**

Replace everything between `{/* Row 1 */}` and the closing tag of the PopoverTrigger children (lines 179–230) with:

```tsx
{/* Row 1: type badge + move name + BP + accuracy + chevron */}
<div className="flex items-center gap-1.5">
  {moveType ? (
    <img
      src={getShowdownTypeIconUrl(moveType)}
      alt={moveType}
      className="h-4 w-auto [image-rendering:pixelated]"
    />
  ) : (
    <span className="inline-block h-4 w-8" aria-hidden />
  )}
  <span
    className={cn(
      "flex-1 text-[11.5px] font-medium",
      isEmpty && "text-muted-foreground/60 italic"
    )}
  >
    {moveName || "+ Add move"}
  </span>
  {basePower > 0 && (
    <span className="font-mono text-[9px] text-muted-foreground">
      BP {basePower}
    </span>
  )}
  {accuracy !== null && accuracy < 100 && (
    <span className="font-mono text-[9px] text-muted-foreground">
      · {accuracy}% acc
    </span>
  )}
  <span className="text-[10px] text-muted-foreground" aria-hidden>
    ▾
  </span>
</div>

{/* Row 2: damage % · KO tier · HP range · contextual notes */}
{output && koTierLabel && (
  <div className="mt-1 flex items-center gap-1.5">
    <span
      className={cn(
        "font-mono text-[12px] font-bold",
        KO_TIER_COLOR[koTierLabel] ?? "text-muted-foreground"
      )}
    >
      {output.minPercent.toFixed(1)}–{output.maxPercent.toFixed(1)}%
    </span>
    <span className="h-[10px] w-px flex-shrink-0 bg-border" aria-hidden />
    <span className="font-mono text-[9px] text-muted-foreground">
      {koTierLabel}
    </span>
    {dmgMin !== null && dmgMax !== null && (
      <>
        <span className="h-[10px] w-px flex-shrink-0 bg-border" aria-hidden />
        <span className="font-mono text-[9px] text-muted-foreground">
          {dmgMin}–{dmgMax}
          {attackerHP !== null ? ` / ${attackerHP} HP` : ""}
        </span>
      </>
    )}
    {extraNote && (
      <span className="font-mono text-[9px] text-teal-500 dark:text-teal-400">
        · {extraNote}
      </span>
    )}
  </div>
)}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck 2>&1 | grep "calc-defender-moves" | head -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/team-builder/v2/calc/calc-defender-moves.tsx
git commit -m "feat(calc): redesign move tile — BP/acc on name row, damage % on calc row"
```

---

## Task 2: Update tests

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/__tests__/calc-defender-moves.test.tsx`

The existing tests check for the old 3-row layout (pill + detail line). Update them to match the new 2-row layout.

- [ ] **Step 1: Update the test file description block**

Replace the `Covers:` comment at the top to reflect the new layout:

```ts
/**
 * Behavioral tests for CalcDefenderMoves and its inner DefenderMoveTile.
 *
 * Covers:
 *   - "Their moves → your atk" header renders
 *   - 4 tiles always render (empty slots show "+ Add move")
 *   - Move name renders for filled slots
 *   - Type icon rendered for a move with type data
 *   - BP renders on row 1 for damaging moves ("BP 65")
 *   - BP omitted for status moves (basePower 0)
 *   - Accuracy renders on row 1 only when < 100% ("· 70% acc")
 *   - No accuracy shown when accuracy is true (always-hit) or 100
 *   - Damage % renders on row 2 with KO-tier color class
 *   - KO tier label renders on row 2 (OHKO / 2HKO / 3HKO / 4HKO+)
 *   - HP range renders on row 2 when attackerHP is provided
 *   - Debuff notes on row 2: "· −2 SpA after" (Draco Meteor)
 *   - Pivot note on row 2: "· pivots out" (U-turn)
 *   - Row 2 not rendered when output is null
 *   - computeReverseOutput called with move name for each filled slot
 *   - onPick called with slotIdx and move name after picking
 */
```

- [ ] **Step 2: Update row-1 tests — BP**

`getMoveData` is mocked via `mockGetMoveData` (already set up in the test file). The `makeMoveData()` factory has `basePower: 90` as default. Use it with overrides:

```ts
it("renders BP on row 1 for damaging moves", () => {
  mockGetMoveData.mockReturnValue(makeMoveData({ basePower: 80 }));
  const computeReverseOutput = jest.fn().mockReturnValue(null);
  render(
    <CalcDefenderMoves
      effectiveMoves={["Any Move", "", "", ""]}
      computeReverseOutput={computeReverseOutput}
      attackerHP={200}
      defenderSpecies="Incineroar"
      format={undefined}
      onPick={jest.fn()}
    />
  );
  expect(screen.getByText("BP 80")).toBeInTheDocument();
});

it("omits BP for status moves (basePower 0)", () => {
  mockGetMoveData.mockReturnValue(makeMoveData({ basePower: 0 }));
  const computeReverseOutput = jest.fn().mockReturnValue(null);
  render(
    <CalcDefenderMoves
      effectiveMoves={["Any Move", "", "", ""]}
      computeReverseOutput={computeReverseOutput}
      attackerHP={200}
      defenderSpecies="Incineroar"
      format={undefined}
      onPick={jest.fn()}
    />
  );
  expect(screen.queryByText(/^BP/)).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Update row-1 tests — accuracy**

Replace the old accuracy tests (which checked the old detail line) with tests checking row 1. The `mockGetMoveData` setup is the same — use `makeMoveData({ accuracy: 70 })` etc.:

```ts
it("renders accuracy on row 1 when accuracy is numeric and < 100", () => {
  mockGetMoveData.mockReturnValue(makeMoveData({ accuracy: 70 }));
  const computeReverseOutput = jest.fn().mockReturnValue(null);
  render(
    <CalcDefenderMoves
      effectiveMoves={["Any Move", "", "", ""]}
      computeReverseOutput={computeReverseOutput}
      attackerHP={200}
      defenderSpecies="Incineroar"
      format={undefined}
      onPick={jest.fn()}
    />
  );
  expect(screen.getByText(/· 70% acc/)).toBeInTheDocument();
});

it("omits accuracy on row 1 when accuracy is true (always-hit)", () => {
  mockGetMoveData.mockReturnValue(makeMoveData({ accuracy: true }));
  const computeReverseOutput = jest.fn().mockReturnValue(null);
  render(
    <CalcDefenderMoves
      effectiveMoves={["Any Move", "", "", ""]}
      computeReverseOutput={computeReverseOutput}
      attackerHP={200}
      defenderSpecies="Incineroar"
      format={undefined}
      onPick={jest.fn()}
    />
  );
  expect(screen.queryByText(/% acc/)).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Update row-2 tests — damage % and KO tier**

Set `mockGetMoveData.mockReturnValue(makeMoveData())` in `beforeEach` (already done in the existing file). These tests control output via `computeReverseOutput`:

```ts
it("renders damage % on row 2 with value from output", () => {
  const computeReverseOutput = jest.fn().mockReturnValue({
    minPercent: 34.0,
    maxPercent: 40.2,
    rolls: [66, 78],
    defenderMaxHP: 194,
    desc: "",
  });
  render(
    <CalcDefenderMoves
      effectiveMoves={["Any Move", "", "", ""]}
      computeReverseOutput={computeReverseOutput}
      attackerHP={194}
      defenderSpecies="Gholdengo"
      format={undefined}
      onPick={jest.fn()}
    />
  );
  expect(screen.getByText("34.0–40.2%")).toBeInTheDocument();
});

it("renders KO tier label on row 2", () => {
  const computeReverseOutput = jest.fn().mockReturnValue({
    minPercent: 34.0,
    maxPercent: 40.2,
    rolls: [66, 78],
    defenderMaxHP: 194,
    desc: "",
  });
  render(
    <CalcDefenderMoves
      effectiveMoves={["Any Move", "", "", ""]}
      computeReverseOutput={computeReverseOutput}
      attackerHP={194}
      defenderSpecies="Gholdengo"
      format={undefined}
      onPick={jest.fn()}
    />
  );
  expect(screen.getByText("3HKO")).toBeInTheDocument();
});

it("renders HP range on row 2 when attackerHP provided", () => {
  const computeReverseOutput = jest.fn().mockReturnValue({
    minPercent: 34.0,
    maxPercent: 40.2,
    rolls: [66, 78],
    defenderMaxHP: 194,
    desc: "",
  });
  render(
    <CalcDefenderMoves
      effectiveMoves={["Any Move", "", "", ""]}
      computeReverseOutput={computeReverseOutput}
      attackerHP={194}
      defenderSpecies="Gholdengo"
      format={undefined}
      onPick={jest.fn()}
    />
  );
  expect(screen.getByText(/66–78 \/ 194 HP/)).toBeInTheDocument();
});

it("does not render row 2 when output is null", () => {
  const computeReverseOutput = jest.fn().mockReturnValue(null);
  render(
    <CalcDefenderMoves
      effectiveMoves={["Any Move", "", "", ""]}
      computeReverseOutput={computeReverseOutput}
      attackerHP={194}
      defenderSpecies="Gholdengo"
      format={undefined}
      onPick={jest.fn()}
    />
  );
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});
```

- [ ] **Step 5: Update note tests — pivots out and debuff**

The note text comes from `getMoveExtraNote(moveName)` which checks the move name against the hardcoded sets (`PIVOT_MOVES`, `SPA_DROP_MOVES`, `DEF_DROP_MOVES`). Pass the real move name so the function matches — `getMoveExtraNote` does NOT use the mock, it uses the imported sets directly:

```ts
it("renders pivot note on row 2 for U-turn", () => {
  // getMoveExtraNote("U-turn") returns "pivots out" via PIVOT_MOVES set
  const computeReverseOutput = jest.fn().mockReturnValue({
    minPercent: 8.2,
    maxPercent: 9.7,
    rolls: [16, 19],
    defenderMaxHP: 194,
    desc: "",
  });
  render(
    <CalcDefenderMoves
      effectiveMoves={["U-turn", "", "", ""]}
      computeReverseOutput={computeReverseOutput}
      attackerHP={194}
      defenderSpecies="Gholdengo"
      format={undefined}
      onPick={jest.fn()}
    />
  );
  expect(screen.getByText(/· pivots out/)).toBeInTheDocument();
});

it("renders SpA drop note on row 2 for Draco Meteor", () => {
  // getMoveExtraNote("Draco Meteor") returns "−2 SpA after" via SPA_DROP_MOVES set
  const computeReverseOutput = jest.fn().mockReturnValue({
    minPercent: 55.0,
    maxPercent: 65.0,
    rolls: [107, 126],
    defenderMaxHP: 194,
    desc: "",
  });
  render(
    <CalcDefenderMoves
      effectiveMoves={["Draco Meteor", "", "", ""]}
      computeReverseOutput={computeReverseOutput}
      attackerHP={194}
      defenderSpecies="Gholdengo"
      format={undefined}
      onPick={jest.fn()}
    />
  );
  expect(screen.getByText(/· −2 SpA after/)).toBeInTheDocument();
});
```

- [ ] **Step 6: Run the test suite for this file**

```bash
cd /Users/beanie/source/trainers.gg
pnpm --filter @trainers/web exec jest --testPathPattern="calc-defender-moves" --no-coverage 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/team-builder/v2/__tests__/calc-defender-moves.test.tsx
git commit -m "test(calc): update move tile tests for 2-row layout"
```

---

## Final Check

- [ ] **Typecheck**

```bash
pnpm typecheck 2>&1 | grep -iE "error" | grep -v "node_modules" | head -10
```

Expected: no errors.

- [ ] **Full calc test suite**

```bash
pnpm --filter @trainers/web exec jest --testPathPattern="calc-" --no-coverage 2>&1 | tail -10
```

Expected: all pass.
