# Project Specs & Plans Index

This directory holds design specs and implementation plans organized by feature.
Each feature pairs one **spec** (the design) with one **plan** (the step-by-step
implementation).

## Conventions

- `specs/<YYYY-MM-DD>-<slug>.md` — design doc; the **what** and **why**
- `plans/<YYYY-MM-DD>-<slug>.md` — implementation plan; the **how**, broken
  into bite-sized tasks with checkbox tracking
- `../design/` — supplementary reference data (e.g. role registries, palettes,
  fixture data) that's consumed by specs/plans but isn't itself a design doc

---

## Active feature work

### Picker redesign (species + move)

A unified redesign that brings persistent sidebar filters, role-preset
panels, and click-to-filter affordances to both pickers, sharing one role
taxonomy and four React components between them.

| Doc | Path |
|---|---|
| Species spec | [specs/2026-05-01-species-picker-redesign.md](specs/2026-05-01-species-picker-redesign.md) |
| Species plan | [plans/2026-05-01-species-picker-redesign.md](plans/2026-05-01-species-picker-redesign.md) |
| Move spec | [specs/2026-05-01-move-picker-redesign.md](specs/2026-05-01-move-picker-redesign.md) |
| Move plan | [plans/2026-05-01-move-picker-redesign.md](plans/2026-05-01-move-picker-redesign.md) |
| Move-role registry (361 moves × 26 roles) | [../design/2026-05-01-champions-ma-move-roles.md](../design/2026-05-01-champions-ma-move-roles.md) |

**Execution order when ready:** species plan Phase 1 (shared infra) →
species Phase 2 (`@trainers/pokemon` package) → species Phases 3 & 4
(species picker integration + pre-push) → move plan Tasks 1–4. The move
plan explicitly lists species Phase 1 as a prerequisite.

**Shared design lives in species spec §13** — the canonical group color
palette, role registry shape, and shared file list. The move spec
references species §13 rather than duplicating it.

---

## Other tracked specs/plans in this directory

(See `ls specs/` and `ls plans/` for older feature work — calc panel
redesigns, defender identity stats, header band, etc. Each spec/plan
pair is dated.)
