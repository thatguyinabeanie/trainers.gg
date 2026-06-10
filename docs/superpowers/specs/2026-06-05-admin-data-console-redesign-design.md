# /admin/data Import Console — Redesign Design

**Date:** 2026-06-05
**Branch:** `feat/pokemon-usage-stats` (continues the usage work; see note in Out of Scope)
**Component:** `apps/web/src/components/admin/external-data.tsx` (shared by the RK9 + Limitless tabs)

## Context

`/admin/data` is the admin console for discovering and importing third-party tournament
data (RK9 + Limitless), and triggering usage computation. A live Playwright audit found:

- **Desktop:** no overflow, but the toolbar is dense — a Backend toggle, three numeric
  config inputs, five plain-text counts, and five action buttons (Queue All, Run Import,
  Sync, Recompute Usage, Calculate Usage) all compete in one row.
- **Mobile (390px):** the table overflows horizontally (`scrollWidth` 687px vs 390px viewport);
  it does not reflow.
- **Functional gap:** the bulk **Queue All** (Limitless) and bulk **Scrape** (RK9) actions
  ignore the active filters — you can *view* only Reg M-A but cannot *queue/scrape* only Reg M-A.

The Limitless sync→queue→import pipeline is already correctly separated (sync stores metadata
only; import is a separate queued step), so this redesign is purely a UI/UX + filter-scoping
pass, not a pipeline change.

## Goals

1. Make bulk actions respect the active filters (the core functional win).
2. Reduce toolbar density and clarify intent (import vs usage).
3. Make the synced/queued/importing/imported/failed state scannable.
4. Surface bulk actions when rows are selected.
5. Make the page usable on a phone (kill horizontal scroll).
6. Keep `external-data.tsx` maintainable by extracting sub-components.

Applies to **both** the RK9 and Limitless tabs (shared component).

## Design

### 1. Filter-aware bulk actions

The two tabs have different action verbs but the same gap: bulk handlers operate on the
**full unfiltered list** today. Change them to operate on the **filtered** rows
(`filteredLimitlessRows` / `filteredRk9Rows`) intersected with per-action eligibility.

- **Limitless:** `Queue All (5717)` → **`Queue Matching (N)`** where N = filtered rows whose
  `import_status` is null or `"failed"`. The unconditional "queue every pending" stays
  available as a secondary item under the button's `▾` ("Queue all pending (5717)").
- **RK9:** the existing bulk **Scrape Rosters** / **Scrape Teams** actions queue the filtered
  eligible events (roster-eligible = pending/failed; teams-eligible = roster/teams/complete).

Selecting individual rows (checkboxes) still scopes to the explicit selection and takes
precedence over the filter-derived set when a selection exists.

### 2. Toolbar — grouped & labeled (chosen layout: Option A)

One row, left→right:

- **Left:** status chips (see §4).
- **Right, grouped with small uppercase labels + dividers:**
  - **Import:** `Sync` · `Queue Matching (N) ▾` (primary) · `Run Import`
  - **Usage:** a `Usage ▾` menu containing `Recompute Usage` and `Calculate Usage`
  - `⚙` Settings popover (§3) · `⟳` Refresh

RK9 tab mirrors this: **Import** group = `Discover` · `Scrape Rosters ▾` · `Scrape Teams`.

### 3. ⚙ Settings popover

Move the Backend auto-import toggle, `tourneys/tick` (Limitless batch size) / `teams/tick`
(RK9), `concurrency` (RK9), and `interval (s)` inputs out of the toolbar into a Popover
opened by the ⚙ button. Saving still writes the same `site_config` keys via `setSiteConfig`
with the existing optimistic + revert behavior. Note inside the popover that the Backend
toggle currently has no active cron driving it (documented separately; not changed here).

### 4. Status chips

Replace the plain-text counts with colored pills (small, `rounded-full`, `tabular-nums`):

| Chip | Color | Backing state |
| --- | --- | --- |
| synced | gray | total rows |
| queued | amber | `import_status = "queued"` |
| importing | blue | `import_status = "importing"` |
| imported | emerald | `data_imported_at` not null |
| failed | red | `import_status = "failed"` |

RK9 maps its statuses to the same vocabulary (already normalized via `normalizeRk9Status`).

### 5. Selection bulk-bar

When ≥1 row is checked, render a bar above the table: **"N selected"** + per-tab bulk actions
(Limitless: `Queue selected`, `Import selected now`, `Reset`; RK9: `Scrape rosters`,
`Scrape teams`, `Reset`) + `Clear selection`. Selection state already exists (`selectedIds`);
this surfaces it as a dedicated bar instead of scattered affordances.

### 6. Active-filter emphasis

When the Format filter is set to a non-"All" value, give its `SelectTrigger` a subtle
primary ring/active style, and keep the existing result note ("Showing N of M — filtered to
Reg M-A"). This makes it obvious that bulk actions are scoped.

### 7. Mobile card reflow (<`sm`)

Per `.claude/rules/mobile-responsiveness.md`: conditional mount via `useIsMobile()` +
`useIsClient()` (NOT `hidden md:block`). Desktop → existing virtualized table; mobile →
stacked card list. Each card: event name + external link, format badge, date, player count,
status pill, a `⋯` per-row action menu, and the Standings/Pairings/Players sub-links. The
toolbar chips + buttons wrap; the primary action goes full-width with a `⋯` overflow.
Skeleton height derives from row count and is `aria-hidden` (CLS-safe).

## Component extraction (maintainability)

`external-data.tsx` is ~2,785 lines. Extract, sharing types via the existing
`external-data-shared.ts`:

- `external-data-toolbar.tsx` — chips + grouped action buttons (props: counts, handlers, tab).
- `external-data-settings.tsx` — the ⚙ Settings popover (Backend + throughput inputs).
- `external-data-cards.tsx` — the mobile card list (mirrors the table rows).
- `external-data-selection-bar.tsx` — the selection bulk-bar.

The parent keeps data fetching, filter state, and handler logic; children are presentational.
No sibling-to-sibling imports — shared symbols live in `external-data-shared.ts`.

## Testing

- **Unit:** filter-aware queue handler queues only the filtered + eligible set (Limitless);
  RK9 bulk-scrape scopes to filtered eligible events.
- **Conditional mount:** test that desktop mounts the table, mobile mounts cards, and the
  skeleton shows pre-hydration (mock `useIsMobile`/`useIsClient` per the mobile rule).
- **Visual (Playwright, delegated to a subagent):** desktop + 390px; the overflow probe
  (`scrollWidth > innerWidth`) is **false** on mobile after the reflow; no sub-40px tap
  targets introduced; screenshots to `.playwright-mcp/screenshots/`.

## Out of scope

- The dead "Backend" auto-import (pg_cron was removed) — surfaced as a note in the popover,
  not revived here.
- The Limitless sync pipeline itself (already metadata-only).
- Whether this ships on `feat/pokemon-usage-stats` or its own branch — decide at plan time.

## Success criteria

- Filtering to Reg M-A and clicking **Queue Matching** queues only those tournaments.
- Toolbar reads as two clear groups; config lives behind ⚙.
- Counts are scannable colored chips; selecting rows reveals bulk actions.
- `/admin/data` has no horizontal overflow at 390px (table → cards).
- `external-data.tsx` is decomposed into focused sub-components.
