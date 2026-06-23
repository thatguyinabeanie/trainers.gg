# Builder single-focus — single-column layout revision

> **Status:** Design only — not yet implemented.
> **Supersedes:** the _Macro-layout_ decision in [`spec.md`](./spec.md) (the
> "immersive, card-less, sprite-center flanked" triptych) **for the calc-OFF
> single-focus view only**. Everything else in the package — the radial stat
> editor, the versus / damage-calc view, navigation, and mobile behavior — still
> stands.

## Context

The original spec gave one Pokémon a wide, **card-less, sprite-center-flanked**
triptych: `STATS panel (left) · sprite + identity + loadout (center) · MOVES panel
(right)` (see `spec.md:19, 30-46`). That shipped as `FocusCard`
(`apps/web/src/components/team-builder/layouts/focus-card.tsx`).

In practice the resting (calc-OFF) view reads as **sparse**: the triptych is one
short row, and `single-focus-view.tsx` pins it to the vertical center with
`my-auto`, leaving large empty bands above and below it on a normal viewport.

Meanwhile the **damage-calc view** (`calc-versus-view.tsx`) reads well: each
Pokémon is a tall **vertical column** of cards — hero band → stats card → moves
card — and the columns fill both width and height.

**Revised decision:** make the calc-OFF single view a **single, centered vertical
column** that resembles one damage-calc column, instead of the wide triptych.

## Before / after

```
BEFORE (current FocusCard — card-less triptych, floats center)

        ┌─────────────────────────────────────────────┐
        │                                             │
        │   ┌───────┐    🦖 sprite     ┌───────┐      │  ← short row pinned
        │   │ STATS │   Tyranitar      │ MOVES │      │    dead-center;
        │   │  ⬡    │  Rock  Dark      │ Crunch│      │    big empty bands
        │   └───────┘  Item · Abil     └───────┘      │    above & below
        │                                             │
        └─────────────────────────────────────────────┘

AFTER (single centered vertical column — calc-style cards)

              ┌───────────────────────────┐
              │ 🦖  Tyranitar ▾   Rock Dark│  ← hero card
              │     Nick · ♂ · ✦ · Lv50    │    (keeps meta row)
              │     Item · Ability         │
              ├───────────────────────────┤
              │  STATS · EVS               │  ← stats card
              │        ⬡ hexagon ⬡         │    (no boosts row)
              │  ATK DEF SPA SPD SPE       │
              ├───────────────────────────┤
              │  MOVES                     │  ← moves card
              │  Crunch       80   100     │
              │  + Add move                │
              └───────────────────────────┘
                centered, ~max-w-lg, taller
                stack ⇒ little dead space
```

## Locked decisions (this revision)

