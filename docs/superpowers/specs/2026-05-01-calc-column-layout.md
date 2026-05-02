# Calc Column Layout — Design Spec

## Context

The damage calc panel is already open as a bottom drawer. When it's open, users need to see calc results (KO tier + damage range + modifiers) alongside each move. The current implementation puts calc results inside the `.mvline` button, causing the button to clip its content when the calc section competes for width.

The user needs sliders visible at all times because adjusting EVs triggers live calc recalculation. Any approach that hides or compresses the stats lane is off the table.

## Design — Option B

**Fixed column widths for every lane:**

| Lane | Width | Notes |
|------|-------|-------|
| Rib | 30px | Slot number |
| Identity | 340px | Species + form + ITEM/ABIL/NAT/LV/TERA |
| Stats | 320px | Always full — sliders must stay for live calc |
| Moves | 280px | **Fixed always** — never changes based on calc state |
| Calc column | 160px | Appears beside moves only when `calc.calcEnabled` |

**Total (calc open):** 30 + 340 + 320 + 280 + 160 = **1130px** — fits at 1280px+ viewport.
**Total (calc closed):** 970px — moves lane fills remaining space naturally via `flex: 1`.

### Move Tile Grid (inside 280px lane)

```
88px        112px         44px   60px
[type+cat]  [name]        [BP]   [ACC]
```

- `type+cat`: 88px — type sprite (h-18px → ~41px) + cat icon (18px) + gap
- `name`: `minmax(0, 1fr)` — fills remaining, truncates with ellipsis if needed
- `BP`: 44px fixed
- `ACC`: 60px fixed

### Calc Column (160px)

A new `CalcColumn` component rendered in `active-row.tsx` as a sibling to `MovesLane`, gated on `calc.calcEnabled`.

Renders 4 rows matching the 4 move tiles exactly (same padding, same height).

Each row shows:
- KO tier label (`OHKO` / `2HKO` / `3HKO` / `4HKO+`) — colored by tier
- Damage range (`31.1–37.1%`) — tabular nums
- Modifiers: effectiveness chip (`0.5×`, `2×`) and/or `spread`
- Status moves / no target: `—` (muted)

Data source: `calc.moveCalcOutputs[index]` from `useCalcStateContext()` — already computed.

### Move Lane Width

- **Always `flex: 0 0 440px; flex-shrink: 0`** — fixed at 440px regardless of calc state
- When calc is closed: remaining card space appears after moves

## Components to Change

### `apps/web/src/components/team-builder/v2/lanes/moves-lane.tsx`
- Remove all calc content from `MoveTile` (revert to pure move display)
- `MovesLane`: always `w-[440px] shrink-0` — fixed width regardless of calc state

### `apps/web/src/components/team-builder/v2/lanes/stats-lane.tsx`
- No changes — stats stays at 320px always

### `apps/web/src/components/team-builder/v2/builder.module.css`
- `.mvline` grid: `max-content | minmax(0,1fr) | 56px | 72px` (adjusted for 440px lane)
- Remove `mvline-calc-row` styles (no longer needed)
- Keep `mvline-calc-section` styles for the `CalcColumn` rows

### `apps/web/src/components/team-builder/v2/lanes/active-row.tsx`
- Add `<CalcColumn>` as flex sibling to `<MovesLane>`, gated on `calc.calcEnabled`

### NEW: `apps/web/src/components/team-builder/v2/lanes/calc-column.tsx`
- `CalcColumn` component
- Uses `useCalcStateContext()` for outputs + defender/field state
- Receives `pokemon` (for move names + attacker stats) and `format`
- Renders 4 `CalcRow` items, each reading `calc.moveCalcOutputs[i]`

## Verification

1. `pnpm --filter @trainers/web typecheck` — no errors
2. Calc panel closed → moves lane fills space, no calc column visible
3. Calc panel open → moves lane is 280px, calc column appears aligned to the right
4. Adjust EV slider → calc results update live
5. Check "4HKO+ 27.7–32.6% 0.5×" renders fully without clipping
6. Status moves and no-defender state show `—` in calc column
