# Speed Tiers Dialog + Builder Settings — Design

**Date:** 2026-06-02
**Status:** Approved design, pending implementation plan
**Scope:** Web app (`apps/web`). Speed tiers is phase 1; damage calc is a later phase.

## Context

The team builder shows **Speed Tiers** in a left side pane and **Damage Calc** in a right
side pane (`apps/web/src/components/team-builder/team-workspace.tsx`). Both are toggled from
the bottom dockbar pills. The side panes work but compete with the Pokémon editor for
horizontal space, and there is no way to view them in a focused, full-attention surface.

This change adds a **dialog-modal presentation** for these panels without removing the side
pane. The dialog is built on the same collapsible two-pane layout the species picker uses
(left filter rail + main content), so the two surfaces feel like one product. A new
**builder Settings** dialog lets the user choose, per feature, whether the default
presentation is the side pane or the dialog, and (for the side pane) whether it opens
automatically on load.

**Phase 1 ships speed tiers end to end. Damage calc reuses the same machinery in a later
phase** — its settings rows appear now, greyed out, as a visible placeholder.

## Goals

- Add a dialog-modal version of the Speed Tiers panel; keep the existing side pane.
- Make the **dialog the out-of-the-box default** for speed tiers.
- Add a **builder Settings** dialog (gear button in the topbar) controlling, per feature:
  - **Default view** — Sidepane or Dialog.
  - **Open on load** — On/Off, only meaningful (and only enabled) when Default view = Sidepane.
- Persist the preference to the **user's account** when signed in, with a **localStorage
  fallback** when signed out.
- **Nothing auto-opens on load** in the default configuration (default = Dialog, which opens
  from the pill, never on load).
- Extract the species-picker two-pane layout into a **reusable shell component**, then build
  the speed tiers dialog on it.

## Non-Goals

- Replacing or removing either side pane.
- Building the damage calc dialog (later phase). Its settings rows render but stay disabled.
- Any change to the speed tier calculation logic itself.

## Core State Model (read this before implementing)

Two independent ideas, intentionally separated:

1. **Persistent default** — the *setting*. "For speed tiers, do I prefer the sidepane or the
   dialog, and should the sidepane auto-open?" Stored on the account / localStorage.
   Changed only from the Settings dialog.

2. **Ephemeral session view** — what is open *right now*. The pop-out button and the
   "collapse to sidepane" button change **session state only**. They never rewrite the
   persistent default.

There is **one panel state, two presentations.** The speed tiers panel's working state
(weather, Trick Room, sort order, per-side modifiers) already lives in shared context
(`CalcStateProvider`, synced with the damage calc). The dialog and the side pane are just
**containers around the same presentation-agnostic content** fed by that shared state.
Consequence: toggling pop-out / collapse-to-sidepane never loses the user's selections,
because the state does not live in either container.

## Behavior Spec

### Opening / closing

| Trigger | Behavior |
| --- | --- |
| Dockbar **Speed Tiers pill** | Opens whichever presentation is the current **default** (dialog or sidepane). |
| **Pop-out button** in the sidepane header | Opens the dialog for this session; closes the sidepane. Does **not** change the default. |
| **Collapse-to-sidepane button** in the dialog header | Opens the sidepane for this session; closes the dialog. Does **not** change the default. |
| **✕** in the dialog / close in the sidepane | Closes the panel entirely. |
| Builder **load** | Open the speed tiers panel only if default = **Sidepane** AND "Open on load" = On. Otherwise nothing opens. (Default config = Dialog ⇒ nothing opens.) |

### Settings dialog

- Opened by a **gear button** in the builder topbar (`builder-topbar.tsx`), to the right of
  the existing File / Validate / Save controls.
- Small centered modal with two grouped sections: **Speed Tiers** and **Damage Calc**.
- Each group has two rows:
  - **Default view** — segmented toggle: Sidepane | Dialog.
  - **Open on load** — segmented toggle: Off | On. **Always visible.** **Disabled** when that
    group's Default view = Dialog, with helper text: *"Only applies to the sidepane — dialogs
    open from the pill."* Each row label has an ⓘ tooltip with a one-line explanation.
- The **Damage Calc** group renders **disabled / greyed** with a "coming soon" affordance
  (later phase). No calc plumbing is built now.

### Mobile

- The speed tiers dialog on mobile is a **bottom sheet** (`Drawer`, the same primitive the
  mobile species picker uses), full-width, slides up. The desktop two-pane layout collapses
  to the mobile tab-switch paradigm the species picker already uses (a "filters" view for
  Field + Modifiers, a "list" view for the table).
- The side pane remains mobile-hidden as today; the pill on mobile opens the default
  presentation (dialog ⇒ bottom sheet).

## Architecture

### 1. Reusable shell (pure refactor, do first)

Extract the species picker's desktop two-pane layout — currently inline in
`apps/web/src/components/team-builder/pickers/species-picker.tsx` — into a reusable shell.

- **What is shared (extract):** the desktop frame = header bar (search slot + count slot +
  extra-controls slot + close) + **collapsible left rail** (340px ↔ 48px transition, collapse
  toggle, collapsed strip) + main-content frame with scroll containment.
- **What is NOT shared:** the mobile `Drawer` tab-switch logic (`species-picker-mobile.tsx`)
  is a different paradigm. Speed tiers will reuse the *pattern* but each surface keeps its own
  mobile component. Do not try to unify mobile in this refactor.
- **Consumers supply:** the left-rail contents, the main-content contents, the header
  search/extra-controls, and counts. The shell owns only layout + collapse state.
