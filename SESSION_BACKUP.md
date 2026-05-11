# Session Backup — Builder Refactor

**Branch:** `improve-builder-cards`
**Base commit:** `217297bb`
**Head commit:** `7cdb6428`
**PR:** https://github.com/thatguyinabeanie/trainers.gg/pull/319
**Status:** Pushed. Awaiting visual smoke-test.

---

## Goal
Stabilize builder responsiveness in `apps/web` by splitting the editor into two cleanly-separated layouts (compact horizontal + vertical grid) sharing internals, replacing JS-driven breakpoint logic with Tailwind defaults only, deleting dead UX scaffolding, adopting more shadcn/ui primitives, and eliminating arbitrary-px Tailwind utilities.

## Constraints & Preferences
- Scope: builder only (first pass).
- Strict Tailwind defaults only: `sm/md/lg/xl/2xl`. No `min-[…]:` / `max-[…]:` arbitrary utilities, no custom `screens`, no named text-size tokens (user rejected).
- Keep BOTH layouts as two top-level components sharing internals.
- No `useMemo` / `useCallback` / `memo` (React Compiler).
- Use subagents for implementation to conserve context; one subagent per sub-phase.
- Visual invariants kept: per-stat slider thumb color via `currentColor`; at-bump hollow-ring state.
- User signed off on density regression: all sub-12px fonts snap UP to `text-xs` (12px); cascade-fix layouts as needed.
- Defer: species/move pickers → Command (TGG-384); whole-app shadcn audit (TGG-383).

---

## Commits (chronological)

| SHA | Message |
|---|---|
| `503a5d95` | refactor(builder): relocate identity cells to team-builder/shared |
| `92a8b8c1` | refactor(builder): add CompactRow layout variant |
| `2b8615db` | refactor(builder): add GridRow layout variant |
| `51a0c7bc` | refactor(builder): wire CompactRow/GridRow via PokeRow router |
| `d57d4f30` | refactor(builder): self-contained empty-slot ghost variants |
| `22cc4836` | refactor(builder): relocate dead identity dispatcher to _deprecated/ |
| `7e682ad1` | refactor(builder): delete dead active-row CSS and relocate RibDecorations |
| `aa306e78` | refactor(builder): rip dead density/calc-open/layout attrs from team-workspace |
| `afa96cd9` | refactor(team-builder): rewrite useTeamLayout with URL param sync, drop viewport degrade |
| `b2863750` | refactor(team-builder): replace container queries with Tailwind viewport breakpoints |
| `4e22bd89` | refactor(team-builder): hide layout toggle on mobile via Tailwind |
| `25f3969e` | refactor(team-builder): rebuild TeamLayoutToggle on shadcn ToggleGroup |
| `e82b6f7c` | refactor(team-builder): migrate stats slider + calc checkboxes to shadcn primitives |
| `0e71f6d1` | refactor(team-builder): replace arbitrary-px utilities with Tailwind scale |
| `7cdb6428` | refactor(team-builder): snap text-[Npx] to Tailwind defaults, cascade row heights |

Total: **15 commits, 82 files, +2290/-1409.**

---

## Phase breakdown

### Phase 1 complete — layout split + dead-code purge (8 commits)
- New layout components: `compact-row.tsx`, `grid-row.tsx`, `compact-row-ghost.tsx`, `grid-row-ghost.tsx`.
- `poke-row.tsx` becomes the layout router.
- Identity cells relocated to `team-builder/shared/`.
- Dead files (identity dispatcher, active-row CSS, RibDecorations indirection) moved to `_deprecated/`.
- `globals.css` trimmed 329 → 235 lines (and further to 172 after Phase 3b).
- Removed dead `data-density` / `data-layout` / `data-calc-open` attrs.

### Phase 2 complete — Tailwind defaults only (3 commits)
- **2a `afa96cd9`** — `use-team-layout.ts` rewrite (169 lines): drops viewport degrade + `isAutoDegraded` + `MIN_VIEWPORT_FOR_3_COLS`; adds `?layout=compact|grid` URL param sync (`router.replace` + `useSearchParams`); retains mobile lock + cross-tab sync + localStorage migration. 4 sibling test files extended with next/navigation mocks.
- **2b `b2863750`** — `@container/dock` + `@[900px]:` / `@[1580px]:` → `lg:` / `2xl:`.
- **2c `4e22bd89`** — `TeamLayoutToggle` hidden on `<md` via Tailwind at 2 mount sites (team-workspace.tsx `ml-auto` wrapper + topbar.tsx `<span hidden md:inline-flex>`); component cleaned of `isMobileLocked` reads.

