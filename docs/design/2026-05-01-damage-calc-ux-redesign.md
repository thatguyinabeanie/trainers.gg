# Damage Calc UX Redesign

**Date:** 2026-05-01  
**Status:** Approved for implementation  
**Files in scope:** `apps/web/src/components/team-builder/v2/calc/`

---

## Overview

Redesign the damage calc bottom panel for better usability: replace the dense 13-button stat boost row with a stepper interaction, expand all field abbreviations to full words, expose the full set of smogon/calc-supported field conditions, and reorganize content within each column by priority.

---

## Decisions

| Topic | Decision |
|---|---|
| Outer column proportions | Equal thirds: `1fr / 1fr / 1fr` |
| Inner defender split | `1fr / 1fr` (stats + moves equal width) |
| Stat boost interaction | Stepper (−/value/+) with quick-pick chips |
| Stat labels | Keep competitive shorthand: Atk / Def / SpA / SpD / Spe |
| Field abbreviations | Expand all to full words |
| Field conditions | Full symmetric set on both sides |

---

## Column 1 — Attacker

### Content order (top → bottom)
1. **Team chip strip** — select active attacker (unchanged)
2. **Mon identity** — sprite, species name, type pills, nature/level/item/ability meta line
3. **Stat Boosts** — promoted above the inherits note; it's the interactive part
4. **Inherits note** — demoted to bottom as secondary context: "↳ Inherits spread & moves from row 01. Edit the row to change."

### Stat Boosts interaction

Replace the 13-button row (`-6 … +6`) with a **stepper + quick-pick chips** per stat:

```
[Atk]  [−]  [ 0 ]  [+]   [0] [+1] [+2] [+3] [+6]
[Def]  [−]  [ 0 ]  [+]   [0] [+1] [+2] [+3] [+6]
[SpA]  [−]  [+2 ]  [+]   [0] [+1] [+2] [+3] [+6]
[SpD]  [−]  [ 0 ]  [+]   [0] [+1] [+2] [+3] [+6]
[Spe]  [−]  [ 0 ]  [+]   [0] [+1] [+2] [+3] [+6]
```

- `−` and `+` buttons step by 1, clamped to `[-6, +6]`
- Value display: muted for 0, teal for positive, red for negative
- Quick-pick chips: `0`, `+1`, `+2`, `+3`, `+6` — one-tap to set common stages
- Stat labels keep existing color coding (Atk=orange, Def=amber, SpA=sky, SpD=emerald, Spe=fuchsia)
- No change to `STAGE_VALUES` or `AttackerBoosts` state shape

---

## Column 2 — Field

### Content order (top → bottom)
1. **Header**: Field eyebrow + Singles/Doubles toggle (unchanged)
2. **Global effects**: Gravity + Fairy Aura — full-width toggle row
3. **Conditions**: Weather and Terrain side-by-side in a 2-column sub-grid
4. **Sides**: Yours and Theirs cards — fully symmetric

### Global effects
| Control | Type | Notes |
|---|---|---|
| Gravity | Toggle | Rename from "🌀 Grav" |
| Fairy Aura | Toggle | **New** — boosts all Fairy-type moves ×1.33 |

### Conditions (side-by-side)
- **Weather** sub-label + buttons: Sun / Rain / Sand / Snow
- **Terrain** sub-label + buttons: Grassy / Electric / Psychic / Misty

### Side cards — Yours and Theirs (fully symmetric)

Both cards get the identical set of controls. Previously Yours lacked Stealth Rock/Spikes/Salt Cure and Theirs lacked Helping Hand — all are now on both sides.

**Toggle row (wrapping):**
- Tailwind
- Reflect
- Light Screen
- Aurora Veil *(exposed for the first time — already in state)*
- Helping Hand *(Theirs now included)*
- Friend Guard *(exposed for the first time — already in state)*
- Protect *(new — add to `BaseSideState` and `buildField`)*

**Hazards sub-section (below a dashed divider):**
- Stealth Rock: toggle off/on *(Yours now included)*
- Spikes: 0 / 1 / 2 / 3 stepper *(exposed for the first time — already in state for Theirs; move to `BaseSideState`)*
- Salt Cure: toggle off/on *(exposed for the first time; move to `BaseSideState`)*

**Fainted:** 0–5 stepper (unchanged)

### State changes required

**`BaseSideState`** — add three fields:
```ts
protect: boolean        // new — isProtected in smogon Side
stealthRock: boolean    // move up from DefenderSideState
spikes: number          // move up from DefenderSideState (0–3)
saltCure: boolean       // move up from DefenderSideState
```

**`DefenderSideState`** — after moving the three fields to `BaseSideState`, this interface becomes empty (`extends BaseSideState {}`). Remove it entirely; use `BaseSideState` directly for both attacker and defender side state throughout the codebase.

**`buildField`** — pass `isFairyAura` from a new top-level `fairyAura: boolean` field, and pass `isProtected` from each side's `protect` field.

**`useCalcState` initial state** — initialize all new fields to `false`/`0`.

---

## Column 3 — Defender

### Full-width mon header

The mon identity block moves from inside the stats sub-column to a **full-width header row** spanning both sub-columns (stats + moves). This makes it immediately clear who the defender is before reading either sub-column.

Header contains (left to right):
- 48px sprite
- Species name (bold, 13px) + type pills
- Loadout chips (item / abil / nat / tera) as a flex-wrap row
- "vs {attackerName} · {HP} HP" — right-aligned

### Stats sub-column

Below the header, unchanged except:
- Section eyebrow label: "Spread" for EV format, "Stat Points" for Champions (already implemented)
- HP% slider stays at the bottom of this sub-column

### Moves sub-column

Unchanged — `CalcDefenderMoves` component stays as-is. Border-left dashed separator remains.

---

## State changes summary

| Change | Where |
|---|---|
| Add `fairyAura: boolean` to top-level field state | `useCalcState` |
| Add `protect: boolean` to `BaseSideState` | `use-calc-state.ts` |
| Move `stealthRock`, `spikes`, `saltCure` to `BaseSideState` | `use-calc-state.ts` |
| Remove moved fields from `DefenderSideState` | `use-calc-state.ts` |
| Pass `isFairyAura` and `isProtected` in `buildField` | `use-calc-state.ts` |
| Expose all new UI controls in `CalcFieldBlock` | `calc-field-block.tsx` |
| Add `fairyAura`/`setFairyAura` to `CalcFieldBlock` props | `calc-field-block.tsx` |
| Update `CalcBottomPanel` and `CalcDrawer` to pass new props | both |
| Replace stat boost row with stepper + chips | `calc-attacker-block.tsx` |
| Change outer panel grid from `[1fr_1fr_2fr]` to `[1fr_1fr_1fr]` | `calc-bottom-panel.tsx` |
| Move defender mon header to full-width row above the inner stats/moves grid | `calc-bottom-panel.tsx` + `calc-defender-stats.tsx` |

---

## Out of scope

- Magic Room, Wonder Room (rare; can be added later)
- Attacker status effects (Burned, Paralyzed) — already handled on attacker side via status picker
- Any changes to move calc output display
- Mobile (CalcDrawer) layout — field block is shared component, gains improvements automatically