- Proposed location: `apps/web/src/components/team-builder/pickers/` (or a shared
  `components/team-builder/` location if cleaner). Name TBD during planning
  (e.g. `FilterDialogShell` / `TwoPaneDialogShell`).
- **Checkpoint:** species picker (desktop + mobile) must behave identically after the
  extraction before anything else consumes the shell. This is a no-behavior-change refactor.

### 2. Presentation-agnostic speed tiers content

The current `SpeedTiersPanel`
(`apps/web/src/components/team-builder/dock/speed-tiers-panel.tsx`) renders Field +
table + Modifiers stacked for the narrow side pane. Restructure so the **content** (table,
field controls, modifier controls) is presentation-agnostic and driven by shared state, then:

- **Sidepane container** keeps today's stacked layout (unchanged for the user).
- **Dialog container** arranges the same content into the shell: Field + Modifiers in the
  left rail, the speed table in the main area, plus a **filter-by-name search** + match count
  in the header (new affordance, dialog-only) and the **collapse-to-sidepane** button.

### 3. Settings + preferences

- **DB:** new `user_preferences` table (mirrors the `notification_preferences` pattern:
  `user_id` UNIQUE FK, `preferences jsonb default '{}'`, timestamps, RLS select/insert/update
  keyed to `(select auth.uid())`, `user_id` index). Only the speed-tiers keys are written in
  phase 1; the JSONB shape leaves room for the calc keys later. New migration in
  `packages/supabase/supabase/migrations/`.
- **Query/mutation:** `getUserPreferences` / `upsertUserPreferences` in
  `packages/supabase/src/{queries,mutations}/`, exported from the barrels — same shape as the
  notification-preferences functions.
- **Server Actions:** `getBuilderPreferencesAction` / `updateBuilderPreferencesAction` in
  `apps/web/src/actions/`, wrapped with `withAction()`, validated with a Zod schema in
  `@trainers/validators`.
- **Preference keys (phase 1):**
  - `speedTiers.defaultView`: `"sidepane" | "dialog"` (default `"dialog"`)
  - `speedTiers.openOnLoad`: `boolean` (default `false`; only meaningful when sidepane)
- **Client read/write:** a hook that resolves the effective preference. Signed in ⇒ account
  value. Signed out ⇒ localStorage (key under the existing `trainersgg.builder.*` namespace
  used by `use-builder-state.ts`).
- **Sign-in reconciliation rule:** if an account value exists, it wins. If none exists and a
  localStorage value is present, adopt the local value and write it to the account. (No extra
  user prompt.)

## Affected Files (representative, not exhaustive)

- `apps/web/src/components/team-builder/pickers/species-picker.tsx` — extract shell.
- New shell component under `apps/web/src/components/team-builder/`.
- `apps/web/src/components/team-builder/dock/speed-tiers-panel.tsx` — split into
  presentation-agnostic content + sidepane/dialog containers.
- `apps/web/src/components/team-builder/dock/dockbar.tsx` — pill opens the default view.
- `apps/web/src/components/team-builder/team-workspace.tsx` — session view state, load
  behavior, render dialog vs sidepane.
- `apps/web/src/components/team-builder/use-builder-state.ts` — load-time open logic +
  localStorage fallback for the preference.
- `apps/web/src/components/team-builder/builder-topbar.tsx` — gear button.
- New builder Settings dialog component.
- New `apps/web/src/actions/builder-preferences.ts`.
- New migration + `packages/supabase/src/{queries,mutations}/user-preferences.ts` + barrels.
- New Zod schema in `packages/validators`.

## Implementation Phasing (maps to subagent-driven execution)

1. **Worktree** — create an isolated git worktree off `main` for this feature.
2. **Shell extraction (no behavior change)** — extract the two-pane shell; species picker is
   first consumer. **Verify species picker desktop + mobile unchanged.**
3. **Preferences infra** — migration + query/mutation + server actions + Zod schema +
   client hook (localStorage fallback + sign-in reconciliation).
4. **Speed tiers content split** — presentation-agnostic content + sidepane/dialog containers
   on the shell; dialog header gets filter-by-name + collapse-to-sidepane.
5. **Wiring** — pill opens default; pop-out (sidepane→dialog) and collapse (dialog→sidepane)
   session toggles; load-time open logic; mobile bottom sheet.
6. **Settings dialog** — gear button + dialog; speed tiers rows live, damage calc rows
   greyed; disabled "Open on load" + helper text/tooltips.

## Verification

- **Refactor checkpoint:** species picker opens, filters, searches, and picks correctly on
  desktop and mobile after extraction (manual + existing tests).
- **Default behavior:** fresh load with default config opens **nothing**. Pill opens the
  dialog.
- **Switch to sidepane + open-on-load On:** reload opens the sidepane; pill opens the
  sidepane.
- **State continuity:** set weather/Trick Room/modifiers in the dialog → collapse to sidepane
  → selections persist (and the damage calc still reflects shared weather).
- **Persistence:** signed in, change setting, reload (and on another browser) → setting holds.
  Signed out, change setting, reload same browser → setting holds via localStorage.
- **Reconciliation:** signed out + local pref set → sign in with no account pref → account
  adopts the local value.
- **Disabled control:** Default view = Dialog ⇒ "Open on load" is visibly disabled with
  helper text; ⓘ tooltips present.
- **Mobile:** pill opens the speed tiers bottom sheet; tab-switch between table and
  filters works.
- **Quality gates:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` pass; new
  tests cover the preference hook (reconciliation + fallback) and the open/close/load logic.
