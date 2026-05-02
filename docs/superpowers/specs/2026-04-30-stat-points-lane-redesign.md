# Stat-Points Lane Redesign — v2 PokeRow

## Context

The v2 team builder's per-Pokemon Stats lane currently has four pain points:

1. **Truncated labels.** The label column is 26 px, so HP/ATK/DEF/SPA/SPD/SPE render as "HP|", "ATI", "DEI", "SP/", "SPI", "SPI" — players can't tell SpA from SpD from Spe.
2. **Hidden base stats.** Base stat numbers aren't shown in the row; the user has no anchor for "what am I working with."
3. **Overlay-only editing.** Each stat opens a `NumberPicker` popover to change EV/SP — no inline interaction.
4. **No breakpoint hints.** Pokemon stat formulas floor at non-uniform thresholds for +nature stats; players manually find these via tools today.

This redesign replaces the current row layout with a Pokemon-Showdown-style affordance: a read-only visualization bar plus a separate slider control, with breakpoint ticks on the +nature stat.

## Out of Scope

- IV editor section below the rows (kept as-is, collapsible).
- Format-gating (already correct).
- Total-investment chip at the top of the lane (kept as-is — `25/66` for Champions, `508/508` for VGC).
- Validation chip rendering (existing `FieldError` pattern stays).
- Mobile responsive collapse (handled in a later task — this design targets desktop ≥ 1024 px).

## Row Anatomy

Each of the six stat rows uses one CSS-grid template:

```
┌─label─base─viz-bar──────────input──slider────────final┐
│ 36px  26px  1fr        38px  ~110px       32px      │
```

| Column      | Purpose                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| **Label**   | "HP" / "Atk" / "Def" / "SpA" / "SpD" / "Spe" — readable, color-coded by stat tier. Inline ▲ red chevron on +nature, ▽ blue chevron on −nature. |
| **Base #**  | Base stat number, muted mono.                                            |
| **Viz bar** | Read-only horizontal bar. Maps 0→250 final stat. Solid base layer + diagonal-striped invest overlay. Grows as the slider increases. |
| **Input**   | Number input. Shows raw EV/SP with Showdown-style nature suffix: empty if 0+neutral, `−` if 0+−nature, `+` if 0+(+nature), `25+` if 25+(+nature), `4−` if 4+(−nature). Direct keyboard entry typed-through. |
| **Slider**  | The controllable affordance. Range 0→`perStatMax`. Step 1 (Champions) or 4 (VGC). Drag to set. Red breakpoint ticks on the +nature stat's slider only. |
| **Final #** | Final calculated stat, mono, bold.                                        |

The viz bar is **not** draggable. The slider is the only EV/SP input affordance.

## Breakpoints (the +nature stat only)

A "breakpoint" is an EV/SP value at which the displayed final stat increases by 1. Pokemon's stat formulas have two `floor()` calls; for +nature stats the 1.1 multiplier creates non-uniform breakpoint spacing in EV space. Players need this visualization to invest precisely without waste.

### New helper: `findStatBreakpoints`

Add to `packages/pokemon/src/stats.ts`:

```ts
export function findStatBreakpoints(args: {
  statKey: StatKey;
  base: number;
  iv: number;          // ignored in Champions
  level: number;       // ignored in Champions (treated as 50 fixed)
  natureMultiplier: number; // 1.0 for HP regardless
  perStatMax: number;
  step: number;
  isChampions: boolean;
}): number[];
```

Algorithm:

```ts
const out: number[] = [];
let prev = computeStatAt(0);
for (let ev = step; ev <= perStatMax; ev += step) {
  const cur = computeStatAt(ev);
  if (cur > prev) { out.push(ev); prev = cur; }
}
return out;
```

`computeStatAt` reuses the existing `calculateHP` / `calculateStat` / `calculateChampionsHP` / `calculateChampionsStat` helpers.

Cost: ≤ 252/4 × 1 = 63 iterations per call (VGC, non-HP), ≤ 32 × 1 = 32 iterations (Champions). Negligible.

Invalidates on: species (→ base), IV, level (non-Champions), `natureMultiplier`, format. React Compiler memoizes free.

### Tick rendering

The +nature stat's slider track gets red `<span>` ticks at each breakpoint EV mapped to slider position `ev / perStatMax * 100%`. The breakpoint immediately above the current invest renders brighter (`.bump.next`) so the player sees the next useful target while dragging. Other rows render no ticks.

## Slider Behavior

- Range: `[0, perStatMax]` clamped further to the team-wide remaining budget (`min(perStatMax, totalBudget − otherStatsInvestment)`).
- Step: `step` (1 for Champions SP, 4 for VGC EV).
- Pointer: drag to set value continuously; click anywhere on the track to jump to that value.
- Keyboard: ArrowLeft/ArrowRight (one step), PageDown/PageUp (10 steps), Home/End (0 / per-stat-max). Standard `<input type="range">` semantics work.
- ARIA: `role="slider" aria-valuemin={0} aria-valuemax={perStatMax} aria-valuenow={ev} aria-valuetext={...} aria-labelledby={...}`.
- Optimistic update flows through existing `onUpdate` → `updatePokemonAction`.