### Phase 3 complete — shadcn primitives (2 commits)
- **3a `25f3969e`** — `TeamLayoutToggle` → shadcn `ToggleGroup` (controlled single-select, array-shaped value, coerces empty→persisted to behave like radio). Dropped `_Icon2x3`.
- **3b `e82b6f7c`** — stats-lane + calc-defender-stats sliders → shadcn `Slider`; calc-detail-card 2 checkboxes → shadcn `Checkbox`. Extended `ui/slider.tsx` (128 lines) with `inheritColor` + `atBump` opt-in props (track/indicator transparent, thumb `bg-current` / `bg-card border-current` per state). Removed `React.useMemo` from slider.tsx. Deleted 63 lines of `.spread-slider` CSS + `spreadSliderClass` const.

### Phase 4 complete — arbitrary utility purge (2 commits)
- **4a `0e71f6d1`** — 25 production arbitrary-px width/basis/size hits → Tailwind scale (`basis-36`, `basis-96`, `max-w-60`, `max-w-36`, `max-w-sm`, `w-4/5/7/15/18/22/96`, `size-4`, `min-h-40`, `min-w-7`, `max-w-40`). 15 files modified. Remaining 47 hits are justified intrinsics (workspace caps `max-w-[1600px]`/`max-w-[1800px]`/`max-h-[1080px]`, sprite-size props tied to `<Sprite size={N}>`, 1–3px hairlines, glyph cells).
- **4b `7cdb6428`** — 276 `text-[Npx]` production hits → 0. All sub-12px → `text-xs` (10–71% growth); 13 → `text-sm` (8% growth); 15 → `text-base` (7% growth). Cascade-fixed `h-[18px]`/`h-[22px]` (11→0), `py-[3px]`/`gap-[3px]` (9→0), `w-[9px]` chevron cells → `w-3`, `form-chip` + `type-chip` row paddings `py-[3px]` → `py-1`. 47 production files modified. Left as-is: `size-[9px]` decorative tick on stat-viz-bar; `border-spacing-y-[3px]` table row gutter.

---

## CI / verification status

| Check | Result |
|---|---|
| `pnpm lint` | ✅ clean |
| `pnpm typecheck` | ✅ clean |
| `pnpm test` | ✅ 328 suites / 5821 tests pass |
| `pnpm test:e2e` | ⚠️ 61 pass, 6 skipped, **1 failure unrelated to this branch** |

E2E failure detail:
- File: `e2e/tests/tournament/full-tournament.spec.ts:83`
- Error: `Failed to refresh TO session: Invalid Refresh Token: Refresh Token Not Found`
- Location: `tournament-simulator.ts:709` auth refresh
- Zero overlap with builder code. User approved push anyway.

---

## Known visual risks needing smoke (Phase 4b cascade)

Phase 4b is the largest behavioural delta — fonts grew 7–71% in places. Tests can't catch overflow. Areas flagged for visual verification at 1024/1280/1536/1920 in both `?layout=compact` and `?layout=grid`:

1. EV inputs (`w-9`/`w-10`) at 12px mono — tight but should fit `252+`.
2. team-workspace + calc-bottom-panel status ribbons (text-xs uppercase).
3. calc-field-block weather/terrain/etc. label grids (8.5px → 12px = +41%).
4. speed-tiers-panel field-block labels (same risk).
5. IV stepper buttons (`size-4` at min tap target with 12px ± glyphs).
6. form-chip + shared/fields/type form labels (60px columns + 12px uppercase `tracking-wider` — 'ABILITY' is borderline ~58px).
7. species-picker header row + abbreviation columns (9px → 12px stat columns may overflow).

---

## Key Decisions

