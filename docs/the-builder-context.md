# Pokemon Team Builder — Requirements & Design Context

> Brainstormed and designed April 9, 2026. This document captures every design decision, technical requirement, and architectural choice made during the brainstorming session. It serves as the definitive reference for implementation.

---

## Table of Contents

1. [Vision & Positioning](#1-vision--positioning)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [V1 Scope](#3-v1-scope)
4. [UI Layout Decisions](#4-ui-layout-decisions)
5. [Team Strip](#5-team-strip)
6. [Editor Panel](#6-editor-panel)
7. [Species Picker](#7-species-picker)
8. [Context Panel Tabs](#8-context-panel-tabs)
9. [Meta Data Integration](#9-meta-data-integration)
10. [Teams List Page](#10-teams-list-page)
11. [Team Lifecycle](#11-team-lifecycle)
12. [Format Awareness](#12-format-awareness)
13. [Validation](#13-validation)
14. [Import & Export](#14-import--export)
15. [Data Pipeline Architecture](#15-data-pipeline-architecture)
16. [Database Schema](#16-database-schema)
17. [Technical Stack](#17-technical-stack)
18. [Competitive Landscape](#18-competitive-landscape)
19. [Deferred Features](#19-deferred-features)
20. [Visual Mockups Reference](#20-visual-mockups-reference)

---

## 1. Vision & Positioning

trainers.gg's team builder is not just a team editor. It is a **competitive Pokemon workbench** — a single integrated platform that replaces 10+ fragmented tools competitive players currently juggle.

**What it replaces/integrates:**

| Tool                                  | What We Replace                 |
| ------------------------------------- | ------------------------------- |
| Pokemon Showdown builder              | Core team editing               |
| Marriland / Gabby's builder           | Type coverage matrix            |
| Pikalytics / Munchstats / Statcrusher | Usage stats, EV spreads, trends |
| VGC MultiCalc / Nerd of Now           | Damage calculator               |
| SableyeVGC SPAMS                      | Matchup planning (future)       |
| vsrecorder / PASRS                    | Match tracking (future)         |
| VGC Pastes / Labmaus / Stalruth       | Team discovery, proven sets     |
| PokePaste / PokeBin                   | Team sharing                    |

**Design principles:**

- Clean, playful, community-driven — NOT dark/aggressive/neon "gamer" aesthetic
- Data-rich and precise where it matters, but warm and never intimidating
- All ages, mixed tech comfort, equal desktop/mobile priority
- Teal primary (OKLCH tokens from @trainers/theme)

---

## 2. System Architecture Overview

```
+------------------------------------------------------------------+
|                        DASHBOARD SHELL                            |
|  [Sidebar] [Top Bar: trainers.gg | Teams / Team Name | Actions]  |
+------------------------------------------------------------------+
|              TEAM STRIP (horizontal, centered)                    |
|  [ Mon1 ] [ Mon2 ] [ Mon3 ] [ Mon4 ] [ Mon5 ] [ Mon6/+ ]       |
+------------------------------------------------------------------+
|                                                                   |
|  EDITOR PANEL (50%)          |  CONTEXT PANEL (50%)              |
|                              |                                    |
|  Species Name (clickable)    |  [Types] [Speed] [Calc]           |
|  [Ability] [Item]            |                                    |
|  [Nature]  [Tera Type]       |  Tab content area                 |
|  [Nickname] [Gender] [Shiny] |  (type matrix, speed tiers,       |
|                              |   damage calcs)                    |
|  [Move1] [Move2]             |                                    |
|  [Move3] [Move4]             |                                    |
|                              |                                    |
|  EVs (draggable bars)        |                                    |
|  IVs (always visible*)       |                                    |
|  Notes (collapsible)         |                                    |
|                              |                                    |
+------------------------------------------------------------------+

* IVs hidden for Pokemon Champions format (no IV system)
```

**When species picker is active:**

```
+------------------------------------------------------------------+
|                        DASHBOARD SHELL                            |
|  [Top Bar: ... | "Choosing Pokemon for slot N" | Cancel]          |
+------------------------------------------------------------------+
|              TEAM STRIP (slot N shows "choosing...")               |
+------------------------------------------------------------------+
|  [Search bar: name, ability, move, type...]                       |
|  [Filters: All | Top 20 | Rising | Role | Type | Move | Stats]  |
|  [Team needs: Covers Ground | Covers Flying | Speed Control]    |
+------------------------------------------------------------------+
|                                                                   |
|  DATA TABLE (52%)            |  DETAIL PANEL (48%)               |
|                              |                                    |
|  Sprite | Name | Types |     |  Key Moves                       |
|  Ability | Stats | BST |     |  Team Fit Analysis (+/-)          |
|  Usage %                     |  VGC Pastes proven sets           |
|  (sortable columns)          |  [Use this set] [View team]       |
|  (no row borders)            |  [Select popular] [Select blank]  |
|                              |                                    |
+------------------------------------------------------------------+

Context panel HIDES during species picking.
Full width given to the picker.
```

---

## 3. V1 Scope

### In Scope

- Team builder workspace (split panel layout)
- Inline species picker (full-width, data table + detail)
- Context panel: Types, Speed, Calc (3 tabs)
- Format-aware editor (VGC, Smogon, Champions)
- EV editor with nature bump indicators
- IV editor (visible for formats that support IVs)
- Move/item/ability pickers with inline descriptions
- Nickname, gender (when relevant), shiny toggle, level
- Import: Showdown paste (full team + per-Pokemon), Pokepaste URL
- Export: Showdown clipboard, Pokepaste link, trainers.gg link (full team + per-Pokemon)
- Team CRUD: create, edit, delete, fork
- Drag-and-drop reordering
- Three-layer validation (strip badges + inline + summary panel)
- Auto-save with 2s debounce
- Team notes + per-Pokemon notes
- Teams list with format filters and grouping
- Database schema for meta stats (tables created, not populated)
- External player identity system (schema only)

### Out of Scope (deferred, architecture documented)

- Meta data pipeline (Limitless webhook, RK9 scraping, Showdown replay parsing)
- Meta UI integration (drawer + inline tooltips — placement TBD)
- VGC Pastes data import
- Matchup planning / SPAMS
- Match tracking / PASRS / vsrecorder
- Team versioning/branching UI (parent_team_id stored, UI later)
- Collaborative editing (websockets)
- Private sharing with revocable access
- Play-by-play match data for native tournaments
- External player account linking

---

## 4. UI Layout Decisions

Every layout decision and the reasoning behind it:

| Decision                     | Choice                                                                            | Reasoning                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Where does the builder live? | Dashboard, scoped to alts                                                         | Teams belong to alts, not user accounts. Consistent with existing dashboard structure.                                    |
| Overall layout               | Split panel: editor left (50%), context tabs right (50%)                          | Allows editing + analyzing simultaneously. Desktop-first, tabs on mobile.                                                 |
| Pokemon list position        | Horizontal strip at top, centered                                                 | Frees full width below for editor + context. Same layout in editor and picker mode. Works on mobile as horizontal scroll. |
| Species picker               | Inline (replaces editor area), NOT a modal                                        | Modals break flow and leave the workspace context. Inline keeps team strip visible.                                       |
| Species picker width         | Full width (context panel hides)                                                  | The data table + detail panel need the space. Right panel returns when done picking.                                      |
| Mobile layout                | Strip horizontal scroll, editor full-width, context tabs below (not side-by-side) | Adapts for touch, doesn't just shrink desktop layout.                                                                     |
| Context panel tabs           | 3 tabs: Types, Speed, Calc                                                        | Meta and Discover moved elsewhere. Clean, focused analysis tools.                                                         |
| Meta tab removed             | Meta not a tab — lives as drawer (A) + inline tooltips (C) + separate page (B)    | Three layers of meta access designed but deferred. Builder ships with only Types/Speed/Calc.                              |
| Discover tab removed         | Discover not a tab — content moved into the species picker detail panel           | VGC Pastes sets, team fit analysis, and alternatives surface during species selection, not as a separate analysis tab.    |
| Meta data placement          | Decide later (drawer + inline tooltips designed, not committed for V1)            | Depends on data pipeline. Builder ships without meta.                                                                     |
| Delete Pokemon               | Delete to empty slot, no confirmation needed                                      | Reversible action — user can simply add another Pokemon. No friction.                                                     |

---

## 5. Team Strip

```
  +--------+  +--------+  +--------+  +--------+  +--------+  +------+
  | Sprite |  | Sprite |  | Sprite |  | Sprite |  | Sprite |  |  +   |
  | Name   |  | Name   |  | Name   |  | Name   |  | Name   |  | Add  |
  | Item   |  | Item   |  | Item   |  | Item   |  | Item   |  |      |
  +--------+  +--------+  +--------+  +--------+  +--------+  +------+
   selected    normal      normal      normal      normal      empty
   (teal)
```

**Behaviors:**

- Click chip → select that Pokemon for editing
- Click "+" → opens species picker
- Drag-and-drop → reorder positions (team_position in DB)
- Selected chip: teal background + border
- Empty slots: dashed border, "+" icon
- During species picking: active slot shows "choosing..." in amber
- Red dot badge on chips with validation errors
- Delete: removes Pokemon, slot becomes empty "+"

---

## 6. Editor Panel

### Fields (2-column grid, click-to-edit)

| Field        | Behavior                                               | Notes                                           |
| ------------ | ------------------------------------------------------ | ----------------------------------------------- |
| Species name | Clickable with ▾ arrow, opens species picker           | Dashed underline indicates clickable            |
| Ability      | Inline picker with description + usage %               |                                                 |
| Held Item    | Inline picker with description, duplicate item warning | "AV already held by Urshifu"                    |
| Nature       | Picker showing +/- stat effects                        | Green "+Atk", Red "-SpA" labels                 |
| Tera Type    | Type selector                                          | Format-dependent (Champions may differ)         |
| Nickname     | Optional text field                                    | Empty by default, preserved on import/export    |
| Gender       | Selector                                               | Only shown for species where gender is relevant |
| Shiny        | Toggle icon (star/sparkle)                             | Changes sprite to shiny variant                 |
| Level        | Number field                                           | Default 50                                      |

### Move Slots (2-column grid, 4 slots)

Each slot shows: move name + type badge. Click to open move picker.

**Move picker shows (inline, like Showdown):**

- All learnable moves for the species
- For each: name, type, category (P/S/Status), BP, accuracy, PP, description, secondary effects
- Filters: All, Physical, Special, Status, STAB, Popular
- Sorted by usage % when meta data available, alphabetical otherwise
- Search at top

### EV Editor

```
  EVs                                        Stat
  HP  [████████████████████████████] 252     207
  Atk [█                           ]   4  + 136   ← green "+" = nature boost
  Def [                            ]   0     110
  SpA [                            ]   0  -  76   ← red "-" = nature reduce (bar dimmed)
  SpD [████████████████████████████] 252     158
  Spe [                            ]   0      81
                                    508 / 510 • 2 remaining
```

**Nature bump ticks:**

```
  +nature stat (e.g., Atk with Adamant):

       ╎  ╎  ╎  ╎  ╎  ╎  ╎  ╎  ╎    ← green tick marks at EV breakpoints
  Atk [████████████████████████████] 252     189
       ↑ each tick = EV value where +10% nature rounds up to +1 stat point
```

- Tick marks only on the +nature stat
- Slider snaps to bump points when dragging near one (within 2 EVs)
- Tooltip shows "88 EVs → 131 SpD ★" when on a bump point
- Reduced stat bar dimmed to 30% opacity

**Preset buttons:** Reset, Max Atk, Max Bulk

### IV Editor

- Shown alongside EVs — always visible for formats that support IVs
- Hidden entirely for Pokemon Champions (no IV system)
- Default 31 all, editable per stat
- Non-standard IVs noted in the header: "IVs: 0 Atk, 27 Spe"

### Per-Pokemon Notes

- Collapsible text field below EVs
- Freeform text for strategy notes
- Lays groundwork for structured matchup planning (SPAMS) later

---

## 7. Species Picker

### Trigger

- Click species name ▾ on existing Pokemon → change species
- Click "+" empty slot → add new Pokemon

### Layout

Full-width (context panel hides). Team strip stays visible.

**Left side (52%) — Showdown-style data table:**

| Column                      | Sortable   | Color coding                             |
| --------------------------- | ---------- | ---------------------------------------- |
| Sprite                      | No         | —                                        |
| Pokemon name                | Yes        | Primary text weight                      |
| Types                       | No         | Type-colored badges                      |
| Ability                     | No         | Secondary text                           |
| HP, Atk, Def, SpA, SpD, Spe | Yes (each) | Green = 120+, normal = mid, dimmed = <70 |
| BST                         | Yes        | Bold                                     |
| Usage %                     | Yes        | Green = high, dimmed = low               |

- Sticky header
- No row borders (Tufte principle — hover background only)
- Current Pokemon: teal highlight with left border
- Previewing Pokemon: blue highlight with left border
- Click row to preview in detail panel

**Right side (48%) — detail panel (no duplication with table):**

- Key moves (not shown in table)
- Team fit analysis: +/- list (e.g., "+Keeps Intimidate", "-Loses Fake Out")
- VGC Pastes proven sets (when data available)
- "Select with popular set" / "Select blank" buttons

### Search

Multi-field search across: species name, ability name, move name, type name.

Examples:

- "Intimidate" → all Pokemon with Intimidate ability
- "Fake Out" → all Pokemon that learn Fake Out
- "Fire Dark" → Pokemon with Fire and/or Dark typing
- "Prankster Tailwind" → Pokemon with Prankster that learn Tailwind

### Filters

**Row 1 — Usage tier:**
All (count) | Top 20 | Rising ↗ | Niche

**Row 2 — Category filters (dropdowns):**

- Role ▾ → Speed Control, Tailwind, Trick Room, Redirection, Fake Out, Intimidate, Priority, Weather Setter, Terrain Setter, Spread Damage, Setup Sweeper, Defensive Wall
- Type ▾ → all 18 types
- Learns Move ▾ → search + quick picks (Tailwind, Follow Me, Trick Room, Fake Out, Protect, Spore)
- Stats ▾ → base stat range sliders

**Row 3 — Auto-suggested team needs (dashed teal border):**

- "✦ Covers Ground" — computed from current team's type weaknesses
- "✦ Covers Flying" — auto-generated
- "✦ Speed Control" — if team lacks Tailwind/Trick Room users

### Species Change Behavior

When changing an existing Pokemon's species:

- Compatible moves kept (if new species can also learn them)
- Held item preserved (if not creating a duplicate)
- EVs/nature reset to popular defaults for new species
- Cancel returns to original Pokemon unchanged

---

## 8. Context Panel Tabs

### Types Tab

**No Pokemon selected (team overview):**

```
Team Defensive Coverage

         Mon1  Mon2  Mon3  Mon4  Mon5  Mon6
Fire      ½     -     -     -     2     ½
Water     -     ½     -     -     ½     ½
Ground    -     -     0     0     -     2    ← 2 immunities!
Rock      2     -     2     -     -     ½    ← warning: 2 weak, 1 resist
...

⚠ Rock: 2 weak (Chien-Pao, Tornadus), only Gholdengo resists
⚠ Ice: 3 weak (Tornadus 2x, Lando-T 4x, Amoonguss 2x)
✓ Bug: 5 resists — extremely well covered
✓ Ground: 2 immunities (Tornadus, Lando-T)
```

**Pokemon selected (per-Pokemon view):**

- Individual weaknesses/resistances/immunities
- How tera type changes matchups
- Move coverage (what types your moves hit SE)

### Speed Tab

**No Pokemon selected (team overview):**

```
Team Speed Tiers (your 6 vs meta benchmarks)

205  ★ Flutter Mane          Timid 252
189    Ogerpon-H              Jolly 252
187  ★ Chien-Pao             Adamant 252
176  ★ Urshifu-R             Adamant 252
163    Landorus-T (meta)      Adamant 252
--- mid speed ---
161  ★ Tornadus              Timid 68
118  ★ Landorus-T            Adamant 44
--- Trick Room ---
 47  ★ Amoonguss             Bold 0 (27 IV)

⚠ Gap: nothing between 118-161
```

**Pokemon selected (focused view):**

- Who you outspeed (with delta: +5, +13, etc.)
- Who outspeeds you (with delta: -2, -9, etc.)
- Smart suggestion: "20 EVs in Speed outspeeds 68% of meta Incineroar"
- Tailwind/Scarf calculated speeds shown

**V1 data source:** Base stats from @pkmn/dex with calculated benchmarks:

- Min speed (0 EVs, 0 IVs, -nature)
- Max speed (252 EVs, 31 IVs, +nature)
- Choice Scarf (1.5x)
- Tailwind (2x)

Meta pipeline data replaces generic benchmarks later.

### Calc Tab

- Uses **@smogon/calc** for damage calculations
- Full field support: weather, terrain, screens, stat stages, abilities, Helping Hand
- **Smart auto-suggestions** (the differentiator):
  - Offensive: your moves vs meta threats with damage ranges + OHKO/2HKO labels
  - Defensive: meta threats' attacks vs your Pokemon
  - Live recalculation when EVs/moves/items change
- **EV optimization insights:** "Shifting 28 EVs from SpD to Def survives Adamant Lando CC"
- Manual calc mode: "+ Manual Calc" button for custom matchups

---

## 9. Meta Data Integration

Three layers designed (placement/timing TBD, not in V1):

| Layer                  | What                                                                                      | When                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **C: Inline tooltips** | Usage % shown in pickers ("Safety Goggles 34%")                                           | At the moment of decision                             |
| **A: Meta drawer**     | Slide-out panel from right edge, per-Pokemon deep dive (items, spreads, moves, teammates) | Toggle while editing                                  |
| **B: Meta page**       | Format-level overview (usage rankings, archetypes, trends)                                | May live outside builder (e.g., /dashboard/analytics) |

Decision on exact placement deferred until data pipeline is ready. Builder ships with Types, Speed, Calc only.

---

## 10. Teams List Page

**Route:** `/dashboard/alts/[handle]/teams`

- Default filter: current active format (e.g., Reg I)
- Format filter chips: All, Reg I, Reg H, Smogon OU, etc.
- When "All" selected: teams grouped by format with section headers
- Team cards show: 6 Pokemon sprites, team name, format, last updated, fork info, W/L record

**Team card:**

```
+-----------------------------------------------------------+
| 🐆 🥊 🌪️ 🌍 🍄 🪙  |  Chien-Pao Offense              |
|                       |  Reg I • Updated 2d ago          |
|                       |  Forked from v2                   |
|                       |                    12W / 5L 70.6% |
+-----------------------------------------------------------+
```

Actions: "+ New Team", "Import Paste"

---

## 11. Team Lifecycle

### Create

New team dialog: name, format selector, start from (empty / import paste / fork existing).

**Empty state (0 Pokemon):**
Workspace visible with empty strip (6 empty slots). Editor area shows "Add your first Pokemon" button + "Import from Showdown paste" option. Both prompts visible.

### Save

**Auto-save with debounce:** Every change saves after 2 seconds of inactivity. Shows "Saving..." → "Saved" indicator. Optimistic update via TanStack Query mutation. No explicit save button.

### Fork

- Full copy of all 6 Pokemon with complete sets
- `parent_team_id` always set (links to original)
- Default: same alt. Can choose different alt.
- Named "Original Name (fork)" by default
- Sets up versioning/branching feature for later

### Delete

- Pokemon can be deleted to empty slot (no confirmation)
- Entire team delete (with confirmation)

### Reorder

- Drag-and-drop in the horizontal team strip
- Updates `team_position` in `team_pokemon` table
- Position matters for VGC team preview order

---

## 12. Format Awareness

The builder is format-aware from day one. The selected format determines:

| Aspect           | Format-dependent behavior                                      |
| ---------------- | -------------------------------------------------------------- |
| Legal Pokemon    | Only format-legal species shown in picker                      |
| Legal moves      | Only format-legal moves in move picker                         |
| Legal abilities  | Only format-legal abilities shown                              |
| IVs              | Shown for VGC/Smogon, hidden for Pokemon Champions             |
| Tera types       | Shown for Gen 9 formats, hidden for earlier gens               |
| Level            | Default 50 for VGC, 100 for Smogon                             |
| Validation rules | Format-specific via @pkmn/sim TeamValidator                    |
| Item clause      | Duplicate items flagged for VGC, allowed for some Smogon tiers |

**Format registry:** `packages/pokemon/src/formats.ts` — GameFormat interface with id, game, generation, category, regulation, doubles flag, active flag.

**Key formats:**

- VGC: Reg I, Reg H, Champions (Reg M-A)
- Smogon: OU, UU, Ubers, LC, Doubles OU, Monotype

---

## 13. Validation

Three simultaneous layers:

```
Layer 1: STRIP BADGES
  [ Mon1 ] [ Mon2• ] [ Mon3 ] [ Mon4• ] [ Mon5 ] [ Mon6 ]
                 ↑                  ↑
            red dot = has issues

Layer 2: INLINE FIELD ERRORS
  +----------------------------------+
  | Held Item                        |
  | Assault Vest                     |  ← red highlight
  | ⚠ Duplicate: also on Urshifu   |  ← error text below
  +----------------------------------+

Layer 3: VALIDATION SUMMARY PANEL (triggered by Validate button)
  +------------------------------------------+
  | Validation Results — 2 issues            |
  |                                           |
  | ⚠ Mon2: Duplicate item (Assault Vest)   |  ← click to jump
  | ⚠ Mon4: EV total exceeds 510 (512)      |  ← click to jump
  +------------------------------------------+
```

**What's validated:**

- Species exists and is format-legal
- Ability is valid for the species
- All moves are learnable by the species
- No duplicate moves on same Pokemon
- Held item exists
- No duplicate items across team (VGC item clause)
- EV total ≤ 510, each stat 0-252
- IV range 0-31
- Gender matches species ratio
- Nickname profanity check
- Format-specific legality (@pkmn/sim TeamValidator)

---

## 14. Import & Export

### Import

| Method                       | Scope         | Behavior                                                       |
| ---------------------------- | ------------- | -------------------------------------------------------------- |
| Showdown paste (full team)   | All 6 Pokemon | Replaces entire team. Parse → validate → populate.             |
| Showdown paste (per-Pokemon) | Single slot   | Add/replace one Pokemon from a single Showdown text block.     |
| Pokepaste URL                | All 6 Pokemon | Fetch raw text from pokepast.es → parse → validate → populate. |

### Export

| Method                     | Scope                    | Output                                        |
| -------------------------- | ------------------------ | --------------------------------------------- |
| Showdown paste (clipboard) | Full team or per-Pokemon | Copy Showdown text format to clipboard        |
| Pokepaste link             | Full team                | Upload to pokepast.es, return shareable URL   |
| trainers.gg link           | Full team                | Generate public shareable link on trainers.gg |

Per-Pokemon import/export placement: TBD during implementation (context menu on strip chip and/or buttons in editor header).

---

## 15. Data Pipeline Architecture

### Data Sources

```
                    +-------------------+
                    |   trainers.gg     |
                    |   (native)        |
                    |   Real-time       |
                    |   OTS + W/L       |
                    +--------+----------+
                             |
                             v
+----------------+  +-------+--------+  +----------------+
| Limitless      |  |                 |  | RK9            |
| (webhook)      +->+ imported_team_  +<-+ (scraping)     |
| OTS + placement|  | sheets          |  | OTS + placement|
+----------------+  |                 |  +----------------+
                    | (normalized)    |
+----------------+  |                 |
| Showdown       +->+                 |
| (replays/usage)|  +---------+-------+
| Battle data    |            |
+----------------+            v
                    +---------+-------+
                    | Aggregation     |
                    | (edge function) |
                    +--------+--------+
                             |
                    +--------v--------+
                    | format_meta_    |
                    | stats           |
                    | pokemon_usage_  |
                    | stats           |
                    | pokemon_detail_ |
                    | stats           |
                    +-----------------+
```

### Key Constraints

- **Native tournaments:** OTS data shared by default (species, ability, item, tera, moves). Full team data (EVs, IVs, nature) is private unless user opts to make team public.
- **Limitless:** Webhook fires on tournament completion. Batch data.
- **RK9:** No API. Requires scraping. Post-event.
- **Showdown:** Public replays parseable. Monthly usage dumps from Smogon.
- **External players:** Separate identity system. Never auto-linked to trainers.gg accounts.

### Weighted Meta Stats

```
Event tier weights:
  Worlds:              5x
  International:       3x
  Regional:            2x
  Special / Midseason: 1.5x
  Community / Online:  1x

Metrics:
  usage_pct           = overall usage across all teams
  usage_pct_top_cut   = usage among teams that made top cut
  usage_pct_top8      = usage among top 8 teams
  conversion_rate     = top_cut_usage / overall_usage
                        > 1.0 = overperforming
                        < 1.0 = overplayed
```

### Aggregation Flow (when pipeline is built)

1. New data arrives (tournament ends / webhook / scrape)
2. Raw data → `data_imports` + `imported_team_sheets`
3. Edge function recomputes `format_meta_stats` for affected format
4. Uses sliding window (last 30 days) for "current meta"
5. Old snapshots preserved for historical trend queries
6. Cache tags busted → UI refreshes

---

## 16. Database Schema

### Existing Tables (modified)

```sql
-- Add to pokemon table
ALTER TABLE pokemon ADD COLUMN notes text;

-- Add to teams table
ALTER TABLE teams ADD COLUMN parent_team_id bigint REFERENCES teams(id);
ALTER TABLE teams ADD COLUMN format text;
```

### New Tables

```sql
-- External players (Limitless, RK9, Showdown — never auto-linked)
external_players (
  id, source, source_player_id, display_name,
  linked_alt_id (nullable), linked_at, linked_by,
  UNIQUE(source, source_player_id)
)

-- Raw tournament data imports
data_imports (
  id, source, external_ref, format,
  event_tier (worlds|international|regional|special_event|
              midseason_showdown|community|online),
  imported_at
)

-- Normalized team sheets from ALL sources
imported_team_sheets (
  id, import_id, external_player_id,
  tournament_name, format, tournament_date, player_count,
  placement_tier (champion|finalist|top4|top8|top16|
                  top_cut|day2|completed),
  position (1-6), species, ability, held_item, tera_type,
  move1-4,
  nature (nullable), ev_spread (nullable), iv_spread (nullable)
)

-- Aggregated meta snapshots
format_meta_stats (
  id, format, computed_at, period_start, period_end,
  total_teams, total_tournaments
)

-- Per-species usage per snapshot
pokemon_usage_stats (
  id, meta_id, species, usage_pct, rank,
  usage_change_7d, usage_change_30d,
  usage_pct_top_cut, usage_pct_top8,
  conversion_rate, sample_size
)

-- Per-species detail breakdowns
pokemon_detail_stats (
  id, meta_id, species,
  items jsonb, abilities jsonb, moves jsonb,
  spreads jsonb, tera_types jsonb, teammates jsonb
)
```

### RLS Summary

- Teams/Pokemon: owner CRUD, public readable by all
- External players: readable by all, writable by admin
- Data imports / imported team sheets: readable by all, writable by service role
- Meta stats: readable by all, writable by service role

---

## 17. Technical Stack

### Dependencies

| Package        | Version | Purpose                                          |
| -------------- | ------- | ------------------------------------------------ |
| `@pkmn/dex`    | 0.10.7  | Species, moves, abilities, items, natures, types |
| `@pkmn/data`   | 0.10.7  | Generations API, raw data                        |
| `@pkmn/sim`    | 0.10.7  | Format-specific TeamValidator                    |
| `@pkmn/sets`   | 5.2.0   | Showdown text parser                             |
| `@pkmn/img`    | 0.3.3   | Sprite URLs                                      |
| `@smogon/calc` | NEW     | Damage calculator (Gen 1-9, full field support)  |

### Existing Functions to Reuse

| Function                                 | Package                     |
| ---------------------------------------- | --------------------------- |
| `calculateStats()`                       | `@trainers/pokemon`         |
| `getNatureMultiplier()`                  | `@trainers/pokemon`         |
| `calculateTeamCoverage()`                | `@trainers/pokemon`         |
| `calculateTeamSynergy()`                 | `@trainers/pokemon`         |
| `getDefensiveMatchups()`                 | `@trainers/pokemon`         |
| `validatePokemon()`                      | `@trainers/pokemon`         |
| `AdvancedTeamValidator`                  | `@trainers/pokemon`         |
| `parseShowdownText()`                    | `@trainers/validators`      |
| `toShowdownFormat()`                     | `@trainers/pokemon`         |
| `parsePokepaseUrl()`                     | `@trainers/validators`      |
| `getPokemonSprite()`                     | `@trainers/pokemon/sprites` |
| `getFormatById()` / `getActiveFormats()` | `@trainers/pokemon`         |

### New Functions to Build

| Function                    | Package             | Purpose                                              |
| --------------------------- | ------------------- | ---------------------------------------------------- |
| `calculateNatureBumps()`    | `@trainers/pokemon` | EV breakpoints where +nature grants extra stat point |
| `calculateSpeedTiers()`     | `@trainers/pokemon` | Speed comparison against format benchmarks           |
| `getSpeciesSearchIndex()`   | `@trainers/pokemon` | Multi-field search index for species picker          |
| `calculateDamage()` wrapper | `apps/web`          | Wrapper around @smogon/calc using our types          |

### Client-Side Calculations

All analysis runs client-side for instant feedback:

- Stat calculations, type coverage, speed tiers, damage calcs, nature bumps, format validation
- @pkmn/dex data loaded client-side via `gen9` singleton

### State Management

- **Server state:** TanStack Query v5
- **Editor form state:** React state (derives from saved team, auto-saves via debounced mutation)
- **Auto-save:** debounced Server Action (2s), optimistic update, "Saving..." → "Saved" indicator
- **Picker state:** local React state

### Routing

```
/dashboard/alts/[handle]/teams           → Teams list
/dashboard/alts/[handle]/teams/new       → New team dialog
/dashboard/alts/[handle]/teams/[id]      → Team builder workspace
/dashboard/alts/[handle]/teams/[id]/meta → Meta page (future)
```

### Key Files to Create

```
apps/web/src/app/(dashboard)/dashboard/alts/[handle]/teams/
  page.tsx, new/page.tsx, [teamId]/page.tsx, [teamId]/layout.tsx

apps/web/src/components/team-builder/
  team-strip.tsx, pokemon-editor.tsx, species-picker.tsx,
  move-picker.tsx, item-picker.tsx, ability-picker.tsx,
  nature-picker.tsx, tera-picker.tsx, ev-editor.tsx, iv-editor.tsx,
  context-panel.tsx, type-coverage-tab.tsx, speed-tier-tab.tsx,
  damage-calc-tab.tsx, validation-panel.tsx, team-card.tsx

apps/web/src/actions/teams.ts

packages/pokemon/src/
  nature-bumps.ts, speed-tiers.ts, species-search.ts

packages/supabase/src/
  queries/teams.ts (expand), mutations/teams.ts (expand)
```

---

## 18. Competitive Landscape

Full competitive landscape with links maintained in `.claude/skills/competitive-landscape/SKILL.md`. Key competitors for the team builder specifically:

| Competitor                                                                                               | What they do           | trainers.gg differentiator                                |
| -------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------- |
| [Pokemon Showdown](https://pokemonshowdown.com)                                                          | Basic team editor      | Analytics integration, versioning, collaboration, sharing |
| [Falinks Teambuilder](https://www.falinks-teambuilder.com)                                               | Collaborative building | Native tournament integration, meta data                  |
| [Marriland](https://marriland.com/tools/team-builder/)                                                   | Type coverage checker  | Integrated into builder alongside calc, speed, meta       |
| [Gabby's Builder](https://pokemon-type-coverage.pokemon-index.com)                                       | Type coverage matrix   | Same, plus offensive coverage                             |
| [Pikalytics](https://www.pikalytics.com)                                                                 | Usage stats            | Stats feed directly into builder decisions                |
| [Munchstats](https://munchstats.com)                                                                     | Showdown ladder stats  | Integrated with team building workflow                    |
| [VGC MultiCalc](https://vgcmulticalc.com)                                                                | Damage calculator      | Inline in builder, auto-suggestions, no context switch    |
| [SableyeVGC SPAMS](https://docs.google.com/spreadsheets/d/1M8w0dHvNBdNlDK4I3xcJBkP68CHWyjgUs7hqnMyV-pQ/) | Matchup planning       | Integrated into builder (future)                          |
| [vsrecorder](https://vsrecorder.app)                                                                     | Match tracking         | Integrated with team history (future)                     |
| [PokePaste](https://pokepast.es)                                                                         | Team sharing           | Richer sharing with access control, analytics             |
| [VGC Pastes](https://www.vrpastes.com)                                                                   | Curated team database  | Proven sets surfaced in species picker                    |

> Full competitive landscape with all links maintained in `.claude/skills/competitive-landscape/SKILL.md`. Updated during this brainstorm with Marriland, SPAMS, Falinks, VGC MultiCalc, Nerd of Now, Pokemon Attack Analyzer, PokeBin, VR Pastes, SilphScope, MunchTeams, Porydex, Stalruth Dev, and Liberty Note.

---

## 19. Deferred Features

### Meta Data (architecture designed, builds later)

- **Drawer (Option A):** slide-out from right, per-Pokemon meta deep dive
- **Inline tooltips (Option C):** usage % shown in pickers during editing
- **Meta page (Option B):** format-level overview, may live outside builder
- All three layers work together: editing a field (C) → want context (A) → want full picture (B)

### Matchup Planning (SPAMS)

- Plan leads, back pairs, game plans against meta archetypes
- Auto-suggested archetypes from meta + user-created custom ones
- Per-Pokemon notes lay the groundwork

### Match Tracking (PASRS/vsrecorder)

- Log games, track W/L, lead pair stats, archetype win rates
- Pokemon bring rates, individual Pokemon win rates
- Performance trends over time

### Team Versioning/Branching

- `parent_team_id` stored from V1 (fork feature)
- Branching UI: see team evolution over time
- Performance comparison across versions

### Collaborative Editing

- Real-time co-editing via websockets
- Private sharing with revocable access, auto-expiry

---

## 20. Visual Mockups Reference

All visual mockups from the brainstorming session are preserved in:

```
.superpowers/brainstorm/83154-1775757376/content/
```

Key mockups:

- `real-team-workspace.html` — Full workspace with Chien-Pao team
- `all-pokemon-views.html` — All 6 Pokemon + adding 6th (each showing a different tab)
- `picker-v5.html` — Species picker with deduplication
- `ev-nature-bumps.html` — EV nature bump tick marks
- `meta-placement.html` — Option A (drawer) vs Option B (page) for meta
- `inline-picker-fullwidth.html` — Full-width inline species picker
- `complete-design.html` — Earlier comprehensive walkthrough (14 sections)

These are HTML files viewable by running the visual companion server:

```bash
.claude/plugins/cache/claude-plugins-official/superpowers/5.0.6/skills/brainstorming/scripts/start-server.sh --project-dir /Users/beanie/source/the-builder
```