1. **Single centered vertical column** (~`max-w-lg`, ≈32rem): hero → stats → moves,
   stacked. NOT a width-filling 2-up body. _(Supersedes "card-less, sprite-center
   flanked".)_
2. **Keep nickname / gender / shiny / level editable** in the hero (the existing
   `MetaBar` row) — the single view stays a full editor. Level auto-hides in
   Champions formats, as today.
3. **Keep the 2×3 grid** view available via the top-right toggle — the grid render
   path is untouched.
4. **Default layout:** no change. `DEFAULT_MODE` is already `"single"`
   (`use-team-layout.ts:21`), so fresh visitors already land on the single view. A
   browser that shows the grid has a persisted `tg.team-layout = "2x3-vertical"`
   from an earlier session; clearing it (or visiting `/builder?layout=single`)
   restores single. **We leave existing saved preferences alone** — no forced reset.
5. **Stats card header = "Stats · EVs"** (matches the calc card exactly).
6. **`CalcVersusView` (calc ON) is behaviorally unchanged.**

## Recommended approach — rebuild `FocusCard` inline

Restructure **only** `FocusCard` (the calc-OFF path). Do **not** extract the calc
view's internal `MonHeroContent` / `MonStatsCard` / `MonMovesCard` components:

- `MonHeroContent` has **no** `MetaBar` (no nickname/gender/shiny/level — which we
  must keep) and lays the sprite to the left rather than on top.
- `MonStatsCard` hard-renders a calc-only `StatBoostsRow` (`calc-versus-view.tsx:308`)
  — the single view must have **no** boosts.
- `MonMovesCard` is wired to calc `outputs` / `direction` / `MobileMoveRow`.

Parameterizing all of that would bloat each component's prop surface and **risk
regressing the calc view** (every new prop is a branch the calc path must keep
passing). Instead, re-stack the same shared primitives `FocusCard` already imports,
and share only the **card-chrome classNames** inline.

### New structure

- **Container** (replaces the grid at `focus-card.tsx:166-174`):
  `relative mx-auto flex w-full max-w-lg flex-col gap-3`. Drop `md:grid` /
  `md:grid-cols-[…]` / `md:order-*` / `md:items-stretch` and the `panelStyle`
  type-tinted borders (`focus-card.tsx:128-139`). **Keep** the hero type-tint wash
  (`:117-125`), the remove button (`:177-190`), and the `SpeciesPickerDialog`
  (`:152-159`).
- **Three stacked cards**, all using the calc card chrome
  `border-border/60 bg-card/60 w-full rounded-xl border p-3 backdrop-blur-sm`:
  1. **Hero card** (sprite on top, centered): `SpriteSection`
     (`variant="pill-bottom"`, `size={isClient && isMobile ? 160 : 240}`) + species
     `FieldErrors` + `MetaBar` (`variant="row"`) + `ItemCell` / `AbilityCell`
     (`variant="grid"`) + their `FieldErrors`.
  2. **Stats card** — header **"Stats · EVs"**; `RadialStatEditor` with **no**
     `boosts` / `onBoostChange` (so it renders no `StatBoostsRow`) and **no**
     `compact` (full hexagon — the column has room).
  3. **Moves card** — header **"Moves"**; `MovesLane`
     (`presentation={isClient && isMobile ? "card-list" : "list"}`,
     `fieldErrors={movesErrors}`). Preserve the existing calc-ON `CalcReverseColumn`
     branch (`focus-card.tsx:333-342`) under a `border-border/30 mt-3 border-t pt-3`
     divider so calc-ON tests stay green.
  - Header markup:
    `text-muted-foreground font-mono text-xs font-semibold tracking-[0.08em] uppercase`.
- **`single-focus-view.tsx`: no change.** Its outer `overflow-y-auto` + inner
  `my-auto` already center the stage when it fits and scroll it when it's tall; the
  taller stacked column naturally shrinks the dead space.
- **Mobile:** the column is the same shape at every breakpoint (a simplification).
  `FocusCard` already uses `useIsClient()` / `useIsMobile()` only to tune the sprite
  `size` and the moves `presentation` — it does **not** double-mount via
  `hidden md:block`, so it satisfies the mobile-responsiveness rule. No new
  sub-40px tap targets and no flash concern (no desktop-open state).
- **`EmptySlotCenterpiece`:** keep as-is. _(Optional later polish: restack its side
  ghost hints, which currently telegraph the old horizontal triptych, to telegraph
  the vertical column.)_

## Files the eventual build would touch

| Action         | File                                                                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rewrite render | `apps/web/src/components/team-builder/layouts/focus-card.tsx`                                                                                                                                          |
| Update tests   | `apps/web/src/components/team-builder/__tests__/focus-card.test.tsx` — change the "Stats" label assertion to "Stats · EVs"; add a single-column-structure test and a **no-`StatBoostsRow`** guard test |
| No change      | `layouts/calc-versus-view.tsx`, `layouts/single-focus-view.tsx`, `use-team-layout.ts`                                                                                                                  |

### Reused primitives (no new components)

`SpriteSection`, `MetaBar`, `ItemCell` / `AbilityCell`, `RadialStatEditor` (renders
no boosts when `boosts` is omitted), `MovesLane`, `FieldErrors`, `useIdentityState`,
`cn()`.

## Constraints to honor (when built)

- React Compiler: no manual `useMemo` / `useCallback` / `React.memo`.
- Tailwind built-in scale only — no new arbitrary `[Npx]` sizing. (`tracking-[0.08em]`
  is letter-spacing, not a px size, and is copied from the calc card to match it.)
- `cn()` for conditional classes; function declarations; named exports; inline
  `import { type X }`.

## Verification (when built)

Playwright MCP against the running dev server at `localhost:3000` (never start a
second dev server — shared `.next`; downscale screenshots with `sips` before
reading):

- **Desktop 1440×900:** add a Pokémon to slot 1. Confirm one centered `max-w-lg`
  column (hero → stats → moves), NO three floating panels, NO large empty band
  above/below. Chrome matches the calc cards (`rounded-xl`, `border-border/60`,
  `bg-card/60`, mono uppercase "Stats · EVs" / "Moves"). **No `StatBoostsRow`** under
  the hexagon. The nickname/gender/shiny/level row is present and editable; switch
  to a Champions format → level hides. Toggle to grid → grid unchanged. Toggle calc
  ON → `CalcVersusView` two-up unchanged.
- **Mobile 393×852:** same vertical column, sprite ~160, moves as `card-list`. Page
  `scrollWidth > innerWidth` is **false**; the sub-40px tap-target probe returns only
  decorative icons.

## Out of scope

Implementing the above (deferred until requested), the `EmptySlotCenterpiece` ghost
restack, extracting shared chrome consts, removing the dead calc branch in
`FocusCard`, and any `2x3-vertical → single` localStorage reset.
