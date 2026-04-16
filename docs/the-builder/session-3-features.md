# Session 3: Species Picker + Context Tabs

> **Rename session to:** `the-builder-s3-features`
> **Branch:** `the-builder` (continue from Session 2's commits)
> **Model:** Sonnet 1M (implementation-heavy, clear specs)
> **Estimated scope:** Species picker (inline, full-width) + Types/Speed/Calc tabs
> **Parallelism:** 2 subagent tracks (Track C: species picker, Track D: context panel tabs)

## How To Start This Session

1. Open a new Claude Code conversation
2. Rename it to `the-builder-s3-features`
3. Verify Sessions 1-2 are complete: `pnpm lint && pnpm typecheck && pnpm test`
4. Send this as your first message:

```
Read docs/the-builder/session-3-features.md and docs/the-builder/context.md.
Execute using subagent-driven development with parallel subagents for Track C and Track D.
Branch: the-builder. Do not push. Commit frequently with descriptive messages.
```

## Prerequisites

- Sessions 1-2 are complete
- The workspace layout exists with: team strip, pokemon editor, context panel (stub tabs)
- Package functions exist: `calculateNatureBumps()`, `calculateSpeedTiers()`, `buildSpeciesSearchIndex()`, `searchSpecies()`
- `@smogon/calc` is installed
- Read `docs/the-builder/context.md` for design decisions (especially sections 7, 8)

## Parallel Track Assignments

### Track C: Species Picker

**Subagent instructions:** You are building the inline species picker. Do NOT create or modify files for the context panel tabs (`type-coverage-tab.tsx`, `speed-tier-tab.tsx`, `damage-calc-tab.tsx`). Track D handles those.

**Files to create:**

```
apps/web/src/components/team-builder/
  species-picker.tsx          — Main picker container (search + filters + split layout)
  species-table.tsx           — Left side: sortable data table
  species-detail.tsx          — Right side: key moves, team fit, VGC Pastes stub
  species-filters.tsx         — Filter chips + role dropdown
  team-fit-analysis.tsx       — +/- analysis of how a species affects the team
```

**Files to modify:**

```
apps/web/src/components/team-builder/
  pokemon-editor.tsx          — Add species name click handler to open picker
  team-strip.tsx              — Add "choosing..." state + "+" click handler
apps/web/src/app/(dashboard)/dashboard/alts/[handle]/teams/[teamId]/
  page.tsx                    — Add picker state management (open/closed, which slot)
```

**Species picker behavior:**

- Triggered by: clicking species name ▾ in editor OR clicking "+" empty slot in strip
- When active: right context panel hides, picker takes full width
- Team strip stays visible, active slot shows "choosing..." in amber
- Cancel button in header returns to normal editor view

**Species picker layout:**

```
[Search bar: full width]
[Filter chips: All | Top 20 | Rising | Niche | Role ▾ | Type ▾ | Learns Move ▾ | Stats ▾]
[Team needs: ✦ Covers Ground | ✦ Covers Flying | ✦ Speed Control]
+--------------------------+---------------------------+
| DATA TABLE (52%)         | DETAIL PANEL (48%)        |
| Sortable columns:        |                           |
| Sprite|Name|Types|Ability | Key Moves                |
| HP|Atk|Def|SpA|SpD|Spe  | Team Fit Analysis (+/-)   |
| BST|Usage%               | VGC Pastes (stub)         |
|                          | [Select popular] [Blank]  |
+--------------------------+---------------------------+
```

**Species table (`species-table.tsx`):**

- Use `buildSpeciesSearchIndex()` to get all format-legal species
- Columns: sprite, name, types (badges), ability, HP, Atk, Def, SpA, SpD, Spe, BST, Usage %
- Usage % column: show "—" when no meta data available (V1)
- Sortable: click column header to sort. Default sort: alphabetical (BST when meta available)
- Stat colors: green for 120+, normal for 70-119, dimmed for <70
- No row borders — hover background change only
- Current Pokemon (if changing species): teal left border + teal background
- Selected/previewing Pokemon: blue left border + subtle blue background
- Click row → update detail panel on right
- Double-click or press Enter → select the species

**Species detail (`species-detail.tsx`):**

- Shows only data NOT in the table (no duplication):
  - Key moves: list of notable moves the species learns (from `getLearnableMoves()`, show top ~10 by competitive relevance)
  - Team fit analysis component
  - VGC Pastes section: STUB for V1 — show "Proven sets will appear here when data is available"
  - Action buttons: "Select with defaults" / "Select blank"
- "Select with defaults" creates a Pokemon with: most common ability (first valid ability), no item, Hardy nature, level 50, no moves, 0 EVs, 31 IVs
- "Select blank" same but completely empty

**Team fit analysis (`team-fit-analysis.tsx`):**

- Props: `currentTeam: Pokemon[]`, `candidateSpecies: string`
- Compute using `calculateTeamSynergy()` and `getDefensiveMatchups()`
- Show +/- list:
  - Green "+": new resistances/immunities the candidate adds, roles it fills (check if it has Intimidate, Fake Out, Tailwind, etc.)
  - Red "−": new weaknesses it introduces, roles it duplicates, shared weaknesses
  - Amber "~": neutral observations (similar speed tier, bulk comparison)

**Species filters (`species-filters.tsx`):**

- Search input: filters the table using `searchSpecies()` from Session 1
- Usage tier chips: All, Top 20, Rising, Niche — V1: only "All" is functional (no meta data), others show but are disabled with tooltip "Requires meta data"
- Category filter dropdowns (use Popover from shadcn):
  - Role ▾ → list of roles: Speed Control, Tailwind, Trick Room, Redirection, Fake Out, Intimidate, Priority, Weather Setter, Terrain Setter, Spread Damage, Setup Sweeper, Defensive Wall
  - Each role maps to a set of abilities/moves to filter by (e.g., "Tailwind" = species that learn the move Tailwind)
  - Type ▾ → 18 type buttons, multi-select
  - Learns Move ▾ → search input + quick picks (Tailwind, Follow Me, Trick Room, Fake Out, Protect, Spore)
  - Stats ▾ → base stat range inputs (min/max for each stat)
- Team need suggestions: auto-generated from `calculateTeamSynergy()` — show types with 2+ weaknesses and 0 resists as "✦ Covers [Type]"

**Integration with workspace:**

- The workspace page (`[teamId]/page.tsx`) manages a `pickerState: { open: boolean; slot: number | null; mode: 'add' | 'change' }` state
- When picker is open: hide `<ContextPanel>`, show `<SpeciesPicker>` at full width
- When species is selected: call `addPokemonToTeam()` or update existing Pokemon's species, close picker, show editor + context panel

---

### Track D: Context Panel Tabs

**Subagent instructions:** You are building the 3 context panel tabs (Types, Speed, Calc). Do NOT create or modify the species picker files. Track C handles those.

**Files to create:**

```
apps/web/src/components/team-builder/
  type-coverage-tab.tsx       — Types tab content
  speed-tier-tab.tsx          — Speed tab content
  damage-calc-tab.tsx         — Calc tab content
```

**Files to modify:**

```
apps/web/src/components/team-builder/
  context-panel.tsx           — Replace stub content with real tab components
```

**Context panel (`context-panel.tsx` modification):**

- Replace stub tab content with real components
- Props: `team: PokemonWithMeta[]`, `selectedPokemon: PokemonWithMeta | null`, `format: GameFormat`
- Pass team + selectedPokemon to each tab — tabs render differently based on whether a Pokemon is selected

**Type coverage tab (`type-coverage-tab.tsx`):**

_No Pokemon selected (team overview):_

- Full 18-type defensive coverage matrix
- Columns: type label + one column per team Pokemon (show sprite/emoji)
- Cells: colored — green "½" or "¼" for resist, red "2" or "4" for weak, gray "-" for neutral, italic "0" for immune
- Use `getDefensiveMatchups()` for each team Pokemon, combine into a matrix
- Below the matrix: insight rows
  - Red warnings: types with 2+ weaknesses and 0-1 resists
  - Green confirmations: types with 3+ resists
- Also show offensive coverage: what types the team can hit super-effectively (from move types)

_Pokemon selected (per-Pokemon view):_

- Show that Pokemon's individual type matchups
- Weaknesses (2x, 4x), resistances (½x, ¼x), immunities
- How tera type changes the matchups (show "after Tera" column)
- Move coverage: what types the Pokemon's 4 moves hit SE (use `getTypeEffectiveness()`)

**Speed tier tab (`speed-tier-tab.tsx`):**

_No Pokemon selected (team overview):_

- Use `getFormatSpeedBenchmarks()` to get benchmark data
- Show team members interleaved with key meta benchmarks
- Each row: speed value, species name, EV/nature spread
- Team members highlighted in teal, meta Pokemon in default color
- Horizontal dividers at meaningful thresholds: "fast" / "mid" / "Trick Room"
- Warnings for speed gaps (large ranges with no team member)

_Pokemon selected (focused view):_

- Use `compareSpeedTier()` for the selected Pokemon
- "You outspeed" section: list with speed values and deltas (+N)
- "You're outsped by" section: list with speed values and deltas (-N)
- Show Tailwind speed (2x) and Choice Scarf speed (1.5x) benchmarks
- Smart suggestion: if a small EV investment would outspeed a key benchmark, mention it

**Damage calc tab (`damage-calc-tab.tsx`):**

This is the most complex tab. Uses `@smogon/calc`.

```typescript
import { calculate, Generations, Pokemon, Move, Field } from "@smogon/calc";
const gen = Generations.get(9); // or derive from format
```

_Layout:_

- Top: field condition toggles (weather, terrain, screens, stat stages, Helping Hand)
- Offensive section: "Your [Pokemon]'s attacks vs meta threats"
- Defensive section: "Meta threats vs your [Pokemon]"
- Each calc row: move name → target name, damage bar, range (XX-YY%), verdict (OHKO/2HKO/3HKO/roll)
- Manual calc button: opens a form to input custom attacker/defender/move

_Smart auto-suggestions:_

- For the selected Pokemon, calculate its moves against common meta threats
- Also calculate common meta threats' moves against the selected Pokemon
- V1 "common meta threats": hardcode the top 10 most common species per format with standard sets (252/252 spreads). When meta pipeline is ready, pull from `pokemon_usage_stats`.
- Show the most relevant calcs first (OHKOs and rolls first, then 2HKOs)

_Damage bar visualization:_

- Width = damage percentage (capped at 100%)
- Color: green for <33%, amber for 33-66%, red/gradient for 66-100%, red for 100%+
- Verdict text: "OHKO" (guaranteed KO), "roll to KO" (damage range spans 100%), "2HKO", "3HKO"

_Field conditions:_

- Weather: None, Sun, Rain, Sand, Snow (toggle buttons)
- Terrain: None, Electric, Grassy, Psychic, Misty (toggle buttons)
- Screens: Light Screen, Reflect (checkboxes)
- Stat stages: -6 to +6 for Atk/Def/SpA/SpD/Spe (number inputs, default 0)
- Helping Hand: checkbox
- These affect the `Field` object passed to `calculate()`

_Manual calc mode:_

- Two Pokemon selectors (attacker + defender) with ability to pick any species and customize their set
- Move selector
- Field conditions
- Calculate button → shows result
- This is a standalone damage calc embedded in the builder

## Verification

After both tracks merge:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm dev:web  # manually verify:
  # 1. Click "+" in team strip → species picker opens, context panel hides
  # 2. Search for "Intimidate" → filters to Intimidate Pokemon
  # 3. Click a species → detail panel shows moves + team fit
  # 4. Click "Select with defaults" → Pokemon added, picker closes
  # 5. Click species name ▾ → picker opens to change species
  # 6. Cancel → returns to editor unchanged
  # 7. Types tab: shows team coverage matrix with warnings
  # 8. Speed tab: shows speed tier comparison
  # 9. Calc tab: shows damage calcs for selected Pokemon
  # 10. Switch Pokemon in strip → all tabs update
```

Commit with a descriptive message. Do NOT push.

## What NOT To Build

- No validation system (Session 4)
- No meta data in filters (usage tier chips disabled in V1)
- No VGC Pastes real data (stub only)
- No mobile layout (Session 5)
