# Builder — Single-Focus Pokémon View (middle section refactor)

## Context

The team builder's middle section (the per-Pokémon rows) feels **dense, space-wasting, visually flat, and workflow-awkward** — all four at once. The current `CompactRow` (1×6 list) crams identity + 6 stat rows + 4 moves + (when calc is on) ~4 extra move columns, ± stat steppers, and an "Incoming" damage strip into one horizontal row. Damage-calc mode roughly *doubles* the information and is the biggest contributor to clutter.

**Goal:** give one Pokémon the full screen width via a new **single-focus carousel view**, with the existing **2×3 grid** kept as the "all 6" overview. All current data stays — it's rearranged and, for stats, reimagined.

**Out of scope (explicit):** the topbar, format/identity selectors, and the bottom dock (Type matchups / Speed tiers / Damage-calc target picker). The only topbar touch is the view toggle gaining the new mode.

## Decisions (locked via brainstorm)

| Topic | Decision |
| --- | --- |
| View modes | **Single-focus ⟷ Grid (2×3)**. Compact 1×6 list **retires**. |
| Default | **Single-focus**. Phones lock to it. Old saved `1x6` preference migrates → single. |
| Navigation | **Sprite tab strip** (primary) + **arrow/dot** carousel affordances + **keyboard ←/→ and swipe**. |
| Switch transition | **Direction-aware slide + crossfade** (slide-and-fade). Reduced-motion → instant. |
| Macro-layout | **Immersive, card-less, sprite-center flanked** (validated visually). No wrapping card. Three zones: stats panel (left) · sprite+identity+loadout (center) · moves panel (right). Carousel along the **bottom** of the canvas. |
| Chrome | Sprite floats on a soft **type-tinted wash** over the existing dotted canvas; stats & moves are **translucent floating panels** (blur, faint border) — not solid cards. |
| Tab strip style | **Sprite + slot number**; active tab = type-colored ring + slight lift; empty = `+`; error slots get a dot; tabs are the drag handles for reorder. Sits in the **bottom carousel** (with ◀ ▶ + dots), not the top. |
| Stats | **Interactive radial hexagon EV/SP editor** (replaces the default edit rows) + a **fine-tune expander** for precision. See below. |
| Loadout + identity | **Clustered under the sprite** (center column): name, identity line (dex no. · gender·shiny · level), **type chips** (base types **+ Tera chip adjacent**, Tera only in non-Champions formats), then a row of **item · ability** only. |
| Nature / Stat Alignment | Lives **in the stats card** (it's a stat modifier), not the loadout — a `Nature ▾` / `Stat Alignment ▾` control under the budget showing `+X −Y`, with the boosted/reduced spokes color-coded on the hexagon (▲ green / ▼ rose). |
| Per-stat readout | Each hexagon spoke shows the **effective stat value** + the **allocated points** (EV or SP) alongside the polygon, plus the total budget in/near the center. |
| Moves | Each move row shows **type · category · name · BP · ACC** (small `Name / BP / Acc` header), mirroring the current builder's move metadata. Calc **on** = rows expand with damage / % / KO; "Outgoing — vs [target]" header. |
| Calc mode | **Versus / face-off view** (supersedes the stacked-panel idea): enabling calc reorganizes your mon to the **left half**; the **right half** renders the calc target as a **fully editable second showcase** (same FocusCard treatment — species, types, item/ability, radial stats + nature, moves). **Damage is mirrored**: your moves show outgoing (→ target), the target's moves show incoming (→ you). This pulls damage calc **out of the bottom dock into the main view**. |
| Grid view | **Keep mostly as-is** (today's `GridRow`); only adopt the calc Outgoing/Incoming labels for consistency. |

## Target layout (single-focus)

Immersive, card-less, sprite-center flanked (validated visually). No wrapping card — the sprite floats on a type-tinted wash over the dotted canvas; stats and moves are **translucent floating panels** of **matching height** (symmetry principle) flanking it. Identity + loadout cluster under the sprite. Carousel tab strip + arrows along the bottom.

```
┌ topbar: trainers.gg / Builder  ·  Champions: Reg M-A  ·  Untitled Team  ·  [▣ single|▦ grid] ┐
│··········· dotted canvas + soft type-tint wash ···········································│
│  ┌ Stats · SP ─────┐        🦖  (big sprite)          ┌ Moves ──────────┐               │
│  │     SPE ●        │       Tyranitar                  │ ◉ Stone Edge    │  ← panels      │
│  │  SPD○ /⬡\ ○ATK   │   [No.248][♂·✦][Lv50]            │ ◉ Crunch        │    match       │
│  │     ( 64/66 )    │      [Rock] [Dark]               │ ◉ Earthquake    │    height      │
│  │  SPA○ \ / ○DEF   │   ITEM …    ABIL …               │ ◉ + Add move    │                │
│  │   HP ●  [fine ▾] │   ALIGN…    TERA …               │                 │               │
│  └──────────────────┘                                 └─────────────────┘               │
│                    ◀  [01🦖][02🐉][03+][04+][05+][06+]  ▶        ← bottom carousel        │
└ dock: Type matchups · Speed tiers · Damage calc vs Floette-Eternal ──────────────────────┘
```

(SP/64-66 and ALIGN shown because the example format is Champions; standard formats show EVs/510 and NATURE.)

## The radial stats editor (new component)

The hexagon **is** the stat control — not a read-only chart beside edit rows.

- **6 spokes** (HP/ATK/DEF/SPA/SPD/SPE). Each handle's distance from center = **points invested** (EV or SP), snapping to the step grid. The connected polygon = the spread shape.
- **Center** shows remaining budget (`508/510` for EV, `64/66` for SP).
- **Live numbers** per spoke: invested points + resulting final stat.
- **EV/SP auto-switch** by format — reuses `getStatBudget(isChampions)`, `formatSupportsIvs(format)`, `isChampionsFormat()` from `StatsLane`. Caps, steps, IV-gating, and the SP-vs-EVs label all come from these. No new branching logic.
- **Precision + accessibility (required, not optional):** each invested number is click-to-type; handles are keyboard-focusable with arrow-key nudging by step. Drag-only would be a trap for exact spreads and for a11y.
- **Budget clamping + breakpoints:** a handle stops when the total is spent (mirrors today's `investBudget` clamp); `+nature` spokes show breakpoint ticks along the spoke.
- **Nature / Stat Alignment:** click a vertex to cycle `+/−` (colored vertex). Labeled **"Stat Alignment"** in Champions formats, **"Nature"** elsewhere (existing naming convention).
- **Fine-tune expander (`▾`):** IV inputs (only when the format supports IVs) and calc **± boost** steppers live here, keeping the hexagon clean.

This is the most novel piece and should be its own well-bounded, independently testable component fed by the same `pokemon` row state the current `StatsLane` reads/writes.

## Architecture changes

Existing system is well-factored; mostly composition + two new components (carousel container, radial editor). Reuse `SpriteSection`, `MetaBar`, `FormCells`, `MovesLane`, `CalcReverseColumn`, `useIdentityState`, and the stat-compute helpers unchanged where possible.

### 1. View-mode plumbing — `use-team-layout.ts`
- `TeamLayoutMode`: `"1x6" | "2x3-vertical"` → **`"single" | "2x3-vertical"`**.
- `DEFAULT_MODE` → `"single"`; mobile lock target → `"single"`.
- URL aliases: `single` ↔ `"single"`, `grid` ↔ `"2x3-vertical"`.
- Migration in `getSnapshot()`: persisted `"1x6"` (+ legacy names) → `"single"`; keep `"2x3-vertical"`.

### 2. View toggle — `team-layout-toggle.tsx`
- Replace the `Icon1x6` three-bars button with a **single-focus icon** (framed single cell) bound to `"single"`; keep the grid button. Update labels.

### 3. Workspace branch — `team-workspace.tsx`
- Branch the render on `layoutMode`: `"2x3-vertical"` → today's grid loop (unchanged); `"single"` → new **`SingleFocusView`** driven by the existing active-slot index (`onActivate`/`isActive` already present).

### 4. New: `layouts/single-focus-view.tsx` (container)
- Renders the **sprite tab strip**, **carousel nav** (arrows + dots), and the active **`FocusCard`**.
- Transition: direction-aware slide + crossfade; instant under `prefers-reduced-motion`.
- Keyboard `←/→` switch slots (when card focused, no input/dialog active); swipe on touch.
- Empty active slot → **prominent "+ Add Pokémon" CTA** (teal dashed circle + hint line) as the centerpiece, with **faint (low-opacity) ghost** stats hexagon + "+ Add move" rows flanking it to hint the structure. Clicking opens the species picker. Carousel shows the active-empty tab (teal dashed ring + `+`); dock calc target reads `vs —`.

### 5. New: `shared/sprite-tab-strip.tsx`
- 6 mini-sprite + slot-number tabs; active = type ring + lift; empty = `+`; error dot. Click → `onActivate(idx)`. Tabs wrap dnd-kit `useSortable` for reorder. Reuse `Sprite`.

### 6. New: `layouts/focus-card.tsx` (one Pokémon)
- Left column: `SpriteSection` (showcase, type-tint panel) + `MetaBar` + loadout via `FormCells` (labeled rows).
- Right column: **radial stats editor** (top) + moves (bottom) + calc Incoming block.
- Type-derived border/chrome reused from `compact-row.tsx`/`grid-row.tsx` (`getSpeciesTypes`/`getTypeColor`).

### 7. New: `stats/radial-stat-editor.tsx` (+ fine-tune subcomponent)
- The hexagon editor described above. Consumes the same EV/IV/nature fields + `onUpdate` contract as `StatRow`/`StatsLane`. Extract shared compute (`computeStat`, budgets, breakpoints) so both the radial editor and any remaining row usage stay in sync.

### 8. Moves presentation — extend `MovesLane`
- Presentation branch: calc **off** → 2×2 card grid (type, category, name, BP, ACC); calc **on** → today's single-column table with an **"Outgoing — vs [target]"** header (`calc.defenderSpecies`). Reuse `MoveTile` internals for both.

### 9. Calc mode — versus view (validated visually)
Enabling calc switches the single-focus stage into a **two-up face-off** (`layouts/calc-versus-view.tsx`): your mon (left) vs a fully editable target (right), field controls in the center.

- **Three aligned columns** with fixed-height bands so everything lines up: (a) label row, (b) sprite + center VS badge on one band, (c) stats-card / field-panel / stats-card tops aligned.
- **Per-mon compact layout** (each ~half width): floating hero (sprite + name + type chips incl. Tera + item/ability — **no card**), then a **stats card** (radial editor + effective readout + nature + boosts row), then a **moves card**. This is the *compact* `FocusCard` arrangement; the solo single-focus uses the *wide* sprite-center-flanked arrangement. Shared sub-parts (`SpriteSection`, radial editor, moves, boosts) compose both.
- **Target = fully editable showcase** — same controls as your mon (species picker via the sprite, radial stats, nature, item/ability, moves), minus the team carousel (a target is one mon). Header reads "Calc Target · click to edit".
- **Mirror damage:** your moves show outgoing (→ target) `% · KO`; the target's moves show incoming (→ you) `% · KO`. Reuse `computeForwardOutputsForRow` / `computeReverseOutputsForRow`. KO tiers color-coded (OHKO rose, 2HKO amber, 3HKO orange, 4HKO+ muted).
- **Per-stat boosts both sides:** each stats card has a **Boosts** row — ATK/DEF/SPA/SPD/SPE `− value +` steppers (−6…+6), positive teal / negative rose — so Dragon Dance, Intimidate, etc. model on either mon. Replaces the old fine-tune-only boost location when in versus.
- **Field control surface (center, everything visible up front):** `Singles / Doubles` segmented toggle; **Weather** (Sun/Rain/Sand/Snow), **Terrain** (Grassy/Electric/Psychic/Misty), **Other** (Gravity/Trick Room/Fairy Aura) as selectable pills; a **Sides** grid (Ours / Theirs columns) for screens (Reflect/Light Screen/Aurora Veil) and hazards (Stealth Rock toggle, Spikes 0–3 count). Active = teal pill/dot.
- **Entry:** the dock's "Damage calc vs X" button toggles versus mode on/off and is the target entry point. Existing `use-calc-state.ts` / `calc-state-context` are the data source.
- Scope note: largest piece — sequence after the calc-off single-focus view ships.

### 10. Retire 1×6 list
- Delete `layouts/compact-row.tsx`, `layouts/compact-row-ghost.tsx` (+ tests).
- Simplify `poke-row.tsx` to route only the grid variant, or fold grid rendering into the workspace branch and remove `poke-row.tsx`.

### 11. Mobile (validated visually)
- **Single-focus (mobile):** the wide sprite-center-flanked layout collapses to a **vertical stack** — sprite + identity, then stats card (radial editor + boosts), then moves card; sprite tab strip becomes a horizontal-scroll carousel at the bottom (swipe to switch mon); dock collapses to icon chips (Types / Speed / Calc). Single-focus is the phone-locked mode.
- **Versus (mobile):** the two-up can't fit, so it **stacks vertically** — your mon (hero + tappable stats summary + outgoing-damage moves) → `VS` divider → `Field ▾` trigger → target (hero + stats summary + incoming-damage moves). Scroll = you → field → them.
- **Tap-to-edit pattern:** inline **summary chips** open full editors in **bottom sheets** — the `Field ▾` bar opens the full field surface (Singles/Doubles, weather/terrain/other pills, per-side screens/hazards) as a sheet; each mon's `⬡ Stats … edit ▾` row opens its radial editor + boosts. Keeps the scroll light, full control one tap away.

## Implementation specifics (resolved gaps)

Concrete designs closing the gaps a deep code review surfaced. These make the versus view actually buildable (it was the ~30% that wasn't drop-in reuse).

### §1a. Calc-target adapter — `calc/use-target-as-pokemon.ts`
The calc target lives as flat `defender*` state (short keys `atk/def/…`, separate `defenderMoves` tuple, no `id`), but the shared showcase components need a `Tables<"pokemon">` + `onUpdate`. **Decision: adapter, not target-specific cells** (the cells are already fully `pokemon`+`onUpdate`-driven and format-aware — zero changes).
- `useTargetAsPokemon()` returns `{ pokemon, onUpdate }`: a synthetic row (`id: -1`) built from defender state, and an `onUpdate(fields)` that fans out to the matching `setDefender*` setters.
- **EV/IV key translation** (the whole surface area): `ev_attack↔setDefenderEv("atk")`, `ev_special_attack↔"spa"`, etc. (reuse/extend the existing `LONG_TO_SHORT` from `calc-defender-stats.tsx:67`). `species → resetDefenderForSpecies` (mirrors `handleSpeciesPick`); item/ability/tera coerce `null↔""`; `move1–4 ↔ defenderMoves[0–3]`.
- **No defender equivalent → hidden on the target:** `level` (engine hard-locks 50 in `buildDefenderPokemon`, `use-calc-state.ts:523`), `gender`, `is_shiny`, `nickname`. Pass `showLevel={false}`, hide gender/shiny/nickname controls. `id:-1` is collision-safe vs the `selectedPokemon?.id === rowPokemon.id` focus check (`use-calc-state.ts:1303`).
- Drive `useIdentityState(target.pokemon, format, [], target.onUpdate)` to get `types/isShiny/handleSpeciesPick` for free.

### §8a. MovesLane direction seam — `lanes/moves-lane.tsx`
`MoveTile` is hard-wired forward (`:253` `computeForwardOutputsForRow`, popover defender from `calc.defenderSpecies` `:447–457`). **Reuse `MoveTile`, do not fork** — make it direction-agnostic by injecting outputs:
- New props on `MovesLane`/`MoveTile`: `direction?: "outgoing"|"incoming"` (default outgoing), `outputs?: (CalcOutput|null)[]` (omit → compute forward as today), `opponent?: {species,ability,item,nature}` (popover descriptor).
- Output line becomes `const rowOutputs = outputs ?? calc.computeForwardOutputsForRow(attacker)`.
- Versus target lane: `direction="incoming"`, `outputs={calc.computeReverseOutputsForRow(yourMon, effectiveMoves)}`, `opponent={yourMon descriptor}`, `pokemon={target.pokemon}`, `onUpdate={target.onUpdate}`. Header label switches "Outgoing — vs X" / "Incoming — from X" off `direction`.

### §7a. Extract `nature-cycle.ts`
`computeNatureForSuffix` (stats-lane `:251`) and `cycleNature` (calc-defender-stats `:171`) are near-identical and **private + duplicated**; the radial editor needs them.
- New pure module `team-builder/nature-cycle.ts` exporting `computeNatureForSuffix`, `cycleNature` (accepts short OR long key via internal `SHORT_TO_LONG`), `findNatureFor`, `pickFreshPartner`, `NEUTRAL_NATURE`, `NatureStat`, the default maps.
- Delete the local copies in `stats-lane.tsx:156–295` and `calc-defender-stats.tsx:105–202`; both import from the new module. Keep `parseEvInput` in stats-lane and `LONG_TO_SHORT` in calc-defender-stats (display use). Bodies copied verbatim → behavior parity.

### §5a. Sprite-tab-strip reorder (dnd-kit)
- Wrap the tab strip's `SortableContext` with **`horizontalListSortingStrategy`** (grid view keeps vertical). Each tab is a `useSortable({id, disabled: pokemon===null})` drag handle (mirrors `poke-row.tsx:74`); empty tabs stay non-draggable `+`.
- **Sensors, `sortableKeyboardCoordinates`, `itemIds` (`team-workspace.tsx:772`), and `handleDragEnd`/`arrayMove` (`:776`) are unchanged** (index-based, layout-agnostic). Note: carousel `←/→` is a separate keydown on the card; dnd-kit only captures arrows while a tab is "picked up" (Space-lift) — no collision.

### §Tests — migration & blast radius
Update (7): `use-team-layout.test.ts` (1x6→single asserts + new migration `"1x6"→"single"` & `?layout=compact→single`), `team-layout-toggle.test.tsx` (new single icon/label), `poke-row.test.tsx` (drop CompactRow cases → grid-only or delete), `calc-reverse-card.test.tsx` (mock default→single; delete the "horizontal (1x6)" describe), `team-workspace-reorder.test.tsx` + `team-workspace-v2.test.tsx` (no CompactRow/1x6 seeds). `stats-lane.test.tsx` needs **no** layout change. Context-default flip is contained (only `poke-row`/`team-workspace`/`calc-reverse-card` consume the context; first/third are mocked — just fix their hardcoded `"1x6"` mock defaults). New tests: `single-focus-view`, `sprite-tab-strip`.

### §11a. Radial editor mobile input
- **Primary = click-to-type + steppers + arrow-keys**, NOT drag (reuse the `inputBuffer` pattern from `calc-defender-stats.tsx:294–335` / `stats-lane.tsx:447`; `inputMode="numeric"`). Handles are `role="slider"` with `aria-valuenow/min/max`; ↑/↓ nudge by `budget.step`, PageUp/Dn jump breakpoints; clamp via `computeInvestBudget`.
- **Drag = pointer-event enhancement only** (radius→points, snap to step). ≥44px hit areas; vertex nature-toggle gets its own ≥40px zone separate from the handle. Aspect-square width-capped (no `[Npx]`).

### §10a. Delete dead reverse-strip branch
`calc-reverse-card.tsx`: once `"1x6"` is gone, `isVertical` (`:81`) is always true → the horizontal `return` (`:175–272`) is dead. Remove it + the `isVertical` guard + the `useTeamLayoutMode` import/call (`:15,:47`). The versus view replaces the strip with the target's incoming `MovesLane`, so `calc-reverse-card.tsx` may become deletable wholesale once grid view no longer needs the strip.

## Files at a glance

| Action | File |
| --- | --- |
| Edit | `use-team-layout.ts`, `team-layout-toggle.tsx`, `team-workspace.tsx`, `lanes/moves-lane.tsx` (direction seam), `lanes/calc-reverse-card.tsx` (delete dead branch §10a), `poke-row.tsx`, `lanes/stats-lane.tsx` + `calc/calc-defender-stats.tsx` (consume `nature-cycle`) |
| New | `layouts/single-focus-view.tsx`, `layouts/focus-card.tsx`, `layouts/calc-versus-view.tsx`, `shared/sprite-tab-strip.tsx`, `stats/radial-stat-editor.tsx` (+ fine-tune + empty hero shell), `nature-cycle.ts`, `calc/use-target-as-pokemon.ts` |
| Delete | `layouts/compact-row.tsx`, `layouts/compact-row-ghost.tsx` (+ tests) |
| Tests | New: radial editor (drag/keyboard/type, EV+SP budgets, clamping, breakpoints, nature cycle, IV gating), single-focus-view (nav/keyboard/active slot/transition), sprite-tab-strip, focus-card, moves 2×2-vs-table. Update: `poke-row`, `team-workspace`, layout-toggle, `use-team-layout` migration. |

## Constraints to honor
- React Compiler: no manual `useMemo`/`useCallback`/`React.memo`.
- No arbitrary `[Npx]` Tailwind values — use the scale (rare hairline exceptions commented).
- Mobile-responsiveness: single-focus is the phone-locked mode; verify no horizontal overflow at 360px, ≥40px tap targets on tab-strip/arrow controls, and a usable radial editor on touch.
- `prefers-reduced-motion` respected for the carousel transition.
- Keep changes inside the middle section; don't touch topbar/dock/selectors beyond the toggle.

## Verification (end-to-end)
1. `pnpm dev:web`, open `/builder`, add a Pokémon.
2. Toggle shows **Single ⟷ Grid**; Single default; old `?layout=compact`/stored `1x6` lands on Single.
3. Single view: tab strip jumps slots; arrows + dots work; `←/→` switches; swipe works on mobile; transition slides+fades (instant under reduced-motion).
4. Hero card shows every field (species, nickname, gender/shiny/level, item, ability, nature/alignment, tera, all 6 stats, 4 moves).
5. Radial editor: drag a handle to invest; click-to-type exact value; keyboard nudge; budget clamps at 510 (EV) / 66 (SP); breakpoint ticks on +nature spoke; fine-tune reveals IV (EV formats only) + calc boosts. Switch to a Champions format → SP labels, no IV.
6. Calc off → 2×2 move cards. Enable calc (dock target) → "Outgoing — vs [target]" table + "Incoming — from [target]" block; copy + detail popover work.
7. Grid view unchanged except calc labels; 1×6 gone.
8. Phone viewport locks to Single; no horizontal overflow; tap targets ≥40px.
9. `ui-verifier` pass (desktop + mobile), then CI green.

## Open / to confirm
- _(none blocking)_ — Tera/Champions confirmed safe: the field cells null-render Tera when `formatSupportsTera` is false (`tera.tsx`, `type.tsx`); nothing else depends on it.
