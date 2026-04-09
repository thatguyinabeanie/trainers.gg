# Session 2: UI Shell

> **Rename session to:** `the-builder-s2-ui-shell`
> **Branch:** `the-builder` (continue from Session 1's commits)
> **Estimated scope:** Teams list page + core editor workspace
> **Parallelism:** 2 subagent tracks (Track A: list page, Track B: editor workspace)

## Prerequisites

- Session 1 is complete (migrations applied, package functions built, CRUD working)
- Read `docs/the-builder/context.md` for design decisions
- Invoke `building-web-app` and `creating-components` skills before starting

## What This Session Builds

The two main pages of the team builder — the teams list and the editor workspace. After this session, a user can navigate to their teams, create a new team, and edit Pokemon in it.

## Parallel Track Assignments

### Track A: Teams List Page

**Subagent instructions:** You are building the teams list page and new team dialog. Do NOT create or modify any files in the `team-builder/` component directory except `team-card.tsx`. Track B handles the workspace.

**Files to create:**

```
apps/web/src/app/(dashboard)/dashboard/alts/[handle]/teams/
  page.tsx              — Teams list page (Server Component)
  loading.tsx           — Loading skeleton
  new/
    page.tsx            — New team creation (could be a dialog/modal triggered from list)

apps/web/src/components/team-builder/
  team-card.tsx         — Team card for the list view
```

**Teams list page (`page.tsx`):**

- Route: `/dashboard/alts/[handle]/teams`
- Server Component that fetches teams via `getTeamsForAlt()`
- Resolve the alt from the `[handle]` URL param (look at how existing `[username]/page.tsx` resolves alts)
- Format filter chips at top — default to current active format via `getActiveFormats()[0]`
- When "All" selected, group teams by format with section headers
- Each team renders as a `<TeamCard>` showing: 6 Pokemon sprites (use `getPokemonSprite()`), team name, format badge, last updated relative time, fork info (if parent_team_id), W/L record placeholder
- Actions: "+ New Team" button, "Import Paste" button
- Empty state: "No teams yet" with prominent create/import buttons

**Team card (`team-card.tsx`):**

- Client Component (needs hover states)
- Props: team data with pokemon array
- Click navigates to `/dashboard/alts/[handle]/teams/[teamId]`
- Show 6 sprite slots (empty slots as gray placeholders)
- Format as a small badge/pill
- Use `cn()` for conditional classes, follow shadcn patterns

**New team dialog:**

- Can be a sheet/dialog triggered from the list page, or a separate route
- Fields: team name (text input), format (radio/pills from `getActiveFormats()`), start from (empty / import paste)
- On submit: call `createTeam()` Server Action → navigate to the new team's workspace
- "Import paste" option: show textarea, parse with `parseShowdownText()`, create team + add all Pokemon

**Sidebar nav update:**

- Update `dashboard-sidebar.tsx` line 738: change `href: "/builder"` to `href: "/dashboard/alts/${currentAlt.username}/teams"` (or however the sidebar generates alt-scoped URLs — match the existing pattern)

---

### Track B: Editor Workspace

**Subagent instructions:** You are building the editor workspace — the page users see when they click into a specific team. Do NOT create or modify the teams list page files (`teams/page.tsx`, `teams/new/`, `team-card.tsx`). Track A handles those.

**Files to create:**

```
apps/web/src/app/(dashboard)/dashboard/alts/[handle]/teams/[teamId]/
  page.tsx              — Team workspace page
  layout.tsx            — Workspace layout (header bar)
  loading.tsx           — Loading skeleton

apps/web/src/components/team-builder/
  team-strip.tsx        — Horizontal team strip (centered, drag-and-drop)
  pokemon-editor.tsx    — Full editor for selected Pokemon
  ev-editor.tsx         — EV bars with nature bump indicators
  iv-editor.tsx         — IV inputs (conditionally shown per format)
  move-picker.tsx       — Move selection with inline descriptions
  item-picker.tsx       — Item selection with inline descriptions
  ability-picker.tsx    — Ability selection with descriptions
  nature-picker.tsx     — Nature selection (+/- stat display)
  tera-picker.tsx       — Tera type selection
  context-panel.tsx     — Right panel with 3 tab headers (STUB content)
```

**Workspace page (`[teamId]/page.tsx`):**

- Server Component that fetches team via `getTeamWithPokemon()`
- Passes data to client components
- Verify the team belongs to the alt from the URL

**Workspace layout (`[teamId]/layout.tsx`):**

- Header bar: breadcrumb ("← Teams / Team Name"), format badge, action buttons (Import, Export, Fork, Share, Validate)
- Children rendered below

**Team strip (`team-strip.tsx`):**

- Client Component
- Horizontal row of Pokemon chips, centered
- Each chip: sprite (from `getPokemonSprite()`), species name, held item text
- Selected chip: teal highlight (use theme tokens from `@trainers/theme`)
- Empty slots: dashed border, "+" icon
- Click chip → `onSelect(pokemonId)` callback
- Click "+" → `onAddNew()` callback (Session 3 connects this to the species picker)
- Drag-and-drop reordering — use a lightweight library or HTML drag API. On drop: call `reorderTeamPokemon()` Server Action
- "Choosing..." state for when species picker is active (prop: `choosingSlot?: number`)

**Pokemon editor (`pokemon-editor.tsx`):**

- Client Component — the main editor form
- Props: `pokemon: PokemonWithMeta`, `format: GameFormat`, `onUpdate: (field, value) => void`
- Species header: species name as clickable text with ▾ arrow + type pills + level
  - `onSpeciesClick()` callback (Session 3 connects to picker)
- 2-column field grid: ability, item, nature, tera type, nickname, gender (when relevant), shiny toggle
  - Each field is click-to-edit: shows current value, clicking opens the relevant picker inline
- Moves: 2x2 grid of move slots, click to open move picker
- EV editor component (below)
- IV editor component (conditionally rendered based on format)
- Notes: collapsible textarea at bottom
- Auto-save: debounce field changes, call `updatePokemon()` Server Action after 2s inactivity
  - Show "Saving..." → "Saved" indicator in the header area

**EV editor (`ev-editor.tsx`):**

- 6 stat rows: label, draggable bar, EV value, calculated stat value
- Colors: HP red, Atk orange, Def yellow, SpA blue, SpD green, Spe pink
- Nature indicators: boosted stat label green with "+", reduced stat label red with "-"
- Reduced stat bar dimmed (opacity-30)
- Nature bump tick marks on +nature stat bar (use `calculateNatureBumps()` from Session 1)
- Drag behavior: mouse/touch drag on bar adjusts EV value, snaps to bump points within 2 EVs
- Total counter: "508 / 510 • 2 remaining"
- Preset buttons: Reset (all 0), Max Atk (252 Atk / 252 Spe / 4 HP), Max Bulk (252 HP / 128 Def / 128 SpD)
- Use `calculateStats()` to show the final calculated stat value next to each bar

**IV editor (`iv-editor.tsx`):**

- 6 stat inputs (0-31), default 31
- Only rendered when `format.generation !== 'champions'` (or however Champions is identified in the format registry)
- Compact row layout alongside or below EVs

**Move picker (`move-picker.tsx`):**

- Opens inline when a move slot is clicked (replaces the slot area)
- Shows all learnable moves via `getLearnableMoves(species)`
- Each move shows: name, type badge, category (Physical P / Special S / Status), BP, accuracy, description
- Get move data from `@pkmn/dex`: `gen9.moves.get(moveName)` returns `{basePower, accuracy, type, category, desc, shortDesc}`
- Search filter at top
- Category filter buttons: All, Physical, Special, Status, STAB
- Click a move to select it, picker closes

**Item picker (`item-picker.tsx`):**

- Opens inline when item field is clicked
- Shows all items via `gen9.items` iteration
- Each item: name, description from `gen9.items.get(itemName).desc`
- Duplicate item warning: check other team Pokemon for same item, show warning text
- Search filter at top

**Ability picker (`ability-picker.tsx`):**

- Opens inline when ability field is clicked
- Shows valid abilities via `getValidAbilities(species)`
- Each ability: name, description from `gen9.abilities.get(abilityName).desc`
- Hidden ability indicator

**Nature picker (`nature-picker.tsx`):**

- Opens inline when nature field is clicked
- Shows all 25 natures via `getValidNatures()`
- Each nature: name, boosted stat (+10%), reduced stat (-10%)
- Use `NATURE_EFFECTS` from `@trainers/pokemon`

**Tera picker (`tera-picker.tsx`):**

- Type selector grid (all 18 types, or valid tera types for the format)
- Use `getValidTeraTypes()` from `@trainers/pokemon`
- Each type styled with type color

**Context panel (`context-panel.tsx`):**

- Tab headers: Types, Speed, Calc
- Tab content: STUB for now — each tab shows "Coming in Session 3"
- Accept `activeTab` state + `onTabChange` callback
- Accept `team` and `selectedPokemon` props for when real tab content is added

**Key patterns to follow:**

- Use `cn()` from `@/lib/utils` for all dynamic classes
- Use shadcn/ui primitives (Button, Input, Tabs, etc.) where they fit
- Follow the existing dashboard component patterns for layout
- React Compiler is active — do NOT use useMemo/useCallback/React.memo
- All Supabase queries accept `supabase: TypedClient` as first param

## Import/Export (Track B)

Add to the workspace header:

- **Import button:** Opens a dialog/sheet with textarea for Showdown paste + Pokepaste URL input. Parse with `parseShowdownText()` or `parsePokepaseUrl()`. On import: create Pokemon records and add to team.
- **Export button:** Dropdown with "Copy as Showdown text" (uses `toShowdownFormat()` or `exportTeamToShowdown()`, copies to clipboard via `navigator.clipboard.writeText()`).
- **Fork button:** Calls `forkTeam()` Server Action, navigates to the new team.

Per-Pokemon import/export (exact placement TBD — could be context menu on strip chip or buttons in editor header).

## Verification

After both tracks merge:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm dev:web  # manually verify:
  # 1. Navigate to /dashboard/alts/[handle]/teams
  # 2. Create a new team
  # 3. Should see empty workspace with prompts
  # 4. (Can't add Pokemon yet without species picker — Session 3)
  # 5. Import a team via Showdown paste — Pokemon should appear in strip
  # 6. Click a Pokemon in strip — editor should show its data
  # 7. Edit fields — auto-save should work
  # 8. Export as Showdown text — should match
  # 9. Fork — should create copy
  # 10. Drag reorder in strip — positions should update
```

Commit with a descriptive message. Do NOT push.

## What NOT To Build

- No species picker (Session 3)
- No real tab content for Types/Speed/Calc (Session 3)
- No validation system (Session 4)
- No mobile-specific layout (Session 5)
