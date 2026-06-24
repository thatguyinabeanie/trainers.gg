# Editor Team Rail — Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` to implement task-by-task. Steps use `- [ ]` for tracking.
> **Plan location note:** lives in `docs/builder-landing/` (with the rest of this effort) rather than the superpowers default.
> **Testing note (project override):** this branch defers tests to a final hardening pass (user directive). Tasks build the feature and verify via Playwright MCP + typecheck; Jest/RTL tests for the new component are written in the deferred pass, not test-first here.

**Goal:** Add an isolated team-navigation rail to the editor (`/builder/t/[id]`) — a collapsible folder tree to load any team, plus create actions — without leaving the workspace.

**Architecture:** A new client component `EditorTeamRail` reads the same localStorage stores as the landing (`listLocalDrafts`, local-folders) but with its own UI state. It mounts as a flush-left sibling of the editor's content area inside `TeamWorkspaceV2`'s `workspaceBody`. The landing's `FolderRail` is untouched (isolated per route — no shared state, no query params).

**Tech Stack:** Next.js 16 App Router, React 19.2 (React Compiler — no `useMemo`/`useCallback`/`React.memo`), Tailwind 4, Base UI/shadcn, lucide icons.

## Global Constraints

- React Compiler on — no manual memoization; no `setState` in effects (use the project's approved patterns).
- `cn()` for class composition; no arbitrary `[Npx]` Tailwind values; type-only imports as `import { type X }`.
- Component = `function` declaration, named export, `interface XxxProps` above it.
- **Bundle guard:** the rail must import only draft/folder data helpers — never `use-calc-state`/`@smogon/calc`. Verify the engine stays out of the editor's initial chunk (Network panel), per the recent code-split.
- Isolated: do **not** modify `FolderRail`, `teams-landing-client.tsx`, or add query params / `(builder)`-layout state.

---

## File Structure

- **Create** `apps/web/src/components/team-builder/editor/editor-team-rail.tsx` — the rail: create actions + collapsible team tree. Client component.
- **Create** `apps/web/src/components/team-builder/editor/use-editor-team-rail.ts` — small hook: reads drafts+folders from localStorage (SSR-safe), builds the grouped tree, exposes expand/collapse + reload-on-storage-change. Keeps the component lean.
- **Modify** `apps/web/src/components/team-builder/team-workspace.tsx` — insert `<EditorTeamRail currentDraftId=… />` as a flush-left sibling of the content area in `workspaceBody` (desktop), behind a sheet on mobile.
- **(Reuse, no edit)** `persistence/local-drafts-store.ts` (`listLocalDrafts`, `createLocalDraft`), `persistence/local-folders-store` (folders), `landing/group-drafts.ts` (`groupDrafts`), `landing/team-landing-shared.ts` (`toDraftSummary`, `draftEditorHref`), `@trainers/pokemon/sprites` (`getPokemonSprite`), `./import-dialog` (`ImportDialog`).

---

## Task 1: `useEditorTeamRail` hook (data + tree state)

**Files:**
- Create: `apps/web/src/components/team-builder/editor/use-editor-team-rail.ts`

**Interfaces:**
- Produces: `useEditorTeamRail(): { sections: TeamRailSection[]; expanded: Record<string,boolean>; toggleSection(id): void; reload(): void }` where `TeamRailSection = { id: string; label: string; teams: LocalDraftSummary[] }`.

**Steps:**
- [ ] **Read the source-of-truth APIs first** — open `persistence/local-drafts-store.ts` (`listLocalDrafts(): LocalDraftRecord[]`), `landing/group-drafts.ts` (`groupDrafts` signature + section shape), and `persistence/local-folders-types`/store. Match their exact names/shapes.
- [ ] **Implement the hook:** read drafts via `listLocalDrafts()` and folders via the local-folders store; map records to summaries with `toDraftSummary`; group into sections reusing `groupDrafts` (Pinned → format/folder → Archived). SSR-safe: return empty sections when `typeof window === "undefined"` (mirror the store's guard). Use `useIsClient()` (`@/hooks/use-is-client`) so the tree only renders after hydration.
- [ ] **Expand state:** local `useState<Record<string, boolean>>` keyed by section id; default the section containing `currentDraftId` (and "Pinned") to expanded. `toggleSection(id)` flips one. (No persistence needed v1.)
- [ ] **Freshness:** expose `reload()` and call it after create actions; optionally subscribe to `storage` events via `useSyncExternalStore` if trivial — otherwise `reload()` on mount + after mutations is enough.
- [ ] **Verify:** `pnpm --filter @trainers/web typecheck` clean for the new file (per project policy CI is authoritative; a scoped check is fine).

---

## Task 2: `EditorTeamRail` component (tree + create actions)

**Files:**
- Create: `apps/web/src/components/team-builder/editor/editor-team-rail.tsx`

**Interfaces:**
- Consumes: `useEditorTeamRail` (Task 1); `createLocalDraft` (store); `draftEditorHref`, `getPokemonSprite`; `ImportDialog`.
- Produces: `EditorTeamRail({ currentDraftId }: { currentDraftId: string })`.

**Steps:**
- [ ] **Top — create actions:** a `+ New team` button → `const d = createLocalDraft(); router.push(draftEditorHref(d.id))` (use `useRouter` from `next/navigation`). An `Import a paste` button → opens `ImportDialog` (read its props in `./import-dialog`); on successful import, create/populate a draft and `router.push` to it. Reuse the landing's create wiring as reference (`teams-landing-client.tsx` `handleNewTeam`).
- [ ] **Body — collapsible tree:** map `sections`; each section is a header button (chevron + label + count) that calls `toggleSection(id)`; when `expanded[id]`, render its `teams` as compact rows — a `<Link href={draftEditorHref(t.id)}>` with the team name (+ optional small sprite of `t.species[0]`). Highlight the row when `t.id === currentDraftId` (e.g. `bg-teal-500/15 text-teal-700`).
- [ ] **Styling:** match the landing rail tokens — panel `bg-muted/40` is provided by the mount wrapper (Task 3); section labels `text-xs font-medium uppercase tracking-wide text-muted-foreground`; rows `text-sm`, `min-h-8`. Use `cn()`. Width `w-56` (or reuse the landing's `w-52`).
- [ ] **Empty state:** if no drafts, show only the create actions + a muted "No teams yet" line.
- [ ] **Verify (Playwright MCP):** temporarily mount or wait for Task 3; defer live check to Task 3.

---

## Task 3: Mount the rail in the editor (layout)

**Files:**
- Modify: `apps/web/src/components/team-builder/team-workspace.tsx` (the `workspaceBody`, starts ~line 871)

**Steps:**
- [ ] **Read `workspaceBody`** (≈ lines 871–1345): it is `<div className="flex h-full flex-col overflow-hidden" style={builderTokenStyle}>` → `{header}` (full-width) → content area (`<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">…`) → `<DockbarConnected/>`.
- [ ] **Insert the rail beside the content (desktop):** wrap the content area + dockbar region so the structure becomes: `header` → `<div className="flex min-h-0 flex-1">` `{ isClient && !isMobile && <aside className="bg-muted/40 shrink-0 overflow-y-auto border-r border-border/40 p-2 w-56"><EditorTeamRail currentDraftId={…}/></aside> }` + `<div className="flex min-w-0 flex-1 flex-col overflow-hidden">…existing content…</div>` `</div>`. Keep the dockbar where it is (it floats centered) — if it currently sits after the content inside the column, leave it inside the content column so it stays centered over the workspace.
- [ ] **`currentDraftId`:** thread the draft id into `TeamWorkspaceV2`. `team.id` is the synthetic `-1` for local drafts, so pass the route id explicitly: add a `draftId?: string` prop to `TeamWorkspaceV2` and pass it from `LocalBuilderWorkspace` (`draftId` is already in scope there). Use it for `currentDraftId` and to gate the rail to local drafts only.
- [ ] **Mobile:** gate the `<aside>` on `!isMobile` (use `useIsMobile()`); add a "Teams" trigger (Sheet) — reuse the landing's mobile pattern (`Sheet side="left"` wrapping `<EditorTeamRail/>`), triggered from the topbar or a small FAB. Keep it minimal; if the topbar has no room, a left-side Sheet trigger button near the format selector is fine.
- [ ] **React Compiler / effects:** no manual memo; the rail mounts/unmounts via the `isClient && !isMobile` JSX condition, not effects.
- [ ] **Verify (Playwright MCP, live):** load `/builder/t/<seeded local id>`; confirm the rail renders on the left, a folder expands to its teams, clicking a team navigates + highlights it, `+ New team` creates+opens, `Import a paste` opens the dialog. Resize to 393px → rail collapses to the Sheet. **Bundle guard:** Network panel shows no `@smogon/calc` chunk on initial load (calc still deferred). Confirm the landing (`/builder`) is visually unchanged.

---

## Task 4: Polish + commit

- [ ] **Collapse parity (optional):** a rail collapse toggle mirroring the landing, if time allows. YAGNI otherwise.
- [ ] **Orchestrator commits** between tasks (subagents report changed files + suggested message). Final commit message explains the why (isolated editor team-rail; reuses landing data helpers; bundle-guarded).
- [ ] **Deferred:** Jest/RTL tests for `EditorTeamRail` + the hook go in the builder-landing test-hardening pass, not here.

---

## Self-Review

- **Spec coverage:** folder tree + load (Task 2/3) ✓; create actions New team + Import (Task 2) ✓; isolated, same stores (Task 1) ✓; mirror-landing placement (Task 3) ✓; mobile sheet (Task 3) ✓; bundle guard (constraints + Task 3 verify) ✓; landing untouched (constraints) ✓.
- **Placeholders:** create-action import wiring + group-drafts/folders signatures are deferred to "read the file first" steps because they're existing APIs the implementer must match exactly — not invented gaps.
- **Type consistency:** `TeamRailSection`/`LocalDraftSummary` from Task 1 used in Task 2; `currentDraftId: string` consistent across Tasks 2–3; `draftId` prop added to `TeamWorkspaceV2` in Task 3.
