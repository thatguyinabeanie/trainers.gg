# Builder Workspace Redesign

## Problem

The current builder workspace has several UX issues: the horizontal Pokemon strip wastes vertical space, the 50/50 split is always-on and cramped, EV bars are oversized, the type matrix is hard to scan, the damage calc is underpowered, and the overall visual hierarchy is unclear. This redesign addresses all of these in one cohesive pass.

## Layout

### Overall Structure

```
[☰ Header: ← Teams / Team Name · Format · Import Export Fork Validate]
[Team Sidebar | Editor | ⋮ Resize Handle | Context Panel]
```

- **Team Sidebar**: Narrow vertical strip (~64px) on the far left. Pokemon stacked vertically, centered, with generous spacing. Click to switch Pokemon, drag to reorder, "+" slot at the bottom.
- **Editor**: Fills the space between team sidebar and context panel. Scrolls vertically.
- **Resize Handle**: Draggable divider between editor and context panel.
- **Context Panel**: Right side with Types/Speed/Calc tabs. 50/50 default split with editor. Closeable (✕ button) — closing gives editor full width. Reopenable via tab buttons that persist as an icon rail.

### Header Bar

Contains: sidebar collapse button (☰), breadcrumb (← Teams / Team Name), format badge, and action buttons (Import, Export, Fork, Validate) pushed right.

### No Horizontal Strip

The horizontal Pokemon strip at the top is removed entirely. The vertical team sidebar replaces it.

## Editor Panel (Left)

### Species Header (one line)

```
Gholdengo  [Steel] [Ghost]  — no nickname · Genderless · Not shiny    Lv. 50
```

Species name, type badges, nickname, gender, shiny status, and level — all on one line. Nickname/gender/shiny are editable inline (click to change).

### Fields Row

Three fields in a single row: **Ability**, **Item**, **Tera Type**. Nature is NOT in this row — it lives adjacent to EVs.

For single-ability Pokemon, the ability displays as static text (not a clickable picker).

### Moves (Single Column List)

Each move is a full-width row showing:

```
Make It Rain    [Steel]  Special   120 BP   100%
Shadow Ball     [Ghost]  Special    80 BP   100%
Focus Blast     [Fight]  Special   120 BP    70%
Protect         [Normal] Status      —        —
```

- Move name (left-aligned, ~100px)
- Type badge (colored pill)
- Category: Physical / Special / Status
- Base Power
- Accuracy

When the Calc tab is open, each move row also shows **read-only damage hints** on the right: percentage range + verdict badge (e.g., "48–57%" "2HKO"). These hints reflect the current defender in the calc panel. Clicking a move always opens the move picker (editing behavior is never overridden by calc).

### Nature (Adjacent to EVs)

Nature sits in its own row directly above the EV section:

```
NATURE  Modest  +SpA  -Atk
```

This is a clickable field that opens the nature picker. Placing it here makes the relationship between nature and stat calculations visually clear.

### EVs (Compact Inline Bars)

Compact 7px-tall bars. Each stat on one row:

```
HP  [████    ]  20   163
Atk [        ]   0    58   (dimmed — nature reduces)
Def [        ]   0   111
SpA [████████]  252  222   (green — nature boosts)
SpD [        ]   0   111
Spe [███████ ]  236  135
                     2 remaining
```

Columns: stat label (28px) | draggable bar | EV value (30px) | calculated stat value (30px). Nature bump tick marks still present on the boosted stat's bar. Drag or click to edit EV values. Total counter below.

### IVs

Single compact line below EVs: `IVs  31 / 0 Atk / 31 / 31 / 31 / 31`. Hidden for Pokemon Champions format (uses Stat Points system instead).

## Context Panel (Right)

### Tab Bar

Three tabs centered in the header: **Types**, **Speed**, **Calc**. Close button (✕) on the right.

### Types Tab

**View toggles**: Defensive / Offensive
**Scope toggles**: Full Team / Selected Pokemon

This gives 4 view combinations:
- **Defensive + Full Team**: Heatmap matrix (18 types × team Pokemon). Colored cells — green for resists, red for weaknesses, dark for immunities. No text numbers needed, just color intensity.
- **Defensive + Selected**: Individual Pokemon's weaknesses, resistances, immunities. How tera type changes matchups.
- **Offensive + Full Team**: Which types the team can hit super-effectively based on actual move types across all Pokemon.
- **Offensive + Selected**: What types the selected Pokemon's 4 moves can hit SE.

**Insights section** below the matrix: warnings (red) for shared weaknesses, confirmations (green) for well-covered types. Adapts to whichever view is active.

### Speed Tab

