# Calc Panel Redesign — Design Spec

**Date:** 2026-04-30
**Branch:** `feat/calc-panel-redesign`
**Status:** Locked, ready for implementation

## Context

The v2 team builder shipped with a right-side calc drawer (`apps/web/src/components/team-builder/v2/calc/calc-drawer.tsx`) using native `<select>` elements, a 44px sprite, only HP/DEF/SPD EVs exposed, no Tera input, no defender Atk/SpA stages, no reverse calc, and a Results block that duplicates information already in the moves-lane calc pill.

This redesign replaces that drawer with a **bottom-panel calc** that sits alongside the existing Type matchups + Speed tiers panels (3rd dock pill). It uses the editor's design language end-to-end (slider-primary stats lane, Base UI popovers, dense-table species picker, KO-tier color system) and adds reverse-calc, attacker selector, ability-inferred weather/terrain, fainted-teammate tracking, and Champions-style inline stage dropdowns.

## Source of truth (visual)

Final mock at `/tmp/brainstorm-87846-1777587727/content/calc-bottom-polished.html` (also screenshotted in `.playwright-mcp/screenshots/calc-balanced.png`). Reference for layout proportions, type/color discipline, tile shapes, and field-section structure.

## Layout anatomy

```
┌─ Editor row(s) — unchanged ─────────────────────────────────────────────┐
│  [01-06 PokeRows; the active row owns the spread + moves]                │
└──────────────────────────────────────────────────────────────────────────┘
┌─ Dock (3 pills) ─────────────────────────────────────────────────────────┐
│  🛡 Type matchups   ⚡ Speed tiers   🎯 Damage calc · vs X · 2HKO worst-case │
└──────────────────────────────────────────────────────────────────────────┘
[ resizer ───────────────────────────────────────────────────────────────  ]
┌─ Bottom panel (when Damage calc pill is active) ─────────────────────────┐
│  ┌─ ATTACKER (1fr) ─┐  ┌─ FIELD (1fr) ──┐  ┌─ DEFENDER (2fr) ───────────┐ │
│  │ chip selector ×6 │  │ Doubles meta   │  │ ┌─ stats ──┬─ Their moves ┐│ │
│  │ sprite + ID +    │  │   foes/ally/   │  │ │ sprite + │ DRAG  Draco  ││ │
│  │   loadout (RO)   │  │   TR/Grav      │  │ │ types +  │  Meteor  ▾  ││ │
│  │ inherits-from    │  │ Weather pills  │  │ │ loadout  │  OHKO 110%  ││ │
│  │   row note       │  │   + ability-   │  │ │   chips  │             ││ │
│  │ STAT BOOSTS      │  │   inferred     │  │ │ stats     │ GHOST       ││ │
│  │   ATK -6..+6     │  │   badge        │  │ │   lane   │  Shadow     ││ │
│  │   DEF -6..+6     │  │ Terrain pills  │  │ │  (full   │  Ball   ▾   ││ │
│  │   SPA -6..+6     │  │ Sides:         │  │ │   SP +   │  2HKO 56%   ││ │
│  │   SPD -6..+6     │  │   Yours card   │  │ │   inline │             ││ │
│  │   SPE -6..+6     │  │   Theirs card  │  │ │   stage  │ FLY         ││ │
│  │                  │  │   (each card   │  │ │   ▾)     │  Hurricane  ││ │
│  │                  │  │    has FAINTED │  │ │ HP %     │  ▾ 2HKO 50% ││ │
│  │                  │  │    0..5 step)  │  │ │  slider  │             ││ │
│  │                  │  │                │  │ │          │ NORM        ││ │
│  │                  │  │                │  │ │          │  U-turn ▾   ││ │
│  │                  │  │                │  │ │          │  3HKO 28%   ││ │
│  └──────────────────┘  └────────────────┘  │ └──────────┴─────────────┘│ │
│                                            └──────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────┘
```

## Asymmetric design

The calc panel only edits what the calc owns:

