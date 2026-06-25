# Team Builder Landing — Design Package

**Status:** Implemented — Phase 1 (#376) + Phase 2 (#377); test-hardening pending
**Date:** 2026-06-22 · **Expanded:** 2026-06-23 (quick-look, list controls, bulk actions, archive & safety; name-first rows)
**Design PR:** #374

A rich, organized **landing/home for the team builder** — the screen you see at `/builder` before editing a specific team. Today `/builder` drops straight into a single-team editor with no "all my teams" surface; this design closes that gap and aims to **beat** the Pokémon Showdown teambuilder rather than match it.

This package complements `docs/builder-single-focus-redesign/` (which redesigns the per-Pokémon *editor* middle section). The two do not overlap.

## Implementation status

**Shipped (Phase 1 #376 + Phase 2 #377)**

- `/builder` landing + `/builder/t/[id]` editor hosting both local drafts and account teams
- Unified list (`useUnifiedTeams`): local-first store (v3) merged with DB-backed account teams
- Smart search + quick-look (hovercard desktop / bottom-sheet mobile)
- Folders: auto (gen→format), manual (⭐), smart (⚡) — DB-backed for authed users; local substitution for guests
- Sort + density toggle (persisted); pin/archive/sort_order; drag-reorder (Custom-order)
- Bulk select + action bar; deferred-commit delete + Undo toast
- "Viewing" alt pills + alt scoping + alt mini-badge on rows
- Fuller row ⋯ menu (rename / duplicate / move-to-alt / duplicate-to-alt / export / make-public / keep-local-only)
- Top-level "Export / back up all teams"
- Loading / error / empty / first-run states; mobile (FAB, folder bottom-sheet, long-press select)
- Reconcile banner for login-with-local-drafts flow; sync badges (Synced / Local / Local-only)
- Full Phase 2–6 DB + RLS layer: `team_folders` / `team_folder_members` / `smart_folders`, `reorder_teams` RPC, enriched query, flag/folder/bulk mutations + server actions
- Dashboard team routes consolidated into `/builder` (dashboard routes redirect)

**Deferred / open**

- "✨ Start from a sample" on-ramp: still stubbed (disabled "coming soon") — source **decided: VGCPastes integration** (community VGC team-paste archive); build deferred to that separate effort
- Full test-hardening pass: Jest (migrate fixtures → `makeDraftRecord`; Milestone C tests) + RTL + Playwright E2E; CI disabled (GitHub Actions billing)
- `hasTeamBuilderAccess` beta gate retired as **obsolete** — `/builder` is open, team-builder is GA

## Files

| File | What it is |
| --- | --- |
| [`spec.md`](./spec.md) | Full-fidelity spec: every section's anatomy, microcopy, states, plus the **Decision Log** (why each choice won + what was rejected) |
| [`mockups/`](./mockups/) | The 13 brainstorm wireframes, preserved as self-contained HTML + PNG screenshots |

## How this was designed

Designed via the superpowers brainstorming flow with a live visual companion — 13 interactive wireframes iterated one decision at a time. Each mockup below maps to a decision in `spec.md`'s Decision Log.

## Mockup gallery

Each links to the rendered screenshot and the self-contained HTML you can open in a browser.

| # | Mockup | Decision it drove |
| --- | --- | --- |
| 1 | [layout](./mockups/layout.png) · [html](./mockups/layout.html) | Landing layout: card grid vs Showdown list vs sidebar → **blend** |
| 2 | [layout-hybrid](./mockups/layout-hybrid.png) · [html](./mockups/layout-hybrid.html) | Row-cards: flat vs grouped → **not flat** (rich) |
| 3 | [org-hierarchy](./mockups/org-hierarchy.png) · [html](./mockups/org-hierarchy.html) | Org tree: alt-first vs multi-lens → **superseded** (alts live in chrome) |
| 4 | [alt-model](./mockups/alt-model.png) · [html](./mockups/alt-model.html) | Alt control: scope dropdown vs tabs |
| 5 | [alt-combo](./mockups/alt-combo.png) · [html](./mockups/alt-combo.html) | **Alt: pills + overflow dropdown** (combined) ✅ |
| 6 | [rich-search](./mockups/rich-search.png) · [html](./mockups/rich-search.html) | **Search: smart field** vs filter builder ✅ |
| 7 | [folders](./mockups/folders.png) · [html](./mockups/folders.html) | Folder surface: browser vs sections vs rail |
| 8 | [smart-folders](./mockups/smart-folders.png) · [html](./mockups/smart-folders.html) | **B+C combo + Smart Folders** (save-from-search **and** criteria builder) ✅ |
| 9 | [sync-model](./mockups/sync-model.png) · [html](./mockups/sync-model.html) | **Sync: pre-save scratch + deliberate local-only** ✅ |
| 10 | [row-actions](./mockups/row-actions.png) · [html](./mockups/row-actions.html) | **Row actions + move-between-alts: menus + drag** ✅ |
| 11 | [empty-states](./mockups/empty-states.png) · [html](./mockups/empty-states.html) | Empty on-ramps: scratch + import + sample |
| 12 | [empty-merged](./mockups/empty-merged.png) · [html](./mockups/empty-merged.html) | **Empty = full shell + welcome inside; seed Smart Folders** ✅ |
| 13 | [mobile](./mockups/mobile.png) · [html](./mockups/mobile.html) | **Mobile folders: bottom sheet** ✅ |
| 14 | [quick-look](./mockups/quick-look.png) · [html](./mockups/quick-look.html) | **Quick-look peek: hovercard + mobile bottom-sheet** ✅ |
| 15 | [bulk-actions](./mockups/bulk-actions.png) · [html](./mockups/bulk-actions.html) | **Bulk select: hover checkbox + mobile long-press** ✅ |
| 16 | [list-controls](./mockups/list-controls.png) · [html](./mockups/list-controls.html) | **Pin section + name-first rows + density / reorder / keyboard** ✅ |
| 17 | [archive-safety](./mockups/archive-safety.png) · [html](./mockups/archive-safety.html) | **Safety: Archive (keep-but-hide) + Undo on delete** ✅ |

## Locked decisions (summary)

| Area | Decision |
| --- | --- |
| Teams source | Unified list: local drafts + account teams, badged |
| Layout | Two-pane: collapsible rail + collapsible sections of rich row-cards (not flat) |
| Alts | "Viewing" pills + overflow dropdown; account avatar separate; alts not in the rail |
| Search | Smart field (fuzzy + grouped suggestions + predicates); match reasons + sprite highlight |
| Folders | Auto (🧬 Gen 9→format) + Manual (⭐) + Smart (⚡) |
| Smart Folders | Save-from-search **and** criteria builder; seeded defaults (Incomplete/Illegal/Recently edited) |
| Sync | Local = pre-save scratch (auto-sync once saved) **plus** deliberate Local-only; login reconcile banner |
| Move between alts | ⋯ "Move to alt" (reassign owner) + "Duplicate to alt" (copy); drag onto alt pill |
| Row interactions | Menus (always) + drag-and-drop (enhancement) |
| Empty/first-run | Full shell renders; welcome + 3 on-ramps inside main area; guest variant |
| Routing | Route per team: `/builder` landing + `/builder/t/[id]` editor |
| Row anatomy | **Name-first everywhere**: name (📌) → sprites → format → sync → ⋯ (fixed-width name column) |
| Quick-look | Hovercard (desktop) + bottom-sheet (mobile); full 6 with item / ability / tera / moves |
| List controls | Sort (Recent/Name/Format/Completeness/Custom) + density toggle; pin-to-top (📌 section); manual reorder (Custom-order); keyboard nav |
| Bulk actions | Hover checkbox + mobile long-press (+ ⇧/⌘-click); action bar: move folder/alt · export · archive · delete; export-all backup |
| Safety / states | Archive (🗄 Archived, restorable) + Undo toast on delete; loading skeletons; error/retry; remembered UI prefs |
| Mobile | Single column; alt dropdown; Folders → bottom sheet; quick-look + actions → bottom sheets; long-press multi-select; `+ New` FAB |
| Parked / dropped | Tournament usage + meta-fit (parked, notes only); legal-for-event + per-card health badge (dropped, redundant) |