**Summary cards** at the top showing the selected Pokemon's speed: Current, Tailwind (×2), Scarf (×1.5).

**EV suggestion** when relevant (e.g., "+4 Speed EVs → outspeeds neutral 252 Landorus-T").

**Stat modifier toggle**: -2, -1, —, +1, +2. Applies globally to all values in the table (simulates Icy Wind, Tailwind effects, etc.).

**Data table** sorted by base speed with grouping dividers:

| Column | Description |
|--------|-------------|
| Pokemon | Species name. Team members prefixed with ★ and highlighted in teal |
| Base | Base speed stat |
| Min | 0 EVs, 0 IVs, -Speed nature |
| Max Neutral | 252 EVs, 31 IVs, neutral nature |
| Max +Nat | 252 EVs, 31 IVs, +Speed nature |
| Tailwind | Max speed × 2 |
| Scarf | Max speed × 1.5 |

Group dividers: **Fast (Base 100+)**, **Mid (Base 60–99)**, **Trick Room (Base <60)**. Team Pokemon interleaved with meta benchmarks.

### Calc Tab

A traditional damage calculator integrated into the builder. The editor IS the attacker — no attacker section in the calc panel.

**Direction toggle**: "You → Them" / "Them → You"

**Move selector**: The calc panel has its own move list (mirrors the editor's 4 moves) for selecting which move to calculate. Each row shows: type dot, move name, BP, damage %, verdict badge, Crit toggle. Clicking a move here selects it for the detailed calc. This is separate from the editor's move slots (which always open the move picker on click).

**Attacker modifiers** (calc-only, don't change the actual set): Status condition dropdown, per-stat boost dropdowns (-6 to +6 for Atk/Def/SpA/SpD/Spe).

**Defender**: Searchable species dropdown. Loads with editable set:
- Ability, Item, Nature, Tera Type (editable fields)
- Stat table: Base | EVs (editable inputs) | Bar | Total | Boost (±dropdown per stat)
- Status condition dropdown
- Current HP bar + input (for calculating against weakened Pokemon)

**Field conditions** (comprehensive):
- Mode: Doubles / Singles
- Weather: None / Sun / Rain / Sand / Snow
- Terrain: None / Electric / Grassy / Misty / Psychic
- Global: Gravity
- Per-side conditions (Your side / Their side independently):
  - Reflect, Light Screen, Aurora Veil, Tailwind, Helping Hand, Friend Guard
  - Their side also: Stealth Rock, Spikes, Salt Cure

**Result** (sticky at bottom of panel): Move → Target, verdict badge (OHKO/2HKO/3HKO color-coded), damage bar, full calc description text (Showdown-style), damage roll values.

## Format Awareness

- **Pre-Champions formats** (VGC Reg I, Smogon, etc.): Show EVs + IVs, traditional stat system
- **Pokemon Champions format**: Show Stat Points (SP) system instead of EVs/IVs. The editor, calc defender stats, and speed table all adapt to the format's generation. Reference: Nerd of Now damage calculator at `~/source/NCP-VGC-Damage-Calculator` for SP system implementation.

## What Changes vs Current

| Area | Current | New |
|------|---------|-----|
| Pokemon list | Horizontal strip at top | Vertical sidebar on left |
| Layout split | Always 50/50 | 50/50 default, closeable + resizable |
| EV bars | 44px tall (mobile), oversized | 7px compact inline bars |
| Moves | 2×2 grid | Single column list with type/category/BP/accuracy |
| Nature | In 2×2 field grid | Own row directly above EVs |
| Fields | 2×2 grid (Ability/Item/Nature/Tera) | 3-across row (Ability/Item/Tera) |
| Species header | Name + types on one line, nickname/gender/shiny at bottom | All on one line |
| Type coverage | Text numbers in table cells | Colored heatmap cells + Defensive/Offensive toggle + Team/Selected scope toggle |
| Speed tab | Large number cards + long list | Data table with Base/Min/Max Neutral/Max +Nat/Tailwind/Scarf columns + groupings + global ±modifier toggle |
| Damage calc | Auto-suggestion bars (red/orange), weak field controls | Full traditional calculator: searchable defender with editable stats, comprehensive field conditions, move selector with crit toggle, full calc text output |
| Validate button | Own row below strip | In header bar with Import/Export/Fork |
| Tab buttons | Left-aligned | Centered |

## Not In Scope

- Meta data integration (usage stats, trending picks) — separate design pass after core calculator works
- Standalone damage calculator page — builder-only for now
- Mobile layout — separate design pass
- Species picker redesign — existing picker is functional
- VGC Pastes integration