- **Attacker** is the user's own Pokémon. Its species, spread, item, ability, nature, Tera, and moves are owned by the editor row. The calc panel shows it read-only and only edits the *calc-only* state: stat stages.
- **Defender** is hypothetical. The calc panel owns it fully: species (with all forms), loadout (item/abil/nat/tera), full SP spread, HP %, all 5 stat stages, and 4 moves.
- **Field** is shared. Game type, weather, terrain, side conditions, doubles meta, and per-side fainted counts.

## Components

All paths are in `apps/web/src/components/team-builder/v2/`.

### New files

| File | Purpose |
| --- | --- |
| `calc/calc-bottom-panel.tsx` | Top-level bottom-panel container (replaces `calc-drawer.tsx` for desktop; mobile keeps Sheet). 3-column grid layout. |
| `calc/calc-attacker-block.tsx` | 6-chip team selector + read-only mon head + loadout meta + 5-row stage grid (Atk/Def/SpA/SpD/Spe). |
| `calc/calc-defender-block.tsx` | Rewrite of existing defender block — mini-PokeRow with full slider-primary stats lane, inline stage dropdowns, HP slider. Splits horizontally into stats sub-col + moves sub-col. |
| `calc/calc-defender-moves.tsx` | The "Their moves" sub-column — 4 vertical move cards each with type pill, name, ▾ chevron, KO pill, and detail line. Each card opens the existing `MovePicker` popover. |
| `calc/calc-field-block.tsx` | Rewrite of existing field block — sectioned: Doubles meta row, Weather pills + ability-inferred badge, Terrain pills, Sides pair (Yours / Theirs side cards each with screens/tailwind/hazards + FAINTED 0..5 stepper). |
| `calc/stage-dropdown.tsx` | Champions-style stage dropdown component — trigger shows `+2▾` / `−1▾` / `−▾`, popover lists -6..+6 with checkmark on current. |
| `calc/attacker-chip-strip.tsx` | 6-chip horizontal selector for picking which team mon is the attacker. |
| `calc/use-defender-moves.ts` | Hook deriving 4 default defender moves from preset/teammate, with override state. |
| `calc/use-fainted-counts.ts` | Hook tracking per-side fainted-teammate counts (0..5 each). Persists to localStorage like other tweaks. |
| `calc/use-attacker-selection.ts` | Hook tracking which team mon is currently the calc attacker (defaults to active row, can override). |

### Files modified