- Base UI ToggleGroup uses array-shaped `value` even in single-select; clicking pressed item fires `onValueChange([])` so we coerce empty→`persisted` to behave like radio.
- Base UI Slider's Thumb wraps a visually-hidden `<input type="range">` that forwards aria + value, so `getByRole('slider')` and `fireEvent.change` keep working in tests.
- Slider primitive `inheritColor=true` switches `thumbAlignment` from "edge" to "center" so the thumb center sits at the value position (matches the bespoke `<input type="range">` model + bumps overlay positioning).
- DockPill NOT migrated to ToggleGroup — three independent drawer-open buttons, not single-select; left local.
- Font-size snap-up strategy chosen over named tokens; user accepts density regression and layout cascade.
- Workspace caps (`max-w-[1600px]`, `max-w-[1800px]`, `max-h-[1080px]`), 1–3px hairlines, sprite-size literals tied to `<Sprite size={N}>` props are intentional intrinsics — kept.
- localStorage key `tg.team-layout` retained for compat.
- URL param uses friendly aliases (`compact`/`grid`) not internal mode names (`1x6`/`2x3-vertical`).

---

## Deferred (filed as Linear tickets)

- **TGG-383** — whole-app shadcn primitive audit beyond builder.
- **TGG-384** — species/move pickers → shadcn Command migration.

---

## Next Steps

1. User smoke-tests preview deploy / `pnpm dev:web` at 1024/1280/1536/1920 in both `?layout=compact` and `?layout=grid`.
2. Triage any visual regressions from 4b font snap against the 7 flagged areas above.
3. User reports overflow → I fix per-area.
4. After visual triage: decide whether to delete `_deprecated/` + orphaned tests in a follow-up commit on this branch, or land as separate cleanup PR.
5. Address PR review feedback (CI checks must all be green per `reviewing-pr-feedback` skill — except known-unrelated tournament e2e flake).

---

## Relevant Files

- `apps/web/src/components/team-builder/use-team-layout.ts` — 169 lines; URL param sync via `useRouter`/`useSearchParams`; `useTeamLayout()` returns `{mode, setMode, persisted, isMobileLocked}`; `useTeamLayoutMode()` unchanged context reader.
- `apps/web/src/components/team-builder/team-layout-toggle.tsx` — 101 lines; ToggleGroup-based; consumed by team-workspace.tsx (`ml-auto hidden md:block` wrapper) + topbar.tsx (`<span hidden md:inline-flex>` wrapper).
- `apps/web/src/components/ui/slider.tsx` — 128 lines; new `inheritColor` + `atBump` props; `useMemo` removed; aria-label forwarded to Thumb.
- `apps/web/src/components/team-builder/lanes/stats-lane.tsx` — Slider with `inheritColor atBump={isAtBump}`; absolute inset-0 inside the relative wrapper so StatBumpsOverlay still positions; `2xl:w-[400px]` (intrinsic).
- `apps/web/src/components/team-builder/calc/calc-defender-stats.tsx` — parallel Slider migration with added `isAtBump` calc.
- `apps/web/src/components/team-builder/calc/calc-detail-card.tsx` — 2 Checkbox primitives inside `<label className="mvdetail-tog flex items-center gap-1.5">`.
- `apps/web/src/components/team-builder/dock/dockbar.tsx` — container-query free; DockPill kept local.
- `apps/web/src/styles/globals.css` — 172 lines (was 329 pre-refactor); only `@keyframes calc-col-enter` remains for builder.
- `apps/web/src/components/team-builder/_deprecated/` — dead-code holding pen (7 files + their tests still pointing here).
- `apps/web/src/components/team-builder/layouts/` — `compact-row.tsx`, `grid-row.tsx`, `compact-row-ghost.tsx`, `grid-row-ghost.tsx`.
- `apps/web/src/components/team-builder/shared/` — relocated identity cells.
- 47 production team-builder files touched in Phase 4b (typography + cascade): root files, `calc/`, `dock/`, `lanes/`, `layouts/`, `pickers/`, `shared/`.

---

## Critical Context

- Two builder entry points share `team-workspace.tsx` (`TeamWorkspaceV2`): public + dashboard.
- Already adopted shadcn (after Phase 3): Popover, DropdownMenu, Dialog, Sheet, Tabs, Resizable, Tooltip, Switch, Table, sonner, ToggleGroup, Slider, Checkbox. 65 primitives in `apps/web/src/components/ui/`.
- Test count steady at 328 suites / 5821 tests throughout Phases 2–4 (web app: 90 suites / 1966 tests touched).
- `pnpm test` runs Jest; `pnpm test:e2e` runs Playwright separately.
- Push policy from AGENTS.md: lint + typecheck + test + e2e must pass. User approved push with the 1 unrelated tournament e2e failure documented in PR body.
