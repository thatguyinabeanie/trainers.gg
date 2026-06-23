# Editor Team Rail — design

_2026-06-23 · builder-landing follow-up_

## Context

The `/builder` landing has a folder rail; the editor (`/builder/t/[id]`) has
none. So switching to another team — or starting a new one — means navigating
back to the landing. Add a team-navigation rail to the editor so you can stay
in the workspace.

## Goal

An **isolated** sidebar in the editor that lets you:

1. Browse your teams, grouped into **collapsible folders**, and **load** any of
   them without leaving the editor.
2. **Start a new team** (blank or from a paste) in place.

## Non-goals (YAGNI)

- **Not** shared state with the landing — each route owns its rail (no query
  params, no `(builder)`-layout hosting, no cross-route React state).
- **No** changes to the landing's `FolderRail`.
- **No** per-folder "create here" (can add later).
- **No** folder management (new/rename/delete folder, smart-folder builder) in
  the editor rail — that stays on the landing. The editor rail is for
  navigating + creating teams only.

## Approach — isolated editor rail

A new client component (working name `editor-team-rail.tsx`) mounted in the
editor. It reads the **same localStorage stores** as the landing (local drafts +
local folders) but keeps its **own UI state**. The landing's `FolderRail` is
left untouched — this is a separate instance, not a shared one.

## Structure & behavior

**Top — create actions:**

- `+ New team` → `createLocalDraft()` → navigate to `/builder/t/<new-id>`
  (same effect as the landing's New Team button).
- `Import a paste` → opens the existing `ImportDialog` (Showdown paste); on
  import, create a draft and open it.

**Body — collapsible team tree:**

- Groups use the landing's existing grouping (`group-drafts`): **Pinned**, then
  by generation→format / manual folders, then **Archived**.
- Each group is a collapsible header (expand / collapse). Expanding reveals its
  teams as compact rows (team name; optional tiny sprite).
- Click a team → navigate to `/builder/t/<id>`.
- The **current** draft (the route `id`) is highlighted.
- Own expand/collapse state; a rail-collapse toggle for parity with the landing.

## Placement

Mirror the landing layout: the editor keeps its **full-width top bar**, a
**flush-left rail** sits beside the workspace body, and the dockbar spans the
bottom.

```
┌───────────────────────────────────────────┐
│  topbar (full width)                        │
├──────────┬──────────────────────────────────┤
│  rail    │  stats · sprite · moves           │
│  (tree)  │  (workspace body)                 │
├──────────┴──────────────────────────────────┤
│  dockbar (Type matchups · Speed tiers · …)    │
└───────────────────────────────────────────┘
```

The exact insertion point (restructuring `LocalBuilderWorkspace` /
`TeamWorkspaceV2` so the top bar stays full-width and `[rail | workspace-body]`
sit below it) is a plan-level detail.

## Mobile

The editor is desktop-first. On phones the rail is hidden behind a button/sheet
(like the landing's Folders sheet) or omitted initially — decided in the plan.

## Reuse

`listLocalDrafts`, `toDraftSummary`, `group-drafts`, `getPokemonSprite`,
`createLocalDraft`, `draftEditorHref`, `ImportDialog`; design tokens as on the
landing.

## Verification

Playwright (MCP) against the live editor:

- Rail renders; expanding a folder lists its teams; clicking a team navigates +
  highlights the current one.
- `+ New team` creates and opens a blank draft; `Import a paste` opens the
  dialog.
- Mobile collapses to a button/sheet; no regression to the landing.
- **Bundle guard:** the rail must read only the draft/folder stores — it must
  NOT re-introduce `@smogon/calc` into the editor's initial chunk (confirm via
  the Network panel, as with the recent code-split).