| File | Change |
| --- | --- |
| `team-workspace-v2.tsx` | Replace `<CalcDrawer>` with `<CalcBottomPanel>` for desktop. Add 3rd dock pill ("🎯 Damage calc"). Wire `panelDrawer` state to support `calc` value alongside existing `heatmap` / `speed`. Keep mobile path on `<Sheet>`. |
| `dock/dockbar.tsx` | Add `calc` button alongside type matchups + speed tiers. Show live worst-case verdict ("vs X · 2HKO") in the pill stat slot. |
| `dock/inline-panel.tsx` | Render `<CalcBottomPanel>` when `state.drawer === "calc"`. |
| `use-builder-state.ts` | `drawer` state expands to `"heatmap" \| "speed" \| "calc" \| null`. Add `attackerSlot: number \| null` (defaults to active selection). Add `faintedYours: 0..5`, `faintedTheirs: 0..5`. |
| `use-calc-state.ts` | Expand state for: `defenderTera`, `defenderEvs` (all 6 stats not just HP/DEF/SPD), `defenderBoosts` (all 5: atk/def/spa/spd/spe), `attackerBoosts` (all 5), `defenderMoves: [string, string, string, string]`, `faintedYours`, `faintedTheirs`. Hook into `@smogon/calc` for ability-inferred weather (set `field.weather` from attacker's ability if it sets one). Compute reverse-calc damage per defender move into the active attacker. Apply Last Respects BP scaling: `50 + 50 * faintedYours` (capped at 250). |
| `lanes/moves-lane.tsx` | Use the new ability-inferred weather and the new field state when computing `getMoveEffectiveness`. Pass through `faintedYours`/`faintedTheirs` for moves like Last Respects. |

### Files retired

| File | Reason |
| --- | --- |
| `calc/calc-drawer.tsx` (desktop path) | Replaced by `calc-bottom-panel.tsx`. Mobile Sheet path stays as a thin wrapper. |
| `calc/calc-results-block.tsx` | Drop entirely. The moves-lane calc pill + the new "Their moves" sub-col cover both directions of damage display. |

## Behavior details

### Attacker block

- **Selector** — 6 sprite chips matching the team_pokemon order. The currently active row is selected by default and shown with a teal outline + 2px box shadow. Clicking a chip switches the calc attacker without changing the editor's row selection. If the user clicks the currently active chip, no change.
- **Mon display** — sprite, name, types, single meta line (`Modest +SpA · Lv 50` and `@ Item · Ability` on a second line). Plus an inline note: `↳ Inherits spread & moves from row 02. Edit the row to change.`
- **Stat boosts grid** — 5 rows (Atk/Def/SpA/SpD/Spe). Each row is 9 toggle buttons: -6/-4/-2/-1/0/+1/+2/+4/+6. Stat-color label on the left, button row spans the rest. Active value highlighted teal; 0 has a soft "zero" style.
- **No HP slider** — attacker is assumed at full HP. Reverse-calc reflects this when computing.

### Defender block

- **Header** — "▸ Defender" with `▾ pick target` chevron. Subtitle shows `· vs <attacker name> · <attacker HP>`.
- **Stats sub-col (left)**:
  - Sprite (60px) + name + types
  - Loadout chips: item / abil / nat / tera (each opens the existing v2 popover picker, **including form-aware species when name is clicked**, Mega/Eternal/Origin all surfaced via the dense-table species picker)
  - Full slider-primary stats lane: HP/Atk/Def/SpA/SpD/Spe rows. Per row: stat label (color-coded, fixed) · base · color-tinted bar · EV input (with 12+/12- suffix support) · slider · stage dropdown · final stat value
  - HP-percent slider with absolute HP readout (`100% · 163`)
- **Moves sub-col (right)**:
  - Header: `⚠ Their moves → your atk` + sub `click a tile to swap`
  - 4 vertical move cards: type pill + move name + ▾ chevron + KO color pill (OHKO/2HKO/3HKO/4HKO+) + detail line (raw damage, accuracy, after-effect)
  - OHKO card has tinted background; others are neutral
  - Click anywhere on a card → opens the existing `MovePicker` popover
  - Auto-fills from preset (when defender selected from CALC_TARGETS) or teammate (when from "Your team") moves; user override per-slot
  - Status moves render as "(status)" instead of a KO pill
  - Spread move flag mirrors editor: shows `0.5×` chip when applicable

### Field block

- **Doubles meta row** — top of the column. `FOES [1][2]` stepper · `ALLY [alive]` toggle · `⏳ TR` toggle · `🌀 Grav` toggle.
- **Singles/Doubles toggle** in the column head (right side).
- **Weather** — 4 pills (Sun/Rain/Sand/Snow). Active pill has teal-primary background. **Auto-applied from attacker's ability** if the ability is one of: Drought, Drizzle, Sand Stream, Snow Warning, Orichalcum Pulse (Sun), Hadron Engine (Electric Terrain). Italic mono note `↳ inferred from <ability>` appears below pills. User can click another pill to override.
- **Terrain** — 4 pills (Grassy/Electric/Misty/Psychic). Same auto-from-ability behavior.
- **Sides** — pair of cards stacked vertically (or side-by-side at wider widths):
  - Yours card: TW / Reflect / L.Screen / Helping Hand pills + FAINTED 0..5 stepper
  - Theirs card: TW / Reflect / L.Screen / Stealth Rock pills + FAINTED 0..5 stepper

### Stage dropdown component (defender stats lane)

- Trigger: `+2▾` (green tint) / `−1▾` (red tint) / `−▾` (gray, neutral 0)
- Click → Base UI popover with 13 options (-6 -5 -4 -3 -2 -1 0 +1 +2 +3 +4 +5 +6) listed vertically, current value gets ✓
- Updates `defenderBoosts[stat]` and the row's `final` stat value live
- HP row has no stage column (HP isn't a stage stat)

### Reverse-calc / Last Respects / fainted-teammate flow

- `defenderMoves` array drives both the Their-moves cards and the reverse-calc damage display
- For each defender move, compute damage into the **active attacker** (after attacker's stage boosts):
  - Apply `field.weather` (auto-set from attacker ability if applicable)
  - Apply `field.terrain`
  - Apply attacker side conditions (Light Screen, Reflect, Aurora Veil all benefit defender's side here since attacker is the defender for reverse-calc)
  - Apply attacker stage boosts to its DEF/SPD as the receiving side
  - Apply the spread reduction in doubles when applicable
- Compute KO tier: OHKO if `min ≥ 100%`, 2HKO if `2*min ≥ 100%`, 3HKO if `3*min ≥ 100%`, else 4HKO+
- Display: the smaller move card pattern with type pill / name / KO pill / detail line
- **Last Respects / Triumphant Wave** — when the defender uses these, BP = `50 + 50 * faintedYours` (capped at 250). Same logic in the editor's per-move calc pill on attacker's Last Respects (uses `faintedYours` for own attacker, since attacker's own Last Respects scales with own team's fainted count). Mirror sense: defender's Last Respects scales with their own fainted count (use `faintedTheirs`).

### Dock pill live readout

- When the panel is collapsed, the "🎯 Damage calc" pill shows: `vs <Defender Name> · <worst-case verdict>` where worst-case is the worst KO tier across the attacker's 4 moves (OHKO > 2HKO > 3HKO > 4HKO+) — same as currently shown in the moves-lane calc pill but rolled up.
- Pill expands to active state (teal-soft background, primary border) when panel is open.

## State model

Lifted into `useBuilderState`:

```ts
type DrawerKey = "heatmap" | "speed" | "calc" | null;

interface BuilderState {
  drawer: DrawerKey;
  panelHeightPct: number;             // existing
  attackerSlot: number | null;        // null = use active row; else 0-5
  faintedYours: 0 | 1 | 2 | 3 | 4 | 5;
  faintedTheirs: 0 | 1 | 2 | 3 | 4 | 5;
  // ...
}
```

Lifted into `useCalcState` (existing):

```ts
interface CalcState {
  defenderSpecies: string;
  defenderAbility: string;
  defenderItem: string;
  defenderNature: string;
  defenderTera: string;                                          // NEW
  defenderEvs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }; // expanded
  defenderIvs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }; // NEW (default all 31)
  defenderBoosts: { atk: number; def: number; spa: number; spd: number; spe: number }; // expanded
  defenderHpPercent: number;
  defenderMoves: [string, string, string, string];                // NEW
  attackerBoosts: { atk: number; def: number; spa: number; spd: number; spe: number }; // NEW
  // ...
}
```

## Implementation phases

Subagent-driven (per project memory: pass `model: "sonnet"` on every dispatch).

### Phase 1 — State + dock + bottom-panel scaffold

- Expand `useBuilderState`: `drawer = "calc"` value, `attackerSlot`, `faintedYours`, `faintedTheirs`. Persist to localStorage.
- Expand `useCalcState`: new fields above. Wire ability-inferred weather into `@smogon/calc` field. Expose `attackerBoosts`, `defenderTera`, `defenderMoves`, full EVs/IVs.
- Add 3rd dock pill in `dockbar.tsx` ("🎯 Damage calc") with live worst-case stat slot.
- Inline panel renders new `<CalcBottomPanel>` shell when `drawer === "calc"`.
- Mobile path keeps the existing Sheet drawer.
- Typecheck + lint clean.

### Phase 2 — Attacker block + selector

- `calc-attacker-block.tsx` + `attacker-chip-strip.tsx`.
- Read-only mon head pulling from `team_pokemon[attackerSlot ?? activeIdx]`.
- 5-row stage grid using existing button-style stages (consistent with current Def/SpD pattern, expanded to 5 stats).
- Wire to `useCalcState.attackerBoosts`.
- Typecheck + lint clean.

### Phase 3 — Defender block stats + inline stage dropdowns

- `calc-defender-block.tsx` rewrite using the editor's `StatsLane` component (or a slimmed clone).
- `stage-dropdown.tsx` Base UI popover with 13 options.
- Loadout chips reuse the editor's popover triggers (item picker, ability picker, nature picker, type picker for tera).
- Species picker uses the editor's dense-table picker (form-aware).
- HP-percent slider.
- Typecheck + lint clean.

### Phase 4 — Defender moves + reverse calc

- `calc-defender-moves.tsx` — 4 vertical move cards.
- Auto-fill defaults: from CALC_TARGETS preset moves if defender is from preset; from teammate's moves if defender is from "Your team"; else empty slots that prompt to pick.
- `use-defender-moves.ts` hook for default + override logic.
- Each card opens the existing `MovePicker`.
- Reverse-calc per move: re-run `@smogon/calc` swapping attacker ↔ defender, applying attacker boosts as defender boosts in the swapped calc.
- KO pill + detail line rendering matching mock.
- Typecheck + lint clean.

### Phase 5 — Field block

- `calc-field-block.tsx` rewrite — sectioned layout per mock.
- Doubles meta row (foes/ally stepper + TR/Grav toggles).
- Weather pills with ability-inferred badge.
- Terrain pills.
- Yours/Theirs side cards with pill rows + FAINTED stepper.
- `use-fainted-counts.ts` hook tracking per-side counts, persisted.
- Wire fainted counts into Last Respects BP scaling in `useCalcState`.
- Typecheck + lint clean.

### Phase 6 — Polish + verification

- Apply final design tokens (spacing, type, color discipline) per mock.
- Mobile Sheet path: condense the same content vertically (stack columns).
- Live dock-pill readout: compute worst-case from attacker's 4 moves vs defender.
- Replace any calc state that the moves-lane reads to use the new ability-inferred weather (so Weather Ball badge agrees with damage).
- Delete `calc-results-block.tsx`.
- Update `validation-hooks.ts` if Tera input introduces new error states (gen 9 only).
- Typecheck + lint + tests pass.
- Manual browser verification at 1440×900 + 768×1024 (mobile breakpoint) viewports.

## Verification

After Phase 6:

1. `pnpm --filter @trainers/web typecheck` — zero errors
2. `pnpm --filter @trainers/web lint` — zero errors
3. `pnpm test` — green
4. Browser at `/dashboard/alts/admin_trainer/teams/197`:
   - Click "🎯 Damage calc" pill — bottom panel opens with 3 columns
   - Pick attacker chip 03 — defender's reverse-calc updates to that mon's HP
   - Click defender species (Dragapult name) — dense-table picker opens, supports forms (search "Mega Chandelure" → finds it)
   - Drag defender SpA EV slider → final SpA value updates live; +2 stage dropdown click → final value scales by 2×
   - Toggle Drought-attacker's Charizard → Sun pill auto-activates; Weather Ball reads Fire-type 0.5× (no longer 0× contradiction)
   - Set FAINTED 3 on Yours side → Basculegion's Last Respects in editor row scales BP to 200
   - Click a "Their moves" tile → MovePicker opens, swap to a different move, reverse-calc updates
   - Verify mobile (Sheet path) still works at 768px viewport

## Out of scope

- Ultra Beast / Z-Moves / Dynamax beyond the existing format-gating already in v2
- Importing the defender from a Showdown paste (could be a follow-up)
- Damage history / batch comparison
- Save/load defender presets — could be a follow-up
