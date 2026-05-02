# Defender Identity + Stats Layout Redesign

## Context

The damage calc defender panel currently stacks the identity section (sprite, name, types, item/abil/nat/tera) vertically above the stat spread section. This creates a tall, vertical layout that feels disconnected from the poke-row editor, which places identity and stats as horizontal adjacent lanes. The goal is to unify the visual language so the defender panel feels like a natural extension of the editor — same component patterns, same CSS classes, same mental model.

## Design

### Layout

Replace the vertically-stacked `calc-defender-header.tsx` + `calc-defender-stats.tsx` arrangement with a single horizontal flex row containing two lanes, identical in structure to the poke-row's `laneId` + `laneStats` pattern:

```
┌─────────────────────────────────────────────────────┐
│ DEFENDER                          vs Gholdengo·194HP │
├──────────────────┬──────────────────────────────────┤
│ [sprite]  Name   │ SPREAD                   256/510  │
│ FIRE DARK        │ HP   95  ████░░  252  ▬▬▬▬  202  │
│ Item  Sitrus...  │ ATK 115  █████░    0  ▬▬▬▬  135  │
│ Abil  Intimid... │ DEF  90  ████░░    0  ▬▬▬▬  110  │
│ Nat   Careful    │ SPA  80  ████░░    4  ▬▬▬▬   98  │
│       +SpD/−SpA  │ SPD▲ 60  ███▒▒▒  252  ▬▬▬▬  122  │
│ Tera  —          │ SPE▽ 60  ███░░░    0  ▬▬▬▬   80  │
├──────────────────┴──────────────────────────────────┤
│ THEIR MOVES → YOUR ATK                              │
│  Knock Off    BP 65 · 100%          34.0–40.2%      │
└─────────────────────────────────────────────────────┘
```

### Panel Header Row

The existing "Defender" label row (`calc-bottom-panel.tsx` lines 163–167) gains the "vs {attackerName} · {HP} HP" badge on the right end. This badge currently lives inside `DefenderMonHeader` — move it up to the panel header so the identity lane doesn't need to show it.

### Identity Lane (left, ~155px fixed)

- **Sprite**: 40px, `border-radius: 8px`, same `<Sprite>` component
- **Name**: `text-[11.5px] font-bold` — same as collapsed poke-row
- **Type pills**: existing `<TypePill>` components, unchanged
- **Metadata rows** (Item / Abil / Nat / Tera): use `.formRow` / `.formLabel` / `.formValue` CSS classes from `builder.module.css` — the exact same classes used in `identity-lane.tsx`. Each row is a popover trigger wrapping a `<button>` with these classes.
- Nature suffix (`+SpD/−SpA`) rendered inline next to the nature value, same pattern as `identity-lane.tsx` lines 415–463.

### Stats Lane (right, flex-1)

`calc-defender-stats.tsx` is **already using the correct shared CSS classes** (`.spreadRow` / `.spreadVbar` / `.spreadSliderWrap` / `.spreadSlider` / `.spreadBumps`). No visual changes needed to the stat rows themselves. The only change is that this section moves from being below the header to being the right lane in the same flex row.

### "Their Moves" Section

Stays below the two-lane row, unchanged.

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/components/team-builder/v2/calc/calc-defender-header.tsx` | Restructure: remove chip-labeled pattern, replace with `.formRow`/`.formLabel`/`.formValue` classes from `builder.module.css`. Sprite resized to 40px. Layout becomes a flex column (the left lane). Remove the `border-b` wrapper — the lane divider is now a right border on this element. |
| `apps/web/src/components/team-builder/v2/calc/calc-defender-stats.tsx` | No visual changes to stat rows. Adjust any outer padding that assumed it sat below the header — it now sits to the right of the identity lane. |
| `apps/web/src/components/team-builder/v2/calc/calc-bottom-panel.tsx` | The defender column currently renders `<DefenderMonHeader>` full-width above a 2-col grid of `[CalcDefenderStats \| CalcDefenderMoves]`. Change to: a flex row of `[DefenderMonHeader (fixed ~155px) \| CalcDefenderStats (flex-1)]` as the top block, and `CalcDefenderMoves` running full-width below it. |

## CSS Reuse

All classes already exist in `builder.module.css`. No new CSS needed:

- `.formRow` — hover-interactive grid row (label col fixed, value col flex)
- `.formLabel` — 9px monospace uppercase muted label
- `.formValue` — 11.5px foreground value, truncates
- `.spreadRow` / `.spreadVbar` / `.spreadSliderWrap` / `.spreadSlider` / `.spreadBumps` / `.spreadBumpTick` — already used in `calc-defender-stats.tsx`

## What Is NOT Changing

- Popover pickers (ItemPicker, AbilityPicker, NaturePicker, TypePicker) — same components, same popovers
- Stat row calculations and interactivity
- HP% slider at the bottom of the stats section
- "Their Moves → Your Atk" move list
- The attacker section (left panel)
- The field section (center panel)

## Verification

1. Open the team builder at `localhost:3000/dashboard/alts/:alt/teams/:id`
2. Open the damage calc panel
3. Confirm the defender panel shows identity + stats side by side in one row
4. Click Item/Abil/Nat/Tera — pickers should open as before
5. Edit EV inputs and sliders — stat calculations should be unchanged
6. Confirm "Their Moves" section is below and unchanged
7. Check dark mode renders correctly
8. `pnpm typecheck` passes