## Number Input Behavior

- `type="text"` (so the ± suffix can render). On blur or Enter, parse the integer prefix; if empty, set to 0; if `> perStatMax`, clamp; on input, update slider live.
- Suffix display rules:
  - 0 EV/SP + neutral nature: empty (placeholder dim "0" optional).
  - 0 EV/SP + +nature: `+`.
  - 0 EV/SP + −nature: `−`.
  - N EV/SP + neutral: `N`.
  - N EV/SP + +nature: `N+`.
  - N EV/SP + −nature: `N−`.
- Color hint: red text on +nature, blue on −nature, neutral otherwise.

## Removal

- `pickers/number-picker.tsx` no longer used by the stats lane (it stays for any other consumer; remove only if call-graph confirms zero usage after this lands).
- The `<Popover>` wrapping each `StatRow` goes away.

## Files Touched

| File                                                                       | Change                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/pokemon/src/stats.ts`                                            | Add `findStatBreakpoints`. Export.                                                         |
| `packages/pokemon/src/index.ts`                                            | Re-export `findStatBreakpoints`.                                                           |
| `apps/web/src/components/team-builder/v2/lanes/stats-lane.tsx`             | Replace `StatRow` body with the new layout (label/base/vizbar/input/slider/final). Drop the `Popover` wrapper. |
| `apps/web/src/components/team-builder/v2/builder.module.css`               | Replace `.statRow`, `.statBar`, `.statBarFill`, `.statLabel`, `.statValue`, `.statEv` rules with `.spread-row`, `.spread-vbar`, `.spread-vbar-base`, `.spread-vbar-invest`, `.spread-input`, `.spread-slider`, `.spread-bumps`. Wider grid template (≥ 480 px stats lane). |
| `apps/web/src/components/team-builder/v2/lanes/__tests__/stats-lane.test.tsx` | Add coverage for: full label rendering, slider value reflects EV, ▲/▽ chevrons render on the right rows, breakpoint ticks count matches `findStatBreakpoints` output for the +nature stat, no ticks on neutral/-nature stats. |
| `packages/pokemon/src/__tests__/stats.test.ts`                             | Add unit tests for `findStatBreakpoints` covering: HP-no-nature, +nature stat in VGC, +nature stat in Champions, neutral stat, no IVs (Champions). |

The `pickers/number-picker.tsx` file stays in place; its only known caller is the StatRow popover which is being replaced. Audit usage before removal in implementation phase.

## Stats-Lane Width

Current minimum is 260 px. New layout needs ≥ 480 px to fit input (38) + slider (~110) + the rest. At narrower viewports the row collapses gracefully:

- ≥ 768 px: full layout as designed.
- < 768 px: out of scope for this redesign — the v2 builder already uses a different mobile shell. We leave the rows clamped to a `min-width: 480 px` and rely on the row's natural horizontal scroll within `.editorRegion` until a separate mobile pass.

## Reactivity Acceptance

Drag the slider on Atk for an Adamant Champions Pokemon → input shows "25+" → final stat updates → bar grows → next-bump tick highlights → calc drawer reflects new Atk → heatmap unaffected (defensive matrix doesn't depend on stats). All updates immediate, no perceptible lag.

## Verification

1. `pnpm --filter @trainers/web typecheck` → 0 errors.
2. `pnpm --filter @trainers/web lint` → 0 errors.
3. `pnpm --filter @trainers/pokemon test` → all green (covers `findStatBreakpoints`).
4. `pnpm --filter @trainers/web test -- stats-lane` → all green.
5. Browser at `http://localhost:3000/dashboard/alts/admin_trainer/teams/197`:
   - Active row's stats lane shows full labels HP/Atk/Def/SpA/SpD/Spe with base numbers next to each.
   - Dragging Spe slider on a Jolly Pokemon: bar grows, input shows `252+`, red ticks visible on slider, brightest tick is the next bump.
   - Switching nature from Jolly to Adamant: ticks move from Spe to Atk; chevrons swap; numbers recompute.
   - Champions M-A team: total chip caps at 25/66, slider step is 1, slider max is 32.
   - VGC team: total chip caps at 252/508, slider step is 4, slider max is 252.
   - Number input: typing "100" then Enter sets the value; "+" / "−" hints render on the right of the value.

## Risks / Trade-offs

- **Visual density.** Adding a slider to every row makes the lane wider. Acceptable on desktop ≥ 1280 px (where this builder runs); future mobile pass needs a different layout.
- **Bar mapping inconsistency.** Viz bar maps 0→250 final stat (proportional to Pokemon stat scale); slider maps 0→perStatMax investment (proportional to format budget). They mean different things — labels and column position should make this clear; the design has separate visual treatments to reinforce the distinction.
- **No bar-drag.** Earlier iterations had a draggable bar. Pokemon Showdown's pattern (separate bar + slider) won out — clearer affordances, cleaner code, matches established mental model from competitive players.
